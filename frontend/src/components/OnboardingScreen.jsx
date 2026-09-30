import React, { useState, useRef } from 'react';
import { 
  GraduationCap, BookOpen, Award, MapPin, Clock3, 
  MessageSquare, ShieldCheck, ChevronRight, ArrowRight, Check
} from 'lucide-react';

const SLIDES = [
  {
    id: 'welcome',
    badge: 'University Portal',
    title: 'Welcome to EduLink',
    subtitle: 'Your all-in-one university portal for curriculum modules, lecture timetables, and verified grade records.',
    icon: GraduationCap,
    accentColor: '#0a2540',
    accentBg: '#eaf1f8',
    chips: [
      { icon: BookOpen, label: 'Course Modules' },
      { icon: Clock3, label: 'Live Timetable' },
      { icon: Award, label: 'Grade Records' }
    ]
  },
  {
    id: 'attendance',
    badge: 'Smart Geofencing',
    title: 'Fast GPS Attendance',
    subtitle: 'Check in to your lectures seamlessly with verified GPS coordinates across all university campuses.',
    icon: MapPin,
    accentColor: '#059669',
    accentBg: '#ecfdf5',
    campuses: [
      { name: 'Goderich Campus', tag: 'Main' },
      { name: 'Congo Cross Campus', tag: 'Faculty' },
      { name: 'Brookfields Campus', tag: 'Annex' }
    ]
  },
  {
    id: 'connect',
    badge: 'Communication & Security',
    title: 'Direct Chat & Device Safety',
    subtitle: 'Connect directly with course lecturers in real-time, with ironclad one-device per account security.',
    icon: ShieldCheck,
    accentColor: '#2563eb',
    accentBg: '#eff6ff',
    chips: [
      { icon: MessageSquare, label: 'Real-Time Messaging' },
      { icon: ShieldCheck, label: '1 Device Per Account' },
      { icon: Check, label: 'Instant Announcements' }
    ]
  }
];

export default function OnboardingScreen({ onFinish }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleFinish = (action = 'gateway') => {
    try {
      localStorage.setItem('edulink_onboarded', 'true');
    } catch (e) {}
    onFinish?.(action);
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleFinish('gateway');
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50 && currentSlide < SLIDES.length - 1) {
      // Swiped left
      setCurrentSlide(prev => prev + 1);
    } else if (diff < -50 && currentSlide > 0) {
      // Swiped right
      setCurrentSlide(prev => prev - 1);
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const slide = SLIDES[currentSlide];
  const IconComponent = slide.icon;
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <main
      className="auth-screen onboarding-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'calc(16px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px)) 20px',
        background: '#ffffff',
        boxSizing: 'border-box',
        maxWidth: '460px',
        margin: '0 auto',
        userSelect: 'none'
      }}
    >
      {/* Top Header with Skip */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '44px'
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#8b9bb4',
            background: '#f1f5f9',
            padding: '5px 12px',
            borderRadius: '99px'
          }}
        >
          {slide.badge}
        </span>
        <button
          type="button"
          onClick={() => handleFinish('gateway')}
          style={{
            background: 'none',
            border: 'none',
            color: '#52657c',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '8px'
          }}
        >
          Skip
        </button>
      </header>

      {/* Main Slide Content */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px 0'
        }}
      >
        {/* Animated Feature Circle */}
        <div
          style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            background: slide.accentBg,
            color: slide.accentColor,
            display: 'grid',
            placeItems: 'center',
            marginBottom: '32px',
            boxShadow: `0 14px 34px ${slide.accentBg}`,
            transition: 'all 0.3s ease'
          }}
        >
          <IconComponent size={52} strokeWidth={2.2} />
        </div>

        {/* Title & Subtitle */}
        <h1
          style={{
            fontSize: '25px',
            fontWeight: 800,
            color: '#061626',
            margin: '0 0 12px 0',
            lineHeight: 1.25,
            letterSpacing: '-0.02em'
          }}
        >
          {slide.title}
        </h1>
        <p
          style={{
            fontSize: '14.5px',
            color: '#52657c',
            lineHeight: 1.6,
            margin: '0 0 28px 0',
            maxWidth: '340px'
          }}
        >
          {slide.subtitle}
        </p>

        {/* Chips or Campuses */}
        {slide.chips && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'center',
              maxWidth: '360px'
            }}
          >
            {slide.chips.map((c, i) => {
              const ChipIcon = c.icon;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#1e293b'
                  }}
                >
                  <ChipIcon size={15} color={slide.accentColor} />
                  <span>{c.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {slide.campuses && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
              maxWidth: '320px'
            }}
          >
            {slide.campuses.map((camp, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#166534'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} color="#16a34a" />
                  <span>{camp.name}</span>
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    background: '#dcfce7',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    color: '#15803d'
                  }}
                >
                  {camp.tag}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer Navigation: Dots & Buttons */}
      <footer
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center',
          width: '100%'
        }}
      >
        {/* Pagination Dots */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                width: currentSlide === idx ? '24px' : '8px',
                height: '8px',
                borderRadius: '99px',
                background: currentSlide === idx ? '#0a2540' : '#cbd5e1',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {isLast ? (
            <>
              <button
                type="button"
                className="primary-btn"
                onClick={() => handleFinish('gateway')}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#0a2540',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(10, 37, 64, 0.22)'
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => handleFinish('register')}
                style={{
                  width: '100%',
                  height: '46px',
                  background: 'none',
                  border: '1px solid #d7e1ec',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#38516c',
                  cursor: 'pointer'
                }}
              >
                Create New Account
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={() => handleFinish('gateway')}
                style={{
                  flex: 1,
                  height: '50px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={handleNext}
                style={{
                  flex: 1.4,
                  height: '50px',
                  background: '#0a2540',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(10, 37, 64, 0.18)'
                }}
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </footer>
    </main>
  );
}
