import { useEffect, useMemo, useState } from 'react';
import { api } from '@appdeploy/client';
import { getDocument } from 'pdfjs-dist';
import {
  BookOpen, Brain, Calculator, CalendarDays, ChevronRight,
  ClipboardList, FileText, FlaskConical, GraduationCap, Home, Menu, Mic2,
  NotebookTabs, Search, Settings, Sparkles, Target, Trophy, Upload, X, Cpu, ScanLine,
} from 'lucide-react';

type Module = { title: string; description: string; icon: typeof Brain; tone: string };
type Material = { id: string; name: string; type: string; source: string; semester: number; subject: string; status: string; fileUrl?: string; unit?: string; topic?: string; version?: number };
type KnowledgeNode = { subject: string; units: Array<{ unit: string; topics: Array<{ topic: string; sources: Array<{ topic: string; materialId?: string; version: number }> }> }> };
type Task = { id: string; title: string; duration: string; done: boolean };
type McqQuestion = { question: string; options: string[]; correctIndex: number; explanation: string; topic?: string };
type ReviewCard = { id: string; topic: string; subject: string; semester: number; lastReviewed: string; nextReview: string; intervalDays: number; ease: number; repetitions: number; status: 'new' | 'due' | 'scheduled' };
type GraphTopic = { id: string; semester: number; subject: string; unit: string; topic: string; prerequisites: string[]; source: string; linkedMaterialIds?: string[]; mastery?: number; verifiedAt?: string };
type VivaEvaluation = { score: number; verdict: string; feedback: string; strengths: string[]; improvements: string[]; followUpQuestion: string; topic: string };
type TheoryEvaluation = { score:number; maxScore:number; verdict:string; feedback:string; strengths:string[]; missingPoints:string[]; improvedAnswer:string; topic:string };
type MockQuestion = { question:string; options:string[]; correctIndex:number; explanation:string; topic?:string };
type AdaptiveAttempt = { id: string; date: string; semester: number; subject: string; score: number; total: number; topics: Array<{ topic: string; correct: number; total: number }> };

const modules: Module[] = [
  { title: 'AI Teacher', description: 'Explain concepts from simple to exam-ready level.', icon: Brain, tone: 'blue' },
  { title: 'Numerical Solver', description: 'Show civil engineering calculations step by step.', icon: Calculator, tone: 'green' },
  { title: 'Exam Preparation', description: 'MCQs, theory, question banks, mocks and answer writing.', icon: GraduationCap, tone: 'violet' },
  { title: 'Lab Assistant', description: 'Experiments, observations, reports and viva preparation.', icon: FlaskConical, tone: 'orange' },
  { title: 'Viva Practice', description: 'Practice short, clear engineering viva answers.', icon: Mic2, tone: 'cyan' },
  { title: 'Project Guide', description: 'Plan mini/major projects, reports and presentations.', icon: NotebookTabs, tone: 'pink' },
  { title: 'Civil Calculators', description: 'Free engineering unit and quantity calculations with validation.', icon: Calculator, tone: 'green' },
  { title: 'Estimation & Costing', description: 'Build quantity takeoffs, BOQs and transparent project cost estimates.', icon: ClipboardList, tone: 'violet' },
  { title: 'Surveying & GIS', description: 'Survey calculations, coordinates, bearings, distances and field-data checks.', icon: Target, tone: 'cyan' },
  { title: 'AutoCAD / Revit / BIM', description: 'Free-first CAD, BIM and project workflows from beginner to portfolio level.', icon: NotebookTabs, tone: 'pink' },
  { title: 'Structural & Project Software', description: 'STAAD, ETABS, Civil 3D, Primavera/MS Project and advanced GIS learning tracks.', icon: Target, tone: 'orange' },
  { title: 'Project & Final Year Manager', description: 'Track civil projects, milestones, deliverables, evidence and final-year work.', icon: ClipboardList, tone: 'pink' },
  { title: 'Career & Internship OS', description: 'Build skills, internship readiness, portfolio evidence and career action plans.', icon: Trophy, tone: 'violet' },
  { title: 'Study Voice & Camera', description: 'Voice-first study prompts and camera question capture with verification-first answers.', icon: Mic2, tone: 'cyan' },
  { title: 'Privacy & Offline Center', description: 'Local data controls, export/reset guidance and offline-first study settings.', icon: Settings, tone: 'blue' },
  { title: 'Revision Scheduler', description: 'Spaced repetition for topics you need to remember.', icon: CalendarDays, tone: 'cyan' },
  { title: 'Adaptive Learning', description: 'Turn your scores, weak topics and reviews into the next best study action.', icon: Trophy, tone: 'violet' },
  { title: 'Drawing & Diagram AI', description: 'Study civil drawings, diagrams and sketches with image-aware explanations.', icon: ScanLine, tone: 'orange' },
  { title: 'Local AI', description: 'Run study prompts privately on your own Ollama models.', icon: Cpu, tone: 'blue' },
];

const semesters = Array.from({ length: 8 }, (_, i) => ({
  number: i + 1,
  subjects: i === 0 ? ['Mathematics - I', 'Engineering Physics', 'Engineering Graphics and Design', 'Elements of Mechanical Engineering', 'EDS AI', 'Bhartiya Knowledge System'] : i === 1 ? ['Building Materials', 'Surveying', 'Mathematics - II'] : i === 2 ? ['Structural Analysis', 'Fluid Mechanics', 'Geotechnical Engineering'] : i === 3 ? ['RCC Design', 'Environmental Engineering', 'Transportation Engineering'] : i === 4 ? ['Advanced Structural Design', 'Construction Management', 'Estimation & Costing'] : i === 5 ? ['Infrastructure Engineering', 'Water Resources', 'Elective - I'] : i === 6 ? ['Elective - II', 'Project Management', 'Professional Practice'] : ['Major Project', 'Industrial Training', 'Seminar'],
  progress: i === 0 ? 15 : i === 1 ? 8 : i === 2 ? 5 : 0,
}));

const semesterOneInternal = [
  { subject: 'Mathematics - I', portion: 'Unit 1: Successive differentiation, Leibnitz theorem, Taylor and Maclaurin expansions, indeterminate forms, Rolle theorem and mean value theorems. Unit 2: Partial derivatives of first and higher order; partial derivatives of composite functions.' },
  { subject: 'Engineering Physics', portion: 'Unit 1 and Unit 3: stated portion including optical fiber, exactly as listed in the supplied internal-exam syllabus.' },
  { subject: 'Engineering Graphics and Design', portion: 'Engineering Curves; Loci of Points; Projection of Point & Line.' },
  { subject: 'Elements of Mechanical Engineering', portion: 'Unit 1: Fundamental of Mechanical Engineering and Thermodynamics. Unit 2: Properties of Gases and Steam. Unit 3: IC Engines.' },
  { subject: 'EDS AI', portion: 'Syllabus covered by L&T Edutech; use supplied course/question-bank material as the primary source.' },
  { subject: 'Bhartiya Knowledge System', portion: 'Unit 1: Introduction to Bharatiya Knowledge System. Unit 2: Darshanas and Knowledge Traditions.' },
];

const navItems = [
  { label: 'Home', icon: Home }, { label: 'Study Materials', icon: BookOpen }, { label: 'AI Teacher', icon: Brain },
  { label: 'Numerical Solver', icon: Calculator }, { label: 'Estimation & Costing', icon: ClipboardList }, { label: 'Surveying & GIS', icon: Target }, { label: 'AutoCAD / Revit / BIM', icon: NotebookTabs }, { label: 'Exam Preparation', icon: GraduationCap }, { label: 'Lab Assistant', icon: FlaskConical },
  { label: 'Viva Practice', icon: Mic2 }, { label: 'Project Guide', icon: NotebookTabs }, { label: 'Structural & Project Software', icon: Target }, { label: 'Project & Final Year Manager', icon: ClipboardList }, { label: 'Career & Internship OS', icon: Trophy }, { label: 'Study Voice & Camera', icon: Mic2 }, { label: 'Privacy & Offline Center', icon: Settings }, { label: 'Adaptive Learning', icon: Trophy }, { label: 'Drawing & Diagram AI', icon: ScanLine }, { label: 'Local AI', icon: Cpu },
];

const defaultTasks: Task[] = [
  { id: 'math1', title: 'Mathematics - I · Unit 1–2 Revision', duration: '1 hr', done: false },
  { id: 'physics', title: 'Engineering Physics · Internal Portion', duration: '1 hr', done: false },
  { id: 'egd', title: 'Engineering Graphics · Curves & Loci', duration: '1 hr', done: false },
  { id: 'mech', title: 'Mechanical Engineering · Units 1–3', duration: '30 min', done: false },
];

function App() {
  const [active, setActive] = useState('Home');
  const [query, setQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem('civil-study-tasks') || JSON.stringify(defaultTasks)));
  const [materials, setMaterials] = useState<Material[]>(() => JSON.parse(localStorage.getItem('civil-study-materials') || '[]'));
  const [teacherTopic, setTeacherTopic] = useState('');
  const [teacherAnswer, setTeacherAnswer] = useState('');
  const [workbenchAnswer, setWorkbenchAnswer] = useState('');
  const [numerical, setNumerical] = useState('');
  const [numericalGiven, setNumericalGiven] = useState('');
  const [numericalFind, setNumericalFind] = useState('');
  const [numericalAnswer, setNumericalAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [materialForm, setMaterialForm] = useState({ name: '', subject: 'Mathematics - I', type: 'PDF / Notes', unit: '', topic: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [questionBankQuery, setQuestionBankQuery] = useState('');
  const [questionBanks, setQuestionBanks] = useState<Material[]>([]);
  const [questionBankAnalysis, setQuestionBankAnalysis] = useState<{ material: { name: string; subject: string; source: string }; analysis: { totalQuestions: number; categories: { mcq: number; theory: number; numerical: number; drawingPractical: number; other: number }; unitsOrTopics: string[]; studyAdvice: string[] } } | null>(null);
  const [questionBankPractice, setQuestionBankPractice] = useState<{ material: { id: string; name: string; subject: string; source: string }; questions: Array<{ type: string; question: string; answer?: string | null; topic?: string }> } | null>(null);
  const [adaptivePlan, setAdaptivePlan] = useState<{ summary: string; actions: Array<{ priority: string; topic: string; reason: string; action: string; minutes: number }> } | null>(null);
  const [adaptiveAttempts, setAdaptiveAttempts] = useState<AdaptiveAttempt[]>(() => JSON.parse(localStorage.getItem('civil-study-adaptive-attempts') || '[]'));
  const [mcqSubject, setMcqSubject] = useState(semesters[0].subjects[0]);
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [drawingMode, setDrawingMode] = useState('Explain the drawing step by step for a beginner');
  const [drawingAnswer, setDrawingAnswer] = useState('');
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [knowledgeSubject, setKnowledgeSubject] = useState('All subjects');
  const [knowledgeResults, setKnowledgeResults] = useState<Array<{ id: string; name: string; subject: string; type: string; source: string; status: string; fileUrl?: string; version: number; hierarchy: Array<{ unit: string; topic: string }>; score: number; snippet: string }>>([]);
  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgeNode[]>([]);
  const [knowledgeTreeOpen, setKnowledgeTreeOpen] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [mcqSet, setMcqSet] = useState<McqQuestion[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [calculatorType, setCalculatorType] = useState('Unit Converter');
  const [calculatorA, setCalculatorA] = useState('');
  const [calculatorB, setCalculatorB] = useState('');
  const [calculatorResult, setCalculatorResult] = useState('');
  const [estimateItems, setEstimateItems] = useState<Array<{ id: string; description: string; measurement: 'count' | 'length' | 'area' | 'volume'; length: string; width: string; height: string; multiplier: string; rate: string; quantity: number; amount: number }>>(() => JSON.parse(localStorage.getItem('civil-study-estimate-items') || '[]'));
  const [estimateDescription, setEstimateDescription] = useState('');
  const [estimateMeasurement, setEstimateMeasurement] = useState<'count' | 'length' | 'area' | 'volume'>('volume');
  const [estimateLength, setEstimateLength] = useState('');
  const [estimateWidth, setEstimateWidth] = useState('');
  const [estimateHeight, setEstimateHeight] = useState('');
  const [estimateMultiplier, setEstimateMultiplier] = useState('1');
  const [estimateRate, setEstimateRate] = useState('');
  const [estimateWastage, setEstimateWastage] = useState('0');
  const [estimateOverhead, setEstimateOverhead] = useState('0');
  const [estimateSummary, setEstimateSummary] = useState<{ subtotal: number; wastageAmount: number; overheadAmount: number; grandTotal: number } | null>(null);
  const [surveyMode, setSurveyMode] = useState('distance'); const [surveyValues, setSurveyValues] = useState<Record<string,string>>({}); const [surveyResult, setSurveyResult] = useState<{formula:string;value:number;units:string;verification:string}|null>(null);
  const [cadTrack, setCadTrack] = useState('AutoCAD');
  const [cadLevel, setCadLevel] = useState('Beginner');
  const [projectName, setProjectName] = useState(() => localStorage.getItem('civil-study-project-name') || 'Residential Building Project');
  const [projectStage, setProjectStage] = useState(() => localStorage.getItem('civil-study-project-stage') || 'Planning');
  const [projectTasks, setProjectTasks] = useState<string[]>(() => JSON.parse(localStorage.getItem('civil-study-project-tasks') || '[]'));
  const [careerSkills, setCareerSkills] = useState<string[]>(() => JSON.parse(localStorage.getItem('civil-study-career-skills') || '[]'));
  const [careerTarget, setCareerTarget] = useState(() => localStorage.getItem('civil-study-career-target') || 'Civil Engineering Internship');
  const [voicePrompt, setVoicePrompt] = useState('Explain a Civil Engineering topic in simple Gujarati, then give an exam-ready English summary.');
  const [cameraText, setCameraText] = useState('');
  const [offlineNotice, setOfflineNotice] = useState('');
  const [solverMode, setSolverMode] = useState('stress');
  const [solverValues, setSolverValues] = useState<Record<string, string>>({});
  const [solverResult, setSolverResult] = useState<{ formula: string; variables: string; value: number; units: string; verification: string } | null>(null);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>(() => JSON.parse(localStorage.getItem('civil-study-reviews') || '[]'));
  const [reviewTopic, setReviewTopic] = useState('');
  const [reviewSubject, setReviewSubject] = useState(semesters[0].subjects[0]);
  const [graphSubject, setGraphSubject] = useState(semesters[0].subjects[0]);
  const [graphUnit, setGraphUnit] = useState('Unit 1');
  const [graphTopic, setGraphTopic] = useState('');
  const [graphPrereq, setGraphPrereq] = useState('');
  const [graphTopics, setGraphTopics] = useState<GraphTopic[]>(() => JSON.parse(localStorage.getItem('civil-study-graph') || '[]'));
  const [graphStatusFilter, setGraphStatusFilter] = useState('All');
  const [graphMastery, setGraphMastery] = useState('0');
  const [projectEvidence, setProjectEvidence] = useState<Array<{id:string; title:string; type:string; note:string; status:'draft'|'verified'; date:string}>>(() => JSON.parse(localStorage.getItem('civil-study-project-evidence') || '[]'));
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState('Drawing / Model');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [labExperiment, setLabExperiment] = useState('');
  const [labSubject, setLabSubject] = useState(semesters[0].subjects[0]);
  const [labObjective, setLabObjective] = useState('');
  const [labApparatus, setLabApparatus] = useState('');
  const [labFormula, setLabFormula] = useState('');
  const [labObservations, setLabObservations] = useState('');
  const [labAnalysis, setLabAnalysis] = useState<{count:number; average:number; minimum:number; maximum:number; spread:number} | null>(null);
  const [labRecords, setLabRecords] = useState<Array<{id:string; experiment:string; subject:string; date:string; observationCount:number}>>(() => JSON.parse(localStorage.getItem('civil-study-lab-records') || '[]'));
  const [vivaSubject, setVivaSubject] = useState(semesters[0].subjects[0]);
  const [vivaQuestion, setVivaQuestion] = useState('');
  const [vivaTopic, setVivaTopic] = useState('');
  const [vivaAnswer, setVivaAnswer] = useState('');
  const [vivaEvaluation, setVivaEvaluation] = useState<VivaEvaluation | null>(null);
  const [vivaWeakTopics, setVivaWeakTopics] = useState<string[]>(() => JSON.parse(localStorage.getItem('civil-study-viva-weak') || '[]'));
  const [theoryQuestion,setTheoryQuestion]=useState(''); const [theoryAnswer,setTheoryAnswer]=useState(''); const [theoryEvaluation,setTheoryEvaluation]=useState<TheoryEvaluation|null>(null);
  const [mockSet,setMockSet]=useState<MockQuestion[]>([]); const [mockAnswers,setMockAnswers]=useState<Record<number,number>>({}); const [mockIndex,setMockIndex]=useState(0); const [mockSubmitted,setMockSubmitted]=useState(false); const [mockStartedAt,setMockStartedAt]=useState<number|null>(() => Number(localStorage.getItem('civil-study-mock-started') || 0) || null); const [mockSecondsLeft,setMockSecondsLeft]=useState(0);
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('civil-study-ollama-url') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('civil-study-ollama-model') || '');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'connected' | 'offline'>('unknown');
  const [ollamaPrompt, setOllamaPrompt] = useState('Explain this Civil Engineering topic for a beginner and then give an exam-ready summary: ');
  const [ollamaAnswer, setOllamaAnswer] = useState('');
  const materialCoverage = useMemo(() => semesters.map(s => ({ semester: s.number, subjects: s.subjects.map(subject => ({ subject, count: materials.filter(m => Number(m.semester) === s.number && m.subject === subject).length })) })), [materials]);
  const adaptiveProfile = useMemo(() => {
    const attempts = adaptiveAttempts.filter(item => item.semester === selectedSemester);
    const total = attempts.reduce((sum, item) => sum + item.total, 0);
    const score = attempts.reduce((sum, item) => sum + item.score, 0);
    const topicMap = new Map<string, { correct: number; total: number; subject: string }>();
    attempts.forEach(item => item.topics.forEach(entry => {
      if (!entry.topic) return;
      const key = entry.topic.trim();
      const current = topicMap.get(key) || { correct: 0, total: 0, subject: item.subject };
      current.correct += entry.correct;
      current.total += entry.total;
      topicMap.set(key, current);
    }));
    const topics = Array.from(topicMap.entries()).map(([topic, value]) => ({ topic, ...value, percentage: Math.round((value.correct / Math.max(value.total, 1)) * 100) })).sort((a, b) => a.percentage - b.percentage);
    const weak = topics.filter(item => item.percentage < 70).slice(0, 5);
    const due = reviewCards.filter(card => card.semester === selectedSemester && card.nextReview <= todayIso()).length;
    const readiness = total ? Math.round((score / total) * 100) : 0;
    const recommendedMinutes = Math.min(120, Math.max(20, weak.length * 15 + due * 10 + (readiness < 70 ? 25 : 10)));
    const nextAction = weak[0] ? 'Revise ' + weak[0].topic + ' first' : due ? 'Complete your due revision topics' : readiness ? 'Take another mixed practice set' : 'Start a 10-question diagnostic MCQ set';
    return { attempts, readiness, weak, due, recommendedMinutes, nextAction };
  }, [adaptiveAttempts, reviewCards, selectedSemester]);

  useEffect(() => localStorage.setItem('civil-study-tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('civil-study-materials', JSON.stringify(materials)), [materials]);
  useEffect(() => localStorage.setItem('civil-study-reviews', JSON.stringify(reviewCards)), [reviewCards]);
  useEffect(() => localStorage.setItem('civil-study-graph', JSON.stringify(graphTopics)), [graphTopics]);
  useEffect(() => localStorage.setItem('civil-study-viva-weak', JSON.stringify(vivaWeakTopics)), [vivaWeakTopics]);
  useEffect(() => localStorage.setItem('civil-study-adaptive-attempts', JSON.stringify(adaptiveAttempts)), [adaptiveAttempts]);
  useEffect(() => localStorage.setItem('civil-study-lab-records', JSON.stringify(labRecords)), [labRecords]);
  useEffect(() => localStorage.setItem('civil-study-estimate-items', JSON.stringify(estimateItems)), [estimateItems]);
  useEffect(() => localStorage.setItem('civil-study-project-name', projectName), [projectName]);
  useEffect(() => localStorage.setItem('civil-study-project-stage', projectStage), [projectStage]);
  useEffect(() => localStorage.setItem('civil-study-project-tasks', JSON.stringify(projectTasks)), [projectTasks]);
  useEffect(() => localStorage.setItem('civil-study-project-evidence', JSON.stringify(projectEvidence)), [projectEvidence]);
  useEffect(() => localStorage.setItem('civil-study-career-skills', JSON.stringify(careerSkills)), [careerSkills]);
  useEffect(() => localStorage.setItem('civil-study-career-target', careerTarget), [careerTarget]);
  useEffect(() => { if (!mockStartedAt || mockSubmitted) return; const tick = () => { const remaining = Math.max(0, 20 * 60 - Math.floor((Date.now() - mockStartedAt) / 1000)); setMockSecondsLeft(remaining); if (remaining === 0 && mockSet.length) setMockSubmitted(true); }; tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer); }, [mockStartedAt, mockSubmitted, mockSet.length]);
  useEffect(() => { if (mockStartedAt) localStorage.setItem('civil-study-mock-started', String(mockStartedAt)); else localStorage.removeItem('civil-study-mock-started'); }, [mockStartedAt]);
  useEffect(() => { api.get('/api/materials', { semester: selectedSemester }).then(result => { if (Array.isArray(result.data.items)) setMaterials(result.data.items); }).catch(() => undefined); }, [selectedSemester]);

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? modules.filter(m => `${m.title} ${m.description}`.toLowerCase().includes(q)) : modules;
  }, [query]);
  const completed = tasks.filter(t => t.done).length;
  const overallProgress = Math.round(((completed / tasks.length) * 35) + semesters.reduce((sum, s) => sum + s.progress, 0) / 8 * 0.65);

  async function connectOllama() {
    const base = ollamaUrl.trim().replace(/\/$/, '');
    if (!base) return setErrorMessage('Enter the Ollama address first.');
    setBusy(true); setErrorMessage(''); setOllamaStatus('unknown');
    try {
      const response = await fetch(base + '/api/tags');
      if (!response.ok) throw new Error('ollama_unavailable');
      const data = await response.json() as { models?: Array<{ name?: string }> };
      const names = (data.models || []).map(model => model.name || '').filter(Boolean);
      setOllamaModels(names);
      setOllamaModel(current => current || names[0] || '');
      setOllamaStatus('connected');
      localStorage.setItem('civil-study-ollama-url', base);
      if (names[0] && !ollamaModel) localStorage.setItem('civil-study-ollama-model', names[0]);
    } catch {
      setOllamaStatus('offline');
      setErrorMessage('Ollama is not reachable. Start Ollama locally and allow this Study OS origin in OLLAMA_ORIGINS.');
    } finally { setBusy(false); }
  }

  async function runLocalAI() {
    const base = ollamaUrl.trim().replace(/\/$/, '');
    const model = ollamaModel.trim();
    const prompt = ollamaPrompt.trim();
    if (!base || !model || !prompt) return setErrorMessage('Enter an Ollama URL, model and prompt.');
    setBusy(true); setErrorMessage(''); setOllamaAnswer('');
    try {
      const response = await fetch(base + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
      });
      if (!response.ok) throw new Error('ollama_generate_failed');
      const data = await response.json() as { response?: string };
      setOllamaAnswer(data.response || 'The local model returned no text.');
      setOllamaStatus('connected');
      localStorage.setItem('civil-study-ollama-url', base);
      localStorage.setItem('civil-study-ollama-model', model);
    } catch {
      setOllamaStatus('offline');
      setErrorMessage('Local AI request failed. Check that the selected model exists and Ollama is running.');
    } finally { setBusy(false); }
  }

  async function analyzeDrawing() {
    if (!drawingFile) return setErrorMessage('Choose a drawing or diagram image first.');
    if (drawingFile.size > 6 * 1024 * 1024) return setErrorMessage('Keep the drawing image under 6 MB.');
    setBusy(true); setErrorMessage(''); setDrawingAnswer('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('file_read_failed'));
        reader.readAsDataURL(drawingFile);
      });
      const result = await api.post('/api/ai/drawing', { semester: selectedSemester, subject: semesters[selectedSemester - 1].subjects[0], mode: drawingMode, filename: drawingFile.name, mimeType: drawingFile.type || 'image/jpeg', data });
      setDrawingAnswer(result.data.answer || 'No drawing analysis returned.');
    } catch { setErrorMessage('Drawing AI could not analyze the image. Check the image and try again.'); }
    finally { setBusy(false); }
  }

  async function askTeacher() {
    if (!teacherTopic.trim()) return setErrorMessage('Enter a topic first.');
    setBusy(true); setErrorMessage('');
    try {
      const result = await api.post('/api/ai/teacher', { topic: teacherTopic, semester: selectedSemester });
      setTeacherAnswer(result.data.answer || 'No answer returned.');
    } catch { setErrorMessage('AI Teacher could not respond. Try again or use Local/Offline notes.'); }
    finally { setBusy(false); }
  }

  async function runWorkbench(mode: string, prompt: string) {
    setBusy(true); setErrorMessage('');
    try {
      const result = await api.post('/api/ai/workbench', { mode, prompt, semester: selectedSemester });
      setWorkbenchAnswer(result.data.answer || 'No result returned.');
    } catch { setErrorMessage('This AI workspace could not respond. Try again.'); }
    finally { setBusy(false); }
  }

  async function generateMcqs(subject = semesters[selectedSemester - 1].subjects[0]) {
    setBusy(true); setErrorMessage(''); setMcqSubmitted(false); setMcqAnswers({}); setMcqSubject(subject);
    try {
      const result = await api.post('/api/ai/exam-mcq', { semester: selectedSemester, subject, count: 10 });
      setMcqSet(Array.isArray(result.data.questions) ? result.data.questions : []);
    } catch { setErrorMessage('MCQ generation failed. Try again or study from your uploaded college material.'); }
    finally { setBusy(false); }
  }

  function submitMcqs() {
    if (!mcqSet.length) return;
    setMcqSubmitted(true);
    const grouped = new Map<string, { correct: number; total: number }>();
    mcqSet.forEach((question, index) => {
      const topic = (question.topic || 'Unlabelled topic').trim();
      const current = grouped.get(topic) || { correct: 0, total: 0 };
      current.total += 1;
      if (mcqAnswers[index] === question.correctIndex) current.correct += 1;
      grouped.set(topic, current);
    });
    setAdaptiveAttempts(items => [{ id: Date.now().toString(), date: new Date().toISOString(), semester: selectedSemester, subject: mcqSubject, score: mcqScore(), total: mcqSet.length, topics: Array.from(grouped.entries()).map(([topic, value]) => ({ topic, ...value })) }, ...items].slice(0, 100));
  }

  function mcqScore() {
    return mcqSet.reduce((score, q, index) => score + (mcqAnswers[index] === q.correctIndex ? 1 : 0), 0);
  }

  async function runEstimation() {
    const description = estimateDescription.trim();
    const rate = Number(estimateRate);
    const multiplier = Number(estimateMultiplier);
    if (!description) return setErrorMessage('Enter an item description first.');
    if (!Number.isFinite(rate) || rate < 0) return setErrorMessage('Enter a valid non-negative rate.');
    if (!Number.isFinite(multiplier) || multiplier <= 0) return setErrorMessage('Enter a positive quantity multiplier.');
    setBusy(true); setErrorMessage('');
    try {
      const result = await api.post('/api/estimation/calculate', {
        items: [{ description, measurement: estimateMeasurement, length: estimateLength, width: estimateWidth, height: estimateHeight, multiplier, rate }],
        wastagePercent: Number(estimateWastage) || 0,
        overheadPercent: Number(estimateOverhead) || 0,
      });
      const item = result.data.items?.[0];
      if (!item) throw new Error('No estimate item returned.');
      setEstimateItems(items => [...items, { id: Date.now().toString(), description, measurement: estimateMeasurement, length: estimateLength, width: estimateWidth, height: estimateHeight, multiplier: String(multiplier), rate: String(rate), quantity: item.quantity, amount: item.amount }].slice(-100));
      setEstimateSummary(result.data.summary || null);
      setEstimateDescription(''); setEstimateLength(''); setEstimateWidth(''); setEstimateHeight(''); setEstimateRate('');
    } catch { setErrorMessage('Estimate calculation failed. Check dimensions, multiplier and rate.'); }
    finally { setBusy(false); }
  }

  async function recalculateEstimate() {
    if (!estimateItems.length) return setErrorMessage('Add at least one takeoff item first.');
    setBusy(true); setErrorMessage('');
    try {
      const result = await api.post('/api/estimation/calculate', { items: estimateItems, wastagePercent: Number(estimateWastage) || 0, overheadPercent: Number(estimateOverhead) || 0 });
      setEstimateItems((result.data.items || []).map((item: typeof estimateItems[number]) => ({ ...item })));
      setEstimateSummary(result.data.summary || null);
    } catch { setErrorMessage('Could not recalculate the estimate. Check the saved item values.'); }
    finally { setBusy(false); }
  }

  async function runSurveying(){setBusy(true);setErrorMessage('');setSurveyResult(null);try{const r=await api.post('/api/survey/calculate',{mode:surveyMode,values:surveyValues});setSurveyResult(r.data.solution)}catch{setErrorMessage('Survey calculation failed. Check values and units.')}finally{setBusy(false)}}

  async function runCalculator() {
    setBusy(true); setErrorMessage(''); setCalculatorResult('');
    try {
      const result = await api.post('/api/calculators/run', { type: calculatorType, a: calculatorA, b: calculatorB });
      setCalculatorResult(result.data.result || 'No result returned.');
    } catch { setErrorMessage('Calculator could not validate the inputs. Check values and units.'); }
    finally { setBusy(false); }
  }

  async function runDeterministicNumerical() {
    setBusy(true); setErrorMessage(''); setSolverResult(null);
    try {
      const result = await api.post('/api/numerical/solve', { mode: solverMode, values: solverValues });
      setSolverResult(result.data.solution || null);
    } catch { setErrorMessage('Numerical validation failed. Enter positive values and check the units.'); }
    finally { setBusy(false); }
  }

  async function solveNumerical() {
    if (!numerical.trim()) return setErrorMessage('Enter a numerical question first.');
    setBusy(true); setErrorMessage('');
    try {
      const structuredQuestion = [numerical.trim(), numericalGiven.trim() ? 'Given: ' + numericalGiven.trim() : '', numericalFind.trim() ? 'Find: ' + numericalFind.trim() : ''].filter(Boolean).join('\n');
      const result = await api.post('/api/ai/numerical', { question: structuredQuestion, semester: selectedSemester });
      setNumericalAnswer(result.data.answer || 'No solution returned.');
    } catch { setErrorMessage('Numerical solver could not respond. Check the question and try again.'); }
    finally { setBusy(false); }
  }

  async function addMaterial() {
    if (!materialForm.name.trim()) return setErrorMessage('Enter the material name.');
    setBusy(true); setErrorMessage('');
    try {
      const result = await api.post('/api/materials', { ...materialForm, semester: selectedSemester, source: 'College Material' });
      const material = result.data.material as Material;
      setMaterials(items => [material, ...items]);
      setMaterialForm(form => ({ ...form, name: '' }));
    } catch { setErrorMessage('Could not save the material.'); }
    finally { setBusy(false); }
  }

  async function uploadMaterialFile() {
    if (!selectedFile) return setErrorMessage('Choose a PDF, note, PPT or document first.');
    if (selectedFile.size > 5 * 1024 * 1024) return setErrorMessage('Keep each upload under 5 MB in this free-first storage layer.');
    setBusy(true); setErrorMessage('');
    try {
      let extractedText = '';
      if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
        const pdf = await getDocument({ data: new Uint8Array(await selectedFile.arrayBuffer()), disableWorker: true }).promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          extractedText += content.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n';
          if (extractedText.length > 50000) break;
        }
      }
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('file_read_failed'));
        reader.readAsDataURL(selectedFile);
      });
      const result = await api.post('/api/materials/file', { ...materialForm, semester: selectedSemester, source: 'College Material', filename: selectedFile.name, contentType: selectedFile.type || 'application/octet-stream', data, extractedText });
      setMaterials(items => [result.data.material as Material, ...items]);
      setSelectedFile(null);
      setMaterialForm(form => ({ ...form, name: '' }));
    } catch { setErrorMessage('File upload failed. Check the file size and try again.'); }
    finally { setBusy(false); }
  }

  function toggleTask(id: string) { setTasks(items => items.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function openModule(title: string) { setActive(title); setShowMobileNav(false); }
  function todayIso() { return new Date().toISOString().slice(0, 10); }
  function addReviewCard() {
    const topic = reviewTopic.trim();
    if (!topic) return setErrorMessage('Enter a topic to schedule.');
    const id = `${selectedSemester}-${reviewSubject}-${topic}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (reviewCards.some(card => card.id === id)) return setErrorMessage('This topic is already in your revision schedule.');
    setReviewCards(items => [...items, { id, topic, subject: reviewSubject, semester: selectedSemester, lastReviewed: '', nextReview: todayIso(), intervalDays: 0, ease: 2.5, repetitions: 0, status: 'due' }]);
    setReviewTopic('');
  }
  function reviewTopicNow(id: string, quality: number) {
    setReviewCards(items => items.map(card => {
      if (card.id !== id) return card;
      const nextEase = Math.max(1.3, card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      const nextInterval = quality < 3 ? 1 : card.repetitions === 0 ? 1 : card.repetitions === 1 ? 3 : Math.max(1, Math.round(card.intervalDays * nextEase));
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + nextInterval);
      return { ...card, lastReviewed: todayIso(), nextReview: nextDate.toISOString().slice(0, 10), intervalDays: nextInterval, ease: Number(nextEase.toFixed(2)), repetitions: quality < 3 ? 0 : card.repetitions + 1, status: 'scheduled' };
    }));
  }

  function addGraphTopic() {
    const topic = graphTopic.trim();
    if (!topic) return setErrorMessage('Enter a topic first.');
    const unit = graphUnit.trim() || 'Unit 1';
    const id = `${selectedSemester}-${graphSubject}-${unit}-${topic}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (graphTopics.some(item => item.id === id)) return setErrorMessage('This topic is already in the knowledge graph.');
    const linkedMaterialIds = materials.filter(m => Number(m.semester) === selectedSemester && m.subject === graphSubject && (`${m.unit || ''} ${m.topic || ''} ${m.name}`).toLowerCase().includes(topic.toLowerCase())).map(m => m.id);
    setGraphTopics(items => [...items, { id, semester: selectedSemester, subject: graphSubject, unit, topic, prerequisites: graphPrereq.split(',').map(x => x.trim()).filter(Boolean), source: linkedMaterialIds.length ? 'Linked to college material · Needs Verification' : 'Student-added · Needs Verification', linkedMaterialIds, mastery: Math.max(0, Math.min(100, Number(graphMastery) || 0)) }]);
    setGraphTopic(''); setGraphPrereq(''); setGraphMastery('0');
  }

  function verifyGraphTopic(id: string) {
    setGraphTopics(items => items.map(item => {
      if (item.id !== id || !(item.linkedMaterialIds || []).length) return item;
      return { ...item, source: 'Student-verified against stored college material', verifiedAt: new Date().toISOString() };
    }));
  }

  function addProjectEvidence() {
    const title = evidenceTitle.trim();
    if (!title) return setErrorMessage('Enter an evidence title first.');
    setProjectEvidence(items => [{ id: Date.now().toString(), title, type: evidenceType, note: evidenceNote.trim(), status: 'draft', date: new Date().toISOString() }, ...items].slice(0, 100));
    setEvidenceTitle(''); setEvidenceNote('');
  }

  function toggleProjectEvidence(id: string) {
    setProjectEvidence(items => items.map(item => item.id === id ? { ...item, status: item.status === 'verified' ? 'draft' : 'verified' } : item));
  }

  async function analyzeLabObservations() {
    if (!labExperiment.trim() || !labObservations.trim()) return setErrorMessage('Enter the experiment name and recorded observations first.');
    setBusy(true); setErrorMessage(''); setLabAnalysis(null);
    try { const result = await api.post('/api/lab/analyze-observations', { observations: labObservations }); const analysis = result.data.analysis || null; setLabAnalysis(analysis); if (analysis) setLabRecords(items => [{ id: Date.now().toString(), experiment: labExperiment.trim(), subject: labSubject, date: new Date().toISOString(), observationCount: analysis.count }, ...items].slice(0, 50)); }
    catch { setErrorMessage('Observation analysis failed. Enter numeric observations separated by commas or spaces.'); }
    finally { setBusy(false); }
  }

  async function buildLabReport() {
    if (!labExperiment.trim()) return setErrorMessage('Enter the experiment name first.');
    await runWorkbench('lab', 'Create a structured lab report for ' + labExperiment + ' in ' + labSubject + '. Aim: ' + labObjective + '. Apparatus: ' + labApparatus + '. Formula/theory: ' + labFormula + '. Recorded observations: ' + labObservations + '. Include aim, apparatus, theory, procedure, observation table, calculations, result, precautions and viva questions. Never invent missing measurements or results; mark missing data clearly.');
  }

  async function evaluateTheory() {
    if (!theoryQuestion.trim() || !theoryAnswer.trim()) return setErrorMessage('Enter the theory question and your answer first.');
    setBusy(true); setErrorMessage(''); setTheoryEvaluation(null);
    try { const result=await api.post('/api/exam/theory-evaluate',{semester:selectedSemester,subject:vivaSubject,question:theoryQuestion,answer:theoryAnswer}); setTheoryEvaluation(result.data.evaluation||null); }
    catch { setErrorMessage('Theory answer evaluation failed. Try again.'); } finally { setBusy(false); }
  }
  async function startMock(subject=semesters[selectedSemester-1].subjects[0]) {
    setBusy(true); setErrorMessage(''); setMockSubmitted(false); setMockAnswers({}); setMockIndex(0); setMockStartedAt(null); setMockSecondsLeft(20 * 60);
    try { const result=await api.post('/api/exam/mock',{semester:selectedSemester,subject,count:10}); setMockSet(Array.isArray(result.data.questions)?result.data.questions:[]); setMockStartedAt(Date.now()); }
    catch { setErrorMessage('Mock exam generation failed. Try again.'); setMockStartedAt(null); } finally { setBusy(false); }
  }
  function submitMock(){if(mockSet.length){setMockSubmitted(true); setMockStartedAt(null);}}
  async function startViva(subject = vivaSubject) {
    setBusy(true); setErrorMessage(''); setVivaEvaluation(null); setVivaAnswer('');
    try {
      const result = await api.post('/api/viva/question', { semester: selectedSemester, subject, previousTopic: vivaTopic, weakTopics: vivaWeakTopics.slice(0, 8) });
      setVivaQuestion(result.data.question || 'No viva question returned.');
      setVivaTopic(result.data.topic || subject);
      setVivaSubject(subject);
    } catch { setErrorMessage('Viva question generation failed. Try again or use your college material.'); }
    finally { setBusy(false); }
  }

  async function evaluateViva() {
    if (!vivaQuestion.trim() || !vivaAnswer.trim()) return setErrorMessage('Enter your viva answer first.');
    setBusy(true); setErrorMessage('');
    try {
      const result = await api.post('/api/viva/evaluate', { semester: selectedSemester, subject: vivaSubject, question: vivaQuestion, answer: vivaAnswer, topic: vivaTopic });
      const evaluation = result.data.evaluation as VivaEvaluation;
      setVivaEvaluation(evaluation);
      if (evaluation.score < 6) setVivaWeakTopics(items => Array.from(new Set([evaluation.topic || vivaTopic || vivaSubject, ...items])).slice(0, 12));
      else if (evaluation.topic) setVivaWeakTopics(items => items.filter(item => item !== evaluation.topic));
    } catch { setErrorMessage('Viva answer evaluation failed. Try again.'); }
    finally { setBusy(false); }
  }

  async function searchKnowledge() {
    setBusy(true); setErrorMessage('');
    try {
      const subject = knowledgeSubject === 'All subjects' ? '' : knowledgeSubject;
      const result = await api.get('/api/knowledge/search', { semester: selectedSemester, q: knowledgeQuery, subject });
      setKnowledgeResults(Array.isArray(result.data.items) ? result.data.items : []);
    } catch { setErrorMessage('Knowledge Base search failed.'); }
    finally { setBusy(false); }
  }

  async function loadKnowledgeHierarchy() {
    setBusy(true); setErrorMessage('');
    try {
      const result = await api.get('/api/knowledge/hierarchy', { semester: selectedSemester });
      setKnowledgeTree(Array.isArray(result.data.subjects) ? result.data.subjects : []);
      setKnowledgeTreeOpen(true);
    } catch { setErrorMessage('Knowledge hierarchy could not be loaded.'); }
    finally { setBusy(false); }
  }

  async function practiceQuestionBank(materialId: string) {
    setBusy(true); setErrorMessage(''); setQuestionBankPractice(null);
    try {
      const result = await api.post('/api/question-bank/practice', { materialId, count: 8 });
      setQuestionBankPractice(result.data);
    } catch { setErrorMessage('Question bank practice could not be prepared. Make sure the file contains readable questions.'); }
    finally { setBusy(false); }
  }

  async function buildAdaptivePlan(subject: string, score: number, total: number, topics: string[]) {
    setBusy(true); setErrorMessage(''); setAdaptivePlan(null);
    try {
      const result = await api.post('/api/study/adaptive-plan', { semester: selectedSemester, subject, score, total, topics });
      setAdaptivePlan(result.data.plan);
    } catch { setErrorMessage('Adaptive revision plan could not be created. Try again.'); }
    finally { setBusy(false); }
  }

  async function analyzeQuestionBank(materialId: string) {
    setBusy(true); setErrorMessage(''); setQuestionBankAnalysis(null);
    try {
      const result = await api.post('/api/question-bank/analyze', { materialId });
      setQuestionBankAnalysis(result.data);
    } catch { setErrorMessage('Question bank analysis failed. Make sure the uploaded file contains readable text.'); }
    finally { setBusy(false); }
  }

  async function searchQuestionBanks() {
    setBusy(true); setErrorMessage('');
    setQuestionBankAnalysis(null);
    try {
      const result = await api.get('/api/materials', { semester: selectedSemester });
      const items = Array.isArray(result.data.items) ? result.data.items as Material[] : [];
      const q = questionBankQuery.trim().toLowerCase();
      setQuestionBanks(items.filter(item => item.type === 'Question Bank' && (!q || `${item.name} ${item.subject}`.toLowerCase().includes(q))));
    } catch { setErrorMessage('Question bank search failed.'); }
    finally { setBusy(false); }
  }

  const renderWorkspace = () => {
    if (active === 'AI Teacher') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">TEACHER AGENT</span><h2>AI Teacher</h2><p>Ask for a concept explanation. College material remains the primary source when available.</p></div><Brain size={30} /></div><textarea value={teacherTopic} onChange={e => setTeacherTopic(e.target.value)} placeholder="Example: Explain bending moment and shear force for a beginner..." /><button className="primary-button" onClick={askTeacher} disabled={busy}><Sparkles size={16} /> {busy ? 'Thinking…' : 'Explain topic'}</button>{teacherAnswer && <article className="answer"><h3>Teacher answer</h3><pre>{teacherAnswer}</pre><small>AI Explanation · Verify college-specific details against your uploaded material.</small></article>}</section>;
    if (active === 'Local AI') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">LOCAL / OFFLINE AI</span><h2>Ollama Local AI</h2><p>Run study prompts on your own computer. The Study OS does not send these prompts through its online AI backend.</p></div><Cpu size={30} /></div><div className="form-grid"><input value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} placeholder="Ollama URL · http://localhost:11434" /><input value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} placeholder="Model name · e.g. llama3.2" /><button className="secondary-button" onClick={connectOllama} disabled={busy}>{busy ? 'Connecting…' : 'Connect & find models'}</button></div><div className="score-card"><strong>{ollamaStatus === 'connected' ? 'LOCAL AI CONNECTED' : ollamaStatus === 'offline' ? 'OFFLINE / NOT REACHABLE' : 'NOT CHECKED'}</strong><span>{ollamaModels.length ? ollamaModels.length + ' local model(s) found' : 'No model list loaded yet.'}</span></div>{ollamaModels.length > 0 && <div className="chip-row">{ollamaModels.map(model => <button className={ollamaModel === model ? 'active-chip' : ''} key={model} onClick={() => setOllamaModel(model)}>{model}</button>)}</div>}<textarea value={ollamaPrompt} onChange={e => setOllamaPrompt(e.target.value)} placeholder="Ask your local model anything about your study material..." /><button className="primary-button" onClick={runLocalAI} disabled={busy || !ollamaModel.trim()}><Cpu size={16} /> {busy ? 'Running locally…' : 'Run local AI'}</button>{ollamaAnswer && <article className="answer"><h3>Local model answer</h3><pre>{ollamaAnswer}</pre><small>LOCAL RESULT · Verify important engineering answers against college material and faculty guidance.</small></article>}<article className="answer"><h3>Windows setup note</h3><p>Ollama must be installed and running on the same computer. If the browser blocks the connection, configure Ollama to allow this web app origin with <code>OLLAMA_ORIGINS</code>, then restart Ollama.</p><p><strong>Privacy:</strong> prompts sent through this screen go directly from your browser to the Ollama address you entered.</p></article></section>;
    if (active === 'Study Materials') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">COLLEGE MATERIAL INTELLIGENCE</span><h2>Study Materials</h2><p>Upload and organize college sources. Coverage counts use only material actually stored in the Study OS.</p></div><BookOpen size={30} /></div><div className="score-card"><strong>{materials.length} indexed material record(s)</strong><span>Sem 1–8 coverage is based on stored sources, not placeholder curriculum.</span></div><div className="material-list">{materialCoverage.map(s => <article className="material-row" key={s.semester}><BookOpen size={18} /><div><strong>Semester {s.semester}</strong><span>{s.subjects.filter(x => x.count > 0).length} / {s.subjects.length} listed subjects have stored material</span><p>{s.subjects.map(x => `${x.subject}: ${x.count}`).join(' · ')}</p></div><b>{s.subjects.reduce((n,x)=>n+x.count,0)} SOURCE(S)</b></article>)}</div><div className="form-grid"><input value={materialForm.name} onChange={e=>setMaterialForm({...materialForm,name:e.target.value})} placeholder="Material name" /><select value={materialForm.subject} onChange={e=>setMaterialForm({...materialForm,subject:e.target.value})}>{semesters[selectedSemester-1].subjects.map(subject=><option key={subject}>{subject}</option>)}</select><select value={materialForm.type} onChange={e=>setMaterialForm({...materialForm,type:e.target.value})}><option>PDF / Notes</option><option>Question Bank</option><option>PPT / Slides</option><option>Lab Manual</option><option>Assignment</option><option>Syllabus</option><option>Previous Paper</option></select><input value={materialForm.unit} onChange={e=>setMaterialForm({...materialForm,unit:e.target.value})} placeholder="Unit (optional)" /><input value={materialForm.topic} onChange={e=>setMaterialForm({...materialForm,topic:e.target.value})} placeholder="Topic (optional)" /><input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt" onChange={e=>setSelectedFile(e.target.files?.[0]||null)} /><button className="primary-button" onClick={uploadMaterial} disabled={busy || !selectedFile}>{busy ? 'Uploading…' : 'Upload college material'}</button></div><div className="material-list">{materials.filter(m=>Number(m.semester)===selectedSemester).map(m=><article className="material-row" key={m.id}><FileText size={18}/><div><strong>{m.name}</strong><span>{m.subject} · {m.type} · {m.status} · v{m.version||1}</span><p>{m.unit||'Unit inferred from source'} · {m.topic||'Topic inferred from source'}</p></div><b>{m.source}</b>{m.fileUrl&&<a className="file-link" href={m.fileUrl} target="_blank" rel="noreferrer">Open</a>}</article>)}</div></section>;
    if (active === 'Knowledge Graph') { const scoped = graphTopics.filter(x => x.semester === selectedSemester); const visible = scoped.filter(x => graphStatusFilter === 'All' || (graphStatusFilter === 'Verified' ? x.source.startsWith('Student-verified') : !x.source.startsWith('Student-verified'))); const missingPrereqs = visible.filter(x => x.prerequisites.some(p => !scoped.some(y => y.topic.toLowerCase() === p.toLowerCase()))).length; const avgMastery = visible.length ? Math.round(visible.reduce((sum,x) => sum + (x.mastery || 0), 0) / visible.length) : 0; return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">CIVIL KNOWLEDGE GRAPH 2.0</span><h2>Knowledge Graph</h2><p>Connect Semester → Subject → Unit → Topic → Prerequisites → College Sources → Mastery. Verification is student-controlled.</p></div><Target size={30} /></div><div className="form-grid"><select value={graphSubject} onChange={e => setGraphSubject(e.target.value)}>{semesters[selectedSemester - 1].subjects.map(subject => <option key={subject}>{subject}</option>)}</select><input value={graphUnit} onChange={e => setGraphUnit(e.target.value)} placeholder="Unit" /><input value={graphTopic} onChange={e => setGraphTopic(e.target.value)} placeholder="Topic" /><input value={graphPrereq} onChange={e => setGraphPrereq(e.target.value)} placeholder="Prerequisites, comma separated" /><input type="number" min="0" max="100" value={graphMastery} onChange={e => setGraphMastery(e.target.value)} placeholder="Mastery %" /><button className="primary-button" onClick={addGraphTopic}><Target size={16} /> Add topic</button></div><div className="form-grid"><select value={graphStatusFilter} onChange={e => setGraphStatusFilter(e.target.value)}><option>All</option><option>Verified</option><option>Needs Verification</option></select><div className="score-card"><strong>{visible.length} mapped · {avgMastery}% avg mastery</strong><span>{missingPrereqs} topic(s) have missing prerequisite nodes · Semester {selectedSemester}</span></div></div><div className="material-list">{visible.length === 0 ? <div className="empty"><Target size={22}/><strong>No graph topics yet</strong><span>Add a topic and optionally connect it to stored college material.</span></div> : visible.map(item => <article className="material-row" key={item.id}><Target size={18}/><div><strong>{item.topic}</strong><span>{item.subject} · {item.unit} · Mastery {item.mastery || 0}%</span><p>{item.prerequisites.length ? 'Prerequisites: ' + item.prerequisites.join(', ') : 'No prerequisite recorded.'}</p><p>{(item.linkedMaterialIds || []).length ? 'Linked college source(s): ' + (item.linkedMaterialIds || []).length : 'No linked college source yet.'}</p></div><b>{item.source.startsWith('Student-verified') ? 'VERIFIED' : 'NEEDS VERIFICATION'}</b>{(item.linkedMaterialIds || []).length > 0 && !item.source.startsWith('Student-verified') && <button className="secondary-button" onClick={() => verifyGraphTopic(item.id)}>Mark verified</button>}</article>)}</div><small>Matching a material does not automatically prove the topic is officially correct. “Verified” means you marked the topic as checked against a stored college source.</small></section>; }
    if (active === 'Revision Scheduler') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">MEMORY AGENT</span><h2>Revision Scheduler</h2><p>Local-first spaced repetition. Topics are stored on this device and scheduled from your review quality.</p></div><CalendarDays size={30} /></div><div className="form-grid"><select value={reviewSubject} onChange={e => setReviewSubject(e.target.value)}>{semesters[selectedSemester - 1].subjects.map(subject => <option key={subject}>{subject}</option>)}</select><input value={reviewTopic} onChange={e => setReviewTopic(e.target.value)} placeholder="Topic to remember, e.g. Taylor series" /><button className="primary-button" onClick={addReviewCard}><Target size={16} /> Add topic</button></div><div className="score-card"><strong>{reviewCards.filter(card => card.semester === selectedSemester && card.nextReview <= todayIso()).length} due today</strong><span>{reviewCards.filter(card => card.semester === selectedSemester).length} scheduled topics for Semester {selectedSemester}</span></div><div className="material-list">{reviewCards.filter(card => card.semester === selectedSemester).length === 0 ? <div className="empty"><CalendarDays size={22} /><strong>No revision topics yet</strong><span>Add weak or important topics and review them repeatedly.</span></div> : reviewCards.filter(card => card.semester === selectedSemester).map(card => { const due = card.nextReview <= todayIso(); return <article className="material-row" key={card.id}><Target size={18} /><div><strong>{card.topic}</strong><span>{card.subject} · {due ? 'Due now' : 'Next review ' + card.nextReview} · {card.repetitions} successful reviews</span></div><b>{card.intervalDays ? card.intervalDays + 'd' : 'New'}</b>{due && <div className="chip-row"><button className="secondary-button" onClick={() => reviewTopicNow(card.id, 2)}>Hard</button><button className="secondary-button" onClick={() => reviewTopicNow(card.id, 4)}>Good</button><button className="primary-button" onClick={() => reviewTopicNow(card.id, 5)}>Easy</button></div>}</article>; })}</div><small>Scheduling is an educational memory aid, not a guarantee of retention. Review college material as the primary source.</small></section>;
    if (active === 'Adaptive Learning') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">ADAPTIVE LEARNING 2.0</span><h2>Your next best study action</h2><p>Local-first learning profile built from your practice scores and revision schedule. It does not replace your college syllabus.</p></div><Trophy size={30} /></div><div className="score-card"><strong>{adaptiveProfile.readiness}% readiness</strong><span>{adaptiveProfile.attempts.length} recorded practice attempt(s) · {adaptiveProfile.due} revision topic(s) due today</span></div><div className="exam-cards"><div><strong>Next action</strong><span>{adaptiveProfile.nextAction}</span><b>{adaptiveProfile.recommendedMinutes} min recommended</b></div><div><strong>Weak areas</strong><span>{adaptiveProfile.weak.length ? adaptiveProfile.weak.map(item => item.topic + ' · ' + item.percentage + '%').join(' | ') : 'No weak topic detected yet'}</span><b>{adaptiveProfile.weak.length ? 'Prioritize' : 'Keep practicing'}</b></div><div><strong>Revision load</strong><span>{adaptiveProfile.due} due topic(s) from your local spaced-repetition schedule</span><b>{adaptiveProfile.due ? 'Review today' : 'On track'}</b></div></div><div className="viva-box"><strong>Topic mastery</strong>{adaptiveProfile.weak.length === 0 && !adaptiveProfile.attempts.length ? <small>Take an MCQ set first. Topic-level mastery will be calculated automatically from your answers.</small> : <div className="material-list">{adaptiveProfile.weak.map(item => <article className="material-row" key={item.topic}><Target size={18} /><div><strong>{item.topic}</strong><span>{item.subject} · {item.correct}/{item.total} correct</span></div><b>{item.percentage}%</b></article>)}</div>}</div>{adaptiveProfile.attempts.length > 0 && <div className="upload-row"><button className="primary-button" onClick={() => { const latest = adaptiveProfile.attempts[0]; buildAdaptivePlan(latest.subject, latest.score, latest.total, latest.topics.map(item => item.topic)); }} disabled={busy}><Sparkles size={16} /> {busy ? 'Building…' : 'Build AI revision plan'}</button><button className="secondary-button" onClick={() => setActive('Revision Scheduler')}>Open revision scheduler</button></div>}{adaptivePlan && <article className="answer"><h3>AI revision plan</h3><p>{adaptivePlan.summary}</p><div className="material-list">{adaptivePlan.actions.map((item, index) => <div className="material-row" key={index}><Target size={18} /><div><strong>{item.priority} · {item.topic}</strong><span>{item.reason}</span><p>{item.action}</p></div><b>{item.minutes} min</b></div>)}</div><small>AI-assisted plan. Verify important priorities against your uploaded college material and faculty guidance.</small></article>}</section>;

    if (active === 'Drawing & Diagram AI') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">DRAWING AGENT</span><h2>Drawing & Diagram AI</h2><p>Upload a civil drawing, diagram or sketch and get a beginner-friendly explanation. It does not certify dimensions, scale or construction safety.</p></div><ScanLine size={30} /></div><div className="form-grid"><select value={drawingMode} onChange={e => setDrawingMode(e.target.value)}><option>Explain the drawing step by step for a beginner</option><option>Identify major labels and components</option><option>Explain plan, elevation and section relationships</option><option>Prepare viva questions from this drawing</option><option>Check the visible drawing for likely learning mistakes</option></select><input type="file" accept="image/*" onChange={e => setDrawingFile(e.target.files?.[0] || null)} /></div><div className="upload-row"><button className="primary-button" onClick={analyzeDrawing} disabled={busy}><ScanLine size={16} /> {busy ? 'Analyzing…' : 'Analyze drawing'}</button><span className="source-note">Image is sent to the Study OS AI backend for analysis.</span></div>{drawingAnswer && <article className="answer"><h3>Drawing analysis</h3><pre>{drawingAnswer}</pre><small>AI-assisted visual explanation. Verify dimensions, symbols, standards and construction details against your college drawing material or faculty guidance.</small></article>}</section>;

    if (active === 'Estimation & Costing') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">ESTIMATION AGENT</span><h2>Estimation &amp; Costing</h2><p>Deterministic quantity takeoff and BOQ-style cost estimation. Rates are entered by you and are not invented by AI.</p></div><ClipboardList size={30} /></div><div className="viva-box"><strong>Add quantity takeoff item</strong><div className="form-grid"><input value={estimateDescription} onChange={e => setEstimateDescription(e.target.value)} placeholder="Item description · e.g. PCC concrete" /><select value={estimateMeasurement} onChange={e => setEstimateMeasurement(e.target.value as 'count' | 'length' | 'area' | 'volume')}><option value="volume">Volume · m³</option><option value="area">Area · m²</option><option value="length">Length · m</option><option value="count">Count · no.</option></select><input type="number" min="0" step="any" value={estimateLength} onChange={e => setEstimateLength(e.target.value)} placeholder="Length" /><input type="number" min="0" step="any" value={estimateWidth} onChange={e => setEstimateWidth(e.target.value)} placeholder="Width" /><input type="number" min="0" step="any" value={estimateHeight} onChange={e => setEstimateHeight(e.target.value)} placeholder="Height / depth" /><input type="number" min="0.0001" step="any" value={estimateMultiplier} onChange={e => setEstimateMultiplier(e.target.value)} placeholder="Multiplier / repetitions" /><input type="number" min="0" step="any" value={estimateRate} onChange={e => setEstimateRate(e.target.value)} placeholder="Rate ₹ per unit" /></div><button className="primary-button" onClick={runEstimation} disabled={busy || !estimateDescription.trim()}><ClipboardList size={16} /> {busy ? 'Calculating…' : 'Add to BOQ'}</button></div><div className="form-grid"><input type="number" min="0" step="any" value={estimateWastage} onChange={e => setEstimateWastage(e.target.value)} placeholder="Wastage % · optional" /><input type="number" min="0" step="any" value={estimateOverhead} onChange={e => setEstimateOverhead(e.target.value)} placeholder="Overhead % · optional" /><button className="secondary-button" onClick={recalculateEstimate} disabled={busy || !estimateItems.length}>Recalculate estimate</button></div>{estimateItems.length > 0 && <article className="answer"><h3>Quantity Takeoff / BOQ</h3><div className="estimate-table"><div className="estimate-head"><span>Item</span><span>Qty</span><span>Rate</span><span>Amount</span></div>{estimateItems.map(item => <div className="estimate-row" key={item.id}><div><strong>{item.description}</strong><small>{item.measurement} · {item.length || '—'} × {item.width || '—'} × {item.height || '—'} · × {item.multiplier}</small></div><span>{item.quantity}</span><span>₹{Number(item.rate).toFixed(2)}</span><b>₹{item.amount.toFixed(2)}</b></div>)}</div>{estimateSummary && <div className="score-card"><strong>Grand Total · ₹{estimateSummary.grandTotal.toFixed(2)}</strong><span>Subtotal ₹{estimateSummary.subtotal.toFixed(2)} · Wastage ₹{estimateSummary.wastageAmount.toFixed(2)} · Overhead ₹{estimateSummary.overheadAmount.toFixed(2)}</span></div>}<small>Educational estimate only. Verify dimensions, measurement rules, local SOR/market rates, taxes, labour constants and tender conditions before real project use.</small></article>}<article className="answer"><h3>Measurement rules</h3><p><strong>Volume:</strong> L × W × H × multiplier · <strong>Area:</strong> L × W × multiplier · <strong>Length:</strong> L × multiplier · <strong>Count:</strong> multiplier.</p><p>Rates are user-entered. The system does not claim an official Gujarat SOR or current market rate.</p></article></section>;

    if (active === 'Surveying & GIS') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">SURVEYING + GIS</span><h2>Surveying &amp; GIS</h2><p>Deterministic survey calculations for learning. Field measurements are never invented.</p></div><Target size={30}/></div><div className="form-grid"><select value={surveyMode} onChange={e=>{setSurveyMode(e.target.value);setSurveyValues({});setSurveyResult(null)}}><option value="distance">Horizontal distance</option><option value="coordinate-distance">Coordinate distance</option><option value="slope-distance">Slope distance → horizontal</option><option value="slope">Slope percentage</option></select>{surveyMode==='distance'&&<><input value={surveyValues.dX||''} onChange={e=>setSurveyValues(v=>({...v,dX:e.target.value}))} placeholder="ΔE (m)"/><input value={surveyValues.dY||''} onChange={e=>setSurveyValues(v=>({...v,dY:e.target.value}))} placeholder="ΔN (m)"/></>}{surveyMode==='coordinate-distance'&&<><input value={surveyValues.e1||''} onChange={e=>setSurveyValues(v=>({...v,e1:e.target.value}))} placeholder="E1 (m)"/><input value={surveyValues.n1||''} onChange={e=>setSurveyValues(v=>({...v,n1:e.target.value}))} placeholder="N1 (m)"/><input value={surveyValues.e2||''} onChange={e=>setSurveyValues(v=>({...v,e2:e.target.value}))} placeholder="E2 (m)"/><input value={surveyValues.n2||''} onChange={e=>setSurveyValues(v=>({...v,n2:e.target.value}))} placeholder="N2 (m)"/></>}{surveyMode==='slope-distance'&&<><input value={surveyValues.slopeDistance||''} onChange={e=>setSurveyValues(v=>({...v,slopeDistance:e.target.value}))} placeholder="Slope distance (m)"/><input value={surveyValues.angle||''} onChange={e=>setSurveyValues(v=>({...v,angle:e.target.value}))} placeholder="Vertical angle (degrees)"/></>}{surveyMode==='slope'&&<><input value={surveyValues.rise||''} onChange={e=>setSurveyValues(v=>({...v,rise:e.target.value}))} placeholder="Rise (m)"/><input value={surveyValues.run||''} onChange={e=>setSurveyValues(v=>({...v,run:e.target.value}))} placeholder="Run (m)"/></>}</div><button className="primary-button" onClick={runSurveying} disabled={busy}><Target size={16}/>{busy?'Calculating…':'Calculate & verify'}</button>{surveyResult&&<article className="answer"><h3>Survey result</h3><p><strong>{surveyResult.formula}</strong></p><p>{surveyResult.value} {surveyResult.units}</p><small>{surveyResult.verification}</small></article>}<article className="answer"><h3>GIS field-data note</h3><p>Confirm datum, coordinate reference system, bearing convention and units before using real project data.</p></article></section>;

    if (active === 'Civil Calculators') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">ENGINEERING TOOLBOX</span><h2>Civil Calculators</h2><p>Deterministic calculations first; AI is not used for the arithmetic.</p></div><Calculator size={30} /></div><div className="form-grid"><select value={calculatorType} onChange={e => { setCalculatorType(e.target.value); setCalculatorResult(''); }}><option>Unit Converter</option><option>Concrete Volume</option><option>Rectangle Area</option><option>Percentage</option><option>Steel Weight</option><option>Earthwork Volume</option><option>Cement Bags Estimate</option><option>Brickwork Volume</option></select><input value={calculatorA} onChange={e => setCalculatorA(e.target.value)} placeholder={calculatorType === 'Concrete Volume' ? 'Length,Width,Height (e.g. 5,3,0.15)' : calculatorType === 'Steel Weight' ? 'Diameter in mm' : calculatorType === 'Earthwork Volume' || calculatorType === 'Brickwork Volume' ? 'Length,Width,Depth/Height' : calculatorType === 'Cement Bags Estimate' ? 'Concrete volume in m³' : 'Value / length / quantity'} /><input value={calculatorB} onChange={e => setCalculatorB(e.target.value)} placeholder={calculatorType === 'Unit Converter' ? 'Conversion (e.g. m to ft)' : calculatorType === 'Steel Weight' ? 'Bar length in m' : calculatorType === 'Cement Bags Estimate' ? 'Mix ratio, e.g. 1,2,4' : 'Second value / total'} /></div><button className="primary-button" onClick={runCalculator} disabled={busy}><Calculator size={16} /> {busy ? 'Calculating…' : 'Calculate & verify'}</button>{calculatorResult && <article className="answer"><h3>Verified calculation</h3><pre>{calculatorResult}</pre><small>Deterministic calculator output. Confirm engineering assumptions before real-world use.</small></article>}</section>;

    if (active === 'Numerical Solver') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">NUMERICAL SOLVER 2.0</span><h2>Numerical Solver</h2><p>Use deterministic formulas first, then use the AI solver for full word problems. Every deterministic result shows its formula, variables, units and verification note.</p></div><Calculator size={30} /></div><div className="form-grid"><select value={solverMode} onChange={e => { setSolverMode(e.target.value); setSolverValues({}); setSolverResult(null); }}><option value="stress">Stress = Force / Area</option><option value="strain">Strain = ΔL / L</option><option value="pressure">Hydrostatic Pressure = ρgh</option><option value="discharge">Discharge = Area × Velocity</option><option value="moment">Moment = Force × Arm</option><option value="density">Density = Mass / Volume</option><option value="bending-stress">Bending Stress = My / I</option></select></div><div className="form-grid">{(solverMode === 'stress' ? ['force','area'] : solverMode === 'strain' ? ['deltaLength','originalLength'] : solverMode === 'pressure' ? ['density','head'] : solverMode === 'discharge' ? ['area','velocity'] : solverMode === 'moment' ? ['force','arm'] : solverMode === 'density' ? ['mass','volume'] : ['moment','distance','inertia']).map(key => <input key={key} type="number" min="0" step="any" value={solverValues[key] || ''} onChange={e => setSolverValues({ ...solverValues, [key]: e.target.value })} placeholder={key + ' (use SI units)'} />)}</div><button className="primary-button" onClick={runDeterministicNumerical} disabled={busy}><Calculator size={16} /> {busy ? 'Checking…' : 'Calculate deterministically'}</button>{solverResult && <article className="answer"><h3>Verified numerical result</h3><p><strong>Formula:</strong> {solverResult.formula}</p><p><strong>Substitution:</strong> {solverResult.variables}</p><p><strong>Result:</strong> {solverResult.value} {solverResult.units}</p><small>{solverResult.verification}</small></article>}<div className="numerical-grid"><textarea value={numerical} onChange={e => setNumerical(e.target.value)} placeholder="AI word problem / full numerical question..." /><textarea value={numericalGiven} onChange={e => setNumericalGiven(e.target.value)} placeholder="Given data (values + units)..." /><textarea value={numericalFind} onChange={e => setNumericalFind(e.target.value)} placeholder="Find / required quantity..." /></div><button className="secondary-button" onClick={solveNumerical} disabled={busy}><Sparkles size={16} /> {busy ? 'Solving…' : 'Use AI for full word problem'}</button>{numericalAnswer && <article className="answer"><h3>AI worked solution</h3><pre>{numericalAnswer}</pre><small>AI-assisted only. Recheck units, assumptions, sign conventions and engineering safety before submission.</small></article>}</section>;
    if (active === 'Study Materials') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">KNOWLEDGE BASE 3.0</span><h2>College Material</h2><p>Organize material as Semester → Subject → Unit → Topic with source versions.</p></div><Upload size={30} /></div><div className="form-grid"><input value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} placeholder="Material name" /><select value={materialForm.subject} onChange={e => setMaterialForm({ ...materialForm, subject: e.target.value })}>{semesters[selectedSemester - 1].subjects.map(s => <option key={s}>{s}</option>)}</select><select value={materialForm.type} onChange={e => setMaterialForm({ ...materialForm, type: e.target.value })}><option>PDF / Notes</option><option>Question Bank</option><option>Lab Manual</option><option>PPT</option><option>Assignment</option><option>Other</option></select><input value={materialForm.unit} onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })} placeholder="Unit (optional)" /><input value={materialForm.topic} onChange={e => setMaterialForm({ ...materialForm, topic: e.target.value })} placeholder="Topic (optional)" /></div><div className="upload-row"><input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt" onChange={e => setSelectedFile(e.target.files?.[0] || null)} /><button className="primary-button" onClick={uploadMaterialFile} disabled={busy}><Upload size={16} /> Upload file</button><button className="secondary-button" onClick={addMaterial} disabled={busy}>Save metadata only</button></div><div className="material-list">{materials.length === 0 ? <div className="empty"><FileText size={22} /><strong>No college material indexed yet</strong><span>Add the name and metadata now; file ingestion/OCR is the next knowledge-base layer.</span></div> : materials.map(m => <div className="material-row" key={m.id}><FileText size={19} /><div><strong>{m.name}</strong><span>Sem {m.semester} · {m.subject} · {m.type}</span></div><b>{m.source}</b>{m.fileUrl && <a className="file-link" href={m.fileUrl} target="_blank" rel="noreferrer">Open file</a>}</div>)}</div></section>;
    if (active === 'Exam Preparation') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">EXAM AGENT</span><h2>Exam Preparation</h2><p>Practice with scored AI-generated MCQs, then review every answer and explanation.</p></div><GraduationCap size={30} /></div><div className="exam-cards"><div><strong>Rapid MCQ</strong><span>10 scored questions for a subject</span><button onClick={() => generateMcqs()} disabled={busy}>{busy ? 'Generating…' : 'Generate MCQs'}</button></div><div><strong>Answer Writing</strong><span>University-style theory</span><button onClick={() => runWorkbench('exam', 'Create 5 university-style theory questions for Semester ' + selectedSemester + ' with concise marking-point answer outlines.')}>Practice</button></div><div><strong>Mock Exam</strong><span>Mixed theory + numerical</span><button onClick={() => runWorkbench('exam', 'Create a balanced mock exam for Semester ' + selectedSemester + ' with theory, short answers, numericals and a marking scheme.')}>Start mock</button></div></div>{mcqSet.length > 0 && <div className="mcq-session"><div className="mcq-header"><div><span className="eyebrow">MCQ PRACTICE</span><h3>Score your set</h3></div><span>{mcqSet.length} questions</span></div>{mcqSet.map((q, index) => <article className="mcq-card" key={index}><strong>Q{index + 1}. {q.question}</strong><div className="mcq-options">{q.options.map((option, optionIndex) => <label key={optionIndex} className={mcqSubmitted ? (optionIndex === q.correctIndex ? 'correct' : mcqAnswers[index] === optionIndex ? 'wrong' : '') : ''}><input type="radio" name={'mcq-' + index} checked={mcqAnswers[index] === optionIndex} onChange={() => setMcqAnswers({ ...mcqAnswers, [index]: optionIndex })} disabled={mcqSubmitted} />{option}</label>)}</div>{mcqSubmitted && <div className="mcq-feedback"><b>{mcqAnswers[index] === q.correctIndex ? 'Correct' : 'Review this answer'}</b><span>{q.explanation}</span></div>}</article>)}<button className="primary-button" onClick={submitMcqs} disabled={busy || mcqSubmitted}>{mcqSubmitted ? 'Submitted' : 'Submit & Score'}</button>{mcqSubmitted && <><div className="score-card"><strong>{mcqScore()} / {mcqSet.length}</strong><span>{Math.round((mcqScore() / mcqSet.length) * 100)}% score · Review incorrect answers before retrying.</span></div><button className="secondary-button" onClick={() => buildAdaptivePlan(semesters[selectedSemester - 1].subjects[0], mcqScore(), mcqSet.length, mcqSet.map(q => q.topic || '').filter(Boolean))} disabled={busy}>Build adaptive revision plan</button>{adaptivePlan && <article className="answer"><h3>Adaptive revision plan</h3><p>{adaptivePlan.summary}</p><div className="material-list">{adaptivePlan.actions.map((item, index) => <div className="material-row" key={index}><Target size={18} /><div><strong>{item.priority} · {item.topic}</strong><span>{item.reason}</span><p>{item.action}</p></div><b>{item.minutes} min</b></div>)}</div><small>Plan is AI-assisted. Verify college-specific priorities against your uploaded material.</small></article>}</>}</div>}{workbenchAnswer && <article className="answer"><h3>Generated exam resource</h3><pre>{workbenchAnswer}</pre></article>}</section>;
    if (active === 'Lab Assistant') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">LAB AGENT 3.0</span><h2>Lab Assistant</h2><p>Structured experiment records, deterministic observation analysis, report building and viva preparation.</p></div><FlaskConical size={30} /></div><div className="form-grid"><input value={labExperiment} onChange={e => setLabExperiment(e.target.value)} placeholder="Experiment name" /><select value={labSubject} onChange={e => setLabSubject(e.target.value)}>{semesters[selectedSemester - 1].subjects.map(s => <option key={s}>{s}</option>)}</select><input value={labObjective} onChange={e => setLabObjective(e.target.value)} placeholder="Aim / objective (optional)" /><input value={labApparatus} onChange={e => setLabApparatus(e.target.value)} placeholder="Apparatus (optional)" /><input value={labFormula} onChange={e => setLabFormula(e.target.value)} placeholder="Formula / theory (optional)" /><textarea value={labObservations} onChange={e => setLabObservations(e.target.value)} placeholder="Recorded observations only — e.g. 12.1, 12.4, 12.0, 12.3" /></div><div className="tool-list"><button onClick={() => runWorkbench('lab', 'Create a step-by-step laboratory procedure for ' + (labExperiment || 'the selected experiment') + '. Include apparatus, theory, safe procedure, observation-table headings, calculations, result format, precautions and viva questions. Never invent measurements or results.')}><FlaskConical size={17} />Procedure builder<ChevronRight size={16} /></button><button onClick={analyzeLabObservations} disabled={busy}><Calculator size={17} />Analyze recorded observations<ChevronRight size={16} /></button><button onClick={buildLabReport} disabled={busy}><FileText size={17} />Build report from record<ChevronRight size={16} /></button><button onClick={() => runWorkbench('viva', 'Create 10 viva questions for ' + (labExperiment || 'the selected experiment') + ' with short model answers and follow-ups.')}><Mic2 size={17} />Experiment viva practice<ChevronRight size={16} /></button></div>{labAnalysis && <article className="answer"><h3>Observation analysis</h3><p><strong>Count:</strong> {labAnalysis.count} · <strong>Average:</strong> {labAnalysis.average} · <strong>Min:</strong> {labAnalysis.minimum} · <strong>Max:</strong> {labAnalysis.maximum} · <strong>Spread:</strong> {labAnalysis.spread}</p><small>Deterministic analysis of entered measurements only. Compare with your lab manual and expected range.</small></article>}{labRecords.length > 0 && <article className="answer"><h3>Local lab history</h3>{labRecords.slice(0,8).map(item => <div className="material-row" key={item.id}><FlaskConical size={18} /><div><strong>{item.experiment}</strong><span>{item.subject} · {new Date(item.date).toLocaleDateString()} · {item.observationCount} observations</span></div><b>LOCAL</b></div>)}</article>}{workbenchAnswer && <article className="answer"><h3>Lab resource</h3><pre>{workbenchAnswer}</pre><small>AI-generated structure only. Measurements and final results must come from the actual experiment/manual.</small></article>}</section>;
    if (active === 'Exam Preparation') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">EXAM AGENT 2.0</span><h2>Exam Preparation</h2><p>Theory evaluation and question-by-question mock exam.</p></div><GraduationCap size={30}/></div><div className="viva-box"><strong>Theory answer evaluator</strong><div className="form-grid"><input value={theoryQuestion} onChange={e=>setTheoryQuestion(e.target.value)} placeholder="Enter theory question"/><textarea value={theoryAnswer} onChange={e=>setTheoryAnswer(e.target.value)} placeholder="Write your answer..."/></div><button className="primary-button" onClick={evaluateTheory} disabled={busy}>{busy?'Evaluating…':'Evaluate theory answer'}</button></div>{theoryEvaluation&&<article className="answer"><h3>Score: {theoryEvaluation.score}/{theoryEvaluation.maxScore} · {theoryEvaluation.verdict}</h3><p>{theoryEvaluation.feedback}</p><p><strong>Strengths:</strong> {theoryEvaluation.strengths.join(' · ')}</p><p><strong>Missing points:</strong> {theoryEvaluation.missingPoints.join(' · ')}</p><div className="score-card"><strong>Improved answer</strong><span>{theoryEvaluation.improvedAnswer}</span></div><small>AI-assisted evaluation. Verify against college material and faculty guidance.</small></article>}<div className="viva-box"><strong>Mock exam</strong><p>{mockStartedAt&&!mockSubmitted?'Time left: '+String(Math.floor(mockSecondsLeft/60)).padStart(2,'0')+':'+String(mockSecondsLeft%60).padStart(2,'0'):'20-minute, 10-question practice mock with answer review.'}</p><button className="primary-button" onClick={()=>startMock()} disabled={busy}>{busy?'Generating…':'Start mock exam'}</button></div>{mockSet.length>0&&<article className="answer"><h3>Mock Exam · {mockSubmitted?'Submitted':'Question '+(mockIndex+1)+'/'+mockSet.length}</h3>{!mockSubmitted?<><strong>{mockSet[mockIndex].question}</strong><div className="chip-row">{mockSet[mockIndex].options.map((o,i)=><button className={mockAnswers[mockIndex]===i?'active-chip':''} key={o} onClick={()=>setMockAnswers(a=>({...a,[mockIndex]:i}))}>{String.fromCharCode(65+i)}. {o}</button>)}</div><div className="upload-row"><button className="secondary-button" disabled={!mockIndex} onClick={()=>setMockIndex(i=>i-1)}>Previous</button><button className="secondary-button" disabled={mockIndex===mockSet.length-1} onClick={()=>setMockIndex(i=>i+1)}>Next</button><button className="primary-button" onClick={submitMock}>Submit mock</button></div></>:<><p>Score: {mockSet.reduce((s,q,i)=>s+(mockAnswers[i]===q.correctIndex?1:0),0)}/{mockSet.length}</p>{mockSet.map((q,i)=><div className="mcq-card" key={i}><strong>Q{i+1}. {q.question}</strong><small>Your answer: {mockAnswers[i]===undefined?'Not answered':q.options[mockAnswers[i]]}</small><small>Correct answer: {q.options[q.correctIndex]}</small><p>{q.explanation}</p></div>)}</>}</article>}</section>;
    if (active === 'Viva Practice') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">VIVA AGENT 2.0</span><h2>Viva Practice</h2><p>One question at a time. Answer first, then get AI-assisted scoring, feedback and a follow-up question.</p></div><Mic2 size={30} /></div><div className="viva-box"><strong>Choose a subject</strong><div className="chip-row">{semesters[selectedSemester - 1].subjects.map(s => <button className={vivaSubject === s ? 'active-chip' : ''} key={s} onClick={() => { setVivaSubject(s); startViva(s); }}>{s}</button>)}</div></div><div className="form-grid"><textarea value={vivaQuestion} readOnly placeholder="Start a viva session to receive your first question." /><textarea value={vivaAnswer} onChange={e => setVivaAnswer(e.target.value)} placeholder="Type your short viva answer here..." disabled={!vivaQuestion || busy} /></div><div className="upload-row"><button className="primary-button" onClick={() => startViva()} disabled={busy}>{busy ? 'Working…' : vivaQuestion ? 'New question' : 'Start viva'}</button><button className="secondary-button" onClick={evaluateViva} disabled={busy || !vivaQuestion || !vivaAnswer.trim()}>Evaluate answer</button></div>{vivaEvaluation && <article className="answer"><h3>Score: {vivaEvaluation.score}/10 · {vivaEvaluation.verdict}</h3><p>{vivaEvaluation.feedback}</p><p><strong>Strengths:</strong> {vivaEvaluation.strengths.join(' · ') || 'None noted'}</p><p><strong>Improve:</strong> {vivaEvaluation.improvements.join(' · ') || 'None noted'}</p><div className="score-card"><strong>Follow-up question</strong><span>{vivaEvaluation.followUpQuestion}</span></div><button className="primary-button" onClick={() => { setVivaQuestion(vivaEvaluation.followUpQuestion); setVivaTopic(vivaEvaluation.topic || vivaTopic); setVivaAnswer(''); setVivaEvaluation(null); }} disabled={busy}>Answer follow-up</button></article>}<article className="answer"><h3>Weak-topic tracker</h3>{vivaWeakTopics.length ? <div className="chip-row">{vivaWeakTopics.map(topic => <span className="source-note" key={topic}>{topic}</span>)}</div> : <small>No weak viva topics yet. Low-scoring topics will be tracked locally on this device.</small>}<small>AI-assisted evaluation only. Check important answers against your college material, lab manual and faculty guidance.</small></article></section>;
    if (active === 'Structural & Project Software') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">INDUSTRY SOFTWARE TRACK</span><h2>Structural & Project Software</h2><p>Free-first learning paths for structural analysis, infrastructure drafting, scheduling and GIS. Software commands and codes must be verified against the installed/current version.</p></div><Target size={30}/></div><div className="exam-cards"><div><strong>STAAD</strong><span>Model setup → loads → supports → analysis → result review → design documentation.</span><b>STRUCTURAL</b></div><div><strong>ETABS</strong><span>Levels/grids → structural members → load cases → analysis → drift/result interpretation.</span><b>STRUCTURAL</b></div><div><strong>Civil 3D</strong><span>Surfaces → alignments → profiles → corridors → quantities → plan production.</span><b>INFRASTRUCTURE</b></div><div><strong>Primavera / MS Project</strong><span>WBS → activities → dependencies → resources → baseline → progress tracking.</span><b>PLANNING</b></div></div><article className="answer"><h3>Recommended project workflow</h3><div className="material-list">{['Choose a real civil project and define scope','Prepare base survey/data and assumptions','Build the model/drawing/schedule in the chosen software','Run analysis or quantity/schedule checks','Review warnings, units, boundary conditions and inputs','Export sheets/results and document assumptions','Create a portfolio README with source files, outputs and revision history'].map((item,i)=><div className="material-row" key={item}><Target size={18}/><div><strong>{i+1}. {item}</strong><span>Verification checkpoint · never treat software output as professional design approval.</span></div><b>STEP {i+1}</b></div>)}</div></article><article className="answer"><h3>Advanced GIS track</h3><p>Coordinate systems → layers → attribute tables → spatial queries → digitization → map layouts → field-data QA → engineering map/report.</p><small>Before real project use, confirm datum, CRS, units, survey convention and data accuracy from authoritative project sources.</small></article></section>;
    if (active === 'AutoCAD / Revit / BIM') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">CAD + BIM LEARNING TRACK</span><h2>AutoCAD · Revit · BIM</h2><p>Software learning paths with practical civil-engineering projects. The OS teaches concepts and workflows; it does not claim a paid software license or certification.</p></div><NotebookTabs size={30} /></div><div className="form-grid"><select value={cadTrack} onChange={e => setCadTrack(e.target.value)}><option>AutoCAD</option><option>Revit</option><option>BIM Coordination</option></select><select value={cadLevel} onChange={e => setCadLevel(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Project Ready</option></select></div><div className="exam-cards"><div><strong>1 · Learn</strong><span>{cadTrack} interface, files, units, layers/families and core commands.</span><b>30–60 min</b></div><div><strong>2 · Practice</strong><span>Recreate a small civil drawing/model and follow a repeatable checklist.</span><b>60–120 min</b></div><div><strong>3 · Build</strong><span>Create a portfolio project with sheets, model structure, quantities and revision notes.</span><b>2–6 hr</b></div></div><article className="answer"><h3>{cadTrack} {cadLevel} roadmap</h3><div className="material-list">{(cadTrack === 'AutoCAD' ? ['Workspace + units + templates','Layers, object properties + annotation','Line/polyline, offset, trim, extend, fillet','Dimensions, text, blocks and layouts','Plans, sections, elevations + plotting'] : cadTrack === 'Revit' ? ['Project setup + levels + grids','Walls, floors, doors/windows and views','Families, dimensions, tags and sheets','Schedules, quantities + model checking','Sheets, revisions + portfolio export'] : ['BIM roles + model information','Model coordination and naming rules','Clash-review workflow and issue tracking','Quantities, schedules and model QA','Handoff, revisions and portfolio documentation']).map((item,index) => <div className="material-row" key={item}><NotebookTabs size={18}/><div><strong>{index + 1}. {item}</strong><span>Practice task · verify software-specific shortcuts/version details in the installed software documentation.</span></div><b>STEP {index + 1}</b></div>)}</div><small>Free-first path: use your own licensed software or legally available educational/trial versions. Do not treat this learning track as a substitute for official vendor training or professional certification.</small></article><article className="answer"><h3>Mini-project: Residential Building BIM/CAD Pack</h3><p>Deliverables: site/base plan → floor plan → elevation → section → room/door/window schedule → basic quantity schedule → title sheet → revision log.</p><p><strong>Portfolio rule:</strong> keep the source model/drawing, exported sheets, assumptions and a short README together so the work can be reviewed later.</p></article></section>;
    if (active === 'Study Voice & Camera') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">VOICE + CAMERA STUDY</span><h2>Study Voice & Camera</h2><p>Use your device microphone or camera workflow as a study input. Browser permissions and device support vary.</p></div><Mic2 size={30}/></div><article className="answer"><h3>Voice study prompt</h3><textarea value={voicePrompt} onChange={e=>setVoicePrompt(e.target.value)} rows={4}/><div className="upload-row"><button className="secondary-button" onClick={()=>{ if ('speechSynthesis' in window) { const u=new SpeechSynthesisUtterance(voicePrompt); u.lang='en-IN'; window.speechSynthesis.speak(u); } else setErrorMessage('Speech playback is not supported by this browser.'); }}>🔊 Read prompt aloud</button><button className="primary-button" onClick={()=>runWorkbench('study', voicePrompt)} disabled={busy}><Sparkles size={16}/> Get study answer</button></div></article><article className="answer"><h3>Camera question capture</h3><p>For a photo-based question, use Drawing & Diagram AI for image analysis. You can also paste the visible question here:</p><textarea value={cameraText} onChange={e=>setCameraText(e.target.value)} rows={5} placeholder="Paste question captured from camera…"/><button className="primary-button" onClick={()=>runWorkbench('study','Solve this photographed/visible Civil Engineering question. Question text: '+cameraText+'. Show assumptions and clearly mark anything that needs verification.')} disabled={busy}><ScanLine size={16}/> Solve captured question</button></article><small>Do not treat AI output as final engineering approval. Verify formulas, dimensions, standards and college-specific answers against your source material.</small></section>;
    if (active === 'Privacy & Offline Center') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">PRIVACY + OFFLINE</span><h2>Privacy & Offline Center</h2><p>Local-first controls for study data stored in this browser.</p></div><Settings size={30}/></div><article className="answer"><h3>Local data</h3><p>Study tasks, revision cards, adaptive attempts, lab history, project checklists, project evidence and career evidence are stored in browser localStorage in this app.</p><div className="upload-row"><button className="secondary-button" onClick={()=>{const keys=['civil-study-tasks','civil-study-materials','civil-study-reviews','civil-study-graph','civil-study-viva-weak','civil-study-adaptive-attempts','civil-study-lab-records','civil-study-estimate-items','civil-study-project-name','civil-study-project-stage','civil-study-project-tasks','civil-study-project-evidence','civil-study-career-skills','civil-study-career-target','civil-study-ollama-url','civil-study-ollama-model']; const data=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='civil-study-os-local-backup.json'; a.click(); URL.revokeObjectURL(a.href);}}>Export local backup</button><button className="secondary-button" onClick={()=>setOfflineNotice('Backup export is created locally by your browser. Keep it in a private location.')}>Privacy note</button></div>{offlineNotice&&<p className="source-note">{offlineNotice}</p>}</article><article className="answer"><h3>Offline-first guidance</h3><ul><li>Deterministic calculators, revision scheduling, project checklists and stored local records can continue without AI cloud generation.</li><li>Online AI, uploaded-material indexing and remote backend features may require network access.</li><li>Ollama can provide local AI when the model is installed and reachable from the browser.</li></ul></article><article className="answer"><h3>Reset local study data</h3><p>Export a backup first. Reset is irreversible for this browser profile.</p><button className="secondary-button" onClick={()=>{if(confirm('Delete Civil Study OS local data from this browser?')){['civil-study-tasks','civil-study-materials','civil-study-reviews','civil-study-graph','civil-study-viva-weak','civil-study-adaptive-attempts','civil-study-lab-records','civil-study-estimate-items','civil-study-project-name','civil-study-project-stage','civil-study-project-tasks','civil-study-project-evidence','civil-study-career-skills','civil-study-career-target','civil-study-ollama-url','civil-study-ollama-model'].forEach(k=>localStorage.removeItem(k)); window.location.reload();}}}>Reset local study data</button></article></section>;
    if (active === 'Project & Final Year Manager') { const checklistCompletion = Math.round(projectTasks.length / 9 * 100); const evidenceVerified = projectEvidence.filter(item => item.status === 'verified').length; const evidenceCompletion = projectEvidence.length ? Math.round(evidenceVerified / projectEvidence.length * 100) : 0; const deliveryCompletion = Math.round(checklistCompletion * 0.7 + evidenceCompletion * 0.3); return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">PROJECT MANAGEMENT OS 2.0</span><h2>Project & Final Year Manager</h2><p>Track a civil project from idea to documented submission with a local evidence ledger. No evidence is treated as verified until you mark it.</p></div><ClipboardList size={30}/></div><div className="form-grid"><input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Project name"/><select value={projectStage} onChange={e=>setProjectStage(e.target.value)}><option>Planning</option><option>Literature Review</option><option>Methodology</option><option>Data Collection</option><option>Analysis</option><option>Report & Presentation</option><option>Completed</option></select></div><article className="answer"><h3>Project delivery checklist</h3><div className="material-list">{['Problem statement + objectives','Literature review + source list','Methodology + work breakdown','Survey/data collection + raw evidence','Calculations/model/analysis + verification','Results + limitations','Final report + drawings/tables','Presentation + viva preparation','Portfolio README + source files'].map((item,i)=><label className="plan-item" key={item}><input type="checkbox" checked={projectTasks.includes(item)} onChange={()=>setProjectTasks(v=>v.includes(item)?v.filter(x=>x!==item):[...v,item])}/><span>{i+1}. {item}</span><small>{projectTasks.includes(item)?'Done':'Pending'}</small></label>)}</div></article><article className="answer"><h3>Evidence ledger</h3><p>Record the actual work that supports your project: drawings, models, raw data, calculations, reports, photos, presentations or portfolio files. Store the real file separately; this ledger records what it proves.</p><div className="form-grid"><input value={evidenceTitle} onChange={e=>setEvidenceTitle(e.target.value)} placeholder="Evidence title"/><select value={evidenceType} onChange={e=>setEvidenceType(e.target.value)}><option>Drawing / Model</option><option>Raw Data</option><option>Calculation</option><option>Report / Literature</option><option>Site / Lab Photo</option><option>Presentation</option><option>Portfolio / GitHub</option><option>Other</option></select><input value={evidenceNote} onChange={e=>setEvidenceNote(e.target.value)} placeholder="What does this evidence prove?"/><button className="primary-button" onClick={addProjectEvidence}><ClipboardList size={16}/> Add evidence</button></div><div className="material-list">{projectEvidence.length ? projectEvidence.map(item=><article className="material-row" key={item.id}><FileText size={18}/><div><strong>{item.title}</strong><span>{item.type} · {item.status === 'verified' ? 'Student-verified' : 'Draft'} · {item.date.slice(0,10)}</span><p>{item.note || 'No evidence note recorded.'}</p></div><button className={item.status === 'verified' ? 'secondary-button' : 'primary-button'} onClick={()=>toggleProjectEvidence(item.id)}>{item.status === 'verified' ? 'Mark draft' : 'Mark verified'}</button></article>) : <div className="empty"><FileText size={22}/><strong>No evidence records yet</strong><span>Add evidence as you produce real project work.</span></div>}</div></article><div className="score-card"><strong>{deliveryCompletion}% delivery readiness</strong><span>Checklist {checklistCompletion}% · Evidence verification {evidenceCompletion}% · {evidenceVerified}/{projectEvidence.length || 0} evidence records verified</span></div><small>AI can help draft plans/reports, but measurements, calculations, citations, standards and final engineering decisions must be verified by the student/faculty. Evidence verification here means your own review, not faculty certification.</small></section>; }
    if (active === 'Career & Internship OS') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">CAREER + INTERNSHIP OS</span><h2>Career & Internship OS</h2><p>Build employable civil-engineering evidence instead of only collecting certificates.</p></div><Trophy size={30}/></div><div className="form-grid"><input value={careerTarget} onChange={e=>setCareerTarget(e.target.value)} placeholder="Career target"/><select value={selectedSemester} onChange={e=>setSelectedSemester(Number(e.target.value))}>{semesters.map(s=><option key={s.number} value={s.number}>Semester {s.number}</option>)}</select></div><article className="answer"><h3>Readiness tracks</h3><div className="exam-cards"><div><strong>Technical</strong><span>AutoCAD/Revit/BIM, surveying, estimation, structural/project software and core subjects.</span><b>BUILD SKILLS</b></div><div><strong>Evidence</strong><span>Projects, drawings, calculations, reports, GitHub/portfolio README and verified outputs.</span><b>SHOW WORK</b></div><div><strong>Professional</strong><span>Resume, communication, interview/viva practice and internship application checklist.</span><b>PREPARE</b></div></div></article><article className="answer"><h3>Skill evidence checklist</h3><div className="material-list">{['One clean AutoCAD/Revit/BIM project','One estimation/BOQ example','One surveying/GIS field-data example','One structural analysis learning project','One project report with sources and assumptions','A concise resume + project portfolio','Mock interview/viva practice'].map(item=><label className="plan-item" key={item}><input type="checkbox" checked={careerSkills.includes(item)} onChange={()=>setCareerSkills(v=>v.includes(item)?v.filter(x=>x!==item):[...v,item])}/><span>{item}</span><small>{careerSkills.includes(item)?'Ready':'Build'}</small></label>)}</div><p><strong>Readiness:</strong> {Math.round(careerSkills.length/7*100)}%</p><small>Internship and job requirements vary by employer. Verify each vacancy's eligibility, software/version requirements and application deadline.</small></article></section>;
    if (active === 'Project Guide') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">PROJECT AGENT</span><h2>Project Guide</h2><p>Turn a Civil Engineering project idea into an actionable, verifiable roadmap.</p></div><NotebookTabs size={30} /></div><button className="primary-button" onClick={() => runWorkbench('project', 'Create a complete Civil Engineering project roadmap for Semester ' + selectedSemester + ' including problem statement, objectives, literature review, methodology, data and calculations, safety, deliverables, report structure and presentation checklist.')} disabled={busy}><Sparkles size={16} /> Generate project roadmap</button>{workbenchAnswer && <article className="answer"><h3>Project roadmap</h3><pre>{workbenchAnswer}</pre></article>}<div className="roadmap">{['Problem definition','Literature / standards review','Methodology','Data & calculations','Results','Report + presentation'].map((s, i) => <div key={s}><span>{i + 1}</span><strong>{s}</strong><small>Checkpoint</small></div>)}</div></section>;
    if (active === 'Study Plan') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">PLANNER</span><h2>Study Plan</h2><p>Daily tasks are stored locally on this device.</p></div><CalendarDays size={30} /></div><div className="material-list">{tasks.map(t => <label className={'plan-item ' + (t.done ? 'completed' : '')} key={t.id}><input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} /><span>{t.title}</span><small>{t.done ? 'Completed' : t.duration}</small></label>)}</div></section>;
    if (active === 'Question Bank') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">QUESTION BANK AGENT</span><h2>Question Bank</h2><p>Find uploaded college question banks, classify their questions and identify supported units/topics.</p></div><ClipboardList size={30} /></div><div className="upload-row"><input value={questionBankQuery} onChange={e => setQuestionBankQuery(e.target.value)} placeholder="Search by question-bank name or subject" /><button className="secondary-button" onClick={searchQuestionBanks} disabled={busy}>Search</button></div><div className="material-list">{questionBanks.length === 0 ? <div className="empty"><ClipboardList size={22} /><strong>No question banks loaded</strong><span>Upload a Question Bank in Study Materials first.</span></div> : questionBanks.map(m => <article className="material-row" key={m.id}><ClipboardList size={18} /><div><strong>{m.name}</strong><span>Sem {m.semester} · {m.subject} · {m.status}</span></div><b>{m.source}</b>{m.fileUrl && <a className="file-link" href={m.fileUrl} target="_blank" rel="noreferrer">Open file</a>}<button className="secondary-button" onClick={() => analyzeQuestionBank(m.id)} disabled={busy}>Analyze</button><button className="secondary-button" onClick={() => practiceQuestionBank(m.id)} disabled={busy}>Practice</button></article>)}</div>{questionBankAnalysis && <article className="answer"><h3>{questionBankAnalysis.material.name}</h3><p><strong>{questionBankAnalysis.material.subject}</strong> · {questionBankAnalysis.material.source}</p><div className="score-card"><strong>{questionBankAnalysis.analysis.totalQuestions} questions</strong><span>MCQ {questionBankAnalysis.analysis.categories.mcq} · Theory {questionBankAnalysis.analysis.categories.theory} · Numerical {questionBankAnalysis.analysis.categories.numerical} · Drawing/Practical {questionBankAnalysis.analysis.categories.drawingPractical} · Other {questionBankAnalysis.analysis.categories.other}</span></div><h4>Units / topics found</h4><ul>{questionBankAnalysis.analysis.unitsOrTopics.map(topic => <li key={topic}>{topic}</li>)}</ul><h4>Study advice</h4><ul>{questionBankAnalysis.analysis.studyAdvice.map(advice => <li key={advice}>{advice}</li>)}</ul><small>AI classification · Original college question-bank content remains the source of truth.</small></article>}{questionBankPractice && <article className="answer"><h3>{questionBankPractice.material.name} · Practice</h3><p>{questionBankPractice.material.subject} · {questionBankPractice.material.source}</p>{questionBankPractice.questions.map((item, index) => <div className="mcq-card" key={index}><strong>Q{index + 1}. {item.question}</strong><span className="source-note">{item.type}{item.topic ? ' · ' + item.topic : ''}</span>{item.answer ? <details><summary>Show source answer</summary><p>{item.answer}</p></details> : <small>Answer not present in the source question bank.</small>}</div>)}<small>Questions are extracted from the uploaded college source; they are not newly invented.</small></article>}{workbenchAnswer && <article className="answer"><h3>Generated study resource</h3><pre>{workbenchAnswer}</pre></article>}</section>;
    if (['Civil Drawing','Formula Sheet','Notes','Syllabus','Downloads'].includes(active)) return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">QUICK ACCESS</span><h2>{active}</h2><p>Generate a semester-specific study resource and verify college-specific details against your material.</p></div><ClipboardList size={30} /></div><button className="primary-button" onClick={() => runWorkbench('study', 'Create a useful ' + active + ' resource for Civil Engineering Semester ' + selectedSemester + '. Label anything that must be verified against college material.')} disabled={busy}><Sparkles size={16} /> {busy ? 'Generating…' : 'Generate resource'}</button>{workbenchAnswer && <article className="answer"><h3>{active}</h3><pre>{workbenchAnswer}</pre></article>}</section>;
    if (active === 'Knowledge Base') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">KNOWLEDGE BASE 3.0</span><h2>Knowledge Base</h2><p>Search or browse Semester → Subject → Unit → Topic with source version metadata.</p></div><FileText size={30} /></div><div className="form-grid"><input value={knowledgeQuery} onChange={e => setKnowledgeQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') searchKnowledge(); }} placeholder="Search a topic, unit, formula or keyword" /><select value={knowledgeSubject} onChange={e => setKnowledgeSubject(e.target.value)}><option>All subjects</option>{semesters[selectedSemester - 1].subjects.map(subject => <option key={subject}>{subject}</option>)}</select><button className="primary-button" onClick={searchKnowledge} disabled={busy}><Search size={16} /> {busy ? 'Searching…' : 'Search material'}</button><button className="secondary-button" onClick={loadKnowledgeHierarchy} disabled={busy}><Target size={16} /> Browse hierarchy</button></div><div className="upload-row"><button className="secondary-button" onClick={() => openModule('Study Materials')}><BookOpen size={16} /> Manage materials</button><span className="source-note">Primary source · Semester {selectedSemester}</span></div>{knowledgeTreeOpen && <article className="answer"><h3>Semester {selectedSemester} hierarchy</h3>{knowledgeTree.length === 0 ? <small>No indexed hierarchy yet.</small> : knowledgeTree.map(subject => <div key={subject.subject}><strong>{subject.subject}</strong>{subject.units.map(unit => <details key={unit.unit}><summary>{unit.unit}</summary>{unit.topics.map(topic => <div className="material-row" key={topic.topic}><div><strong>{topic.topic}</strong><span>{topic.sources.length} source record(s)</span></div><b>v{Math.max(...topic.sources.map(source => source.version))}</b></div>)}</details>)}</div>)}</article>}<div className="material-list">{knowledgeResults.length === 0 ? <div className="empty"><Search size={22} /><strong>No search results yet</strong><span>Enter a topic such as differentiation, thermodynamics, curves, AI or a unit name.</span></div> : knowledgeResults.map(item => <article className="material-row" key={item.id}><FileText size={18} /><div><strong>{item.name}</strong><span>{item.subject} · {item.type} · {item.status} · Version {item.version} · Score {item.score}</span><p>{item.hierarchy.map(node => node.unit + ' → ' + node.topic).join(' · ')}</p><p>{item.snippet || 'Source contains matching material.'}</p></div><b>{item.source}</b>{item.fileUrl && <a className="file-link" href={item.fileUrl} target="_blank" rel="noreferrer">Open file</a>}</article>)}</div><small>Inferred hierarchy is a navigation aid, not an official college syllabus.</small></section>;
    if (active === 'Settings') return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">SYSTEM</span><h2>Settings</h2><p>Free-first, source-traceable study configuration.</p></div><Settings size={30} /></div><div className="material-list"><div className="material-row"><Cpu size={18} /><div><strong>Local AI / Ollama</strong><span>Browser-to-Ollama support is available from the Local AI workspace. No cloud API is required for local prompts.</span></div><b>LOCAL-FIRST</b></div><div className="material-row"><Settings size={18} /><div><strong>AI routing</strong><span>Online AI workbench is active; local/offline support is now available when Ollama is running.</span></div><b>FREE-FIRST</b></div><div className="material-row"><FileText size={18} /><div><strong>Source policy</strong><span>College Material → AI Explanation → External Reference → Needs Verification.</span></div><b>TRACEABLE</b></div></div></section>;
    if (active.startsWith('Semester ')) return <section className="workspace panel-large"><div className="workspace-head"><div><span className="eyebrow">SEMESTER {selectedSemester}</span><h2>Semester {selectedSemester}</h2><p>Open a subject to study, revise or connect it to the AI agents.</p></div><BookOpen size={30} /></div><div className="subject-list">{semesters[selectedSemester - 1].subjects.map(subject => <button key={subject} onClick={() => { setTeacherTopic(`Teach me ${subject} from beginner to exam level`); setActive('AI Teacher'); }}><BookOpen size={17} /><span>{subject}</span><ChevronRight size={16} /></button>)}</div>{selectedSemester === 1 && <div className="material-list"><div className="section-heading"><div><h3>First Internal Exam · College Source</h3><p>Loaded from the supplied U.V. Patel College of Engineering Civil Engineering syllabus.</p></div></div>{semesterOneInternal.map(item => <article className="material-row" key={item.subject}><FileText size={18} /><div><strong>{item.subject}</strong><span>{item.portion}</span></div><b>PRIMARY SOURCE</b></article>)}</div>}</section>;
    return null;
  };

  return <div className="app-shell">
    <aside className={showMobileNav ? 'sidebar mobile-open' : 'sidebar'}><div className="brand"><div className="brand-mark">⌂</div><div><strong>Civil Engineering</strong><span>Study OS</span></div></div><nav>{[...navItems, { label: 'Revision Scheduler', icon: CalendarDays }, { label: 'Knowledge Graph', icon: Target }].map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => openModule(label)}><Icon size={18} /><span>{label}</span></button>)}</nav><div className="semester-nav"><div className="section-label">SEMESTERS</div>{semesters.map(s => <button key={s.number} className={selectedSemester === s.number ? 'semester active' : 'semester'} onClick={() => { setSelectedSemester(s.number); setActive(`Semester ${s.number}`); setShowMobileNav(false); }}><span>{selectedSemester === s.number ? '●' : '○'}</span>Semester {s.number}</button>)}</div><div className="sidebar-bottom"><button className="nav-item" onClick={() => openModule('Knowledge Base')}><FileText size={18} /><span>Knowledge Base</span></button><button className="nav-item" onClick={() => openModule('Settings')}><Settings size={18} /><span>Settings</span></button><div className="status"><i /> System Online<span>Local-first · Free-first</span></div></div></aside>
    <main className="main-content"><header className="topbar"><button className="mobile-menu" onClick={() => setShowMobileNav(v => !v)} aria-label="Open navigation"><Menu size={20} /></button><div className="search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search topics, modules, notes, questions..." /><kbd>Ctrl K</kbd></div><button className="mode" onClick={() => openModule('Local AI')}>AI <span>● Local</span></button><button className="icon-button" aria-label="Calendar" onClick={() => setActive('Study Plan')}><CalendarDays size={20} /></button><div className="profile"><div className="avatar">CE</div><div><strong>Civil Engineer</strong><span>Student</span></div></div></header>
      <section className="hero"><div><h1>Welcome to <em>Civil Engineering Study OS</em></h1><p>Your AI-powered, free-first study companion for Civil Engineering.</p><div className="hero-tags"><span>8 Semesters</span><span>College Material Primary</span><span>AI Agents</span><span>Offline Ready</span><span>Source Traceable</span></div></div><div className="hero-illustration">🏗️</div></section>
      {errorMessage && <div className="error-banner"><X size={16} />{errorMessage}<button onClick={() => setErrorMessage('')}>Dismiss</button></div>}
      {active !== 'Home' && renderWorkspace()}
      {active === 'Home' && <><section className="workspace-banner"><div><span className="workspace-label">ACTIVE WORKSPACE</span><h2>Semester {selectedSemester}</h2><p>Choose a module or semester to begin your focused study session.</p></div><div className="workspace-actions"><button onClick={() => openModule('AI Teacher')}>Explain a topic</button><button onClick={() => openModule('Numerical Solver')}>Solve a numerical</button><button onClick={() => openModule('Exam Preparation')}>Start practice</button></div></section><section className="content-grid"><div className="primary-column"><div className="section-heading"><div><h2>Study Modules</h2><p>Choose a focused learning mode.</p></div><span className="result-count">{filteredModules.length} active</span></div><div className="module-grid">{filteredModules.map(({ title, description, icon: Icon, tone }) => <button className={`module-card ${tone}`} key={title} onClick={() => openModule(title)}><div className="module-icon"><Icon size={22} /></div><h3>{title}</h3><p>{description}</p><span className="arrow">→</span></button>)}</div><div className="section-heading semester-heading"><div><h2>Semester Overview</h2><p>Structured from Semester 1 to Semester 8.</p></div><button className="text-button" onClick={() => openModule(`Semester ${selectedSemester}`)}>Open selected <ChevronRight size={16} /></button></div><div className="semester-grid">{semesters.map(s => <button key={s.number} className={s.number === selectedSemester ? 'semester-card selected' : 'semester-card'} onClick={() => { setSelectedSemester(s.number); setActive(`Semester ${s.number}`); }}><div className="semester-title"><span>SEM {s.number}</span><strong>{s.progress}%</strong></div>{s.subjects.map(subject => <p key={subject}>{subject}</p>)}<div className="progress-track"><span style={{ width: `${Math.max(s.progress, 3)}%` }} /></div><small>Open semester →</small></button>)}</div></div>
        <aside className="right-column"><section className="panel"><div className="panel-heading"><h3>Today's Study Plan</h3><CalendarDays size={18} /></div>{tasks.map(t => <label className={`plan-item ${t.done ? 'completed' : ''}`} key={t.id}><input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} /><span>{t.title}</span><small>{t.duration}</small></label>)}<button className="primary-button" onClick={() => openModule('Study Plan')}>View full schedule <ChevronRight size={16} /></button></section><section className="panel"><div className="panel-heading"><h3>Quick Access</h3><Target size={18} /></div><div className="quick-grid">{['Civil Drawing','Formula Sheet','Question Bank','Notes','Syllabus','Downloads'].map(item => <button key={item} onClick={() => openModule(item)}>{item}</button>)}</div></section><section className="panel"><div className="panel-heading"><h3>College Material</h3><Upload size={18} /></div><p className="panel-copy">Index your WhatsApp PDFs, notes, question banks, lab manuals and PPTs with source labels.</p><button className="secondary-button" onClick={() => openModule('Study Materials')}>Open knowledge base</button></section><section className="panel progress-panel"><div className="panel-heading"><h3>Overall Progress</h3><Trophy size={18} /></div><div className="progress-number">{overallProgress}%</div><p>{completed} of {tasks.length} daily tasks completed. Semester progress is tracked separately.</p><div className="progress-track"><span style={{ width: `${Math.max(overallProgress, 2)}%` }} /></div></section></aside></section></>}
      <footer>Study Smart · Build Better · Engineer the Future <span>Local-first architecture · College material stays source-traceable</span></footer></main>
    </div>;
}

export default App;
