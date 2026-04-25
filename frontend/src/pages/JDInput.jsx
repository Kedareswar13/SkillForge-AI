import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { processJD } from '../api';
import { Briefcase, Type, Upload, Link as LinkIcon, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import './FormPages.css';

export default function JDInput() {
  const [mode, setMode] = useState('text'); // text, pdf, url
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      let payload;
      if (mode === 'pdf' && jdFile) {
        payload = new FormData();
        payload.append('jdFile', jdFile);
      } else if (mode === 'url' && jdUrl) {
        payload = { jdUrl };
      } else if (mode === 'text' && jdText) {
        payload = { jdText };
      } else {
        setError('Please provide job description content');
        setLoading(false); return;
      }
      const { data } = await processJD(payload);
      setResult(data);
      await refreshProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process JD');
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade">
        <h1>Job Description</h1>
        <p>Add the target job description for skill gap analysis</p>
      </div>

      {!result ? (
        <div className="form-card glass-card animate-slide">
          <div className="mode-tabs">
            {[
              { key: 'text', icon: Type, label: 'Paste Text' },
              { key: 'pdf', icon: Upload, label: 'Upload PDF' },
              { key: 'url', icon: LinkIcon, label: 'From URL' },
            ].map(m => (
              <button key={m.key} className={`mode-tab ${mode === m.key ? 'active' : ''}`} onClick={() => setMode(m.key)}>
                <m.icon size={16} /> {m.label}
              </button>
            ))}
          </div>

          {mode === 'text' && (
            <div className="input-group">
              <label>Job Description</label>
              <textarea className="input" value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste the full job description here..." rows={10} />
            </div>
          )}
          {mode === 'pdf' && (
            <div className="input-group">
              <label>Upload JD PDF</label>
              <input type="file" accept=".pdf" onChange={e => setJdFile(e.target.files[0])} className="input" />
            </div>
          )}
          {mode === 'url' && (
            <div className="input-group">
              <label>Job Posting URL</label>
              <input className="input" type="url" value={jdUrl} onChange={e => setJdUrl(e.target.value)} placeholder="https://company.com/jobs/role" />
            </div>
          )}

          {error && <div className="form-error"><AlertCircle size={16} /> {error}</div>}
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} style={{width:'100%'}}>
            {loading ? <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Analyzing JD...</> : <><Briefcase size={18}/> Analyze Job Description</>}
          </button>
        </div>
      ) : (
        <div className="result-card glass-card animate-slide">
          <div className="result-header">
            <CheckCircle size={32} className="success-icon" />
            <h2>JD Processed Successfully!</h2>
          </div>
          {result.jdSkills?.roleType && <p className="role-type"><strong>Role:</strong> {result.jdSkills.roleType}</p>}
          <div className="result-skills">
            <h3>Required Skills</h3>
            <div className="skill-tags">
              {result.jdSkills?.required?.map((s, i) => <span key={i} className="badge badge-error">{s}</span>)}
            </div>
          </div>
          <div className="result-skills">
            <h3>Preferred Skills</h3>
            <div className="skill-tags">
              {result.jdSkills?.preferred?.map((s, i) => <span key={i} className="badge badge-warning">{s}</span>)}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/analysis')}>
            Next: Run Gap Analysis <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
