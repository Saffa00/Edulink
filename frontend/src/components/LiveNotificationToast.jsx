import React, { useState, useEffect } from 'react';
import {
  Bell, MessageSquare, Phone, Award, ClipboardList,
  CalendarCheck, DollarSign, BookOpen, X, ChevronRight
} from 'lucide-react';
import { subscribeToLiveToasts } from '../services/liveNotificationService.js';

export default function LiveNotificationToast({ onNavigate }) {
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToLiveToasts((item) => {
      setToast(item);
      setVisible(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Auto-dismiss after 6.5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 6500);

    return () => clearTimeout(timer);
  }, [visible, toast]);

  if (!toast || !visible) return null;

  const getCategoryConfig = (cat) => {
    switch (cat) {
      case 'message':
        return {
          icon: MessageSquare,
          color: '#2563eb',
          bg: '#dbeafe',
          label: 'Message',
          defaultTab: 'messages'
        };
      case 'call':
        return {
          icon: Phone,
          color: '#16a34a',
          bg: '#dcfce7',
          label: 'Call',
          defaultTab: 'messages'
        };
      case 'grade':
        return {
          icon: Award,
          color: '#7c3aed',
          bg: '#ede9fe',
          label: 'Academic Grade',
          defaultTab: 'grades'
        };
      case 'assignment':
        return {
          icon: ClipboardList,
          color: '#d97706',
          bg: '#fef3c7',
          label: 'Assignment',
          defaultTab: 'assignments'
        };
      case 'attendance':
        return {
          icon: CalendarCheck,
          color: '#0891b2',
          bg: '#cffafe',
          label: 'Attendance',
          defaultTab: 'attendance'
        };
      case 'payment':
        return {
          icon: DollarSign,
          color: '#059669',
          bg: '#d1fae5',
          label: 'Payment',
          defaultTab: 'payments'
        };
      case 'dissertation':
        return {
          icon: BookOpen,
          color: '#4f46e5',
          bg: '#e0e7ff',
          label: 'Dissertation',
          defaultTab: 'dissertation'
        };
      default:
        return {
          icon: Bell,
          color: '#0f172a',
          bg: '#f1f5f9',
          label: 'Notice',
          defaultTab: 'notifications'
        };
    }
  };

  const config = getCategoryConfig(toast.category);
  const IconComponent = config.icon;

  const handleOpen = () => {
    setVisible(false);
    const target = toast.link_url
      ? toast.link_url.replace(/^\//, '')
      : config.defaultTab;
    if (onNavigate) {
      onNavigate(target);
    }
  };

  return (
    <aside
      className="live-toast-container"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="live-toast-card">
        {/* Category Icon Badge */}
        <div
          className="live-toast-icon-wrap"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          <IconComponent size={20} />
        </div>

        {/* Text Content */}
        <div className="live-toast-body" onClick={handleOpen}>
          <div className="live-toast-header">
            <span className="live-toast-tag" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="live-toast-time">Just now</span>
          </div>
          <strong className="live-toast-title">{toast.title}</strong>
          <p className="live-toast-snippet">{toast.body}</p>
        </div>

        {/* Actions */}
        <div className="live-toast-actions">
          <button
            type="button"
            className="live-toast-open-btn"
            onClick={handleOpen}
            title="Open and view"
          >
            <span>Open</span>
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className="live-toast-close-btn"
            onClick={() => setVisible(false)}
            title="Dismiss"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>

        {/* Animated 6s Progress Bar */}
        <div className="live-toast-progress-bar" />
      </div>
    </aside>
  );
}
