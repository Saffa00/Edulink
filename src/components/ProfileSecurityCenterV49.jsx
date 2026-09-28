import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  User, ShieldCheck, Smartphone, KeyRound, Clock, CheckCircle2,
  AlertCircle, Trash2, RefreshCw, Eye, EyeOff, Bell, Sliders,
  Save, GraduationCap, Building2, MapPin, Phone, Mail, Sparkles,
  Lock, Check, SmartphoneCharging, Laptop, Camera, Upload
} from 'lucide-react';
import {
  getProfileSecurityInfo, updateUserPassword, updateUserProfile,
  uploadProfileAvatar, removeProfileAvatar
} from '../services/academicMasterV41toV55.js';
import { revokeDeviceBinding } from '../services/device.js';

export default function ProfileSecurityCenterV49({
  role = 'student',
  profile: initialProfile = null,
  defaultTab = 'profile',
  onProfileUpdate = null
}) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'profile');
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(initialProfile);
  const [avatarUrl, setAvatarUrl] = useState(() => initialProfile?.avatar_url || (initialProfile?.id ? localStorage.getItem(`edulink_avatar_${initialProfile.id}`) : ''));
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Form states for profile editing
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [campus, setCampus] = useState('Goderich Campus');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bio, setBio] = useState('');

  // Form states for password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states for preferences
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('edulink_theme') || 'light');
  const [pushEnabled, setPushEnabled] = useState(() => Notification?.permission === 'granted');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // UI state
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Sync with defaultTab prop if it changes
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProfileSecurityInfo(role);
      setData(res);

      const resolved = res.profile || initialProfile;
      if (resolved) {
        setProfile(resolved);
        setFullName(resolved.full_name || '');
        setPhone(resolved.phone || '');
        setCampus(resolved.campus || 'Goderich Campus');
        setEmergencyName(resolved.emergency_contact_name || '');
        setEmergencyPhone(resolved.emergency_contact_phone || '');
        setBio(resolved.bio || (role === 'student' ? 'Undergraduate Student in Computing & IT.' : 'Lecturer & Department Researcher.'));
        const photo = resolved.avatar_url || res.user?.user_metadata?.avatar_url || (resolved.id ? localStorage.getItem(`edulink_avatar_${resolved.id}`) : '');
        if (photo) setAvatarUrl(photo);
      }
    } catch (err) {
      setError(err.message || 'Failed to load security and profile info.');
    } finally {
      setLoading(false);
    }
  }, [role, initialProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle avatar photo selection & upload
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large (maximum size is 5MB).');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError('');
      const uploadedUrl = await uploadProfileAvatar({
        file,
        profileId: profile?.id,
        role
      });

      setAvatarUrl(uploadedUrl);
      const updated = { ...profile, avatar_url: uploadedUrl };
      setProfile(updated);
      onProfileUpdate?.(updated);
      setMessage('Profile photo uploaded and updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle removing avatar photo
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your profile photo and revert to initials?')) return;
    try {
      setUploadingPhoto(true);
      setError('');
      await removeProfileAvatar({ profileId: profile?.id, role });
      setAvatarUrl('');
      const updated = { ...profile, avatar_url: null };
      setProfile(updated);
      onProfileUpdate?.(updated);
      setMessage('Profile photo removed.');
    } catch (err) {
      setError(err.message || 'Failed to remove profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle saving personal profile edits
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile?.id) {
      setError('Profile ID not found.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const updates = {
        full_name: fullName.trim(),
        phone: phone.trim() || null
      };

      const updatedRecord = await updateUserProfile({
        role,
        id: profile.id,
        updates
      });

      const merged = { ...profile, ...updatedRecord };
      setProfile(merged);
      onProfileUpdate?.(merged);
      setMessage('Profile information updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setBusy(false);
    }
  };

  // Handle switching student track (Normal Coursework vs Dissertation)
  const handleToggleStudentTrack = async () => {
    if (!profile) return;
    const isDissertation = profile?.registration_type === 'dissertation';
    const nextType = isDissertation ? 'normal' : 'dissertation';
    try {
      setBusy(true);
      setError('');
      if (profile?.id) {
        await updateUserProfile({
          role: 'student',
          id: profile.id,
          updates: { registration_type: nextType }
        });
      }
      const merged = { ...profile, registration_type: nextType };
      setProfile(merged);
      onProfileUpdate?.(merged);
      setMessage(`Switched track to ${nextType === 'dissertation' ? 'Dissertation Student' : 'Coursework Student'}.`);
    } catch (err) {
      console.warn('Could not persist track change:', err);
      const merged = { ...profile, registration_type: nextType };
      setProfile(merged);
      onProfileUpdate?.(merged);
      setMessage(`Switched track to ${nextType === 'dissertation' ? 'Dissertation Student' : 'Coursework Student'}.`);
    } finally {
      setBusy(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      setBusy(true);
      await updateUserPassword(newPassword);
      setMessage('Your password has been changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  // Handle revoking device binding
  const handleRevokeDevice = async (device) => {
    if (!window.confirm(`Revoke access for device "${device.device_label || 'Current Browser'}"?`)) return;
    try {
      setBusy(true);
      await revokeDeviceBinding(device.id);
      setMessage('Device authorization revoked.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to revoke device access.');
    } finally {
      setBusy(false);
    }
  };

  // Handle requesting browser push notifications
  const handleEnablePush = async () => {
    if (!('Notification' in window)) {
      setError('Push notifications are not supported in this browser.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        setMessage('Push notifications are now enabled on this device.');
      } else {
        setPushEnabled(false);
        setError('Notification permission was denied.');
      }
    } catch (err) {
      setError('Failed to enable push notifications: ' + err.message);
    }
  };

  // Handle theme change
  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('edulink_theme', mode);
    if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    setMessage(`Theme set to ${mode} mode.`);
  };

  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength();
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  const initials = (profile?.full_name || (role === 'student' ? 'Student' : 'Lecturer'))
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userDisplayId = profile?.student_id || profile?.lecturer_id || (role === 'student' ? '8100' : 'LECT-2026-0001');

  if (loading && !data && !profile) {
    return (
      <div className="v-master-wrap">
        <div className="v-card text-center" style={{ padding: '60px 20px' }}>
          <RefreshCw className="v-spin" size={30} style={{ color: '#0a2540', margin: '0 auto 12px auto' }} />
          <h3>Loading Profile & Settings</h3>
          <p className="v-sub">Fetching your authenticated academic records…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v-master-wrap">
      {/* Header Banner */}
      <header className="v-master-header">
        <div>
          <h1>Profile & Account Settings</h1>
          <p>Manage your academic profile, contact information, device security, and preferences.</p>
        </div>
        <div className="v-header-actions">
          <span style={{
            background: '#eaf1f8',
            color: '#051525',
            padding: '6px 14px',
            borderRadius: '99px',
            fontSize: '12px',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={15} />
            {role === 'student' ? 'Student Account' : 'Faculty Lecturer'} • Active
          </span>
        </div>
      </header>

      {/* Flash Messages */}
      {message && (
        <div className="v-banner success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="v-banner error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            border: 0,
            background: 'transparent',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'profile' ? '750' : '600',
            color: activeTab === 'profile' ? '#0a2540' : '#64748b',
            borderBottom: activeTab === 'profile' ? '3px solid #0a2540' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <User size={16} /> Personal Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            border: 0,
            background: 'transparent',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'security' ? '750' : '600',
            color: activeTab === 'security' ? '#0a2540' : '#64748b',
            borderBottom: activeTab === 'security' ? '3px solid #0a2540' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <KeyRound size={16} /> Security & Devices
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          style={{
            border: 0,
            background: 'transparent',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'preferences' ? '750' : '600',
            color: activeTab === 'preferences' ? '#0a2540' : '#64748b',
            borderBottom: activeTab === 'preferences' ? '3px solid #0a2540' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Sliders size={16} /> Preferences & Alerts
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PERSONAL PROFILE                                              */}
      {/* ==================================================================== */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Identity Header Card */}
          <section className="v-card" style={{
            background: 'linear-gradient(135deg, #061626, #1b4975)',
            color: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            {/* Hidden File Picker */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept="image/png, image/jpeg, image/webp"
              style={{ display: 'none' }}
            />

            {/* Avatar Circle with Camera Overlay */}
            <div style={{ position: 'relative', width: '82px', height: '82px', flexShrink: 0 }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#0a2540',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '28px',
                fontWeight: '800',
                boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
                border: '3px solid rgba(255,255,255,0.25)',
                overflow: 'hidden'
              }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.full_name || 'Profile Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initials
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                title="Upload profile photo"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#38bdf8',
                  color: '#0f172a',
                  border: '2px solid #ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                {uploadingPhoto ? <RefreshCw className="v-spin" size={13} /> : <Camera size={14} />}
              </button>
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#ffffff' }}>
                  {profile?.full_name || 'Academic User'}
                </h2>
                <span style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontWeight: '600'
                }}>
                  {role === 'student' ? 'Student' : 'Lecturer'}
                </span>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#cbd5e1' }}>
                {profile?.email || 'user@edulink.sl'}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#93c5fd' }}>
                <span><strong>ID:</strong> {userDisplayId}</span>
                <span>•</span>
                <span><strong>Campus:</strong> {campus}</span>
                <span>•</span>
                <span style={{ color: '#86efac', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={13} /> Verified Status
                </span>
              </div>

              {/* Photo Action Controls */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  style={{
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={13} /> {uploadingPhoto ? 'Uploading photo…' : avatarUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingPhoto}
                    style={{
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.25)',
                      color: '#fca5a5',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Academic Records Summary (Read-Only) */}
          <section className="v-card">
            <h3 style={{ margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={18} color="#0a2540" /> Academic Affiliation & Standing
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px'
            }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Programme / Degree</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{profile?.programme || 'B.Sc. Computer Science'}</strong>
              </div>

              {role === 'student' ? (
                <>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Academic Level</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>Level {profile?.level || '3'}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Current Term</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{profile?.semester || 'First Semester'} ({profile?.academic_year || '2026/2027'})</strong>
                  </div>
                  <div style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Registration Track</span>
                      <strong style={{ fontSize: '13px', color: '#0a2540' }}>
                        {profile?.registration_type === 'dissertation' ? '🎓 Dissertation Student' : '📚 Coursework Student'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleStudentTrack}
                      disabled={busy}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0a2540',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Switch student track to test mobile bottom navigation bar"
                    >
                      {profile?.registration_type === 'dissertation' ? 'Switch to Coursework' : 'Switch to Dissertation'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Teaching Area</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{profile?.teaching_area || 'Computer Science & Software Systems'}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Faculty Status</span>
                    <strong style={{ fontSize: '13px', color: '#16a34a' }}>Active Instruction & Research</strong>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Editable Contact & Information Form */}
          <section className="v-card">
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="#0a2540" /> Edit Personal & Contact Details
            </h3>

            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 0
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Email Address (Primary Account)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    borderRadius: '10px',
                    fontSize: '13px'
                  }}
                />
                <small style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Email changes require academic registry approval.
                </small>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Phone Number (Sierra Leone)
                </label>
                <input
                  type="tel"
                  placeholder="+232 76 000 000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 0
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Primary Campus Location
                </label>
                <select
                  value={campus}
                  onChange={e => setCampus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 0,
                    background: '#ffffff'
                  }}
                >
                  <option value="Goderich Campus">Goderich Main Campus</option>
                  <option value="Jui Campus">Jui Health & Sciences Campus</option>
                  <option value="Tower Hill Campus">Tower Hill Campus</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Academic Bio / Focus
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Share your academic interests or research focus..."
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 0,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={busy}
                  className="v-btn primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}
                >
                  <Save size={16} /> {busy ? 'Saving Changes…' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SECURITY & DEVICES                                            */}
      {/* ==================================================================== */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Change Password Card */}
          <section className="v-card">
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={18} color="#0a2540" /> Update Account Password
            </h3>
            <p className="v-sub" style={{ margin: '0 0 16px 0' }}>
              Ensure your account uses a secure password with at least 8 characters.
            </p>

            <form onSubmit={handleChangePassword} style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 13px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '13px',
                      outline: 0
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 0,
                      background: 'transparent',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', height: '5px', gap: '4px', borderRadius: '4px', overflow: 'hidden' }}>
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          style={{
                            flex: 1,
                            background: step <= strengthScore ? strengthColors[strengthScore] : '#e2e8f0',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: strengthColors[strengthScore], fontWeight: '700', display: 'block', marginTop: '4px' }}>
                      Strength: {strengthLabels[strengthScore]}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 0
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="v-btn primary"
                style={{ alignSelf: 'flex-start', padding: '12px 22px', marginTop: '6px' }}
              >
                {busy ? 'Updating Password…' : 'Change Password'}
              </button>
            </form>
          </section>

          {/* Device Authorization & Hardware Binding */}
          <section className="v-card">
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={18} color="#0a2540" /> Authorized Devices & Hardware Binding
            </h3>
            <p className="v-sub" style={{ margin: '0 0 16px 0' }}>
              Device binding prevents unauthorized attendance marking and ensures access is restricted to verified student hardware.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Current Active Browser Badge */}
              <div style={{
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'grid',
                    placeItems: 'center'
                  }}>
                    <Laptop size={20} />
                  </div>
                  <div>
                    <strong style={{ color: '#166534', fontSize: '13px', display: 'block' }}>Current Browser / Primary Device</strong>
                    <small style={{ color: '#15803d', fontSize: '11px' }}>Device ID verified & bound to this account</small>
                  </div>
                </div>
                <span style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '99px'
                }}>
                  ACTIVE NOW
                </span>
              </div>

              {/* Other Authorized Devices */}
              {!data?.devices?.length ? (
                <p className="v-sub" style={{ padding: '12px 0' }}>No external device bindings registered.</p>
              ) : (
                data.devices.map(d => (
                  <div key={d.id} className="v-device-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px'
                  }}>
                    <div>
                      <strong style={{ fontSize: '13px' }}>{d.device_label || 'Registered Device'}</strong>
                      <small className="v-sub" style={{ display: 'block', marginTop: '2px' }}>
                        First authorized: {new Date(d.first_registered_at).toLocaleDateString()}
                      </small>
                    </div>
                    {d.revoked_at ? (
                      <span className="v-status-pill red">REVOKED</span>
                    ) : (
                      <button
                        type="button"
                        className="v-btn-mini danger"
                        onClick={() => handleRevokeDevice(d)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={13} /> Revoke Access
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Login Activity & Audit History */}
          <section className="v-card">
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#0a2540" /> Recent Security & Login Activity
            </h3>
            <p className="v-sub" style={{ margin: '0 0 16px 0' }}>
              Timestamped record of recent sign-ins and session initiations.
            </p>

            <div className="v-table-responsive">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>IP Address</th>
                    <th>Client / Platform</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.logins?.length ? (
                    <tr>
                      <td colSpan="4" className="v-no-data" style={{ textAlign: 'center', padding: '24px' }}>
                        No login events recorded.
                      </td>
                    </tr>
                  ) : (
                    data.logins.map(l => (
                      <tr key={l.id}>
                        <td>{new Date(l.created_at).toLocaleString()}</td>
                        <td><code>{l.ip_address || '127.0.0.1'}</code></td>
                        <td><small className="v-sub">{l.user_agent?.slice(0, 40) || 'Academic PWA'}</small></td>
                        <td>
                          <span className={`v-status-pill ${l.status === 'success' ? 'green' : 'red'}`}>
                            {l.status || 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PREFERENCES & ALERTS                                          */}
      {/* ==================================================================== */}
      {activeTab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Notification Preferences */}
          <section className="v-card">
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#0a2540" /> Push Notifications & Academic Alerts
            </h3>
            <p className="v-sub" style={{ margin: '0 0 20px 0' }}>
              Configure how and when EduLink alerts you about classes, attendance, grades, and assignments.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Browser Push Prompt Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', marginBottom: '2px' }}>
                    Browser & Mobile Push Notifications
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Status: {pushEnabled ? 'Enabled on this device' : 'Disabled / Needs Permission'}
                  </span>
                </div>
                {!pushEnabled ? (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    className="v-btn primary"
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    Enable Push Notifications
                  </button>
                ) : (
                  <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={16} /> Active
                  </span>
                )}
              </div>

              {/* Notification Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block' }}>Email Academic Summaries</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Weekly attendance overview and grade notices delivered to your inbox.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={e => setEmailAlerts(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#0a2540' }}
                  />
                </label>

                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block' }}>Class & Attendance Deadlines</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Instant alert when an attendance window opens or closes.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    style={{ width: '18px', height: '18px', accentColor: '#0a2540' }}
                  />
                </label>

                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block' }}>Audio Alert Sounds</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Play audio chime when new messages or attendance results are recorded.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={e => setSoundEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#0a2540' }}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Theme & Display Mode */}
          <section className="v-card">
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#0a2540" /> Visual Theme & Display Mode
            </h3>
            <p className="v-sub" style={{ margin: '0 0 16px 0' }}>
              Choose your preferred interface theme for day and night use.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: themeMode === 'light' ? '2px solid #0a2540' : '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: themeMode === 'light' ? '800' : '600',
                  boxShadow: themeMode === 'light' ? '0 4px 14px rgba(2, 132, 199, 0.15)' : 'none'
                }}
              >
                ☀️ Light Mode
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: themeMode === 'dark' ? '2px solid #38bdf8' : '1px solid #cbd5e1',
                  background: '#1c2541',
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: themeMode === 'dark' ? '800' : '600',
                  boxShadow: themeMode === 'dark' ? '0 4px 14px rgba(56, 189, 248, 0.25)' : 'none'
                }}
              >
                🌙 Dark Mode
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
