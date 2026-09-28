import { Router } from 'express';
import { getAdminSupabase, getAuthenticatedUser } from '../services/supabase.js';
import { sendPushToUser } from './push.js';

const router = Router();

// Helper to resolve user profile
async function resolveUserRoleAndProfile(user) {
  const admin = getAdminSupabase();

  // 1. Check students
  const { data: student } = await admin
    .from('students')
    .select('id, student_id, full_name, email, level, registration_type, auth_user_id, account_status')
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  if (student) {
    if (!student.auth_user_id) {
      await admin.from('students').update({ auth_user_id: user.id }).eq('id', student.id).catch(() => {});
    }
    return { role: 'student', profile: student };
  }

  // 2. Check lecturers
  const { data: lecturer } = await admin
    .from('lecturers')
    .select('id, lecturer_id, full_name, email, auth_user_id, active')
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  if (lecturer) {
    if (!lecturer.auth_user_id) {
      await admin.from('lecturers').update({ auth_user_id: user.id }).eq('id', lecturer.id).catch(() => {});
    }
    return { role: 'lecturer', profile: lecturer };
  }

  // 3. Fallback from metadata
  const metaRole = user.user_metadata?.role || 'student';
  return {
    role: metaRole,
    profile: {
      id: user.id,
      auth_user_id: user.id,
      full_name: user.user_metadata?.full_name || 'Academic User',
      email: user.email
    }
  };
}

// 1. GET /api/messages/conversations - List all conversations including Module Class Groups & Direct Chats
router.get('/conversations', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { role, profile } = await resolveUserRoleAndProfile(user);
    const admin = getAdminSupabase();

    // 1. Find all modules this user belongs to
    let userModuleIds = [];
    if (role === 'student') {
      const { data: sm } = await admin
        .from('student_modules')
        .select('module_id')
        .eq('student_id', profile.id);
      userModuleIds = (sm || []).map(r => r.module_id);
    } else {
      const { data: lm } = await admin
        .from('modules')
        .select('id')
        .eq('lecturer_id', profile.id);
      userModuleIds = (lm || []).map(r => r.id);
    }

    // 2. For each enrolled/taught module, ensure a Module Class Group conversation exists
    if (userModuleIds.length > 0) {
      const { data: activeMods } = await admin
        .from('modules')
        .select('id, code, title, lecturer_id')
        .in('id', userModuleIds);

      for (const mod of (activeMods || [])) {
        const { data: existingGroup } = await admin
          .from('conversations')
          .select('id')
          .eq('module_id', mod.id)
          .limit(1)
          .maybeSingle();

        if (!existingGroup) {
          // Resolve lecturer and a student for foreign key constraints
          const { data: lecs } = await admin.from('lecturers').select('id, auth_user_id').limit(1);
          const { data: stus } = await admin.from('students').select('id, auth_user_id').limit(1);
          const targetLecId = mod.lecturer_id || lecs?.[0]?.id;
          const targetStuId = (role === 'student' ? profile.id : stus?.[0]?.id) || '00000000-0000-0000-0000-000000000001';

          if (targetLecId && targetStuId) {
            await admin.from('conversations').insert({
              module_id: mod.id,
              lecturer_id: targetLecId,
              student_id: targetStuId,
              student_user_id: user.id,
              lecturer_user_id: lecs?.[0]?.auth_user_id || user.id,
              last_message_at: new Date().toISOString()
            }).catch(() => {});
          }
        }
      }
    }

    // 3. Query all conversations:
    // (a) Module group conversations where module_id is in user's modules
    // (b) Direct conversations where user is participant
    let query = admin
      .from('conversations')
      .select(`
        id, module_id, student_id, lecturer_id, student_user_id, lecturer_user_id, last_message_at, created_at,
        modules(id, code, title, level, semester),
        students(id, student_id, full_name, email, phone, programme, level, registration_type, auth_user_id),
        lecturers(id, lecturer_id, full_name, email, phone, teaching_area, auth_user_id)
      `);

    if (userModuleIds.length > 0) {
      query = query.or(`module_id.in.(${userModuleIds.join(',')}),student_user_id.eq.${user.id},lecturer_user_id.eq.${user.id},student_id.eq.${profile.id},lecturer_id.eq.${profile.id}`);
    } else {
      query = query.or(`student_user_id.eq.${user.id},lecturer_user_id.eq.${user.id},student_id.eq.${profile.id},lecturer_id.eq.${profile.id}`);
    }

    const { data: convs, error } = await query.order('last_message_at', { ascending: false });

    if (error) {
      console.warn('Error querying conversations:', error);
    }

    let conversations = convs || [];

    // Deduplicate module groups (pick primary group conversation per module)
    const seenModuleGroups = new Set();
    const finalConvs = [];

    // Also get enrolled student counts for module groups
    const { data: studentModuleCounts } = await admin
      .from('student_modules')
      .select('module_id');

    const countsMap = {};
    (studentModuleCounts || []).forEach(sm => {
      countsMap[sm.module_id] = (countsMap[sm.module_id] || 0) + 1;
    });

    for (const c of conversations) {
      const isGroupCandidate = userModuleIds.includes(c.module_id);
      if (isGroupCandidate && !seenModuleGroups.has(c.module_id)) {
        seenModuleGroups.add(c.module_id);
        const memberCount = (countsMap[c.module_id] || 1) + 1; // students + lecturer
        finalConvs.push({
          ...c,
          is_group: true,
          group_title: `${c.modules?.code || 'Module'} Class Group`,
          members_count: memberCount
        });
      } else if (!isGroupCandidate || c.student_user_id === user.id || c.lecturer_user_id === user.id) {
        // Direct conversation (1-on-1 with lecturer or peer student)
        finalConvs.push({
          ...c,
          is_group: false
        });
      }
    }

    // Attach latest message and unread counts
    const enriched = await Promise.all(finalConvs.map(async (c) => {
      const { data: msgs } = await admin
        .from('messages')
        .select('id, sender_user_id, body, created_at, read_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { count: unreadCount } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .neq('sender_user_id', user.id)
        .is('read_at', null);

      const latest = msgs?.[0] || null;
      return {
        ...c,
        lastMessage: latest?.body || 'No messages yet',
        lastMessageTime: latest?.created_at || c.last_message_at,
        unreadCount: unreadCount || 0
      };
    }));

    return res.json({ conversations: enriched });
  } catch (err) {
    console.error('Failed to get conversations:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

// 2. GET /api/messages/conversations/:id/messages - Get messages enriched with real sender identities
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id: conversationId } = req.params;
    const admin = getAdminSupabase();

    const { data: messages, error } = await admin
      .from('messages')
      .select('id, conversation_id, sender_user_id, body, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Fetch sender names & roles for all senders in this conversation
    const senderUserIds = Array.from(new Set((messages || []).map(m => m.sender_user_id).filter(Boolean)));
    const senderMap = new Map();

    if (senderUserIds.length > 0) {
      const [{ data: lecs }, { data: stus }] = await Promise.all([
        admin.from('lecturers').select('auth_user_id, full_name, lecturer_id').in('auth_user_id', senderUserIds),
        admin.from('students').select('auth_user_id, full_name, student_id').in('auth_user_id', senderUserIds)
      ]);

      (lecs || []).forEach(l => {
        senderMap.set(l.auth_user_id, { name: l.full_name, role: 'Lecturer', identifier: l.lecturer_id });
      });
      (stus || []).forEach(s => {
        senderMap.set(s.auth_user_id, { name: s.full_name, role: 'Student', identifier: s.student_id });
      });
    }

    const enrichedMessages = (messages || []).map(m => {
      const isMine = m.sender_user_id === user.id;
      const sender = senderMap.get(m.sender_user_id);
      return {
        ...m,
        is_mine: isMine,
        sender_name: isMine ? 'You' : (sender ? sender.name : 'Class Member'),
        sender_role: sender ? sender.role : 'Member',
        sender_id: sender?.identifier || ''
      };
    });

    // Mark messages sent by others as read
    admin
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_user_id', user.id)
      .is('read_at', null)
      .then(null, () => {});

    return res.json({ messages: enrichedMessages });
  } catch (err) {
    console.error('Failed to get conversation messages:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

// 3. POST /api/messages/send - Send a chat message (to Group or Direct)
router.post('/send', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { conversationId, body } = req.body;
    const cleanBody = String(body || '').trim();

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required.' });
    }
    if (!cleanBody) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const admin = getAdminSupabase();

    const { data: message, error: sendErr } = await admin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_user_id: user.id,
        body: cleanBody
      })
      .select()
      .single();

    if (sendErr) throw sendErr;

    // Update conversation timestamp
    await admin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
      .catch(() => {});

    // Dispatch in-app notification & push alerts
    try {
      const { data: conv } = await admin
        .from('conversations')
        .select('id, module_id, student_user_id, lecturer_user_id, modules(code, title)')
        .eq('id', conversationId)
        .maybeSingle();

      if (conv) {
        const senderName = user.user_metadata?.full_name || 'Academic Contact';
        const moduleCode = conv.modules?.code || 'EduLink';

        // Check if group conversation: notify all enrolled students + lecturer
        const { data: enrollments } = await admin
          .from('student_modules')
          .select('students(auth_user_id)')
          .eq('module_id', conv.module_id);

        const recipients = new Set();
        (enrollments || []).forEach(e => {
          if (e.students?.auth_user_id && e.students.auth_user_id !== user.id) {
            recipients.add(e.students.auth_user_id);
          }
        });

        // Add lecturer
        if (conv.lecturer_user_id && conv.lecturer_user_id !== user.id) {
          recipients.add(conv.lecturer_user_id);
        }
        if (conv.student_user_id && conv.student_user_id !== user.id) {
          recipients.add(conv.student_user_id);
        }

        for (const recipientId of Array.from(recipients).slice(0, 15)) {
          admin.from('notifications').insert({
            recipient_user_id: recipientId,
            title: `${moduleCode}: ${senderName}`,
            body: cleanBody.length > 100 ? cleanBody.slice(0, 97) + '...' : cleanBody,
            category: 'message',
            link_url: '/messages',
            created_at: new Date().toISOString()
          }).catch(() => {});

          sendPushToUser(recipientId, {
            title: `${moduleCode}: ${senderName}`,
            body: cleanBody.length > 100 ? cleanBody.slice(0, 97) + '...' : cleanBody,
            icon: '/edulink-logo.jpg',
            data: { url: '/messages', category: 'message' }
          }).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.warn('Notification warning:', notifErr.message);
    }

    return res.json({ ok: true, message });
  } catch (err) {
    console.error('Failed to send message:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

// 4. POST /api/messages/conversations - Create or find conversation (Group or Direct)
router.post('/conversations', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { role, profile } = await resolveUserRoleAndProfile(user);
    const { moduleId, recipientType, recipientId, initialMessage } = req.body;
    const admin = getAdminSupabase();

    let targetModuleId = moduleId;
    if (!targetModuleId) {
      const { data: firstMod } = await admin.from('modules').select('id').limit(1).maybeSingle();
      targetModuleId = firstMod?.id;
    }

    // Resolve module details
    const { data: mod } = await admin
      .from('modules')
      .select('id, code, title, lecturer_id')
      .eq('id', targetModuleId)
      .maybeSingle();

    let conv = null;

    if (recipientType === 'group') {
      // Find or create the Module Class Group conversation
      const { data: existingGroup } = await admin
        .from('conversations')
        .select(`
          id, module_id, student_id, lecturer_id, last_message_at,
          modules(id, code, title),
          students(id, student_id, full_name),
          lecturers(id, lecturer_id, full_name)
        `)
        .eq('module_id', targetModuleId)
        .limit(1)
        .maybeSingle();

      if (existingGroup) {
        conv = { ...existingGroup, is_group: true, group_title: `${mod?.code} Class Group` };
      } else {
        const { data: stus } = await admin.from('students').select('id, auth_user_id').limit(1);
        const { data: lecs } = await admin.from('lecturers').select('id, auth_user_id').limit(1);
        const targetLecId = mod?.lecturer_id || lecs?.[0]?.id;
        const targetStuId = (role === 'student' ? profile.id : stus?.[0]?.id) || '00000000-0000-0000-0000-000000000001';

        const { data: createdGroup, error: cErr } = await admin
          .from('conversations')
          .insert({
            module_id: targetModuleId,
            student_id: targetStuId,
            lecturer_id: targetLecId,
            student_user_id: user.id,
            lecturer_user_id: lecs?.[0]?.auth_user_id || user.id,
            last_message_at: new Date().toISOString()
          })
          .select(`
            id, module_id, student_id, lecturer_id, last_message_at,
            modules(id, code, title),
            students(id, student_id, full_name),
            lecturers(id, lecturer_id, full_name)
          `)
          .single();

        if (cErr) throw cErr;
        conv = { ...createdGroup, is_group: true, group_title: `${mod?.code} Class Group` };
      }
    } else if (recipientType === 'student') {
      // Classmate direct chat (Student to Student doing the same module)
      const { data: peerStudent } = await admin
        .from('students')
        .select('id, auth_user_id, full_name, student_id')
        .eq('id', recipientId)
        .maybeSingle();

      const peerUserId = peerStudent?.auth_user_id || '00000000-0000-0000-0000-000000000002';
      const myStuId = role === 'student' ? profile.id : recipientId;
      const targetLecId = mod?.lecturer_id || (role === 'lecturer' ? profile.id : '00000000-0000-0000-0000-000000000001');

      // Check existing
      const { data: existingPeerConv } = await admin
        .from('conversations')
        .select(`
          id, module_id, student_id, lecturer_id, last_message_at,
          modules(id, code, title),
          students(id, student_id, full_name),
          lecturers(id, lecturer_id, full_name)
        `)
        .eq('module_id', targetModuleId)
        .or(`and(student_user_id.eq.${user.id},lecturer_user_id.eq.${peerUserId}),and(student_user_id.eq.${peerUserId},lecturer_user_id.eq.${user.id})`)
        .maybeSingle();

      if (existingPeerConv) {
        conv = existingPeerConv;
      } else {
        const { data: createdPeer, error: cpErr } = await admin
          .from('conversations')
          .insert({
            module_id: targetModuleId,
            student_id: myStuId,
            lecturer_id: targetLecId,
            student_user_id: user.id,
            lecturer_user_id: peerUserId,
            last_message_at: new Date().toISOString()
          })
          .select(`
            id, module_id, student_id, lecturer_id, last_message_at,
            modules(id, code, title),
            students(id, student_id, full_name),
            lecturers(id, lecturer_id, full_name)
          `)
          .single();

        if (cpErr) throw cpErr;
        conv = createdPeer;
      }
    } else {
      // Direct student to lecturer consultation
      const targetLecId = recipientId || mod?.lecturer_id;
      const targetStuId = role === 'student' ? profile.id : recipientId;

      const { data: existingDirect } = await admin
        .from('conversations')
        .select(`
          id, module_id, student_id, lecturer_id, last_message_at,
          modules(id, code, title),
          students(id, student_id, full_name),
          lecturers(id, lecturer_id, full_name)
        `)
        .eq('module_id', targetModuleId)
        .eq('student_id', targetStuId)
        .eq('lecturer_id', targetLecId)
        .maybeSingle();

      if (existingDirect) {
        conv = existingDirect;
      } else {
        const { data: lecRec } = await admin.from('lecturers').select('auth_user_id').eq('id', targetLecId).maybeSingle();
        const { data: stuRec } = await admin.from('students').select('auth_user_id').eq('id', targetStuId).maybeSingle();

        const { data: createdDirect, error: cdErr } = await admin
          .from('conversations')
          .insert({
            module_id: targetModuleId,
            student_id: targetStuId,
            lecturer_id: targetLecId,
            student_user_id: stuRec?.auth_user_id || user.id,
            lecturer_user_id: lecRec?.auth_user_id || user.id,
            last_message_at: new Date().toISOString()
          })
          .select(`
            id, module_id, student_id, lecturer_id, last_message_at,
            modules(id, code, title),
            students(id, student_id, full_name),
            lecturers(id, lecturer_id, full_name)
          `)
          .single();

        if (cdErr) throw cdErr;
        conv = createdDirect;
      }
    }

    if (initialMessage && initialMessage.trim() && conv?.id) {
      await admin.from('messages').insert({
        conversation_id: conv.id,
        sender_user_id: user.id,
        body: initialMessage.trim()
      }).catch(() => {});
    }

    return res.json({ ok: true, conversation: conv });
  } catch (err) {
    console.error('Failed to create conversation:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

// 5. GET /api/messages/contacts - Get eligible contacts grouped by module (Groups, Lecturers, Classmates)
router.get('/contacts', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { role, profile } = await resolveUserRoleAndProfile(user);
    const admin = getAdminSupabase();

    let userModuleIds = [];
    if (role === 'student') {
      const { data: sm } = await admin
        .from('student_modules')
        .select('module_id')
        .eq('student_id', profile.id);
      userModuleIds = (sm || []).map(r => r.module_id);
    } else {
      const { data: lm } = await admin
        .from('modules')
        .select('id')
        .eq('lecturer_id', profile.id);
      userModuleIds = (lm || []).map(r => r.id);
    }

    if (userModuleIds.length === 0) {
      const { data: allMods } = await admin.from('modules').select('id').eq('active', true);
      userModuleIds = (allMods || []).map(r => r.id);
    }

    // 1. Module details
    const { data: modules } = await admin
      .from('modules')
      .select('id, code, title, level, semester, lecturer_id, lecturers(id, lecturer_id, full_name, email)')
      .in('id', userModuleIds);

    // 2. Classmates enrolled in these modules
    const { data: enrollments } = await admin
      .from('student_modules')
      .select('module_id, student_id, students(id, student_id, full_name, email, programme, level)')
      .in('module_id', userModuleIds);

    // Group classmates by module
    const classmatesByModule = {};
    const uniqueClassmates = new Map();
    (enrollments || []).forEach(e => {
      const s = e.students;
      if (s && s.id !== profile.id) {
        if (!classmatesByModule[e.module_id]) classmatesByModule[e.module_id] = [];
        if (!classmatesByModule[e.module_id].some(c => c.id === s.id)) {
          classmatesByModule[e.module_id].push(s);
        }
        uniqueClassmates.set(s.id, s);
      }
    });

    // 3. Lecturers for these modules
    const uniqueLecturers = new Map();
    (modules || []).forEach(m => {
      if (m.lecturers) uniqueLecturers.set(m.lecturers.id, m.lecturers);
    });

    return res.json({
      role,
      modules: modules || [],
      lecturers: Array.from(uniqueLecturers.values()),
      classmates: Array.from(uniqueClassmates.values()),
      classmatesByModule
    });
  } catch (err) {
    console.error('Failed to get contacts:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

export default router;
