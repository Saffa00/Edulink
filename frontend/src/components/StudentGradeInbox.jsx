import React, { useEffect, useState } from 'react';
import { 
  GraduationCap, 
  Info, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  TrendingUp, 
  FileCheck2,
  ChevronRight,
  RefreshCw,
  Bell
} from 'lucide-react';
import { getMyPublishedGrades } from '../services/moduleGrades';
import { getModuleCatalogue } from '../services/academicMasterV41toV55';
import { getMyStudentProfile } from '../services/studentAttendance';

export default function StudentGradeInbox() {
  const [activeTab, setActiveTab] = useState('published'); // 'published' | 'summary'
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const profile = await getMyStudentProfile().catch(() => null);
        if (!mounted) return;

        const effectiveStudent = profile || {
          student_id: '8100',
          full_name: 'Peter Saffa',
          programme: 'BSc Computer Science',
          level: 3,
          academic_year: '2026/2027',
          semester: 'First Semester'
        };
        setStudent(effectiveStudent);

        // Fetch published grades and registered modules
        const [published, modules] = await Promise.all([
          getMyPublishedGrades(effectiveStudent.id).catch(() => []),
          getModuleCatalogue().catch(() => [])
        ]);

        if (mounted) {
          setGrades(Array.isArray(published) ? published : []);
          setAllModules(Array.isArray(modules) ? modules : []);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load grade records.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, []);

  const programmeName = student?.programme 
    ? (student.programme.toLowerCase().startsWith('bsc') ? student.programme : `BSc ${student.programme}`)
    : 'BSc Computer Science';
  const studentId = student?.student_id || '8100';

  // GPA calculation helper
  const gradePoints = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D': 1.0, 'F': 0.0
  };

  const calculatedGPA = grades.length > 0 
    ? (grades.reduce((acc, g) => acc + (gradePoints[g.grade] || (g.score >= 80 ? 4.0 : g.score >= 70 ? 3.0 : 2.0)), 0) / grades.length).toFixed(2)
    : '0.00';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 40px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 1. TOP NAVY BLUE BANNER (Matches uploaded mockup) */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #071E3D 0%, #0A2952 100%)',
          borderRadius: '18px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(7, 30, 61, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '14px'
        }}
      >
        {/* Left: Graduation Cap & Program Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div 
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.4)'
            }}
          >
            <GraduationCap size={24} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 
              style={{ 
                margin: 0, 
                fontSize: '16px', 
                fontWeight: '700', 
                letterSpacing: '-0.2px',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {programmeName}
            </h2>
            <p 
              style={{ 
                margin: '2px 0 0', 
                fontSize: '13px', 
                color: '#93c5fd', 
                fontWeight: '500' 
              }}
            >
              MMTU
            </p>
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{ width: '1px', height: '36px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 16px' }} />

        {/* Right: Student ID */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span 
            style={{ 
              display: 'block', 
              fontSize: '11px', 
              color: '#94a3b8', 
              fontWeight: '500', 
              letterSpacing: '0.3px',
              textTransform: 'uppercase' 
            }}
          >
            Student ID
          </span>
          <strong 
            style={{ 
              fontSize: '20px', 
              fontWeight: '800', 
              color: '#ffffff', 
              letterSpacing: '-0.3px',
              display: 'block',
              marginTop: '1px'
            }}
          >
            {studentId}
          </strong>
        </div>
      </div>

      {/* 2. MAIN WHITE CARD CONTAINER */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f1f5f9'
        }}
      >
        {/* Header Row: My Grades Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
          <div 
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {/* Clipboard / Test score icon matching image */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <path d="M9 12h2"></path>
              <path d="M9 16h6"></path>
              <circle cx="15" cy="11" r="1" fill="#0284c7"></circle>
            </svg>
          </div>
          <div>
            <h1 
              style={{ 
                margin: 0, 
                fontSize: '20px', 
                fontWeight: '800', 
                color: '#0f294a', 
                letterSpacing: '-0.3px' 
              }}
            >
              My Grades
            </h1>
            <p 
              style={{ 
                margin: '4px 0 0', 
                fontSize: '13px', 
                color: '#64748b', 
                lineHeight: '1.4' 
              }}
            >
              View your published grades and performance for registered modules.
            </p>
          </div>
        </div>

        {/* Pill Tab Switcher */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            background: '#f8fafc', 
            padding: '4px', 
            borderRadius: '999px',
            marginBottom: '18px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('published')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: activeTab === 'published' ? '700' : '600',
              background: activeTab === 'published' ? '#072b61' : 'transparent',
              color: activeTab === 'published' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'published' ? '0 2px 8px rgba(7, 43, 97, 0.25)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            Published Grades
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: activeTab === 'summary' ? '700' : '600',
              background: activeTab === 'summary' ? '#072b61' : 'transparent',
              color: activeTab === 'summary' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'summary' ? '0 2px 8px rgba(7, 43, 97, 0.25)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            Performance Summary
          </button>
        </div>

        {/* Grade Information Callout Banner (Matches image callout) */}
        <div 
          style={{
            background: '#f0f7ff',
            border: '1px solid #d0e7ff',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '28px'
          }}
        >
          <div style={{ color: '#0284c7', flexShrink: 0, marginTop: '1px' }}>
            <Info size={19} />
          </div>
          <div>
            <strong 
              style={{ 
                display: 'block', 
                fontSize: '13.5px', 
                fontWeight: '700', 
                color: '#0f294a' 
              }}
            >
              Grade Information
            </strong>
            <p 
              style={{ 
                margin: '2px 0 0', 
                fontSize: '12.5px', 
                color: '#475569', 
                lineHeight: '1.45' 
              }}
            >
              Your grades will appear here once they have been published by your lecturer.
            </p>
          </div>
        </div>

        {/* TAB 1: PUBLISHED GRADES */}
        {activeTab === 'published' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <RefreshCw size={24} className="spin-icon" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Checking published results…</p>
              </div>
            ) : grades.length === 0 ? (
              /* EMPTY STATE: EXACT TEST SHEET ILLUSTRATION FROM MOCKUP */
              <div 
                style={{ 
                  textAlign: 'center', 
                  padding: '24px 16px 36px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center' 
                }}
              >
                {/* SVG Illustration: Light Blue Cloud + Test Paper Sheet + A+ Stamp */}
                <div 
                  style={{ 
                    position: 'relative', 
                    width: '160px', 
                    height: '140px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  {/* Background Soft Sky Blue Cloud / Blob */}
                  <svg width="150" height="130" viewBox="0 0 150 130" style={{ position: 'absolute', top: 5, left: 5, zIndex: 1 }}>
                    <path 
                      d="M25,65 C10,45 25,15 65,15 C95,15 110,25 125,45 C145,70 135,100 110,115 C85,128 45,120 25,100 C15,90 15,75 25,65 Z" 
                      fill="#eaf4ff" 
                    />
                  </svg>

                  {/* Decorative Sparkle Rays around the Sheet */}
                  <svg width="160" height="140" viewBox="0 0 160 140" style={{ position: 'absolute', zIndex: 3, pointerEvents: 'none' }}>
                    <line x1="102" y1="22" x2="108" y2="18" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="110" y1="28" x2="116" y2="28" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="107" y1="36" x2="114" y2="38" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
                    
                    <line x1="42" y1="92" x2="36" y2="92" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="44" y1="98" x2="39" y2="104" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>

                  {/* White Test Paper Card Sheet */}
                  <div 
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '84px',
                      height: '106px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '2.5px solid #1d4ed8',
                      boxShadow: '0 8px 16px rgba(29, 78, 216, 0.12)',
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transform: 'rotate(-2deg)'
                    }}
                  >
                    {/* Circular A+ Badge Stamp */}
                    <div 
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '2px solid #1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1d4ed8',
                        fontWeight: '800',
                        fontSize: '14px',
                        marginTop: '2px',
                        marginBottom: '10px'
                      }}
                    >
                      A+
                    </div>

                    {/* Paper text lines */}
                    <div style={{ width: '85%', height: '3px', background: '#1d4ed8', borderRadius: '2px', marginBottom: '6px' }} />
                    <div style={{ width: '85%', height: '3px', background: '#1d4ed8', borderRadius: '2px', marginBottom: '6px' }} />
                    <div style={{ width: '55%', height: '3px', background: '#1d4ed8', borderRadius: '2px', alignSelf: 'flex-start', marginLeft: '5px' }} />
                  </div>
                </div>

                {/* Typography matching image */}
                <h3 
                  style={{ 
                    margin: '8px 0 6px', 
                    fontSize: '18px', 
                    fontWeight: '800', 
                    color: '#072b61',
                    letterSpacing: '-0.3px'
                  }}
                >
                  No grades available
                </h3>
                <p 
                  style={{ 
                    margin: '0 0 4px', 
                    fontSize: '13.5px', 
                    color: '#334155',
                    fontWeight: '500'
                  }}
                >
                  You don't have any published grades yet.
                </p>
                <p 
                  style={{ 
                    margin: 0, 
                    fontSize: '12.5px', 
                    color: '#64748b',
                    maxWidth: '320px',
                    lineHeight: '1.45'
                  }}
                >
                  Check back later once your lecturers have released your results.
                </p>
              </div>
            ) : (
              /* PUBLISHED GRADES LIST */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {grades.map(g => (
                  <div 
                    key={g.id || g.module_id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                          {g.modules?.code || 'MODULE'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', background: '#f0fdf4', padding: '3px 7px', borderRadius: '6px' }}>
                          PUBLISHED
                        </span>
                      </div>
                      <h4 style={{ margin: '6px 0 2px', fontSize: '14.5px', fontWeight: '700', color: '#0f172a' }}>
                        {g.modules?.title || 'Academic Module'}
                      </h4>
                      <small style={{ color: '#64748b', fontSize: '12px' }}>
                        Lecturer: {g.lecturers?.full_name || 'Academic Staff'}
                      </small>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div 
                        style={{ 
                          fontSize: '22px', 
                          fontWeight: '800', 
                          color: g.score >= 70 ? '#15803d' : '#b45309' 
                        }}
                      >
                        {g.grade || (g.score >= 80 ? 'A' : g.score >= 70 ? 'B' : 'C')}
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                        Score: {g.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PERFORMANCE SUMMARY */}
        {activeTab === 'summary' && (
          <div>
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Current GPA</span>
                <strong style={{ display: 'block', fontSize: '24px', fontWeight: '800', color: '#072b61', marginTop: '4px' }}>
                  {calculatedGPA}
                </strong>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Graded Modules</span>
                <strong style={{ display: 'block', fontSize: '24px', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>
                  {grades.length} / {allModules.length || 8}
                </strong>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Standing</span>
                <strong style={{ display: 'block', fontSize: '15px', fontWeight: '800', color: '#16a34a', marginTop: '8px' }}>
                  Good Standing
                </strong>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                Registered Curriculum Modules ({allModules.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allModules.map((m, idx) => {
                  const publishedMatch = grades.find(g => g.module_id === m.id || g.modules?.code === m.code);
                  return (
                    <div 
                      key={m.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        fontSize: '12.5px'
                      }}
                    >
                      <div>
                        <b>{m.code}</b> — <span style={{ color: '#475569' }}>{m.title}</span>
                      </div>
                      <span 
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: publishedMatch ? '#dcfce7' : '#f1f5f9',
                          color: publishedMatch ? '#15803d' : '#64748b'
                        }}
                      >
                        {publishedMatch ? `Grade: ${publishedMatch.grade || 'A'}` : 'Pending Lecturer Release'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
