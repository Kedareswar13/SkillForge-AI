import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateLearningPlan, updateProgress, getAssessmentHistory, getValidationQuestion, submitValidationAnswer } from '../api';
import { Map, BookOpen, Clock, ArrowRight, ChevronDown, ChevronUp, ExternalLink, Zap, ArrowDown, CheckCircle, Lock, Brain, Target, Send, Star } from 'lucide-react';
import './LearningRoadmap.css';

export default function LearningRoadmap() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [hasAssessment, setHasAssessment] = useState(null);
  
  const [validatingIndex, setValidatingIndex] = useState(null);
  const [validatingResourceIndex, setValidatingResourceIndex] = useState(null);
  const [valQuestion, setValQuestion] = useState('');
  const [valAnswer, setValAnswer] = useState('');
  const [valResult, setValResult] = useState(null);
  const [valLoading, setValLoading] = useState(false);

  const plan = profile?.learningPlan || [];

  useEffect(() => {
    // Check if assessment exists
    getAssessmentHistory()
      .then(r => {
        const completed = r.data?.find(a => a.status === 'completed');
        setHasAssessment(!!completed);
      })
      .catch(() => setHasAssessment(false));
  }, []);

  const handleGenerate = async () => {
    setLoading(true); setError('');
    try {
      await generateLearningPlan();
      await refreshProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate plan');
    }
    setLoading(false);
  };

  const handleProgress = async (index, val) => {
    try {
      await updateProgress(index, val);
      await refreshProfile();
    } catch (e) { /* ignore */ }
  };

  const toggle = (i) => {
    if (expanded[i]) {
      setValidatingIndex(null);
      setValidatingResourceIndex(null);
    }
    setExpanded(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const handleStartValidation = async (index, resourceIndex = undefined, e) => {
    if (e) e.stopPropagation();
    if (validatingIndex === index && validatingResourceIndex === resourceIndex) { 
      setValidatingIndex(null); 
      setValidatingResourceIndex(null);
      return; 
    }
    setValidatingIndex(index); 
    setValidatingResourceIndex(resourceIndex);
    setValQuestion(''); setValAnswer(''); setValResult(null); setValLoading(true);
    try {
      const { data } = await getValidationQuestion(index, resourceIndex);
      setValQuestion(data.question);
    } catch (err) {
      setError('Failed to generate validation question');
      setValidatingIndex(null);
      setValidatingResourceIndex(null);
    }
    setValLoading(false);
  };

  const handleSubmitValidation = async (index) => {
    if (!valAnswer.trim()) return;
    setValLoading(true); setValResult(null);
    try {
      const { data } = await submitValidationAnswer(index, { 
        question: valQuestion, 
        answer: valAnswer,
        resourceIndex: validatingResourceIndex
      });
      setValResult(data);
      if (data.passed) {
        await refreshProfile();
      }
    } catch (err) {
      setError('Failed to evaluate answer');
    }
    setValLoading(false);
  };

  const renderValidationBox = (i) => (
    <div className="validation-box glass-card" style={{marginTop:12, padding:16, borderLeft:'3px solid var(--indigo)'}}>
      {valLoading && !valQuestion && !valResult ? (
        <div style={{display:'flex', alignItems:'center', gap:8, color:'var(--text-muted)'}}><div className="spinner" style={{width:16,height:16,borderWidth:2}}></div> Generating question...</div>
      ) : valResult ? (
        <div className={`eval-card ${valResult.passed ? 'eval-good' : 'eval-low'}`} style={{margin:0}}>
          <div className="eval-score">
            {[...Array(5)].map((_, idx) => <Star key={idx} size={16} fill={idx < valResult.score ? 'currentColor' : 'none'} />)}
            <span>{valResult.score}/5</span>
          </div>
          <p className="text-sm" style={{margin:'8px 0'}}>{valResult.reasoning}</p>
          {valResult.passed ? (
            <div className="text-sm" style={{color:'var(--success)', fontWeight:600, marginTop:8}}><CheckCircle size={14}/> Validation Passed! Progress updated.</div>
          ) : (
            <div className="text-sm" style={{color:'var(--warning)', marginTop:8}}>Not quite there yet. Keep studying and try again!</div>
          )}
          <button className="btn btn-ghost btn-sm" style={{marginTop:12}} onClick={() => {setValidatingIndex(null); setValidatingResourceIndex(null)}}>Close</button>
        </div>
      ) : valQuestion ? (
        <div className="animate-fade">
          <p style={{fontWeight:600, fontSize:'0.9rem', margin:'0 0 12px 0'}}>{valQuestion}</p>
          <textarea className="input" value={valAnswer} onChange={e => setValAnswer(e.target.value)} placeholder="Type your answer here to validate..." rows={3} style={{fontSize:'0.9rem'}}/>
          <div style={{display:'flex', gap:8, marginTop:12}}>
            <button className="btn btn-primary btn-sm" onClick={() => handleSubmitValidation(i)} disabled={valLoading || !valAnswer.trim()}>
              {valLoading ? 'Evaluating...' : <><Send size={14}/> Submit Answer</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => {setValidatingIndex(null); setValidatingResourceIndex(null)}}>Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const getStatusInfo = (item, index) => {
    if (item.completed || (item.progress || 0) >= 100) return { status: 'completed', color: 'var(--success)', icon: CheckCircle };
    if (index === 0 || plan[index - 1]?.progress >= 50) return { status: 'active', color: 'var(--indigo)', icon: Target };
    return { status: 'locked', color: 'var(--text-muted)', icon: Lock };
  };

  // Calculate overall progress
  const overallProgress = plan.length > 0 
    ? Math.round(plan.reduce((sum, item) => sum + (item.progress || 0), 0) / plan.length) 
    : 0;

  const completedCount = plan.filter(item => (item.progress || 0) >= 100).length;

  return (
    <div className="page-container">
      <div className="page-header animate-fade">
        <h1>Learning Roadmap</h1>
        <p>Personalized skill growth path — learn in the right order</p>
      </div>

      {plan.length === 0 ? (
        <div className="form-card glass-card animate-slide" style={{textAlign:'center'}}>
          <Map size={56} style={{color:'var(--teal)',margin:'0 auto'}}/>
          <h2>Generate Your Roadmap</h2>
          <p className="text-muted">We'll create a personalized learning path based on your skill gaps and current levels</p>
          
          {hasAssessment === false && (
            <div className="glass-card" style={{background:'rgba(234,179,8,0.08)', padding:'12px 16px', marginBottom:16, borderLeft:'3px solid var(--warning)'}}>
              <p className="text-sm" style={{margin:0}}>
                <Brain size={14} style={{verticalAlign:'middle', marginRight:6}}/> 
                <strong>Tip:</strong> Take the skill assessment first for a more accurate roadmap based on your real proficiency.
              </p>
            </div>
          )}
          
          {error && <div className="form-error" style={{justifyContent:'center'}}>{error}</div>}
          <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={loading} style={{margin:'0 auto'}}>
            {loading ? <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Generating...</> : <><Zap size={18}/> Generate Roadmap</>}
          </button>
        </div>
      ) : (
        <div className="roadmap-flow animate-slide">
          {/* Overview Stats */}
          <div className="roadmap-overview glass-card">
            <div className="roadmap-overview-stats">
              <div className="overview-stat">
                <span className="overview-num">{plan.length}</span>
                <span className="text-muted text-sm">Skills</span>
              </div>
              <div className="overview-stat">
                <span className="overview-num">{completedCount}</span>
                <span className="text-muted text-sm">Completed</span>
              </div>
              <div className="overview-stat">
                <span className="overview-num">{overallProgress}%</span>
                <span className="text-muted text-sm">Overall</span>
              </div>
            </div>
            <div className="progress-bar" style={{height:8}}>
              <div className="progress-bar-fill" style={{width:`${overallProgress}%`}}></div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={loading} style={{marginTop:12}}>
              {loading ? 'Regenerating...' : 'Regenerate Roadmap'}
            </button>
          </div>

          {/* Visual Flow Graph */}
          <div className="flow-graph">
            {/* Start Node */}
            <div className="flow-start-node">
              <div className="flow-start-icon"><Zap size={20}/></div>
              <span>Your Current Skills</span>
            </div>
            <div className="flow-connector"><ArrowDown size={20}/></div>

            {plan.map((item, i) => {
              const { status, color, icon: StatusIcon } = getStatusInfo(item, i);
              const isExpanded = expanded[i];
              return (
                <div key={i} className="flow-node-wrapper">
                  <div className={`flow-node glass-card flow-${status}`}>
                    {/* Node Header */}
                    <div className="flow-node-header" onClick={() => toggle(i)} style={{cursor:'pointer'}}>
                      <div className="flow-node-num" style={{borderColor: color, color}}>
                        <StatusIcon size={16}/>
                      </div>
                      <div className="flow-node-info">
                        <h3 className="flow-node-title">{item.skill}</h3>
                        <div className="flow-node-meta">
                          <span className="badge badge-indigo">{item.currentLevel} → {item.targetLevel}</span>
                          {item.timeEstimate && <span className="text-muted text-sm"><Clock size={12}/> {item.timeEstimate}</span>}
                        </div>
                      </div>
                      <div className="flow-node-right">
                        <div className="flow-progress-ring">
                          <svg viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--bg-hover)" strokeWidth="3"/>
                            <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
                              strokeDasharray={`${(item.progress||0)*0.88} 88`} strokeLinecap="round"
                              transform="rotate(-90 18 18)" style={{transition:'stroke-dasharray 0.5s ease'}}/>
                          </svg>
                          <span className="flow-progress-text">{item.progress||0}%</span>
                        </div>
                        {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="flow-node-body">
                        {item.reason && <p className="flow-reason">{item.reason}</p>}
                        
                        {item.depends_on?.length > 0 && (
                          <div className="flow-prereqs">
                            <h4>Prerequisites</h4>
                            <div className="flow-prereq-tags">
                              {item.depends_on.map((dep, j) => (
                                <span key={j} className="badge badge-teal">{dep}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.steps?.length > 0 && (
                          <div className="flow-steps">
                            <h4>Learning Steps</h4>
                            <div className="flow-step-list">
                              {item.steps.map((s, j) => (
                                <div key={j} className="flow-step-item">
                                  <div className="flow-step-dot">{j + 1}</div>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.resources?.length > 0 && (
                          <div className="flow-resources">
                            <h4><BookOpen size={14}/> Resources</h4>
                            {item.resources.map((r, j) => (
                              <div key={j} style={{display:'flex', flexDirection:'column', gap:8}}>
                                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                                  <a href={r.url} target="_blank" rel="noreferrer" className="resource-link" style={{flex:1}}>
                                    <BookOpen size={14}/> {r.title}
                                    <span className="badge badge-teal" style={{marginLeft:'auto'}}>{r.type}</span>
                                    <ExternalLink size={12}/>
                                  </a>
                                  {r.completed ? (
                                    <span className="badge badge-success" style={{display:'flex', alignItems:'center', gap:4, height:'fit-content', padding:'6px 10px'}}><CheckCircle size={14}/> Done</span>
                                  ) : (
                                    <button 
                                      className="btn btn-secondary btn-sm" 
                                      onClick={(e) => handleStartValidation(i, j, e)}
                                      disabled={valLoading && validatingIndex === i && validatingResourceIndex === j}
                                    >
                                      <Brain size={14}/> Validate
                                    </button>
                                  )}
                                </div>
                                {validatingIndex === i && validatingResourceIndex === j && renderValidationBox(i)}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flow-progress-control">
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <label className="text-sm" style={{fontWeight:600}}>Overall Skill Progress</label>
                            {(item.progress||0) < 100 && (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={(e) => handleStartValidation(i, undefined, e)}
                                disabled={valLoading && validatingIndex === i && validatingResourceIndex === undefined}
                              >
                                <Brain size={14}/> {validatingIndex === i && validatingResourceIndex === undefined ? 'Cancel Validation' : 'Validate Overall Skill'}
                              </button>
                            )}
                          </div>
                          
                          {validatingIndex === i && validatingResourceIndex === undefined && renderValidationBox(i)}

                          <div className="flow-progress-slider" style={{marginTop: validatingIndex === i ? 16 : 8}}>
                            <input type="range" min="0" max="100" value={item.progress||0} 
                              onChange={e => handleProgress(i, parseInt(e.target.value))} 
                              className="range-input"/>
                            <span className="text-sm" style={{fontWeight:600,minWidth:40,textAlign:'right'}}>{item.progress||0}%</span>
                          </div>
                          {(item.progress||0) >= 100 && (
                            <div className="flow-complete-badge" style={{marginTop:8}}>
                              <CheckCircle size={14}/> Skill Completed!
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connector Arrow between nodes */}
                  {i < plan.length - 1 && (
                    <div className="flow-connector">
                      <ArrowDown size={20} style={{color: getStatusInfo(plan[i+1], i+1).color}}/>
                    </div>
                  )}
                </div>
              );
            })}

            {/* End Node */}
            <div className="flow-connector"><ArrowDown size={20} style={{color:'var(--success)'}}/></div>
            <div className="flow-end-node">
              <div className="flow-end-icon"><CheckCircle size={20}/></div>
              <span>Role Ready!</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
