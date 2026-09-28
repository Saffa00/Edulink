import { supabase } from './supabase.js';

export const GOOGLE_STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

// Record a new outgoing call in backend / Supabase
export async function initiateCallRecord({
  conversationId,
  receiverUserId,
  callerName,
  receiverName,
  callType = 'audio',
  moduleCode = 'Academic Consultation'
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId,
          receiverUserId,
          callerName,
          receiverName,
          callType,
          moduleCode
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.call;
      }
    } catch (err) {
      console.warn('API call initiate fallback:', err.message);
    }
  }

  return {
    id: `call_${Date.now()}`,
    conversation_id: conversationId,
    caller_name: callerName,
    receiver_name: receiverName,
    call_type: callType,
    module_code: moduleCode,
    status: 'initiated',
    started_at: new Date().toISOString()
  };
}

// Update call status (completed, missed, rejected, duration)
export async function updateCallRecordStatus({ callId, status, durationSeconds = 0 }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token && callId) {
    try {
      const res = await fetch('/api/calls/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ callId, status, durationSeconds })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API update call status error:', err.message);
    }
  }
}

// Fetch call history
export async function getCallHistory() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    try {
      const res = await fetch('/api/calls/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        return json.calls || [];
      }
    } catch (err) {
      console.warn('API call history error:', err.message);
    }
  }

  return [];
}

// Web Audio API Ringtone Generator (Pure browser synthesis, no external assets needed!)
let ringtoneAudioContext = null;
let ringtoneInterval = null;

export function playRingtone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!ringtoneAudioContext) {
      ringtoneAudioContext = new AudioContextClass();
    }

    if (ringtoneAudioContext.state === 'suspended') {
      ringtoneAudioContext.resume();
    }

    const playChime = () => {
      if (!ringtoneAudioContext) return;
      const now = ringtoneAudioContext.currentTime;

      // Note 1
      const osc1 = ringtoneAudioContext.createOscillator();
      const gain1 = ringtoneAudioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ringtoneAudioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2
      const osc2 = ringtoneAudioContext.createOscillator();
      const gain2 = ringtoneAudioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(554.37, now + 0.15); // C#5
      osc2.frequency.exponentialRampToValueAtTime(1108, now + 0.45);
      gain2.gain.setValueAtTime(0.12, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ringtoneAudioContext.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    };

    playChime();
    ringtoneInterval = setInterval(playChime, 2500);
  } catch (e) {
    console.warn('Ringtone error:', e);
  }
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

// WebRTC RTCPeerConnection factory
export function createWebRTCPeerConnection({
  onTrack,
  onIceCandidate,
  onConnectionStateChange
}) {
  const pc = new RTCPeerConnection(GOOGLE_STUN_SERVERS);

  if (onIceCandidate) {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };
  }

  if (onTrack) {
    pc.ontrack = (event) => {
      onTrack(event.streams[0] || new MediaStream([event.track]));
    };
  }

  if (onConnectionStateChange) {
    pc.onconnectionstatechange = () => {
      onConnectionStateChange(pc.connectionState);
    };
  }

  return pc;
}
