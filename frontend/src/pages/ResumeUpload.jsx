import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadResume } from '../api';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import './FormPages.css';

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') { setFile(f); setError(''); }
    else setError('Only PDF files are accepted');
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await uploadResume(formData);
      setResult(data);
      await refreshProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process resume');
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade">
        <h1>Upload Resume</h1>
        <p>Upload your PDF resume for intelligent skill extraction</p>
      </div>

      {!result ? (
        <div className="form-card glass-card animate-slide">
          <div className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf" hidden onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <div className="file-selected">
                <FileText size={40} className="file-icon" />
                <p className="file-name">{file.name}</p>
                <span className="text-muted">{(file.size / 1024).toFixed(0)} KB</span>
                <button className="remove-file" onClick={e => { e.stopPropagation(); setFile(null); }}><X size={16} /></button>
              </div>
            ) : (
              <div className="drop-content">
                <div className="drop-icon"><Upload size={32} /></div>
                <p>Drop your resume PDF here</p>
                <span className="text-muted">or click to browse</span>
              </div>
            )}
          </div>
          {error && <div className="form-error"><AlertCircle size={16} /> {error}</div>}
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!file || loading} style={{width:'100%'}}>
            {loading ? (
              <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Processing with AI...</>
            ) : (
              <><span>Analyze Resume</span><ArrowRight size={18}/></>
            )}
          </button>
        </div>
      ) : (
        <div className="result-card glass-card animate-slide">
          <div className="result-header">
            <CheckCircle size={32} className="success-icon" />
            <h2>Resume Processed Successfully!</h2>
          </div>
          <div className="result-skills">
            <h3>Extracted Skills ({result.skills?.length || 0})</h3>
            <div className="skill-tags">
              {result.skills?.map((s, i) => (
                <span key={i} className={`badge badge-${s.level === 'expert' ? 'success' : s.level === 'advanced' ? 'teal' : s.level === 'intermediate' ? 'indigo' : 'warning'}`}>
                  {s.name} • {s.level}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/jd')}>
            Next: Add Job Description <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
