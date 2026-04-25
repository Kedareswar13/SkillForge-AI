import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAssessmentHistory } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { FileText, Briefcase, Brain, Map, TrendingUp, Target, Zap, ArrowRight, Clock, ChevronRight, Swords, Play } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [latestAssessment, setLatestAssessment] = useState(null);

  useEffect(() => {
    refreshProfile();
    getAssessmentHistory()
      .then(r => {
        const completed = r.data?.find(a => a.status === 'completed');
        if (completed) setLatestAssessment(completed);
      })
      .catch(() => {});
  }, []);

  const skills = profile?.skills || [];
  const topSkills = [...skills].sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  const radarData = topSkills.map(s => ({ skill: s.name, confidence: s.confidence, fullMark: 100 }));
  const barData = topSkills.map(s => ({ name: s.name.length > 12 ? s.name.slice(0,12)+'...' : s.name, value: s.confidence, level: s.level }));

  const levelCounts = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
  skills.forEach(s => { if (levelCounts[s.level] !== undefined) levelCounts[s.level]++; });

  const hasAssessment = !!latestAssessment || profile?.recentActivity?.some(a => a.type === 'assessment_completed' && a.description?.includes('Completed'));

  const steps = [
    { label: 'Upload Resume', path: '/resume', icon: FileText, done: !!profile?.resumeFileName },
    { label: 'Add Job Description', path: '/jd', icon: Briefcase, done: profile?.jdSkills?.required?.length > 0 },
    { label: 'Run Analysis', path: '/analysis', icon: TrendingUp, done: profile?.gapAnalysis?.matches?.length > 0 },
    { label: 'Take Assessment', path: '/assessment', icon: Brain, done: hasAssessment },
    { label: 'View Roadmap', path: '/roadmap', icon: Map, done: profile?.learningPlan?.length > 0 },
    { label: 'Mock Interview', path: '/mock-interview', icon: Swords, done: false },
  ];

  const nextStep = steps.find(s => !s.done);
  const completedSteps = steps.filter(s => s.done).length;

  // Calculate roadmap progress
  const roadmapPlan = profile?.learningPlan || [];
  const roadmapProgress = roadmapPlan.length > 0 
    ? Math.round(roadmapPlan.reduce((sum, item) => sum + (item.progress || 0), 0) / roadmapPlan.length)
    : 0;
  const currentLearning = roadmapPlan.find(item => (item.progress || 0) > 0 && (item.progress || 0) < 100);

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div className="dash-welcome animate-fade">
        <div>
          <h1>Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span></h1>
          <p className="text-muted">{profile?.resumeFileName ? 'Continue your skill growth journey' : 'Let\'s set up your skill profile'}</p>
        </div>
        {profile?.overallReadiness > 0 && (
          <div className="readiness-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-hover)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${profile.overallReadiness * 2.64} 264`} transform="rotate(-90 50 50)" />
              <defs><linearGradient id="grad"><stop offset="0%" stopColor="var(--indigo)" /><stop offset="100%" stopColor="var(--teal)" /></linearGradient></defs>
            </svg>
            <div className="readiness-value">{profile.overallReadiness}%</div>
            <div className="readiness-label">Ready</div>
          </div>
        )}
      </div>

      {/* Continue Where You Left Off */}
      {nextStep && (
        <div className="glass-card dash-continue animate-slide" onClick={() => navigate(nextStep.path)}>
          <div className="continue-left">
            <Play size={20} style={{color:'var(--indigo)'}}/>
            <div>
              <p className="continue-title">{completedSteps === 0 ? "Let's Get Started" : "Continue Where You Left Off"}</p>
              <p className="text-muted text-sm" style={{margin:0}}>
                {completedSteps}/{steps.length} steps completed • Next: <strong>{nextStep.label}</strong>
              </p>
            </div>
          </div>
          <div className="continue-right">
            <button className="btn btn-primary btn-sm">
              {nextStep.label} <ArrowRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Current Learning Progress */}
      {currentLearning && (
        <div className="glass-card dash-learning animate-slide" style={{animationDelay:'0.05s'}} onClick={() => navigate('/roadmap')}>
          <div className="continue-left">
            <Map size={20} style={{color:'var(--teal)'}}/>
            <div>
              <p className="continue-title">Currently Learning: {currentLearning.skill}</p>
              <p className="text-muted text-sm" style={{margin:0}}>
                {currentLearning.currentLevel} → {currentLearning.targetLevel} • {currentLearning.progress}% complete
              </p>
            </div>
          </div>
          <div className="continue-right">
            <div className="progress-bar" style={{width:100}}>
              <div className="progress-bar-fill" style={{width:`${currentLearning.progress}%`}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="dash-steps glass-card animate-slide">
        <h3><Target size={18} /> Your Journey</h3>
        <div className="steps-track">
          {steps.map((step, i) => (
            <div key={i} className={`step-item ${step.done ? 'done' : ''} ${step === nextStep ? 'next' : ''}`} onClick={() => navigate(step.path)}>
              <div className="step-icon"><step.icon size={18} /></div>
              <span>{step.label}</span>
              {step === nextStep && <ArrowRight size={14} className="step-arrow" />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {skills.length > 0 && (
        <div className="grid-4 dash-stats animate-slide" style={{animationDelay:'0.1s'}}>
          <div className="glass-card stat-card">
            <div className="stat-value">{skills.length}</div>
            <div className="stat-label">Skills Found</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value">{levelCounts.advanced + levelCounts.expert}</div>
            <div className="stat-label">Strong Skills</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value">{profile?.gapAnalysis?.missing?.length || 0}</div>
            <div className="stat-label">Gaps Found</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value">{profile?.learningPlan?.length || 0}</div>
            <div className="stat-label">Learning Items</div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      {topSkills.length > 0 && (
        <div className="grid-2 dash-charts animate-slide" style={{animationDelay:'0.2s'}}>
          <div className="glass-card">
            <h3>Skill Confidence</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--indigo)" /><stop offset="100%" stopColor="var(--teal)" /></linearGradient></defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card">
            <h3>Skill Radar</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="confidence" stroke="var(--indigo)" fill="var(--indigo)" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Activity + Quick Actions */}
      <div className="grid-2 animate-slide" style={{animationDelay:'0.3s'}}>
        <div className="glass-card">
          <h3><Clock size={18} /> Recent Activity</h3>
          {profile?.recentActivity?.length > 0 ? (
            <div className="activity-list">
              {profile.recentActivity.slice(0, 6).map((a, i) => (
                <div key={i} className="activity-item">
                  <div className={`activity-dot ${a.type}`}></div>
                  <div>
                    <p>{a.description}</p>
                    <span className="text-muted text-sm">{new Date(a.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-muted" style={{padding: '20px 0'}}>No activity yet. Start by uploading your resume!</p>}
        </div>
        <div className="glass-card">
          <h3><Zap size={18} /> Quick Actions</h3>
          <div className="quick-actions">
            {steps.filter(s => !s.done).slice(0, 3).map((step, i) => (
              <button key={i} className="quick-action-btn" onClick={() => navigate(step.path)}>
                <step.icon size={20} />
                <span>{step.label}</span>
                <ChevronRight size={16} />
              </button>
            ))}
            {steps.every(s => s.done) && <p className="text-muted">All steps complete! 🎉</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
