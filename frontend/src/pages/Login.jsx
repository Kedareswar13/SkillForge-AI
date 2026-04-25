import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginAPI } from '../api';
import { Zap, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await loginAPI({ email, password });
      loginUser(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1"></div>
        <div className="auth-orb auth-orb-2"></div>
        <div className="auth-grid-lines"></div>
      </div>
      <div className="auth-container animate-fade">
        <div className="auth-header">
          <div className="auth-brand">
            <div className="brand-icon-lg"><Zap size={28} /></div>
            <h1>SkillForge <span>AI</span></h1>
          </div>
          <p className="auth-subtitle">
            <Sparkles size={16} /> Intelligent Skill Assessment Platform
          </p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="form-desc">Sign in to continue your skill journey</p>
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label><Mail size={14} /> Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="input-group">
            <label><Lock size={14} /> Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{width:'100%'}}>
            {loading ? <div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> : <><span>Sign In</span><ArrowRight size={18}/></>}
          </button>
          <p className="auth-switch">Don't have an account? <Link to="/signup">Sign up</Link></p>
        </form>
      </div>
    </div>
  );
}
