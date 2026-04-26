import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { startAssessment, submitAnswer, getAssessmentHistory } from '../api';
import { Brain, Send, ArrowRight, CheckCircle, Star, ChevronRight, RotateCcw, Trophy } from 'lucide-react';
import './Assessment.css';

export default function Assessment() {
  const [phase, setPhase] = useState('loading'); // loading, start, question, complete
  const [assessmentId, setAssessmentId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [totalSkills, setTotalSkills] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finalScores, setFinalScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previousAssessment, setPreviousAssessment] = useState(null);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Check for existing completed assessments on mount
  useEffect(() => {
    checkExistingAssessment();
  }, []);

  const checkExistingAssessment = async () => {
    try {
      const { data } = await getAssessmentHistory();
      const completed = data.find(a => a.status === 'completed');
      if (completed) {
        setPreviousAssessment(completed);
        setFinalScores(completed.finalScores || []);
        setPhase('complete');
      } else {
        setPhase('start');
      }
    } catch {
      setPhase('start');
    }
  };

  const handleStart = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await startAssessment();
      setAssessmentId(data.assessmentId);
      setQuestion({ skill: data.currentSkill, level: data.currentLevel, text: data.question });
      setTotalSkills(data.totalSkills);
      setCurrentIdx(data.currentSkillIndex);
      setPhase('question');
    } catch (err) {
      const serverError = err.response?.data?.error || '';
      if (serverError.toLowerCase().includes('resume')) {
        setError('Please upload your resume first before starting the assessment.');
        setTimeout(() => navigate('/resume'), 2500);
      } else if (serverError.toLowerCase().includes('job description') || serverError.toLowerCase().includes('analysis')) {
        setError('Please complete the gap analysis first before starting the assessment.');
        setTimeout(() => navigate('/analysis'), 2500);
      } else {
        setError(serverError || 'Failed to start assessment');
      }
    }
    setLoading(false);
  };

  const handleSkip = () => {
    // Submit a canned "I don't know" response
    setAnswer("I don't know the answer to this question.");
    // We need to wait for state to update, so we pass the string directly to a custom submit handler
    submitAnswerDirectly("I don't know the answer to this question.");
  };

  const submitAnswerDirectly = async (answerText) => {
    setLoading(true); setEvaluation(null);
    try {
      const { data } = await submitAnswer({ assessmentId, answer: answerText });
      setEvaluation(data.evaluation);
      if (data.isComplete) {
        setFinalScores(data.finalScores || []);
        setTimeout(() => { setPhase('complete'); refreshProfile(); }, 2000);
      } else if (data.nextQuestion) {
        setTimeout(() => {
          setQuestion({ skill: data.nextQuestion.skill, level: data.nextQuestion.level, text: data.nextQuestion.question });
          setCurrentIdx(data.nextQuestion.currentSkillIndex);
          setAnswer(''); setEvaluation(null);
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit answer');
    }
    setLoading(false);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    submitAnswerDirectly(answer);
  };

  if (phase === 'loading') {
    return (
      <div className="page-container">
        <div className="form-card glass-card animate-slide" style={{textAlign:'center',padding:48}}>
          <div className="spinner" style={{width:40,height:40,margin:'0 auto 16px'}}></div>
          <p className="text-muted">Loading assessment status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header animate-fade">
        <h1>Adaptive Assessment</h1>
        <p>AI-guided skill validation — questions adapt to your level</p>
      </div>

      {phase === 'start' && (
        <div className="form-card glass-card animate-slide" style={{textAlign:'center'}}>
          <Brain size={56} style={{color:'var(--indigo)',margin:'0 auto'}}/>
          <h2>Skill Assessment</h2>
          <p className="text-muted">The system will ask you skill-by-skill questions starting from your inferred level. Answer naturally — difficulty adjusts based on your responses.</p>
          {previousAssessment && (
            <div className="glass-card" style={{background:'rgba(99,102,241,0.06)', padding:'12px 16px', marginBottom:16, borderLeft:'3px solid var(--indigo)'}}>
              <p className="text-sm" style={{margin:0}}>
                <Trophy size={14} style={{verticalAlign:'middle', marginRight:6}}/> 
                You previously completed an assessment on {new Date(previousAssessment.completedAt).toLocaleDateString()} with {previousAssessment.finalScores?.length || 0} skills.
                Taking a new assessment will update your scores.
              </p>
            </div>
          )}
          {error && <div className="form-error" style={{justifyContent:'center'}}>{error}</div>}
          <button className="btn btn-primary btn-lg" onClick={handleStart} disabled={loading} style={{margin:'0 auto'}}>
            {loading ? <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Preparing...</> : <>{previousAssessment ? <><RotateCcw size={18}/> Retake Assessment</> : <>Start Assessment <ArrowRight size={18}/></>}</>}
          </button>
        </div>
      )}

      {phase === 'question' && question && (
        <div className="assessment-flow animate-slide">
          <div className="assessment-progress">
            <div className="progress-bar"><div className="progress-bar-fill" style={{width:`${((currentIdx+1)/totalSkills)*100}%`}}></div></div>
            <span className="text-muted text-sm">Skill {currentIdx + 1} of {totalSkills}</span>
          </div>
          <div className="glass-card question-card">
            <div className="question-meta">
              <span className="badge badge-indigo">{question.skill}</span>
              <span className={`badge badge-${question.level === 'expert' ? 'success' : question.level === 'advanced' ? 'teal' : question.level === 'intermediate' ? 'warning' : 'indigo'}`}>
                {question.level}
              </span>
            </div>
            <h3 className="question-text">{question.text}</h3>
            {evaluation && (
              <div className={`eval-card ${evaluation.score >= 4 ? 'eval-good' : evaluation.score >= 2 ? 'eval-ok' : 'eval-low'}`}>
                <div className="eval-score">
                  {[...Array(5)].map((_, i) => <Star key={i} size={18} fill={i < evaluation.score ? 'currentColor' : 'none'} />)}
                  <span>{evaluation.score}/5</span>
                </div>
                <p>{evaluation.reasoning}</p>
                <span className="text-sm">Level → <strong>{evaluation.updatedLevel}</strong></span>
              </div>
            )}
            {!evaluation && (
              <>
                <textarea className="input" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer here..." rows={5} />
                <div style={{display: 'flex', gap: '12px'}}>
                  <button className="btn btn-secondary" onClick={handleSkip} disabled={loading} style={{flex: 1}}>
                    Skip Question
                  </button>
                  <button className="btn btn-primary" onClick={handleSubmitAnswer} disabled={loading || !answer.trim()} style={{flex: 2}}>
                    {loading ? <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Evaluating...</> : <><Send size={18}/> Submit Answer</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="form-card glass-card animate-slide" style={{textAlign:'center'}}>
          <CheckCircle size={56} style={{color:'var(--success)',margin:'0 auto'}}/>
          <h2>Assessment Complete!</h2>
          <p className="text-muted" style={{marginBottom:16}}>Your skill levels have been updated based on this assessment.</p>
          <div className="final-scores">
            {finalScores.map((s,i) => (
              <div key={i} className="score-row">
                <span>{s.skill}</span>
                <span className="badge badge-teal">{s.level}</span>
                <div className="progress-bar" style={{width:100}}><div className="progress-bar-fill" style={{width:`${s.confidence}%`}}></div></div>
                <span>{s.confidence}%</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={()=>navigate('/roadmap')}>View Learning Roadmap <ArrowRight size={18}/></button>
            <button className="btn btn-secondary" onClick={()=>navigate('/results')}>Detailed Results <ChevronRight size={18}/></button>
            <button className="btn btn-ghost" onClick={() => { setPreviousAssessment({finalScores}); setPhase('start'); }}>
              <RotateCcw size={16}/> Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
