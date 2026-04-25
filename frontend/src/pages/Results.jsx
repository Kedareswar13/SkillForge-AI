import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAssessmentHistory } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Clock, Map, ArrowRight, RotateCcw, Brain } from 'lucide-react';

export default function Results() {
  const [assessments, setAssessments] = useState([]);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getAssessmentHistory().then(r => setAssessments(r.data)).catch(() => {});
  }, []);

  const latest = assessments[0];
  const chartData = latest?.finalScores?.map(s => ({ name: s.skill, confidence: s.confidence })) || [];

  return (
    <div className="page-container">
      <div className="page-header animate-fade">
        <h1>Assessment Results</h1>
        <p>Your skill assessment history and scores</p>
      </div>

      {latest ? (
        <div className="animate-slide">
          <div className="glass-card" style={{marginBottom:24}}>
            <h3 style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}><Trophy size={18} style={{color:'var(--warning)'}}/> Latest Assessment</h3>
            <p className="text-muted text-sm" style={{marginBottom:16}}>
              <Clock size={14}/> {new Date(latest.startedAt).toLocaleDateString()} • {latest.finalScores?.length || 0} skills assessed
            </p>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)'}}/>
                  <Bar dataKey="confidence" fill="url(#rGrad)" radius={[6,6,0,0]}/>
                  <defs><linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--indigo)"/><stop offset="100%" stopColor="var(--teal)"/></linearGradient></defs>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:16}}>
              {latest.finalScores?.map((s,i) => (
                <div key={i} className="glass-card" style={{padding:'12px 16px',flex:'1 1 200px'}}>
                  <div style={{fontWeight:600}}>{s.skill}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                    <span className={`badge badge-${s.level==='expert'?'success':s.level==='advanced'?'teal':'indigo'}`}>{s.level}</span>
                    <span className="text-muted text-sm">{s.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="glass-card" style={{marginBottom:24}}>
            <h3 style={{marginBottom:16}}>Next Steps</h3>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={() => navigate('/roadmap')}>
                <Map size={18}/> View Learning Roadmap <ArrowRight size={16}/>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/assessment')}>
                <RotateCcw size={16}/> Retake Assessment
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/profile')}>
                View Profile
              </button>
            </div>
          </div>

          {assessments.length > 1 && (
            <div className="glass-card">
              <h3>Assessment History</h3>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
                {assessments.slice(1).map((a,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                    <span>{new Date(a.startedAt).toLocaleDateString()}</span>
                    <span className={`badge badge-${a.status==='completed'?'success':'warning'}`}>{a.status}</span>
                    <span className="text-muted">{a.finalScores?.length || 0} skills</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card animate-slide" style={{textAlign:'center',padding:48}}>
          <Brain size={48} style={{color:'var(--text-muted)',margin:'0 auto 16px'}}/>
          <h2>No Assessments Yet</h2>
          <p className="text-muted" style={{marginBottom:16}}>Complete an assessment to see your results here</p>
          <button className="btn btn-primary" onClick={() => navigate('/assessment')}>
            <Brain size={18}/> Take Assessment <ArrowRight size={16}/>
          </button>
        </div>
      )}
    </div>
  );
}
