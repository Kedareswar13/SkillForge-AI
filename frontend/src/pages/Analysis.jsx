import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { runAnalysis } from '../api';
import { BarChart3, CheckCircle, XCircle, AlertTriangle, ArrowRight, Zap, FileText, Briefcase } from 'lucide-react';
import './Analysis.css';

export default function Analysis() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Check prerequisites on mount
  const hasSkills = Array.isArray(profile?.skills) && profile.skills.length > 0;
  const hasJD = Array.isArray(profile?.jdSkills?.required) && profile.jdSkills.required.length > 0;

  const handleAnalyze = async () => {
    // Frontend guard: check prerequisites before making API call
    if (!hasSkills) {
      setError('resume_missing');
      return;
    }
    if (!hasJD) {
      setError('jd_missing');
      return;
    }

    setLoading(true); setError('');
    try {
      const { data } = await runAnalysis();
      setResult(data);
      await refreshProfile();
    } catch (err) {
      const serverError = err.response?.data?.error || '';
      if (serverError.toLowerCase().includes('resume')) {
        setError('resume_missing');
      } else if (serverError.toLowerCase().includes('job description')) {
        setError('jd_missing');
      } else {
        setError(serverError || 'Analysis failed');
      }
    }
    setLoading(false);
  };

  // Show existing analysis from profile only if skills & JD still exist AND readiness is valid
  const profileReadiness = typeof profile?.overallReadiness === 'number' ? profile.overallReadiness : 0;
  const data = result || (profile?.gapAnalysis?.matches?.length && hasSkills && hasJD ? {
    gapAnalysis: profile.gapAnalysis,
    overallReadiness: profileReadiness,
    recommendations: profile.gapAnalysis?.recommendations || []
  } : null);

  console.log("🔍 Analysis UI Render Data:", JSON.stringify(data, null, 2));

  // Render a prerequisite-missing card with action button
  const renderMissingStep = () => {
    if (error === 'resume_missing') {
      return (
        <div className="form-card glass-card animate-slide" style={{textAlign:'center'}}>
          <FileText size={48} style={{color:'var(--warning)', margin:'0 auto 16px'}} />
          <h2>Resume Required</h2>
          <p className="text-muted">You need to upload your resume before running gap analysis. We need your skills to compare against the job description.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/resume')} style={{margin:'16px auto 0'}}>
            <FileText size={18}/> Go to Resume Upload <ArrowRight size={18}/>
          </button>
        </div>
      );
    }
    if (error === 'jd_missing') {
      return (
        <div className="form-card glass-card animate-slide" style={{textAlign:'center'}}>
          <Briefcase size={48} style={{color:'var(--warning)', margin:'0 auto 16px'}} />
          <h2>Job Description Required</h2>
          <p className="text-muted">You need to add a target job description before running gap analysis. We need the JD requirements to compare against your skills.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/jd')} style={{margin:'16px auto 0'}}>
            <Briefcase size={18}/> Go to JD Input <ArrowRight size={18}/>
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade">
        <h1>Gap Analysis</h1>
        <p>Compare your skills against the job requirements</p>
      </div>

      {error === 'resume_missing' || error === 'jd_missing' ? (
        renderMissingStep()
      ) : !data ? (
        <div className="form-card glass-card animate-slide" style={{textAlign:'center'}}>
          <BarChart3 size={48} style={{color:'var(--indigo)', margin:'0 auto'}} />
          <h2>Ready to Analyze</h2>
          <p className="text-muted">We'll compare your resume skills against the JD requirements</p>

          {/* Show prerequisite status */}
          <div style={{display:'flex', gap:12, justifyContent:'center', margin:'16px 0', flexWrap:'wrap'}}>
            <span className={`badge ${hasSkills ? 'badge-success' : 'badge-error'}`}>
              {hasSkills ? '✓' : '✗'} Resume Skills
            </span>
            <span className={`badge ${hasJD ? 'badge-success' : 'badge-error'}`}>
              {hasJD ? '✓' : '✗'} JD Requirements
            </span>
          </div>

          {error && error !== 'resume_missing' && error !== 'jd_missing' && (
            <div className="form-error" style={{justifyContent:'center'}}><AlertTriangle size={16}/> {error}</div>
          )}
          <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={loading} style={{margin:'0 auto'}}>
            {loading ? <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Analyzing...</> : <><Zap size={18}/> Run Gap Analysis</>}
          </button>
        </div>
      ) : (
        <div className="analysis-results animate-slide">
          <div className="readiness-banner glass-card">
            <div className="readiness-circle">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-hover)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#aGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${Math.max(0, Number(data?.overallReadiness || 0)) * 2.64} 264`} transform="rotate(-90 50 50)"/>
                <defs><linearGradient id="aGrad"><stop offset="0%" stopColor="var(--indigo)"/><stop offset="100%" stopColor="var(--teal)"/></linearGradient></defs>
              </svg>
              <span className="readiness-pct">{Math.max(0, Number(data?.overallReadiness || 0))}%</span>
            </div>
            <div>
              <h2>Job Readiness Score</h2>
              <p className="text-muted">Based on resume evidence and JD requirements</p>
            </div>
          </div>

          <div className="grid-2 gap-sections">
            <div className="glass-card gap-section">
              <h3><CheckCircle size={18} className="text-success"/> Matched Skills ({data.gapAnalysis?.matches?.length || 0})</h3>
              <div className="skill-tags">{data.gapAnalysis?.matches?.map((s,i)=><span key={i} className="badge badge-success">{s}</span>)}</div>
            </div>
            <div className="glass-card gap-section">
              <h3><AlertTriangle size={18} className="text-warning"/> Partial Matches ({data.gapAnalysis?.partialMatches?.length || 0})</h3>
              <div className="skill-tags">{data.gapAnalysis?.partialMatches?.map((s,i)=><span key={i} className="badge badge-warning">{s}</span>)}</div>
            </div>
            <div className="glass-card gap-section">
              <h3><XCircle size={18} className="text-error"/> Missing Skills ({data.gapAnalysis?.missing?.length || 0})</h3>
              <div className="skill-tags">{data.gapAnalysis?.missing?.map((s,i)=><span key={i} className="badge badge-error">{s}</span>)}</div>
            </div>
            <div className="glass-card gap-section">
              <h3><AlertTriangle size={18} style={{color:'var(--info)'}}/> Weak Areas ({data.gapAnalysis?.weakAreas?.length || 0})</h3>
              <div className="skill-tags">{data.gapAnalysis?.weakAreas?.map((s,i)=><span key={i} className="badge badge-indigo">{s}</span>)}</div>
            </div>
          </div>

          {data.recommendations?.length > 0 && (
            <div className="glass-card recommendations">
              <h3>Recommendations</h3>
              <ul>{data.recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul>
            </div>
          )}

          {error && error !== 'resume_missing' && error !== 'jd_missing' && (
            <div className="form-error" style={{marginTop: 16, justifyContent: 'center', backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--error)'}}>
              <AlertTriangle size={16}/> {error}
            </div>
          )}

          <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:24}}>
            <button className="btn btn-primary" onClick={()=>navigate('/assessment')}><Zap size={18}/> Take Assessment <ArrowRight size={18}/></button>
            <button className="btn btn-secondary" onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing...' : 'Re-analyze'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
