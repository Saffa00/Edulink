import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, MapPin, Plus, RefreshCw, CheckCircle2, AlertCircle,
  BookOpen, Trash2, X, LayoutGrid, ListFilter, DoorOpen, Ban, AlertTriangle
} from 'lucide-react';
import {
  getWeeklyTimetable,
  createScheduleSlot,
  deleteScheduleSlot,
  OFFICIAL_CAMPUSES,
  formatCampusName,
  detectTimetableConflictsLocal,
  cancelClassSlotDate
} from '../services/academicMasterV41toV55.js';
import { getLecturerModules } from '../services/attendanceV39.js';

export default function TimetableManagementV43({
  role = 'lecturer',
  scopedModule = null,
  campusFilter = 'all'
}) {
  const [allSchedules, setAllSchedules] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'today'

  const [form, setForm] = useState({
    module_id: scopedModule?.id || '',
    campus_id: campusFilter && campusFilter !== 'all' ? campusFilter : 'goderich',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '11:00',
    location_name: 'Room 201',
    room_code: 'R-201'
  });

  useEffect(() => {
    if (scopedModule?.id) {
      setForm(f => ({ ...f, module_id: scopedModule.id }));
    }
  }, [scopedModule]);

  useEffect(() => {
    if (campusFilter && campusFilter !== 'all') {
      setForm(f => ({ ...f, campus_id: campusFilter }));
    }
  }, [campusFilter]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const todayName = useMemo(() => {
    const dayIndex = new Date().getDay();
    const map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return map[dayIndex] || 'Monday';
  }, []);

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5500);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getWeeklyTimetable(role, 'all');
      setAllSchedules(list || []);

      if (role === 'lecturer') {
        const m = await getLecturerModules();
        setModules(m || []);
        if (m && m.length > 0) {
          setForm(f => ({ ...f, module_id: f.module_id || m[0].id }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered schedules based on Lecturer Campus Switcher (while keeping allSchedules for cross-campus conflict detection)
  const schedules = useMemo(() => {
    if (role !== 'lecturer' || !campusFilter || campusFilter === 'all') {
      return allSchedules;
    }
    return allSchedules.filter(s => {
      const slotCampus = s.campus_id || (s.location_name || '').toLowerCase();
      if (slotCampus === campusFilter) return true;
      if (campusFilter === 'congo-cross' && String(slotCampus).includes('congo')) return true;
      if (campusFilter === 'brookfields' && String(slotCampus).includes('brook')) return true;
      if (campusFilter === 'goderich' && (!s.campus_id || String(slotCampus).includes('goderich'))) return true;
      return false;
    });
  }, [allSchedules, campusFilter, role]);

  // Task 3.4: Live detection of direct overlaps and back-to-back classes at different campuses (< 45 min)
  const conflictWarnings = useMemo(() => {
    if (!showAddForm || role !== 'lecturer') return [];
    return detectTimetableConflictsLocal(allSchedules, form);
  }, [allSchedules, form, showAddForm, role]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!form.module_id && role === 'lecturer' && modules.length > 0) {
      form.module_id = modules[0].id;
    }

    if (conflictWarnings.length > 0) {
      const hasHardOverlap = conflictWarnings.some(w => w.type === 'overlap');
      const promptMsg = hasHardOverlap
        ? `${conflictWarnings.map(w => w.message).join('\n')}\n\nProceed anyway?`
        : `${conflictWarnings.map(w => w.message).join('\n')}\n\nDo you still want to schedule this back-to-back cross-campus slot?`;
      if (!window.confirm(promptMsg)) return;
    }

    try {
      setActionBusy(true);
      await createScheduleSlot(form);
      setMessage(
        `Lecture slot for ${form.day_of_week} (${form.start_time} - ${form.end_time}) at ${formatCampusName(form.campus_id)} created.`
      );
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create schedule slot.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteSlot = async (slotId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this lecture schedule slot?')) {
      return;
    }

    try {
      setActionBusy(true);
      await deleteScheduleSlot(slotId);
      setMessage('Schedule slot removed.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete schedule slot.');
    } finally {
      setActionBusy(false);
    }
  };

  // Task 5.6: Cancel a class date and push immediate notice "<module> at <time> is cancelled"
  const handleCancelClassDate = async (slot, e) => {
    e.stopPropagation();
    const todayIso = new Date().toISOString().slice(0, 10);
    const modCode = slot.modules?.code || 'Module';
    const timeStr = (slot.start_time || '').slice(0, 5);
    const reason = window.prompt(
      `Cancel ${modCode} at ${timeStr} for date (${todayIso})?\nEnrolled students will immediately receive: "${modCode} at ${timeStr} is cancelled".\n\nOptional reason:`,
      'Lecturer unavailable'
    );
    if (reason === null) return;

    try {
      setActionBusy(true);
      await cancelClassSlotDate({
        timetableId: slot.id,
        classDate: todayIso,
        reason: reason.trim() || 'Cancelled by lecturer'
      });
      setMessage(`"${modCode} at ${timeStr} is cancelled" notice sent to enrolled students for ${todayIso}.`);
    } catch (err) {
      setError(err.message || 'Failed to cancel class date.');
    } finally {
      setActionBusy(false);
    }
  };

  const stats = useMemo(() => {
    const totalSlots = schedules.length;
    const uniqueModules = new Set(schedules.map(s => s.modules?.code || s.module_id)).size;
    const uniqueVenues = new Set(schedules.map(s => s.location_name)).size;

    let totalMinutes = 0;
    schedules.forEach(s => {
      if (s.start_time && s.end_time) {
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) totalMinutes += diff;
      }
    });
    const weeklyHours = (totalMinutes / 60).toFixed(1);

    return { totalSlots, uniqueModules, uniqueVenues, weeklyHours };
  }, [schedules]);

  if (loading) {
    return (
      <div className="v-master-wrap">
        <div className="v-card text-center" style={{ padding: '60px 20px' }}>
          <RefreshCw className="v-spin" size={28} style={{ margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--v-text-muted)', fontSize: '0.9rem' }}>Loading academic timetable…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v-master-wrap">
      {/* Page Header */}
      <header className="v-master-header">
        <div>
          <h1>Timetable & Class Schedule</h1>
          <p>
            {role === 'lecturer'
              ? `Organize your weekly recurring lecture periods across campuses (${formatCampusName(campusFilter)}).`
              : 'Personalized weekly schedule for your campus and enrolled coursework modules.'}
          </p>
        </div>
        <div className="v-header-actions">
          {role === 'lecturer' && (
            <button
              type="button"
              className="v-btn primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? <X size={16} /> : <Plus size={16} />}
              {showAddForm ? 'Cancel' : 'Add Class Slot'}
            </button>
          )}
          <button
            type="button"
            className="v-btn secondary"
            onClick={loadData}
            title="Refresh timetable"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {/* Notifications / Alerts */}
      {message && (
        <div className="v-banner success">
          <CheckCircle2 size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="v-banner error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Top Summary Metrics Bar */}
      <section className="v-timetable-stats" aria-label="Timetable summary statistics">
        <div className="v-timetable-stat-card">
          <div className="v-timetable-stat-icon">
            <Calendar size={20} />
          </div>
          <div className="v-timetable-stat-info">
            <strong>{stats.totalSlots}</strong>
            <span>Weekly Classes</span>
          </div>
        </div>

        <div className="v-timetable-stat-card">
          <div className="v-timetable-stat-icon" style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
            <Clock size={20} />
          </div>
          <div className="v-timetable-stat-info">
            <strong>{stats.weeklyHours}h</strong>
            <span>Weekly Teaching Hours</span>
          </div>
        </div>

        <div className="v-timetable-stat-card">
          <div className="v-timetable-stat-icon" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' }}>
            <BookOpen size={20} />
          </div>
          <div className="v-timetable-stat-info">
            <strong>{stats.uniqueModules}</strong>
            <span>Active Modules</span>
          </div>
        </div>

        <div className="v-timetable-stat-card">
          <div className="v-timetable-stat-icon" style={{ background: 'rgba(5, 150, 105, 0.08)', color: '#059669' }}>
            <DoorOpen size={20} />
          </div>
          <div className="v-timetable-stat-info">
            <strong>{stats.uniqueVenues}</strong>
            <span>Lecture Venues</span>
          </div>
        </div>
      </section>

      {/* Structured "Add Class Slot" Form Card */}
      {showAddForm && role === 'lecturer' && (
        <section className="v-timetable-form-card" aria-label="Add Class Slot Form">
          <div className="v-form-head">
            <div>
              <h3>Add Lecture Schedule Slot</h3>
              <p>Set a recurring weekly teaching period, campus, and lecture hall location.</p>
            </div>
            <button
              type="button"
              className="v-slot-del-btn"
              onClick={() => setShowAddForm(false)}
              title="Close form"
            >
              <X size={18} />
            </button>
          </div>

          {/* Task 3.4: Live Overlap & Back-to-Back Cross-Campus Warning */}
          {conflictWarnings.length > 0 && (
            <div
              role="alert"
              style={{
                margin: '0 0 14px 0',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fffbeb',
                border: '1px solid #f59e0b',
                color: '#92400e',
                fontSize: '0.84rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
                <AlertTriangle size={16} color="#d97706" />
                Timetable Conflict / Cross-Campus Travel Warning
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {conflictWarnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleCreateSlot} className="v-form-grid">
            {/* Field 1: Campus Select */}
            <div className="v-form-group">
              <label>
                <MapPin size={15} color="#2563eb" /> Teaching Campus
              </label>
              <select
                value={form.campus_id}
                onChange={e => setForm({ ...form, campus_id: e.target.value })}
                required
              >
                {OFFICIAL_CAMPUSES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 2: Module Select */}
            <div className="v-form-group">
              <label>
                <BookOpen size={15} color="#2563eb" /> Coursework Module
              </label>
              <select
                value={form.module_id}
                onChange={e => setForm({ ...form, module_id: e.target.value })}
                required
              >
                {modules.length ? (
                  modules.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))
                ) : (
                  <option value="">No allocated modules found</option>
                )}
              </select>
            </div>

            {/* Field 3: Day of the Week */}
            <div className="v-form-group">
              <label>
                <Calendar size={15} color="#2563eb" /> Day of Week
              </label>
              <select
                value={form.day_of_week}
                onChange={e => setForm({ ...form, day_of_week: e.target.value })}
                required
              >
                {days.map(d => (
                  <option key={d} value={d}>
                    {d} {d === todayName ? '• (Today)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 4: Start Time */}
            <div className="v-form-group">
              <label>
                <Clock size={15} color="#2563eb" /> Start Time
              </label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
              />
            </div>

            {/* Field 5: End Time */}
            <div className="v-form-group">
              <label>
                <Clock size={15} color="#2563eb" /> End Time
              </label>
              <input
                type="time"
                required
                value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
              />
            </div>

            {/* Field 6: Venue / Location Name */}
            <div className="v-form-group">
              <label>
                <MapPin size={15} color="#2563eb" /> Venue / Building Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Science Block, IT Lab 2"
                value={form.location_name}
                onChange={e => setForm({ ...form, location_name: e.target.value })}
              />
            </div>

            {/* Field 7: Room Code */}
            <div className="v-form-group">
              <label>
                <DoorOpen size={15} color="#2563eb" /> Room Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. R-201, LAB-B"
                value={form.room_code}
                onChange={e => setForm({ ...form, room_code: e.target.value })}
              />
            </div>

            {/* Form Footer Buttons */}
            <div className="v-form-actions">
              <button
                type="button"
                className="v-btn secondary"
                onClick={() => setShowAddForm(false)}
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="v-btn primary"
                disabled={actionBusy}
              >
                {actionBusy ? (
                  <>
                    <RefreshCw size={15} className="v-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Save Class Slot
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Controls Bar (View Mode Switcher) */}
      <div className="v-timetable-controls">
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--v-text)' }}>
          Weekly Teaching Schedule ({schedules.length} class periods)
        </span>

        <div className="v-view-switch">
          <button
            type="button"
            className={`v-view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="View all days of the week"
          >
            <LayoutGrid size={14} /> Full Week Grid
          </button>
          <button
            type="button"
            className={`v-view-switch-btn ${viewMode === 'today' ? 'active' : ''}`}
            onClick={() => setViewMode('today')}
            title="View today's schedule only"
          >
            <ListFilter size={14} /> Today ({todayName})
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="v-timetable-grid">
        {(viewMode === 'today' ? [todayName] : days).map(day => {
          const isToday = day === todayName;
          const daySlots = schedules.filter(s => s.day_of_week === day);

          return (
            <div
              key={day}
              className={`v-timetable-day-col ${isToday ? 'today' : ''}`}
            >
              {/* Day Header */}
              <div className="v-day-header">
                <div className="v-day-header-left">
                  <strong>{day}</strong>
                  {isToday && <span className="v-today-tag">Today</span>}
                </div>
                <span className="v-day-count-badge">
                  {daySlots.length} {daySlots.length === 1 ? 'class' : 'classes'}
                </span>
              </div>

              {/* Day Slots */}
              <div className="v-day-slots">
                {!daySlots.length ? (
                  <div className="v-day-empty-box">
                    <Clock size={20} style={{ opacity: 0.4 }} />
                    <span>No classes scheduled</span>
                  </div>
                ) : (
                  daySlots.map(slot => (
                    <article key={slot.id} className="v-slot-card">
                      <div className="v-slot-card-top">
                        <div className="v-slot-time">
                          <Clock size={12} />
                          <span>
                            {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                          </span>
                        </div>

                        {role === 'lecturer' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="v-slot-del-btn"
                              title="Cancel class date & notify enrolled students"
                              onClick={(e) => handleCancelClassDate(slot, e)}
                              style={{ color: '#d97706' }}
                            >
                              <Ban size={13} />
                            </button>
                            <button
                              type="button"
                              className="v-slot-del-btn"
                              title="Remove class slot"
                              onClick={(e) => handleDeleteSlot(slot.id, e)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                        <strong className="v-slot-module-code">
                          {slot.modules?.code || 'Module'}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: 'rgba(37, 99, 235, 0.1)',
                            color: '#1d4ed8'
                          }}
                        >
                          {formatCampusName(slot.campus_id || slot.location_name || 'goderich')}
                        </span>
                      </div>

                      <span className="v-slot-module-title">
                        {slot.modules?.title || 'Lecture Class'}
                      </span>

                      <div className="v-slot-venue">
                        <MapPin size={11} color="#2563eb" />
                        <span>
                          {slot.location_name} {slot.room_code ? `(${slot.room_code})` : ''}
                        </span>
                      </div>

                      {role === 'student' && slot.lecturers?.full_name && (
                        <span className="v-slot-lecturer-tag">
                          👤 {slot.lecturers.full_name}
                        </span>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
