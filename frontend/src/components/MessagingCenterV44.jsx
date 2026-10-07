import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Search, User, Check, CheckCheck, RefreshCw,
  AlertCircle, ArrowLeft, Plus, X, GraduationCap, BookOpen, Clock,
  Sparkles, Paperclip, ChevronRight, Filter, Bell, MoreVertical,
  Phone, Video, Mic, FileText, Image as ImageIcon, CornerUpLeft,
  Copy, Trash2, CheckCircle2, ShieldCheck, Play, Pause,
  PhoneOff, MicOff, VideoOff, Volume2, VolumeX, Maximize2, SwitchCamera,
  ArrowDownLeft, ArrowUpRight, PhoneIncoming, PhoneMissed, Smile, Mail,
  Users
} from 'lucide-react';
import {
  getConversationsList, getConversationMessages, sendChatMessage,
  createOrGetConversation, getAvailableChatContacts, getAuthUser
} from '../services/academicMasterV41toV55.js';
import {
  createWebRTCPeerConnection, playRingtone, stopRingtone,
  initiateCallRecord, updateCallRecordStatus, getCallHistory
} from '../services/webrtcCallService.js';
import { supabase } from '../services/supabase.js';
import '../v25-whatsapp-messages.css';

function getSafeInitials(name, fallback = 'ED') {
  if (!name || typeof name !== 'string') return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function MessagingCenterV44({ role = 'student', profile = null, onNavigate = null }) {
  // Navigation Tabs: 'chats' | 'calls'
  const [sidebarTab, setSidebarTab] = useState('chats');

  const [conversations, setConversations] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'modules' | 'dissertation' | 'unread'
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Replying state (WhatsApp quote)
  const [replyingTo, setReplyingTo] = useState(null);

  // WhatsApp dropdown menus & dialogs
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isMutedNotifications, setIsMutedNotifications] = useState(false);

  // New consultation modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState({ modules: [], lecturers: [], students: [] });
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [newMsgText, setNewMsgText] = useState('');
  const [modalBusy, setModalBusy] = useState(false);

  // Search in chat thread
  const [searchInChat, setSearchInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Attachment menu toggle
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef(null);

  // Voice note simulation state
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);

  // Live Audio & Video Call State
  const [activeCall, setActiveCall] = useState(null); // { id, type: 'audio' | 'video', status: 'calling' | 'connected', duration: 0, recipientName, moduleCode, peerConnection }
  const [incomingCall, setIncomingCall] = useState(null); // { callId, type, callerName, callerUserId, moduleCode, offer }
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [audioBars, setAudioBars] = useState([12, 20, 16, 24, 10, 18, 22, 14, 19, 12, 16]);

  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const audioContextRef = useRef(null);
  const callTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const isDissertationStudent = role === 'student' && (
    profile?.registration_type === 'dissertation' ||
    profile?.student_type === 'dissertation' ||
    profile?.is_dissertation === true ||
    String(profile?.registration_type || '').toLowerCase().includes('dissert')
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const formatCallTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Load conversations list and call history
  const loadData = useCallback(async (selectFirstOnDesktop = false) => {
    try {
      setError('');
      const user = await getAuthUser();
      setCurrentUserId(user.id);

      const [convs, calls] = await Promise.all([
        getConversationsList(),
        getCallHistory().catch(() => [])
      ]);

      setConversations(convs || []);
      setCallHistory(calls || []);

      if (selectFirstOnDesktop && convs?.length > 0 && !activeConvId) {
        if (typeof window !== 'undefined' && window.innerWidth >= 800) {
          setActiveConvId(convs[0].id);
        }
      }
    } catch (err) {
      console.warn('MessagingCenter load error:', err);
      setError(err.message || 'Could not load conversations.');
    } finally {
      setLoading(false);
    }
  }, [activeConvId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Supabase Realtime Call Signaling Listener
  useEffect(() => {
    if (!currentUserId) return;

    const signalChannel = supabase.channel('academic-calls-signaling', {
      config: { broadcast: { self: false } }
    });

    signalChannel
      .on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
        if (!payload || payload.targetUserId !== currentUserId) return;

        console.log('Received WebRTC signal:', payload.action);

        if (payload.action === 'incoming-call') {
          // Received incoming call from lecturer / student
          setIncomingCall({
            callId: payload.callId,
            type: payload.type || 'audio',
            callerName: payload.callerName || 'Academic Caller',
            callerUserId: payload.callerUserId,
            moduleCode: payload.moduleCode || 'Academic Consultation',
            offer: payload.offer,
            conversationId: payload.conversationId
          });
          playRingtone();
        } else if (payload.action === 'call-answered') {
          // Recipient answered our call
          stopRingtone();
          if (pcRef.current && payload.answer) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer)).catch(console.warn);
          }
          setActiveCall(prev => (prev ? { ...prev, status: 'connected' } : null));
        } else if (payload.action === 'call-rejected') {
          // Recipient declined or was busy
          stopRingtone();
          showToast(`Call was declined by ${payload.byName || 'recipient'}.`);
          handleEndCall(false, 'rejected');
        } else if (payload.action === 'call-ended') {
          // Other party ended the call
          stopRingtone();
          handleEndCall(false, 'completed');
        } else if (payload.action === 'ice-candidate') {
          if (pcRef.current && payload.candidate) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.warn);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(signalChannel);
    };
  }, [currentUserId]);

  // Load contacts strictly for enrolled modules, class groups & classmates
  const loadContacts = async () => {
    try {
      const data = await getAvailableChatContacts();
      setContacts(data || { modules: [], lecturers: [], students: [], classmates: [], classmatesByModule: {} });
      if (data?.modules?.length > 0 && !selectedModuleId) {
        setSelectedModuleId(data.modules[0].id);
      }
      if (!selectedRecipientId) {
        setSelectedRecipientId('group');
      }
    } catch (e) {
      console.warn('Could not load contacts:', e);
    }
  };

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const list = await getConversationMessages(convId);
      setMessages(list || []);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.warn('Could not load messages:', err);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);

      // Realtime subscription for incoming messages
      const channel = supabase
        .channel(`chat-room-${activeConvId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
          payload => {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeConvId, loadMessages]);

  // Broadcast WebRTC Signal helper
  const sendSignal = async (action, data) => {
    const channel = supabase.channel('academic-calls-signaling');
    await channel.send({
      type: 'broadcast',
      event: 'call-signal',
      payload: { action, ...data }
    }).catch(console.warn);
  };

  // Start outgoing call (WebRTC)
  const handleStartCall = async (type = 'audio') => {
    if (!activeConv) return;
    const recipientName = other.name;
    const moduleCode = other.code;
    const targetUserId = other.userId;

    try {
      // 1. Get user media (microphone + optional camera)
      let stream = null;
      if (type === 'video') {
        try {
          stream = await navigator.mediaDevices?.getUserMedia({
            video: { facingMode: 'user' },
            audio: true
          });
        } catch (mediaErr) {
          console.warn('Video stream error, falling back to audio:', mediaErr);
          stream = await navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => null);
        }
      } else {
        stream = await navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => null);
      }

      localStreamRef.current = stream;

      // 2. Setup WebRTC PeerConnection with Google STUN servers
      const pc = createWebRTCPeerConnection({
        onTrack: (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        onIceCandidate: (candidate) => {
          if (targetUserId) {
            sendSignal('ice-candidate', { targetUserId, candidate });
          }
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setActiveCall(prev => (prev ? { ...prev, status: 'connected' } : null));
          } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            handleEndCall(false);
          }
        }
      });
      pcRef.current = pc;

      // Add local tracks to peer connection
      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Record in database
      const callRec = await initiateCallRecord({
        conversationId: activeConv.id,
        receiverUserId: targetUserId,
        callerName: profile?.full_name || (role === 'student' ? 'Student' : 'Lecturer'),
        receiverName: recipientName,
        callType: type,
        moduleCode
      });

      // Set active call state
      setActiveCall({
        id: callRec.id,
        type,
        status: 'calling',
        duration: 0,
        recipientName,
        moduleCode,
        targetUserId
      });
      setIsMuted(false);
      setIsCameraOff(false);
      setIsSpeakerOn(true);

      // Connect video stream to self-view PIP video element
      if (type === 'video' && stream) {
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }, 150);
      }

      // Live microphone audio visualizer using Web Audio API
      if (stream) {
        setupAudioVisualizer(stream);
      }

      // Send incoming-call signal via Supabase Realtime
      if (targetUserId) {
        sendSignal('incoming-call', {
          targetUserId,
          callId: callRec.id,
          type,
          callerName: profile?.full_name || (role === 'student' ? 'Student' : 'Lecturer'),
          callerUserId: currentUserId,
          moduleCode,
          offer,
          conversationId: activeConv.id
        });
      }

      // Simulate connection timeout / ring progression
      setTimeout(() => {
        setActiveCall(prev => {
          if (!prev) return null;
          return { ...prev, status: 'connected' };
        });

        // Start call duration counter
        let seconds = 0;
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          seconds += 1;
          setActiveCall(prev => (prev ? { ...prev, duration: seconds } : null));
        }, 1000);
      }, 2000);

    } catch (err) {
      console.error('Call initialization failed:', err);
      showToast('Call failed. Microphone or camera permission required.');
    }
  };

  // Accept incoming call
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    stopRingtone();

    const { callId, type, callerName, callerUserId, moduleCode, offer, conversationId } = incomingCall;

    try {
      let stream = null;
      if (type === 'video') {
        try {
          stream = await navigator.mediaDevices?.getUserMedia({ video: true, audio: true });
        } catch {
          stream = await navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => null);
        }
      } else {
        stream = await navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => null);
      }

      localStreamRef.current = stream;

      const pc = createWebRTCPeerConnection({
        onTrack: (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        onIceCandidate: (candidate) => {
          sendSignal('ice-candidate', { targetUserId: callerUserId, candidate });
        }
      });
      pcRef.current = pc;

      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      // Set remote offer & create answer
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer signal
        sendSignal('call-answered', {
          targetUserId: callerUserId,
          callId,
          answer
        });
      }

      // Update call status to connected in database
      updateCallRecordStatus({ callId, status: 'connected' });

      setActiveCall({
        id: callId,
        type,
        status: 'connected',
        duration: 0,
        recipientName: callerName,
        moduleCode,
        targetUserId: callerUserId
      });
      setIncomingCall(null);
      setIsMuted(false);
      setIsCameraOff(false);

      if (type === 'video' && stream) {
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }, 150);
      }

      if (stream) {
        setupAudioVisualizer(stream);
      }

      // Start timer
      let seconds = 0;
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        seconds += 1;
        setActiveCall(prev => (prev ? { ...prev, duration: seconds } : null));
      }, 1000);

    } catch (err) {
      console.error('Accept call error:', err);
      showToast('Could not access microphone/camera to accept call.');
      handleRejectIncomingCall();
    }
  };

  // Reject incoming call
  const handleRejectIncomingCall = () => {
    if (!incomingCall) return;
    stopRingtone();

    const { callId, callerUserId } = incomingCall;

    // Send reject signal
    sendSignal('call-rejected', {
      targetUserId: callerUserId,
      callId,
      byName: profile?.full_name || 'Recipient'
    });

    // Mark as rejected/missed in database
    updateCallRecordStatus({ callId, status: 'missed' });
    setIncomingCall(null);
    showToast('Call declined.');
  };

  // Setup Web Audio API live microphone frequency visualizer
  const setupAudioVisualizer = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVisualizer = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const newBars = [];
        for (let i = 0; i < 11; i++) {
          const val = dataArray[i] || 0;
          const height = Math.max(6, Math.min(32, Math.round(val / 7)));
          newBars.push(height);
        }
        setAudioBars(newBars);
        animFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();
    } catch (audioCtxErr) {
      console.warn('AudioContext error:', audioCtxErr);
    }
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(prev => !prev);
      showToast(isMuted ? 'Microphone unmuted' : 'Microphone muted');
    }
  };

  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(t => { t.enabled = !t.enabled; });
      setIsCameraOff(prev => !prev);
      showToast(isCameraOff ? 'Camera turned on' : 'Camera turned off');
    }
  };

  // Flip front/rear camera
  const handleFlipCamera = async () => {
    if (!localStreamRef.current) return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';

    try {
      // Stop old video track
      localStreamRef.current.getVideoTracks().forEach(t => t.stop());

      // Request new stream with inverted facing mode
      const newStream = await navigator.mediaDevices?.getUserMedia({
        video: { facingMode: newFacing },
        audio: false
      });

      const newVideoTrack = newStream?.getVideoTracks()?.[0];
      if (newVideoTrack) {
        localStreamRef.current.addTrack(newVideoTrack);

        // Replace track on RTCPeerConnection sender
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        setFacingMode(newFacing);
        showToast(newFacing === 'user' ? 'Front camera active' : 'Rear camera active');
      }
    } catch (err) {
      console.warn('Flip camera error:', err);
      showToast('Could not flip camera.');
    }
  };

  // Fullscreen video toggle
  const handleToggleFullscreen = () => {
    const elem = document.querySelector('.wa-call-overlay');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.().catch(console.warn);
    } else {
      document.exitFullscreen?.().catch(console.warn);
    }
  };

  // End active call
  const handleEndCall = async (notifyPeer = true, callStatus = 'completed') => {
    stopRingtone();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const duration = activeCall?.duration || 0;
    const type = activeCall?.type || 'audio';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const formattedDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    if (notifyPeer && activeCall?.targetUserId) {
      sendSignal('call-ended', { targetUserId: activeCall.targetUserId });
    }

    // Update call record in database
    if (activeCall?.id) {
      updateCallRecordStatus({
        callId: activeCall.id,
        status: callStatus,
        durationSeconds: duration
      });
    }

    // Log call event in conversation thread
    const callLogBody = type === 'video'
      ? `📹 Video Consultation ended (${formattedDuration})`
      : `📞 Academic Voice Call ended (${formattedDuration})`;

    if (activeConvId) {
      const tempId = `temp-call-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: tempId,
          conversation_id: activeConvId,
          sender_user_id: currentUserId,
          body: callLogBody,
          created_at: new Date().toISOString(),
          read_at: null,
          isCallLog: true
        }
      ]);
      sendChatMessage(activeConvId, callLogBody).catch(() => {});
    }

    setActiveCall(null);
    showToast(`Call ended (${formattedDuration})`);
    loadData(false);
  };

  // Send message handler
  const handleSendAction = async (e) => {
    e?.preventDefault();
    handleSend();
  };

  // Voice note simulation
  const handleVoiceNoteClick = async () => {
    if (!activeConvId) return;
    setRecordingVoice(true);
    showToast('Recording academic voice memo…');

    setTimeout(async () => {
      setRecordingVoice(false);
      const voiceBody = `🎙️ [Academic Voice Note - 0:14]`;
      const tempId = `temp-voice-${Date.now()}`;
      const voiceMsg = {
        id: tempId,
        conversation_id: activeConvId,
        sender_user_id: currentUserId,
        body: voiceBody,
        created_at: new Date().toISOString(),
        read_at: null,
        isVoice: true
      };

      setMessages(prev => [...prev, voiceMsg]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      try {
        await sendChatMessage(activeConvId, voiceBody);
        loadData(false);
      } catch (err) {
        console.warn('Voice send error:', err);
      }
    }, 2000);
  };

  // File attachment handler
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    setShowAttachMenu(false);

    const docBody = `📄 [Attached Document: ${file.name} (${Math.round(file.size / 1024)} KB)]`;
    const tempId = `temp-doc-${Date.now()}`;
    const docMsg = {
      id: tempId,
      conversation_id: activeConvId,
      sender_user_id: currentUserId,
      body: docBody,
      created_at: new Date().toISOString(),
      read_at: null,
      isAttachment: true,
      fileName: file.name
    };

    setMessages(prev => [...prev, docMsg]);
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      await sendChatMessage(activeConvId, docBody);
      showToast(`Document "${file.name}" sent.`);
      loadData(false);
    } catch (err) {
      console.warn('File send error:', err);
      setError('Could not attach file.');
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Message copied to clipboard ✓');
  };

  const handleDeleteMessage = (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    showToast('Message deleted');
  };

  // Quick reply chips
  const quickChips = role === 'student'
    ? [
        isDissertationStudent ? "🎓 Thesis Chapter draft ready for review" : "❓ Question on lecture question 3",
        "📄 Submitting assignment revision",
        "📅 Office consultation appointment request",
        "✅ Understood, thank you Sir!"
      ]
    : [
        "👍 Received. I will review it shortly.",
        "📅 Office consultation hours are today 2:00 PM – 4:00 PM.",
        "ℹ️ Please refer to the syllabus guidelines in Chapter 3.",
        "✅ Well prepared submission."
      ];

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const party = getOtherParty(c);
    const otherName = party.name || '';
    const modCode = c.modules?.code || '';
    const modTitle = c.modules?.title || '';
    const last = c.lastMessage || '';

    const matchesSearch = !q ||
      otherName.toLowerCase().includes(q) ||
      modCode.toLowerCase().includes(q) ||
      modTitle.toLowerCase().includes(q) ||
      last.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterMode === 'unread') return (c.unreadCount || 0) > 0;
    if (filterMode === 'modules') return !modCode.includes('401') && !modTitle.toLowerCase().includes('dissert');
    if (filterMode === 'dissertation') {
      return modCode.includes('401') ||
             modTitle.toLowerCase().includes('dissert') ||
             String(c.students?.registration_type || '') === 'dissertation';
    }
    return true;
  });

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Participant helper
  const getOtherParty = (conv) => {
    if (!conv) return { name: 'Academic Contact', code: 'Coursework', moduleTitle: '', roleTag: 'Academic', userId: null };

    // 1. Module Class Discussion Group
    if (conv.is_group) {
      const code = conv.modules?.code || 'Module';
      const moduleTitle = conv.modules?.title || '';
      const name = conv.group_title || `${code} Class Group`;
      const membersCount = conv.members_count || null;
      const roleTag = 'Class Group';
      return {
        name,
        code,
        moduleTitle,
        roleTag,
        isGroup: true,
        membersCount,
        lecturerName: conv.lecturers?.full_name || 'Module Lecturer',
        email: conv.lecturers?.email || '',
        phone: conv.lecturers?.phone || '',
        userId: null
      };
    }

    // 2. Student-to-Student Classmate Direct Chat
    if (conv.is_classmate_chat || (conv.other_party_role === 'student' && role === 'student')) {
      const name = conv.other_party_name || conv.partner_name || conv.students?.full_name || 'Classmate';
      const code = conv.modules?.code || 'Course Module';
      const moduleTitle = conv.modules?.title || '';
      const roleTag = 'Classmate';
      const userId = conv.other_party_user_id || (conv.student_user_id === currentUserId ? conv.lecturer_user_id : conv.student_user_id);
      const email = conv.other_party_email || conv.students?.email || '';
      const phone = conv.other_party_phone || conv.students?.phone || '';
      const identifier = conv.other_party_id || conv.students?.student_id || '';
      return { name, code, moduleTitle, roleTag, isClassmate: true, userId, email, phone, identifier };
    }

    // 3. Regular 1-on-1 Student <-> Lecturer / Supervisor Chat
    if (role === 'student') {
      const isSuper = conv.modules?.code?.includes('401') || conv.modules?.title?.toLowerCase().includes('dissert');
      const name = conv.lecturers?.full_name || (isSuper ? 'Research Supervisor' : 'Module Lecturer');
      const code = conv.modules?.code || (isSuper ? 'Dissertation' : 'Course Module');
      const moduleTitle = conv.modules?.title || '';
      const roleTag = isSuper ? 'Research Supervisor' : 'Lecturer';
      const userId = conv.lecturer_user_id || conv.lecturer_id;
      const email = conv.lecturers?.email || '';
      const phone = conv.lecturers?.phone || '';
      const department = conv.lecturers?.teaching_area || 'Academic Faculty';
      const identifier = conv.lecturers?.lecturer_id || '';
      return { name, code, moduleTitle, roleTag, isSuper, userId, email, phone, department, identifier };
    } else {
      const isSuper = conv.students?.registration_type === 'dissertation';
      const name = conv.students?.full_name || 'Enrolled Student';
      const code = conv.modules?.code || 'Course Module';
      const moduleTitle = conv.modules?.title || '';
      const roleTag = isSuper ? 'Dissertation Student' : 'Student';
      const userId = conv.student_user_id || conv.student_id;
      const email = conv.students?.email || '';
      const phone = conv.students?.phone || '';
      const programme = conv.students?.programme || (conv.students?.level ? `Level ${conv.students.level}` : 'Undergraduate');
      const identifier = conv.students?.student_id || '';
      return { name, code, moduleTitle, roleTag, isSuper, userId, email, phone, programme, identifier };
    }
  };

  const other = getOtherParty(activeConv);

  // Filter messages in thread if searching inside chat
  const displayedMessages = chatSearchQuery.trim()
    ? messages.filter(m => m.body?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  // Handle starting a new conversation strictly restricted to modules
  const handleStartNewConversation = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;

    try {
      setModalBusy(true);
      setError('');

      let recipientType = 'group';
      let recipientId = null;

      if (!selectedRecipientId || selectedRecipientId === 'group') {
        recipientType = 'group';
        recipientId = null;
      } else if (selectedRecipientId.startsWith('student:')) {
        recipientType = 'student';
        recipientId = selectedRecipientId.replace('student:', '');
      } else if (selectedRecipientId.startsWith('lecturer:')) {
        recipientType = 'lecturer';
        recipientId = selectedRecipientId.replace('lecturer:', '');
      } else if (role === 'lecturer') {
        recipientType = 'student';
        recipientId = selectedRecipientId;
      } else {
        recipientType = 'lecturer';
        recipientId = selectedRecipientId;
      }

      const created = await createOrGetConversation({
        moduleId: selectedModuleId,
        lecturerId: role === 'lecturer' ? profile?.id : (recipientType === 'lecturer' ? recipientId : null),
        studentId: role === 'student' ? profile?.id : (recipientType === 'student' ? recipientId : null),
        recipientType,
        recipientId,
        initialMessage: newMsgText.trim()
      });

      setShowNewModal(false);
      setNewMsgText('');
      await loadData(false);

      if (created?.id) {
        setActiveConvId(created.id);
        await loadMessages(created.id);
      }
      showToast(recipientType === 'group' ? 'Module Class Group conversation opened ✓' : 'Academic consultation thread started ✓');
    } catch (err) {
      console.error('Start conversation error:', err);
      setError(err.message || 'Could not start conversation.');
    } finally {
      setModalBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '12px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#0a2540',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '99px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={16} color="#86efac" /> {toast}
        </div>
      )}

      {/* Main WhatsApp Layout Container */}
      <div className={`wa-container ${activeConvId ? 'in-thread' : ''}`}>
        
        {/* ============================================================ */}
        {/* 1. CHATS & CALLS SCREEN (Sidebar / Conversation & Call List) */}
        {/* ============================================================ */}
        <aside className="wa-sidebar">
          {/* WhatsApp Header */}
          <div className="wa-header">
            <h2>Chats</h2>
            <div className="wa-header-actions">
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="wa-icon-btn"
                  title="Menu options"
                  onClick={() => setShowSidebarMenu(prev => !prev)}
                >
                  <MoreVertical size={19} />
                </button>
                {showSidebarMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '38px',
                    right: 0,
                    background: '#233138',
                    color: '#e9edef',
                    borderRadius: '9px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    padding: '6px 0',
                    zIndex: 100,
                    minWidth: '180px',
                    border: '1px solid rgba(134, 150, 160, 0.15)'
                  }}>
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        fontSize: '0.86rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setShowSidebarMenu(false);
                        loadContacts();
                        setShowNewModal(true);
                      }}
                    >
                      <Plus size={16} color="#00a884" /> New chat
                    </button>
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        fontSize: '0.86rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setShowSidebarMenu(false);
                        setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
                        showToast('All messages marked as read.');
                      }}
                    >
                      <CheckCheck size={16} color="#53bdeb" /> Mark all read
                    </button>
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        fontSize: '0.86rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setShowSidebarMenu(false);
                        loadData();
                        showToast('Conversations refreshed.');
                      }}
                    >
                      <RefreshCw size={16} /> Refresh chats
                    </button>
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        fontSize: '0.86rem',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setShowSidebarMenu(false);
                        const next = !isMutedNotifications;
                        setIsMutedNotifications(next);
                        showToast(next ? 'Chat alerts muted.' : 'Chat alerts enabled.');
                      }}
                    >
                      <Bell size={16} /> {isMutedNotifications ? 'Unmute alerts' : 'Mute alerts'}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="wa-header-green-plus"
                title="New chat"
                onClick={() => {
                  loadContacts();
                  setShowNewModal(true);
                }}
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* WhatsApp Tabs: Chats vs Calls */}
          <div className="wa-main-tabs">
            <button
              type="button"
              className={`wa-main-tab-btn ${sidebarTab === 'chats' ? 'active' : ''}`}
              onClick={() => setSidebarTab('chats')}
            >
              <MessageSquare size={15} /> Chats ({conversations.length})
              {sidebarTab === 'chats' && <div className="wa-main-tab-indicator" />}
            </button>
            <button
              type="button"
              className={`wa-main-tab-btn ${sidebarTab === 'calls' ? 'active' : ''}`}
              onClick={() => setSidebarTab('calls')}
            >
              <Phone size={15} /> Calls ({callHistory.length})
              {sidebarTab === 'calls' && <div className="wa-main-tab-indicator" />}
            </button>
          </div>

          {/* Search Bar */}
          <div className="wa-search-wrap">
            <div className="wa-search-bar">
              <Search size={15} color="#8696a0" />
              <input
                id="wa-search-input"
                type="text"
                placeholder={sidebarTab === 'chats' ? "Search or start a new chat" : "Search call logs"}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ border: 0, background: 'none', cursor: 'pointer', color: '#8696a0', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: CHATS LIST */}
          {sidebarTab === 'chats' ? (
            <>
              {/* WhatsApp Filter Chips */}
              <div className="wa-filter-row">
                <button
                  type="button"
                  className={`wa-filter-chip ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`wa-filter-chip ${filterMode === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilterMode('unread')}
                >
                  Unread {conversations.filter(c => (c.unreadCount || 0) > 0).length > 0 ? conversations.filter(c => (c.unreadCount || 0) > 0).length : ''}
                </button>
                <button
                  type="button"
                  className={`wa-filter-chip ${filterMode === 'modules' ? 'active' : ''}`}
                  onClick={() => setFilterMode('modules')}
                >
                  Modules
                </button>
                {isDissertationStudent && (
                  <button
                    type="button"
                    className={`wa-filter-chip dissertation-chip ${filterMode === 'dissertation' ? 'active' : ''}`}
                    onClick={() => setFilterMode('dissertation')}
                  >
                    🎓 Dissertation
                  </button>
                )}
              </div>

              {/* Chat List */}
              <div className="wa-chat-list">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <RefreshCw size={22} className="v-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <span style={{ fontSize: '13px' }}>Loading WhatsApp chats…</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 12px auto'
                    }}>
                      <MessageSquare size={26} color="#94a3b8" />
                    </div>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                      No chats found
                    </strong>
                    <p style={{ fontSize: '12px', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                      {searchQuery ? 'No chats matched your search query' : 'Your academic module conversations will appear here.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        loadContacts();
                        setShowNewModal(true);
                      }}
                      style={{
                        background: '#0a2540',
                        color: '#ffffff',
                        border: 0,
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      + New Academic Chat
                    </button>
                  </div>
                ) : (
                  filteredConversations.map(c => {
                    const isCurrent = c.id === activeConvId;
                    const party = getOtherParty(c);
                    const hasUnread = (c.unreadCount || 0) > 0;
                    const timeLabel = c.lastMessageTime
                      ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`wa-chat-item ${isCurrent ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
                        onClick={() => setActiveConvId(c.id)}
                      >
                        {/* Circle Avatar with Online Dot */}
                        {party.isGroup ? (
                          <div className="wa-avatar group" style={{ background: '#00a884', color: '#ffffff', display: 'grid', placeItems: 'center' }}>
                            <Users size={19} />
                            <div className="wa-avatar-online" />
                          </div>
                        ) : (
                          <div className={`wa-avatar ${party.isSuper ? 'supervisor' : (party.isClassmate ? 'classmate' : (role === 'student' ? 'lecturer' : 'student'))}`}>
                            {getSafeInitials(party.name)}
                            <div className="wa-avatar-online" />
                          </div>
                        )}

                        {/* Chat Middle Content */}
                        <div className="wa-chat-details">
                          <div className="wa-chat-top">
                            <span className="wa-contact-name">
                              {party.name}
                            </span>
                            <span className={`wa-chat-time ${hasUnread ? 'unread' : ''}`}>
                              {timeLabel}
                            </span>
                          </div>

                          {/* Module Badge */}
                          <span
                            className={`wa-chat-module-tag ${party.isSuper ? 'dissertation' : ''}`}
                            style={party.isGroup ? { background: '#dcfce7', color: '#166534', fontWeight: 600 } : (party.isClassmate ? { background: '#e0f2fe', color: '#0369a1', fontWeight: 600 } : {})}
                          >
                            {party.isGroup ? `👥 ${party.code} Class Group` : (party.isSuper ? '🎓 Dissertation' : (party.isClassmate ? `🎓 ${party.code} Classmate` : party.code))}
                          </span>

                          {/* Last Message Snippet */}
                          <div className="wa-chat-bottom">
                            <span className="wa-last-msg">
                              {c.lastMessage?.startsWith('🎙️') ? (
                                <>🎙️ Voice Note</>
                              ) : c.lastMessage?.startsWith('📄') ? (
                                <>📄 Document</>
                              ) : c.lastMessage?.startsWith('📞') ? (
                                <>📞 Voice Call</>
                              ) : c.lastMessage?.startsWith('📹') ? (
                                <>📹 Video Call</>
                              ) : (
                                c.lastMessage
                              )}
                            </span>

                            {/* Unread Counter Badge */}
                            {hasUnread && (
                              <div className="wa-unread-badge">
                                {c.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* TAB 2: CALLS HISTORY LIST */
            <div className="wa-chat-list">
              {callHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 12px auto'
                  }}>
                    <Phone size={24} color="#94a3b8" />
                  </div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                    No call logs yet
                  </strong>
                  <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
                    Start an audio or video consultation call from any active academic thread.
                  </p>
                </div>
              ) : (
                callHistory.map(call => {
                  const isOutgoing = call.caller_user_id === currentUserId;
                  const isMissed = call.status === 'missed';
                  const isVideo = call.call_type === 'video';
                  const otherPartyName = isOutgoing ? call.receiver_name : call.caller_name;
                  const dateStr = call.created_at || call.started_at
                    ? new Date(call.created_at || call.started_at).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })
                    : 'Recent';

                  return (
                    <div key={call.id} className="wa-call-history-item">
                      <div className="wa-call-history-left">
                        <div className="wa-avatar" style={{ width: '42px', height: '42px', fontSize: '13px' }}>
                          {getSafeInitials(otherPartyName)}
                        </div>
                        <div className="wa-call-history-info">
                          <span className="wa-call-history-name">{otherPartyName}</span>
                          <span className={`wa-call-history-meta ${isMissed ? 'missed' : ''}`}>
                            {isMissed ? (
                              <PhoneMissed size={13} color="#ef4444" />
                            ) : isOutgoing ? (
                              <ArrowUpRight size={13} color="#0284c7" />
                            ) : (
                              <ArrowDownLeft size={13} color="#16a34a" />
                            )}
                            <span>{dateStr}</span>
                            {call.duration_seconds > 0 && <span>• {formatCallTimer(call.duration_seconds)}</span>}
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Redial / Call Back Button */}
                      <button
                        type="button"
                        className="wa-icon-btn"
                        style={{ color: '#0a2540', background: '#f1f5f9' }}
                        title={`Call back ${otherPartyName}`}
                        onClick={() => {
                          if (call.conversation_id) {
                            setActiveConvId(call.conversation_id);
                          }
                          handleStartCall(isVideo ? 'video' : 'audio');
                        }}
                      >
                        {isVideo ? <Video size={17} /> : <Phone size={17} />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </aside>

        {/* ============================================================ */}
        {/* 2. CHAT SCREEN (Active Conversation Thread) */}
        {/* ============================================================ */}
        {activeConv ? (
          <main className="wa-chat-pane">
            {/* WhatsApp Doodle Wallpaper */}
            <div className="wa-chat-wallpaper" />

            {/* Chat Screen Top Bar */}
            <div className="wa-chat-header">
              <div className="wa-chat-header-contact" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
                {/* Back Arrow (Mobile) */}
                <button
                  type="button"
                  className="wa-back-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveConvId(null);
                  }}
                  title="Back to chats"
                >
                  <ArrowLeft size={20} />
                </button>

                {/* Avatar */}
                {other.isGroup ? (
                  <div className="wa-avatar group" style={{ width: '40px', height: '40px', background: '#00a884', color: '#ffffff', display: 'grid', placeItems: 'center' }}>
                    <Users size={20} />
                  </div>
                ) : (
                  <div className={`wa-avatar ${other.isSuper ? 'supervisor' : (other.isClassmate ? 'classmate' : (role === 'student' ? 'lecturer' : 'student'))}`} style={{ width: '40px', height: '40px', fontSize: '13px' }}>
                    {getSafeInitials(other?.name)}
                  </div>
                )}

                {/* Contact Title & Subtitle */}
                <div className="wa-contact-title-wrap">
                  <div className="wa-contact-title">
                    {other.name}
                  </div>
                  <div className="wa-contact-subtitle online">
                    {other.isGroup
                      ? `${other.code} • Enrolled Students & Lecturer • ${other.membersCount ? `${other.membersCount} members` : 'Group Discussion'}`
                      : `${other.code} • ${other.roleTag} • Online`}
                  </div>
                </div>
              </div>

              {/* Top Bar Actions: Working WebRTC Audio Call & Video Call */}
              <div className="wa-header-actions">
                {!other.isGroup && (
                  <>
                    <button
                      type="button"
                      className="wa-icon-btn"
                      title="Video call"
                      onClick={() => handleStartCall('video')}
                    >
                      <Video size={19} />
                    </button>
                    <button
                      type="button"
                      className="wa-icon-btn"
                      title="Audio call"
                      onClick={() => handleStartCall('audio')}
                    >
                      <Phone size={18} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="wa-icon-btn"
                  title="Search in chat"
                  onClick={() => setSearchInChat(prev => !prev)}
                >
                  <Search size={18} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="wa-icon-btn"
                    title="Menu"
                    onClick={() => setShowChatMenu(prev => !prev)}
                  >
                    <MoreVertical size={19} />
                  </button>
                  {showChatMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '38px',
                      right: 0,
                      background: '#233138',
                      color: '#e9edef',
                      borderRadius: '9px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      padding: '6px 0',
                      zIndex: 100,
                      minWidth: '180px',
                      border: '1px solid rgba(134, 150, 160, 0.15)'
                    }}>
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#e9edef',
                          fontSize: '0.86rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setShowChatMenu(false);
                          setShowContactInfo(true);
                        }}
                      >
                        <User size={16} /> Contact info
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#e9edef',
                          fontSize: '0.86rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setShowChatMenu(false);
                          setSearchInChat(true);
                        }}
                      >
                        <Search size={16} /> Search in chat
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#e9edef',
                          fontSize: '0.86rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setShowChatMenu(false);
                          loadMessages(activeConvId);
                          showToast('Messages refreshed.');
                        }}
                      >
                        <RefreshCw size={16} /> Refresh chat
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          fontSize: '0.86rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setShowChatMenu(false);
                          if (window.confirm('Clear conversation messages?')) {
                            setMessages([]);
                            showToast('Chat history cleared.');
                          }
                        }}
                      >
                        <Trash2 size={16} /> Clear chat
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#8696a0',
                          fontSize: '0.86rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setShowChatMenu(false);
                          setActiveConvId(null);
                        }}
                      >
                        <X size={16} /> Close chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search inside thread bar */}
            {searchInChat && (
              <div style={{
                background: '#202c33',
                padding: '8px 16px',
                borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 2
              }}>
                <Search size={16} color="#8696a0" />
                <input
                  type="text"
                  placeholder="Search in conversation…"
                  value={chatSearchQuery}
                  onChange={e => setChatSearchQuery(e.target.value)}
                  style={{ flex: 1, border: 0, outline: 0, fontSize: '13.5px', background: 'transparent', color: '#e9edef' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setChatSearchQuery('');
                    setSearchInChat(false);
                  }}
                  style={{ border: 0, background: 'none', cursor: 'pointer', color: '#8696a0' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Messages Area */}
            <div className="wa-messages-area">
              {/* Academic Security Pill */}
              <div className="wa-security-pill">
                <ShieldCheck size={16} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Academic Confidential Channel:</strong> Messages and consultations are secured and restricted to enrolled coursework and thesis supervision.
                </span>
              </div>

              {/* Date Pill */}
              <div className="wa-date-pill">TODAY</div>

              {/* Message List */}
              {displayedMessages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b', maxWidth: '300px' }}>
                  <p style={{ fontSize: '13px', margin: '0 0 6px 0', fontWeight: 600, color: '#334155' }}>
                    {chatSearchQuery ? 'No matching messages found' : 'No messages in this chat yet.'}
                  </p>
                  <p style={{ fontSize: '12px', margin: 0 }}>
                    Type your question below or pick a quick suggestion chip to start consultation.
                  </p>
                </div>
              ) : (
                displayedMessages.map(m => {
                  const isMine = m.sender_user_id === currentUserId;
                  const time = m.created_at
                    ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  const isVoice = m.body?.includes('🎙️ [Academic Voice Note');
                  const isAttachment = m.body?.includes('📄 [Attached Document');
                  const isCallLog = m.body?.includes('📞') || m.body?.includes('📹');

                  return (
                    <div key={m.id} className={`wa-msg-row ${isMine ? 'outgoing' : 'incoming'}`}>
                      <div className={`wa-bubble ${isMine ? 'outgoing' : 'incoming'}`} style={isCallLog ? { background: '#f1f5f9', border: '1px solid #cbd5e1' } : {}}>
                        {/* Hover Action Menu: Reply / Copy / Delete */}
                        <div className="wa-msg-actions-trigger" onClick={(e) => { e.stopPropagation(); }}>
                          <button
                            type="button"
                            title="Reply to message"
                            onClick={() => {
                              setReplyingTo(m);
                              inputRef.current?.focus();
                            }}
                            style={{ border: 0, background: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                          >
                            <CornerUpLeft size={13} />
                          </button>
                          <button
                            type="button"
                            title="Copy message"
                            onClick={() => handleCopyMessage(m.body)}
                            style={{ border: 0, background: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                          >
                            <Copy size={13} />
                          </button>
                          {isMine && (
                            <button
                              type="button"
                              title="Delete message"
                              onClick={() => handleDeleteMessage(m.id)}
                              style={{ border: 0, background: 'none', cursor: 'pointer', padding: '2px', color: '#ef4444' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Sender Name & Role Label for Group & Incoming messages */}
                        {!isMine && (m.sender_name || other.isGroup) && (
                          <div style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: m.sender_role === 'lecturer' ? '#00a884' : '#2563eb',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>{m.sender_name || (m.sender_user_id === other.userId ? other.name : 'Class Participant')}</span>
                            <span style={{
                              fontSize: '9px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: m.sender_role === 'lecturer' ? '#dcfce7' : '#dbeafe',
                              color: m.sender_role === 'lecturer' ? '#166534' : '#1e40af',
                              fontWeight: 600,
                              textTransform: 'uppercase'
                            }}>
                              {m.sender_role === 'lecturer' ? 'Lecturer' : 'Student'}
                            </span>
                          </div>
                        )}

                        {/* If quoted reply message */}
                        {m.body.startsWith('[Replying to') && (
                          <div className="wa-quoted-card">
                            <div className="wa-quoted-sender">{isMine ? 'You' : other.name}</div>
                            <div className="wa-quoted-text">
                              {m.body.slice(m.body.indexOf('"') + 1, m.body.lastIndexOf('"'))}
                            </div>
                          </div>
                        )}

                        {/* Special Bubble Content: Call Log */}
                        {isCallLog ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0a2540', fontWeight: 600, fontSize: '13px' }}>
                            {m.body.includes('📹') ? <Video size={16} color="#0a2540" /> : <Phone size={16} color="#0a2540" />}
                            <span>{m.body}</span>
                          </div>
                        ) : isVoice ? (
                          /* Special Bubble Content: Voice Note */
                          <div className="wa-voicenote-card">
                            <button
                              type="button"
                              className="wa-play-btn"
                              onClick={() => setPlayingVoiceId(playingVoiceId === m.id ? null : m.id)}
                            >
                              {playingVoiceId === m.id ? <Pause size={18} color="#00a884" /> : <Play size={18} color="#00a884" />}
                            </button>
                            <div className="wa-waveform">
                              {[12, 18, 14, 22, 10, 16, 24, 15, 19, 12, 16].map((h, i) => (
                                <div
                                  key={i}
                                  className="wa-waveform-bar"
                                  style={{
                                    height: `${h}px`,
                                    background: playingVoiceId === m.id ? '#53bdeb' : '#8696a0',
                                    opacity: playingVoiceId === m.id ? 1 : 0.65
                                  }}
                                />
                              ))}
                            </div>
                            <span style={{ fontSize: '11px', color: '#8696a0', minWidth: '28px' }}>0:18</span>

                            {/* Speaker avatar with micro mic badge */}
                            <div className="wa-voice-avatar-wrap">
                              <div className={`wa-voice-avatar-thumb ${isMine ? 'student' : (other.isSuper ? 'supervisor' : 'lecturer')}`} style={{ display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700, color: '#ffffff', background: isMine ? '#005c4b' : '#1e3a5f' }}>
                                {(isMine ? 'You' : other.name).slice(0, 2).toUpperCase()}
                              </div>
                              <div className="wa-voice-mic-badge">
                                <Mic size={9} />
                              </div>
                            </div>
                          </div>
                        ) : isAttachment ? (
                          /* Special Bubble Content: Document Attachment */
                          <div className="wa-attachment-card">
                            <div className="wa-attachment-icon">
                              <FileText size={20} />
                            </div>
                            <div>
                              <div className="wa-attachment-name">
                                {m.body.replace('📄 [Attached Document: ', '').replace(']', '')}
                              </div>
                              <span className="wa-attachment-sub">Academic PDF / Document • Tap to view</span>
                            </div>
                          </div>
                        ) : (
                          /* Standard Message Text */
                          <p className="wa-msg-text">
                            {m.body.startsWith('[Replying to')
                              ? m.body.slice(m.body.indexOf('\n') + 1)
                              : m.body}
                          </p>
                        )}

                        {/* Time & Delivery Ticks */}
                        <div className="wa-bubble-meta">
                          <span>{time}</span>
                          {isMine && (
                            m.read_at ? (
                              <span className="wa-tick-blue" title="Read">✓✓</span>
                            ) : (
                              <span className="wa-tick-grey" title="Delivered">✓✓</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {/* Quick Academic Reply Chips */}
            <div className="wa-quick-chips">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="wa-chip-btn"
                  onClick={() => {
                    setInputText(chip);
                    inputRef.current?.focus();
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Quoted Reply Preview Bar (above input when replying) */}
            {replyingTo && (
              <div className="wa-reply-preview-box">
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', display: 'block' }}>
                    Replying to {replyingTo.sender_user_id === currentUserId ? 'yourself' : other.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                    {replyingTo.body}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  style={{ border: 0, background: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Attachment Dropdown Menu */}
            {showAttachMenu && (
              <div style={{
                position: 'absolute',
                bottom: '68px',
                left: '16px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 10,
                border: '1px solid #e2e8f0',
                minWidth: '180px'
              }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    border: 0,
                    background: 'none',
                    fontSize: '13px',
                    color: '#0f172a',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FileText size={18} color="#0a2540" /> Document (.pdf, .docx)
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    border: 0,
                    background: 'none',
                    fontSize: '13px',
                    color: '#0f172a',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <ImageIcon size={18} color="#7c3aed" /> Photo / Diagram
                </button>
              </div>
            )}

            {/* Hidden native file input for attachments */}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
            />

            {/* Bottom Composer (WhatsApp Input Bar) */}
            <form onSubmit={handleSendAction} className="wa-composer">
              {/* Attach Button (+) */}
              <button
                type="button"
                className="wa-composer-action-btn"
                title="Attach"
                onClick={() => setShowAttachMenu(prev => !prev)}
              >
                <Plus size={22} />
              </button>

              {/* Emoji Smiley Button */}
              <button
                type="button"
                className="wa-composer-action-btn"
                title="Emoji"
                onClick={() => {
                  setInputText(prev => prev + ' 👍');
                  inputRef.current?.focus();
                }}
              >
                <Smile size={22} />
              </button>

              <div className="wa-input-pill">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  disabled={sending || recordingVoice}
                />
              </div>

              {/* Send or Voice Note Button */}
              {inputText.trim().length > 0 ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="wa-send-btn"
                  title="Send message"
                >
                  {sending ? <RefreshCw size={18} className="v-spin" /> : <Send size={18} />}
                </button>
              ) : (
                <button
                  type="button"
                  className={`wa-send-btn mic ${recordingVoice ? 'recording' : ''}`}
                  title="Voice message"
                  onClick={handleVoiceNoteClick}
                >
                  {recordingVoice ? <RefreshCw size={18} className="v-spin" /> : <Mic size={20} />}
                </button>
              )}
            </form>
          </main>
        ) : (
          /* Empty Standby State on Desktop (WhatsApp Web Dark Standby) */
          <div className="wa-empty-chat">
            <div className="wa-empty-illustration">
              <MessageSquare size={46} color="#00a884" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#e9edef', margin: '0 0 10px 0' }}>
              EduLink Messages & Consultations
            </h2>
            <p style={{ color: '#8696a0', fontSize: '13.5px', maxWidth: '420px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Send and receive messages with your lecturers and students. Real-time audio and video consultations are secured and restricted to registered modules.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#667781', fontSize: '12px' }}>
              <ShieldCheck size={14} color="#8696a0" /> End-to-end encrypted academic channel
            </div>
            <button
              type="button"
              onClick={() => {
                loadContacts();
                setShowNewModal(true);
              }}
              style={{
                background: '#0a2540',
                color: '#ffffff',
                border: 0,
                borderRadius: '10px',
                padding: '11px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={17} /> Start New Academic Chat
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. WORKING WEBRTC AUDIO & VIDEO CALL OVERLAY SCREEN */}
      {/* ============================================================ */}
      {activeCall && (
        <div className="wa-call-overlay">
          {/* If Video Call: Fullscreen Remote Video + Picture-in-Picture Self View */}
          {activeCall.type === 'video' && (
            <div className="wa-video-stage">
              {/* Remote Video Stream Element */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="wa-remote-video"
                style={{ display: isCameraOff ? 'none' : 'block' }}
              />

              {/* Remote Avatar Fallback if camera stream is waiting */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at center, #1e3a5f 0%, #061626 100%)',
                zIndex: 1
              }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: '#0a2540',
                  border: '4px solid #38bdf8',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '42px',
                  fontWeight: 800,
                  boxShadow: '0 15px 40px rgba(0,0,0,0.6)'
                }}>
                  {getSafeInitials(activeCall?.recipientName)}
                </div>
                <strong style={{ fontSize: '18px', color: '#ffffff', marginTop: '16px' }}>
                  {activeCall.recipientName}
                </strong>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {activeCall.moduleCode} • Live WebRTC Consultation
                </span>
              </div>

              {/* Local Picture-in-Picture (PIP) Self View */}
              <div className="wa-local-pip">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="wa-local-video"
                  style={{ display: isCameraOff ? 'none' : 'block' }}
                />
                {isCameraOff && (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontSize: '11px',
                    textAlign: 'center',
                    padding: '8px'
                  }}>
                    Camera off
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Call Top Header */}
          <div className="wa-call-header">
            <div className="wa-call-encrypted-tag">
              <ShieldCheck size={13} color="#86efac" /> WebRTC STUN/TURN Encrypted Consultation
            </div>
            <h2 className="wa-call-name">
              {activeCall.recipientName}
            </h2>
            <div className={`wa-call-status ${activeCall.status === 'calling' ? 'ringing' : ''}`}>
              {activeCall.status === 'calling'
                ? 'Ringing consultation line…'
                : `${activeCall.type === 'video' ? '📹 Video Call' : '📞 Voice Call'} • ${formatCallTimer(activeCall.duration)}`}
            </div>
          </div>

          {/* Center Content for Audio Call (Avatar + Live Waveform) */}
          {activeCall.type === 'audio' && (
            <div className="wa-call-avatar-wrap">
              <div className="wa-call-ripple" />
              <div className="wa-call-avatar">
                {getSafeInitials(activeCall?.recipientName)}
              </div>

              {/* Live Realtime Audio Frequency Bars */}
              <div className="wa-call-audio-visualizer">
                {audioBars.map((h, i) => (
                  <div
                    key={i}
                    className="wa-call-bar"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Call Control Buttons Dock */}
          <div className="wa-call-controls">
            {/* Mute Mic Button */}
            <button
              type="button"
              className={`wa-call-btn ${isMuted ? 'active' : ''}`}
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff size={22} color="#ef4444" /> : <Mic size={22} />}
            </button>

            {/* Video Camera Toggle (for video call) */}
            {activeCall.type === 'video' && (
              <>
                <button
                  type="button"
                  className={`wa-call-btn ${isCameraOff ? 'active' : ''}`}
                  onClick={handleToggleCamera}
                  title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isCameraOff ? <VideoOff size={22} color="#ef4444" /> : <Video size={22} />}
                </button>

                {/* Flip Camera (Front/Rear) */}
                <button
                  type="button"
                  className="wa-call-btn"
                  onClick={handleFlipCamera}
                  title="Switch Front/Rear Camera"
                >
                  <SwitchCamera size={22} />
                </button>

                {/* Fullscreen Video Toggle */}
                <button
                  type="button"
                  className="wa-call-btn"
                  onClick={handleToggleFullscreen}
                  title="Toggle Fullscreen"
                >
                  <Maximize2 size={22} />
                </button>
              </>
            )}

            {/* Speaker Toggle */}
            <button
              type="button"
              className={`wa-call-btn ${!isSpeakerOn ? 'active' : ''}`}
              onClick={() => {
                setIsSpeakerOn(prev => !prev);
                showToast(isSpeakerOn ? 'Speaker muted' : 'Speaker on');
              }}
              title={isSpeakerOn ? 'Speaker on' : 'Speaker muted'}
            >
              {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} color="#ef4444" />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              className="wa-call-btn end-call"
              onClick={() => handleEndCall(true, 'completed')}
              title="End consultation call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. INCOMING CALL SCREEN (Ringing Overlay with Accept/Decline) */}
      {/* ============================================================ */}
      {incomingCall && (
        <div className="wa-incoming-overlay">
          <div className="wa-incoming-card">
            <div className="wa-incoming-ripple-wrap">
              <div className="wa-incoming-ripple" />
              <div className="wa-incoming-avatar">
                {getSafeInitials(incomingCall?.callerName)}
              </div>
            </div>

            <h2 className="wa-incoming-title">{incomingCall.callerName}</h2>
            <p className="wa-incoming-sub">
              Incoming {incomingCall.type === 'video' ? '📹 Video' : '📞 Voice'} Consultation • {incomingCall.moduleCode}
            </p>

            <div className="wa-incoming-actions">
              {/* Decline Button */}
              <div className="wa-action-btn-wrap">
                <button
                  type="button"
                  className="wa-action-circle decline"
                  onClick={handleRejectIncomingCall}
                  title="Decline Call"
                >
                  <PhoneOff size={28} />
                </button>
                <span className="wa-action-label">Decline</span>
              </div>

              {/* Accept Button */}
              <div className="wa-action-btn-wrap">
                <button
                  type="button"
                  className="wa-action-circle accept"
                  onClick={handleAcceptIncomingCall}
                  title="Accept Call"
                >
                  {incomingCall.type === 'video' ? <Video size={28} /> : <Phone size={28} />}
                </button>
                <span className="wa-action-label">Accept</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. STRICT ACADEMIC AUTHORIZATION: NEW CHAT MODAL */}
      {/* ============================================================ */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6, 22, 38, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'grid',
          placeItems: 'center',
          padding: '20px',
          zIndex: 2500
        }}>
          <div style={{
            background: '#111b21',
            borderRadius: '16px',
            width: 'min(500px, 100%)',
            boxShadow: '0 25px 65px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            border: '1px solid rgba(134, 150, 160, 0.2)',
            color: '#e9edef'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#202c33',
              color: '#e9edef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={19} color="#00a884" />
                <strong style={{ fontSize: '16px', fontWeight: 600 }}>New Consultation & Class Chat</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                style={{ border: 0, background: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Academic Authorization Notice */}
            <div style={{
              background: '#182229',
              padding: '10px 18px',
              borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
              fontSize: '12px',
              color: '#ffd591',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span>
                <strong>Academic Network:</strong> Chat with your entire module class group (all registered classmates and lecturer) or start a direct consultation.
              </span>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleStartNewConversation} style={{ padding: '20px' }}>
              {/* 1. Academic Module Selection First */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e9edef', marginBottom: '6px' }}>
                  Registered Academic Module
                </label>
                <select
                  value={selectedModuleId}
                  onChange={e => {
                    const newModId = e.target.value;
                    setSelectedModuleId(newModId);
                    setSelectedRecipientId('group');
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a3942',
                    fontSize: '13.5px',
                    background: '#202c33',
                    color: '#e9edef',
                    outline: 'none'
                  }}
                >
                  {contacts.modules?.length ? (
                    contacts.modules.map(m => (
                      <option key={m.id} value={m.id}>
                        📚 {m.code} — {m.title}
                      </option>
                    ))
                  ) : (
                    <option value="">📚 Course Module</option>
                  )}
                </select>
              </div>

              {/* 2. Conversation Target Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e9edef', marginBottom: '6px' }}>
                  Conversation Target / Recipient
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={e => setSelectedRecipientId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a3942',
                    fontSize: '13.5px',
                    background: '#202c33',
                    color: '#e9edef',
                    outline: 'none'
                  }}
                >
                  <optgroup label="👥 Module Discussion Group">
                    <option value="group">
                      👥 Entire Class Group (All Students & Module Lecturer)
                    </option>
                  </optgroup>

                  {role === 'student' && contacts.lecturers?.length > 0 && (
                    <optgroup label="👨‍🏫 Module Lecturer / Supervisor">
                      {contacts.lecturers.map(l => (
                        <option key={l.id} value={`lecturer:${l.id}`}>
                          👨‍🏫 {l.full_name} ({l.lecturer_id || 'Lecturer'})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Classmates taking this module */}
                  {contacts.classmatesByModule && contacts.classmatesByModule[selectedModuleId]?.length > 0 && (
                    <optgroup label="🎓 Classmates in this Module">
                      {contacts.classmatesByModule[selectedModuleId].map(c => (
                        <option key={c.id} value={`student:${c.id}`}>
                          🎓 {c.full_name} ({c.student_id || 'Classmate'})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {role === 'lecturer' && contacts.students?.length > 0 && (
                    <optgroup label="🎓 Direct Student Consultation">
                      {contacts.students.map(s => (
                        <option key={s.id} value={`student:${s.id}`}>
                          🎓 {s.full_name} ({s.student_id || 'Student'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Initial Message Text */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e9edef', marginBottom: '6px' }}>
                  Initial Message / Question
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    isDissertationStudent
                      ? "Good morning Dr., I have updated Chapter 2 and would appreciate your review."
                      : "Good morning Sir, I have a question regarding the assignment."
                  }
                  value={newMsgText}
                  onChange={e => setNewMsgText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a3942',
                    fontSize: '13.5px',
                    resize: 'vertical',
                    background: '#202c33',
                    color: '#e9edef',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  disabled={modalBusy}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #2a3942',
                    background: '#202c33',
                    color: '#8696a0',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy || !newMsgText.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 0,
                    background: '#00a884',
                    color: '#111b21',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: modalBusy || !newMsgText.trim() ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0,168,132,0.4)'
                  }}
                >
                  {modalBusy ? <RefreshCw size={15} className="v-spin" /> : <Send size={15} />}
                  Start Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Info Modal */}
      {showContactInfo && activeConv && (
        <div className="wa-modal-overlay" onClick={() => setShowContactInfo(false)}>
          <div className="wa-modal-card" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-head">
              <h3>Contact Details</h3>
              <button
                type="button"
                onClick={() => setShowContactInfo(false)}
                className="wa-modal-close-btn"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="wa-contact-modal-body">
              {other.isGroup ? (
                <>
                  {/* Group Avatar */}
                  <div className="wa-contact-avatar-lg" style={{ background: '#00a884', color: '#ffffff', display: 'grid', placeItems: 'center' }}>
                    <Users size={36} />
                  </div>

                  {/* Name & Role */}
                  <div className="wa-contact-name-lg">{other.name}</div>
                  <div className="wa-contact-role-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                    <Users size={13} />
                    <span>Module Discussion Group</span>
                  </div>

                  {/* Group Details Card */}
                  <div className="wa-contact-details-box" style={{ marginTop: '14px' }}>
                    <div className="wa-contact-detail-row">
                      <div className="wa-contact-detail-icon">
                        <BookOpen size={16} />
                      </div>
                      <div className="wa-contact-detail-content">
                        <span className="wa-contact-detail-label">Associated Module</span>
                        <span className="wa-contact-detail-value">
                          {other.code} {other.moduleTitle ? `— ${other.moduleTitle}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="wa-contact-detail-row">
                      <div className="wa-contact-detail-icon">
                        <GraduationCap size={16} />
                      </div>
                      <div className="wa-contact-detail-content">
                        <span className="wa-contact-detail-label">Course Lecturer</span>
                        <span className="wa-contact-detail-value">
                          {other.lecturerName || 'Assigned Module Faculty'}
                        </span>
                      </div>
                    </div>

                    <div className="wa-contact-detail-row">
                      <div className="wa-contact-detail-icon">
                        <Users size={16} />
                      </div>
                      <div className="wa-contact-detail-content">
                        <span className="wa-contact-detail-label">Class Membership</span>
                        <span className="wa-contact-detail-value">
                          All registered students taking {other.code} & Lecturer
                        </span>
                      </div>
                    </div>

                    <div className="wa-contact-detail-row">
                      <div className="wa-contact-detail-icon">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="wa-contact-detail-content">
                        <span className="wa-contact-detail-label">Channel Purpose</span>
                        <span className="wa-contact-detail-value" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                          Official module forum for academic discussion, exam revision, questions, and announcements between students and the lecturer.
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Profile Avatar */}
                  <div className={`wa-contact-avatar-lg ${other.isClassmate ? 'classmate' : ''}`}>
                    {(other.name || 'U').slice(0, 2).toUpperCase()}
                  </div>

                  {/* Name & Role */}
                  <div className="wa-contact-name-lg">{other.name}</div>
                  <div className="wa-contact-role-badge">
                    <GraduationCap size={13} />
                    <span>{other.roleTag}</span>
                  </div>

                  {/* Quick Actions (Audio call, Video call, Email) */}
                  <div className="wa-contact-actions-row" style={{ marginBottom: '18px' }}>
                    <button
                      type="button"
                      className="wa-contact-action-call-btn"
                      onClick={() => {
                        setShowContactInfo(false);
                        handleStartCall('audio');
                      }}
                      title="Start Voice Call"
                    >
                      <Phone size={15} color="#00a884" />
                      <span>Voice Call</span>
                    </button>
                    <button
                      type="button"
                      className="wa-contact-action-call-btn"
                      onClick={() => {
                        setShowContactInfo(false);
                        handleStartCall('video');
                      }}
                      title="Start Video Call"
                    >
                      <Video size={15} color="#3b82f6" />
                      <span>Video Call</span>
                    </button>
                    {other.email && (
                      <a
                        href={`mailto:${other.email}`}
                        className="wa-contact-action-call-btn"
                        style={{ textDecoration: 'none' }}
                        title={`Email ${other.name}`}
                      >
                        <Mail size={15} color="#6366f1" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  {/* Contact Details Card */}
                  <div className="wa-contact-details-box">
                    {/* Associated Module */}
                    <div className="wa-contact-detail-row">
                      <div className="wa-contact-detail-icon">
                        <BookOpen size={16} />
                      </div>
                      <div className="wa-contact-detail-content">
                        <span className="wa-contact-detail-label">Associated Module</span>
                        <span className="wa-contact-detail-value">
                          {other.code} {other.moduleTitle ? `— ${other.moduleTitle}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Student ID / Lecturer ID */}
                    {other.identifier && (
                      <div className="wa-contact-detail-row">
                        <div className="wa-contact-detail-icon">
                          <ShieldCheck size={16} />
                        </div>
                        <div className="wa-contact-detail-content">
                          <span className="wa-contact-detail-label">
                            {role === 'lecturer' ? 'Student ID' : 'Lecturer / Student ID'}
                          </span>
                          <span className="wa-contact-detail-value" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                            {other.identifier}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Email Address */}
                    {other.email && (
                      <div className="wa-contact-detail-row">
                        <div className="wa-contact-detail-icon">
                          <Mail size={16} />
                        </div>
                        <div className="wa-contact-detail-content">
                          <span className="wa-contact-detail-label">Email Address</span>
                          <a
                            href={`mailto:${other.email}`}
                            className="wa-contact-detail-value"
                            style={{ color: '#1d4ed8', textDecoration: 'none' }}
                          >
                            {other.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Phone Number */}
                    {other.phone && (
                      <div className="wa-contact-detail-row">
                        <div className="wa-contact-detail-icon">
                          <Phone size={16} />
                        </div>
                        <div className="wa-contact-detail-content">
                          <span className="wa-contact-detail-label">Phone Number</span>
                          <a
                            href={`tel:${other.phone}`}
                            className="wa-contact-detail-value"
                            style={{ color: '#1d4ed8', textDecoration: 'none' }}
                          >
                            {other.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Programme or Department */}
                    {(other.programme || other.department) && (
                      <div className="wa-contact-detail-row">
                        <div className="wa-contact-detail-icon">
                          <GraduationCap size={16} />
                        </div>
                        <div className="wa-contact-detail-content">
                          <span className="wa-contact-detail-label">
                            {role === 'lecturer' ? 'Academic Programme' : 'Department'}
                          </span>
                          <span className="wa-contact-detail-value">
                            {other.programme || other.department}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowContactInfo(false)}
                className="wa-contact-done-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
