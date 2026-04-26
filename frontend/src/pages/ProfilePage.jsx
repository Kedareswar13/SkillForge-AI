import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { User, Target, Award, TrendingUp, BookOpen, FileText, Brain, Eye, X, Download, Star, Clock, Swords } from 'lucide-react';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [showPdf, setShowPdf] = useState(false);
  const skills = profile?.skills || [];
  const topSkills = [...skills].sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  const radarData = topSkills.slice(0, 8).map(s => ({ skill: s.name, value: s.confidence, fullMark: 100 }));
  const latestAssessment = profile?.latestAssessment;

  const levelColors = { beginner: 'var(--warning)', intermediate: 'var(--indigo)', advanced: 'var(--teal)', expert: 'var(--success)' };

  const token = localStorage.getItem('sf_token');
  const pdfUrl = `/api/profile/resume-pdf`;

  return (
    <div className="page-container">
      <div className="page-header animate-fade"><h1>Profile</h1><p>Your skill identity and growth overview</p></div>

      <div className="profile-layout animate-slide">
        {/* Left: User Info */}
        <div className="profile-sidebar">
          <div className="glass-card profile-card">
            <div className="profile-avatar" style={{background: user?.avatarColor || 'var(--indigo)'}}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <h2>{user?.name}</h2>
            <p className="text-muted">{user?.email}</p>
            {user?.targetRole && <span className="badge badge-teal"><Target size={12}/> {user.targetRole}</span>}
          </div>

          <div className="glass-card">
            <h3><Award size={16}/> Quick Stats</h3>
            <div className="profile-stats">
              <div><span className="stat-num">{skills.length}</span><span className="text-muted text-sm">Skills</span></div>
              <div><span className="stat-num">{profile?.overallReadiness || 0}%</span><span className="text-muted text-sm">Readiness</span></div>
              <div><span className="stat-num">{profile?.learningPlan?.length || 0}</span><span className="text-muted text-sm">Learning</span></div>
            </div>
          </div>

          {/* Resume Section with PDF Viewer */}
          {profile?.resumeFileName && (
            <div className="glass-card">
              <h3><FileText size={16}/> Resume</h3>
              <p className="text-muted text-sm" style={{marginBottom:8}}>{profile.resumeFileName}</p>
              <div style={{display:'flex', gap:8}}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPdf(true)} style={{flex:1}}>
                  <Eye size={14}/> View PDF
                </button>
                <button onClick={async () => {
                  try {
                    const res = await fetch('/api/profile/resume-pdf', { headers: { Authorization: `Bearer ${localStorage.getItem('sf_token')}` } });
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = profile.resumeFileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (e) { console.error('Download failed', e); }
                }} className="btn btn-ghost btn-sm" style={{flex:1, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:4}}>
                  <Download size={14}/> Download
                </button>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {profile?.recentActivity?.length > 0 && (
            <div className="glass-card">
              <h3><Clock size={16}/> Recent Activity</h3>
              <div className="profile-activity">
                {profile.recentActivity.slice(0, 5).map((a, i) => (
                  <div key={i} className="profile-activity-item">
                    <div className={`activity-dot ${a.type}`}></div>
                    <div>
                      <p className="text-sm" style={{margin:0}}>{a.description}</p>
                      <span className="text-muted" style={{fontSize:'0.7rem'}}>{new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Skill Details */}
        <div className="profile-main">
          {radarData.length > 0 && (
            <div className="glass-card">
              <h3>Skill Radar</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)"/>
                  <PolarAngleAxis dataKey="skill" tick={{fill:'var(--text-muted)',fontSize:11}}/>
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false}/>
                  <Radar dataKey="value" stroke="var(--indigo)" fill="var(--indigo)" fillOpacity={0.2} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Assessment Scores Section */}
          {latestAssessment && latestAssessment.finalScores?.length > 0 && (
            <div className="glass-card assessment-scores-card">
              <h3><Brain size={16}/> Assessment Scores</h3>
              <p className="text-muted text-sm" style={{marginBottom:12}}>
                <Clock size={12}/> Assessed on {new Date(latestAssessment.completedAt).toLocaleDateString()} • {latestAssessment.finalScores.length} skills
              </p>
              <div className="assessment-scores-grid">
                {latestAssessment.finalScores.map((score, i) => (
                  <div key={i} className="assessment-score-item">
                    <div className="assessment-score-header">
                      <span className="assessment-skill-name">{score.skill}</span>
                      <span className={`badge badge-${score.level === 'expert' ? 'success' : score.level === 'advanced' ? 'teal' : score.level === 'intermediate' ? 'warning' : 'indigo'}`}>
                        {score.level}
                      </span>
                    </div>
                    <div className="assessment-score-bar">
                      <div className="progress-bar" style={{flex:1,height:6}}>
                        <div className="progress-bar-fill" style={{width:`${score.confidence}%`}}></div>
                      </div>
                      <span className="assessment-score-value">{score.confidence}%</span>
                    </div>
                    {score.evidenceSummary && (
                      <span className="text-muted" style={{fontSize:'0.72rem'}}>{score.evidenceSummary}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile?.strengths?.length > 0 && (
            <div className="glass-card">
              <h3><TrendingUp size={16}/> Top Strengths</h3>
              <div className="skill-tags" style={{marginTop:8}}>
                {profile.strengths.map((s,i) => <span key={i} className="badge badge-success">{s}</span>)}
              </div>
            </div>
          )}

          {/* Mock Interview History */}
          {profile?.mockInterviews?.length > 0 && (
            <div className="glass-card">
              <h3><Swords size={16}/> Mock Interview History</h3>
              <div className="mock-interview-history" style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
                {profile.mockInterviews.map((mi, i) => (
                  <div key={i} className="profile-activity-item" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'var(--surface-light)', borderRadius:'8px', border:'1px solid var(--border)'}}>
                    <div>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontWeight:600, textTransform:'capitalize'}}>{mi.type.replace('_', ' ')}</span>
                        <span className="badge badge-indigo" style={{fontSize:'0.7rem'}}>{mi.questionsCount} Qs</span>
                      </div>
                      <span className="text-muted" style={{fontSize:'0.75rem'}}>{new Date(mi.date).toLocaleString()}</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:4}}>
                      <Star size={16} fill="var(--warning)" color="var(--warning)"/>
                      <span style={{fontWeight:700, fontSize:'1.1rem'}}>{mi.avgScore}</span><span className="text-muted">/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile?.gaps?.length > 0 && (
            <div className="glass-card">
              <h3><Target size={16}/> Skill Gaps</h3>
              <div className="skill-tags" style={{marginTop:8}}>
                {profile.gaps.map((s,i) => <span key={i} className="badge badge-error">{s}</span>)}
              </div>
            </div>
          )}

          <div className="glass-card">
            <h3><BookOpen size={16}/> All Skills ({skills.length})</h3>
            <div className="skills-table">
              {skills.map((s, i) => (
                <div key={i} className="skill-row">
                  <span className="skill-name">{s.name}</span>
                  <span className="badge" style={{background:`${levelColors[s.level]}22`,color:levelColors[s.level]}}>{s.level}</span>
                  {s.assessmentScore !== undefined && (
                    <span className="badge badge-teal" title="Assessment Score" style={{fontSize:'0.7rem'}}>
                      <Brain size={10}/> {s.assessmentScore}%
                    </span>
                  )}
                  <div className="progress-bar" style={{width:100,flex:'0 0 100px'}}><div className="progress-bar-fill" style={{width:`${s.confidence}%`}}></div></div>
                  <span className="text-muted text-sm" style={{width:40,textAlign:'right'}}>{s.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {showPdf && (
        <PdfViewerModal 
          onClose={() => setShowPdf(false)} 
          fileName={profile?.resumeFileName} 
        />
      )}
    </div>
  );
}

function PdfViewerModal({ onClose, fileName }) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const res = await fetch('/api/profile/resume-pdf', {
          headers: { Authorization: `Bearer ${localStorage.getItem('sf_token')}` }
        });
        if (!res.ok) throw new Error('Failed to load PDF');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (err) {
        setError('Could not load resume. Please try downloading it instead.');
      }
      setLoading(false);
    };
    fetchPdf();

    // Cleanup function
    return () => {
      if (pdfBlobUrl) window.URL.revokeObjectURL(pdfBlobUrl);
    };
  }, []);

  return (
    <div className="pdf-overlay" onClick={onClose}>
      <div className="pdf-modal" onClick={e => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <h3><FileText size={16}/> {fileName}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="pdf-modal-body" style={{position: 'relative'}}>
          {loading && (
            <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)'}}>
              <div className="spinner" style={{width:40, height:40, margin:'0 auto'}}></div>
              <p style={{marginTop:16}}>Loading PDF...</p>
            </div>
          )}
          {error && (
            <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center', color:'var(--error)'}}>
              <FileText size={48} style={{margin:'0 auto 16px', opacity:0.5}} />
              <p>{error}</p>
            </div>
          )}
          {pdfBlobUrl && <iframe src={pdfBlobUrl} title="Resume PDF" className="pdf-iframe"/>}
        </div>
      </div>
    </div>
  );
}
