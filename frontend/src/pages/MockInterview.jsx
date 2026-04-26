import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { startMockInterview, evaluateMockAnswer } from '../api';
import { Swords, Play, Send, Star, ChevronRight, RefreshCw } from 'lucide-react';
import './MockInterview.css';

export default function MockInterview() {
  const { refreshProfile } = useAuth();
  const [phase, setPhase] = useState('setup'); // setup, interview, done
  const [type, setType] = useState('jd_based');
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await startMockInterview({ type });
      setQuestions(data.questions || []);
      setCurrentQ(0); setEvaluations([]); setPhase('interview');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate questions');
    }
    setLoading(false);
  };

  const handleAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const q = questions[currentQ];
      const { data } = await evaluateMockAnswer({
        question: q.question, answer, skill: q.skill, level: q.difficulty
      });
      const newEvaluation = { ...data, question: q.question, userAnswer: answer };
      const newEvaluationsList = [...evaluations, newEvaluation];
      setEvaluations(newEvaluationsList);
      setAnswer('');
      if (currentQ + 1 >= questions.length) {
        const finalAvgScore = (newEvaluationsList.reduce((s, e) => s + (e.score || 0), 0) / newEvaluationsList.length).toFixed(1);
        try {
          // Import saveMockInterview dynamically if not already imported at top
          const { saveMockInterview } = await import('../api');
          await saveMockInterview({ type, avgScore: parseFloat(finalAvgScore), evaluations: newEvaluationsList });
          await refreshProfile(); // Refresh profile state immediately
        } catch (e) {
          console.error("Failed to save mock interview:", e);
        }
        setPhase('done');
      }
      else setCurrentQ(prev => prev + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Evaluation failed');
    }
    setLoading(false);
  };

  const avgScore = evaluations.length ? (evaluations.reduce((s, e) => s + (e.score || 0), 0) / evaluations.length).toFixed(1) : 0;

  return (
    <div className="page-container">
      <div className="page-header animate-fade"><h1>Mock Interview</h1><p>Practice with AI-generated interview questions</p></div>

      {phase === 'setup' && (
        <div className="form-card glass-card animate-slide" style={{textAlign:'center'}}>
          <Swords size={56} style={{color:'var(--teal)',margin:'0 auto'}}/>
          <h2>Choose Interview Type</h2>
          <div className="mode-tabs" style={{maxWidth:400,margin:'0 auto'}}>
            {[{k:'jd_based',l:'JD-Based'},{k:'skill_specific',l:'Skill-Based'},{k:'mixed',l:'Mixed'}].map(m => (
              <button key={m.k} className={`mode-tab ${type===m.k?'active':''}`} onClick={()=>setType(m.k)}>{m.l}</button>
            ))}
          </div>
          {error && <div className="form-error" style={{justifyContent:'center'}}>{error}</div>}
          <button className="btn btn-primary btn-lg" onClick={handleStart} disabled={loading} style={{margin:'0 auto'}}>
            {loading ? <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Generating...</> : <><Play size={18}/> Start Interview</>}
          </button>
        </div>
      )}

      {phase === 'interview' && questions[currentQ] && (
        <div className="assessment-flow animate-slide" style={{maxWidth:700,margin:'0 auto'}}>
          <div className="assessment-progress">
            <div className="progress-bar"><div className="progress-bar-fill" style={{width:`${((currentQ+1)/questions.length)*100}%`}}></div></div>
            <span className="text-muted text-sm">Q{currentQ+1}/{questions.length}</span>
          </div>
          <div className="glass-card question-card">
            <div className="question-meta">
              <span className="badge badge-teal">{questions[currentQ].skill}</span>
              <span className="badge badge-indigo">{questions[currentQ].type}</span>
            </div>
            <h3 className="question-text">{questions[currentQ].question}</h3>
            {questions[currentQ].tips && <p className="text-muted text-sm" style={{fontStyle:'italic'}}>💡 {questions[currentQ].tips}</p>}
            <textarea className="input" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer..." rows={5}/>
            <button className="btn btn-primary" onClick={handleAnswer} disabled={loading || !answer.trim()} style={{width:'100%'}}>
              {loading ? <><div className="spinner" style={{width:20,height:20,borderWidth:2}}></div> Evaluating...</> : <><Send size={18}/> Submit</>}
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="mock-results animate-slide" style={{maxWidth:700,margin:'0 auto'}}>
          <div className="glass-card" style={{textAlign:'center',marginBottom:24}}>
            <h2>Interview Complete!</h2>
            <div className="mock-avg-score">
              <span className="gradient-text" style={{fontSize:'3rem',fontWeight:800}}>{avgScore}</span>
              <span className="text-muted">/5 avg</span>
            </div>
            <button className="btn btn-secondary" onClick={()=>{setPhase('setup');setEvaluations([]);setQuestions([]);}}><RefreshCw size={16}/> Try Again</button>
          </div>
          {evaluations.map((ev,i) => (
            <div key={i} className="glass-card" style={{marginBottom:12}}>
              <p style={{fontWeight:600,marginBottom:8}}>Q{i+1}: {ev.question}</p>
              <p className="text-muted text-sm" style={{marginBottom:8}}><strong>Your answer:</strong> {ev.userAnswer}</p>
              <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:8,color:'var(--warning)'}}>
                {[...Array(5)].map((_,j)=><Star key={j} size={16} fill={j<ev.score?'currentColor':'none'}/>)}<span style={{marginLeft:8,color:'var(--text-primary)',fontWeight:700}}>{ev.score}/5</span>
              </div>
              <p className="text-muted text-sm">{ev.feedback}</p>
              {ev.improvements?.length > 0 && <p className="text-sm" style={{color:'var(--warning)',marginTop:4}}>💡 {ev.improvements.join('. ')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
