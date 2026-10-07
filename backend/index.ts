import { router, json, error, db, ai, storage } from '@appdeploy/sdk';

type MaterialInput = { name?: string; type?: string; source?: string; semester?: number; subject?: string; extractedText?: string; unit?: string; topic?: string };
type MaterialRecord = MaterialInput & { id?: string; extractedText?: string; filePath?: string; fileUrl?: string; status?: string; createdAt?: string; version?: number; hierarchy?: { unit: string; topic: string }[] };

function inferHierarchy(item: MaterialRecord) {
  const text = `${item.name || ''} ${item.extractedText || ''}`;
  const units = Array.from(text.matchAll(/\\b(?:unit|module|chapter)\\s*[-:]?\\s*(\\d+|[ivx]+)\\b[^\\n]{0,140}/gi)).map(match => match[0].replace(/\\s+/g, ' ').trim()).slice(0, 12);
  const explicitUnit = item.unit?.trim();
  const explicitTopic = item.topic?.trim();
  const topics = Array.from(text.matchAll(/(?:topic|topics|chapter title)\\s*[-:]?\\s*([^\\n.;]{3,100})/gi)).map(match => match[1].replace(/\\s+/g, ' ').trim()).slice(0, 12);
  const uniqueUnits = Array.from(new Set((explicitUnit ? [explicitUnit] : []).concat(units.length ? units : ['Unmapped Unit'])));
  const uniqueTopics = Array.from(new Set((explicitTopic ? [explicitTopic] : []).concat(topics.length ? topics : [item.name || 'Unmapped Topic'])));
  return uniqueUnits.slice(0, 12).map(unit => ({ unit, topic: uniqueTopics[0] || 'Unmapped Topic' }));
}

function materialVersion(items: MaterialRecord[], input: MaterialInput) {
  const same = items.filter(item => Number(item.semester) === (Number(input.semester) || 1) && (item.subject || '').toLowerCase() === (input.subject || 'Unassigned').toLowerCase() && (item.name || '').toLowerCase() === (input.name || '').trim().toLowerCase());
  return same.reduce((max, item) => Math.max(max, Number(item.version) || 1), 0) + 1;
}
type WorkbenchInput = { mode?: string; prompt?: string; semester?: number };
type McqInput = { semester?: number; subject?: string; count?: number };
type McqQuestion = { question: string; options: string[]; correctIndex: number; explanation: string; topic?: string };

async function collegeContext(semester: number, query: string) {
  const result = await db.list<MaterialRecord>('college_materials', { limit: 50 });
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
  const ranked = result.items
    .filter(item => Number(item.semester) === semester && item.extractedText)
    .map(item => {
      const haystack = ((item.name || '') + ' ' + (item.subject || '') + ' ' + (item.extractedText || '')).toLowerCase();
      const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return ranked.map(({ item }) => `SOURCE: ${item.name} | SUBJECT: ${item.subject}\n${item.extractedText}`).join('\n\n').slice(0, 12000) || 'No extracted college-material text is available yet. Do not claim college-specific facts.';
}

const modeInstructions: Record<string, string> = {
  exam: 'You are a Civil Engineering exam coach. Create useful revision content with answers or marking points. Never claim content is from a specific university unless supplied as source material.',
  lab: 'You are a Civil Engineering laboratory assistant. Give safe academic procedures, observations, calculations, results and precautions. Never invent measured results.',
  viva: 'You are a Civil Engineering viva examiner. Ask technically sound questions and give concise model answers plus follow-ups.',
  project: 'You are a Civil Engineering project supervisor. Produce actionable project plans with scope, methodology, data, calculations, safety, deliverables and verification checkpoints.',
  study: 'You are a Civil Engineering study assistant. Create clear exam-useful resources and label anything that needs verification.',
};

function toNumber(value: unknown) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

function calculator(type: string, a: unknown, b: unknown) {
  if (type === 'Rectangle Area') {
    const length = toNumber(a); const width = toNumber(b);
    if (length === null || width === null || length < 0 || width < 0) throw new Error('Enter non-negative length and width.');
    return length * width + ' square units';
  }
  if (type === 'Concrete Volume') {
    const parts = String(a ?? '').split(',').map(v => Number(v.trim()));
    if (parts.length !== 3 || parts.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Enter length,width,height in the first field, e.g. 5,3,0.15.');
    return (parts[0] * parts[1] * parts[2]).toFixed(6).replace(/0+$/, '').replace(/\.$/, '') + ' m³';
  }
  if (type === 'Percentage') {
    const value = toNumber(a); const total = toNumber(b);
    if (value === null || total === null || total === 0) throw new Error('Enter value and non-zero total.');
    return ((value / total) * 100).toFixed(2) + '%';
  }
  if (type === 'Steel Weight') {
    const diameterMm = toNumber(a); const lengthM = toNumber(b);
    if (diameterMm === null || lengthM === null || diameterMm <= 0 || lengthM <= 0) throw new Error('Enter positive diameter in mm and bar length in m.');
    const area = Math.PI * Math.pow(diameterMm / 1000, 2) / 4;
    return (area * lengthM * 7850).toFixed(3) + ' kg (using steel density 7850 kg/m³)';
  }
  if (type === 'Earthwork Volume') {
    const parts = String(a ?? '').split(',').map(v => Number(v.trim()));
    if (parts.length !== 3 || parts.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Enter length,width,depth in the first field.');
    return (parts[0] * parts[1] * parts[2]).toFixed(3) + ' m³';
  }
  if (type === 'Brickwork Volume') {
    const parts = String(a ?? '').split(',').map(v => Number(v.trim()));
    if (parts.length !== 3 || parts.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Enter length,width,height in the first field.');
    return (parts[0] * parts[1] * parts[2]).toFixed(3) + ' m³';
  }
  if (type === 'Cement Bags Estimate') {
    const volume = toNumber(a); const ratio = String(b ?? '').split(',').map(v => Number(v.trim()));
    if (volume === null || volume <= 0 || ratio.length !== 3 || ratio.some(v => !Number.isFinite(v) || v <= 0)) throw new Error('Enter concrete volume and a positive mix ratio such as 1,2,4.');
    const cementVolume = volume * 1.54 * (ratio[0] / (ratio[0] + ratio[1] + ratio[2]));
    const cementMass = cementVolume * 1440;
    return (cementMass / 50).toFixed(2) + ' bags of 50 kg cement (estimated; uses dry-volume factor 1.54 and cement density 1440 kg/m³)';
  }
  if (type === 'Unit Converter') {
    const value = toNumber(a); const unitPair = String(b ?? '').trim().toLowerCase();
    if (value === null) throw new Error('Enter a numerical value.');
    const conversions: Record<string, number> = {
      'm to ft': 3.280839895, 'ft to m': 0.3048, 'm to mm': 1000, 'mm to m': 0.001,
      'km to m': 1000, 'm to km': 0.001, 'kg to n': 9.80665, 'n to kg': 1 / 9.80665,
      'mpa to pa': 1000000, 'pa to mpa': 0.000001
    };
    const factor = conversions[unitPair];
    if (!factor) throw new Error('Supported examples: m to ft, ft to m, m to mm, mm to m, km to m, kg to n, N to kg, MPa to Pa, Pa to MPa.');
    return (value * factor).toPrecision(8) + ' (' + unitPair + ')';
  }
  throw new Error('Unsupported calculator.');
}

function estimationCalculate(itemsInput: unknown, wastageInput: unknown, overheadInput: unknown) {
  if (!Array.isArray(itemsInput) || itemsInput.length === 0) throw new Error('Add at least one quantity takeoff item.');
  const wastagePercent = Number(wastageInput ?? 0);
  const overheadPercent = Number(overheadInput ?? 0);
  if (!Number.isFinite(wastagePercent) || wastagePercent < 0 || !Number.isFinite(overheadPercent) || overheadPercent < 0) throw new Error('Wastage and overhead percentages must be non-negative.');
  const items = itemsInput.slice(0, 100).map((raw) => {
    const item = raw as { description?: string; measurement?: string; length?: unknown; width?: unknown; height?: unknown; multiplier?: unknown; rate?: unknown };
    const description = item.description?.trim();
    const measurement = item.measurement || 'volume';
    const length = toNumber(item.length);
    const width = toNumber(item.width);
    const height = toNumber(item.height);
    const multiplier = toNumber(item.multiplier);
    const rate = toNumber(item.rate);
    if (!description) throw new Error('Every takeoff item needs a description.');
    if (!['count', 'length', 'area', 'volume'].includes(measurement)) throw new Error('Unsupported measurement type.');
    if (multiplier === null || multiplier <= 0 || rate === null || rate < 0) throw new Error('Each item needs a positive multiplier and non-negative rate.');
    let quantity = multiplier;
    if (measurement === 'length') {
      if (length === null || length < 0) throw new Error('Length measurement requires a non-negative length.');
      quantity = length * multiplier;
    } else if (measurement === 'area') {
      if (length === null || width === null || length < 0 || width < 0) throw new Error('Area measurement requires non-negative length and width.');
      quantity = length * width * multiplier;
    } else if (measurement === 'volume') {
      if (length === null || width === null || height === null || length < 0 || width < 0 || height < 0) throw new Error('Volume measurement requires non-negative length, width and height.');
      quantity = length * width * height * multiplier;
    }
    const amount = quantity * rate;
    if (!Number.isFinite(quantity) || !Number.isFinite(amount)) throw new Error('Takeoff calculation produced a non-finite result.');
    return { ...item, description, measurement, quantity: Number(quantity.toPrecision(10)), amount: Number(amount.toFixed(2)), rate };
  });
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const wastageAmount = subtotal * (wastagePercent / 100);
  const overheadBase = subtotal + wastageAmount;
  const overheadAmount = overheadBase * (overheadPercent / 100);
  const grandTotal = subtotal + wastageAmount + overheadAmount;
  return { items, summary: { subtotal: Number(subtotal.toFixed(2)), wastageAmount: Number(wastageAmount.toFixed(2)), overheadAmount: Number(overheadAmount.toFixed(2)), grandTotal: Number(grandTotal.toFixed(2)) } };
}

function surveyCalculate(mode: string, v: Record<string,unknown>){const n=(k:string)=>toNumber(v[k]);const p=(k:string)=>{const x=n(k);if(x===null||x<0)throw new Error('Enter a valid non-negative value for '+k);return x};let value=0,formula='',units='';if(mode==='distance'){value=Math.hypot(p('dX'),p('dY'));formula='Horizontal distance = √(ΔE² + ΔN²)';units='m'}else if(mode==='coordinate-distance'){value=Math.hypot(p('e2')-p('e1'),p('n2')-p('n1'));formula='Distance = √((E2−E1)² + (N2−N1)²)';units='m'}else if(mode==='slope-distance'){const sd=p('slopeDistance'),ang=p('angle');value=sd*Math.cos(ang*Math.PI/180);formula='Horizontal distance = slope distance × cos(vertical angle)';units='m'}else{const r=p('rise'),run=p('run');if(run===0)throw new Error('Run must be non-zero');value=r/run*100;formula='Slope % = (Rise / Run) × 100';units='%'}if(!Number.isFinite(value))throw new Error('Non-finite result');return{formula,value:Number(value.toPrecision(10)),units,verification:'Deterministic arithmetic. Confirm datum, CRS, bearing convention and units before project use.'}}

type NumericalMode = 'stress' | 'strain' | 'pressure' | 'discharge' | 'moment' | 'density' | 'bending-stress';

function numericalSolve(mode: NumericalMode, values: Record<string, unknown>) {
  const n = (key: string) => toNumber(values[key]);
  const positive = (key: string) => { const value = n(key); if (value === null || value <= 0) throw new Error('Enter a positive value for ' + key + '.'); return value; };
  let value: number; let formula: string; let variables: string; let units: string;
  if (mode === 'stress') { value = positive('force') / positive('area'); formula = 'Stress = Force / Area'; variables = 'Force ÷ Area'; units = 'Pa when force is N and area is m²'; }
  else if (mode === 'strain') { value = positive('deltaLength') / positive('originalLength'); formula = 'Strain = Change in length / Original length'; variables = 'ΔL ÷ L'; units = 'dimensionless'; }
  else if (mode === 'pressure') { value = positive('density') * 9.80665 * positive('head'); formula = 'Pressure = ρ × g × h'; variables = 'Density × 9.80665 × Head'; units = 'Pa when density is kg/m³ and head is m'; }
  else if (mode === 'discharge') { value = positive('area') * positive('velocity'); formula = 'Discharge = Area × Velocity'; variables = 'Area × Velocity'; units = 'm³/s when area is m² and velocity is m/s'; }
  else if (mode === 'moment') { value = positive('force') * positive('arm'); formula = 'Moment = Force × Lever arm'; variables = 'Force × Arm'; units = 'N·m when force is N and arm is m'; }
  else if (mode === 'density') { value = positive('mass') / positive('volume'); formula = 'Density = Mass / Volume'; variables = 'Mass ÷ Volume'; units = 'kg/m³ when mass is kg and volume is m³'; }
  else { value = positive('moment') * positive('distance') / positive('inertia'); formula = 'Bending stress = M × y / I'; variables = 'Moment × distance ÷ second moment of area'; units = 'Pa when M is N·m, y is m and I is m⁴'; }
  if (!Number.isFinite(value)) throw new Error('Calculation produced a non-finite result.');
  return { mode, formula, variables, value: Number(value.toPrecision(10)), units, verification: 'Arithmetic is deterministic. Confirm units, sign convention and engineering assumptions before real-world use.' };
}

function analyzeObservations(raw: unknown) {
  const values = String(raw ?? '').split(/[\\s,;]+/).map(Number).filter(Number.isFinite);
  if (values.length < 2) throw new Error('Enter at least two numeric observations.');
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const minimum = Math.min(...values); const maximum = Math.max(...values);
  return { count: values.length, average: Number(average.toPrecision(10)), minimum, maximum, spread: Number((maximum - minimum).toPrecision(10)) };
}

export const handler = router({
  'POST /api/lab/analyze-observations': [async ({ body }) => {
    try { return json({ analysis: analyzeObservations((body as { observations?: string }).observations) }); }
    catch (err) { return error(err instanceof Error ? err.message : 'Invalid observations', 400); }
  }],
  'POST /api/numerical/solve': [async ({ body }) => {
    const input = body as { mode?: NumericalMode; values?: Record<string, unknown> };
    const allowed: NumericalMode[] = ['stress', 'strain', 'pressure', 'discharge', 'moment', 'density', 'bending-stress'];
    if (!input.mode || !allowed.includes(input.mode)) return error('Unsupported numerical mode', 400);
    try { return json({ solution: numericalSolve(input.mode, input.values || {}) }); }
    catch (err) { return error(err instanceof Error ? err.message : 'Invalid numerical input', 400); }
  }],

  'POST /api/calculators/run': [async ({ body }) => {
    const input = body as { type?: string; a?: string; b?: string };
    try { return json({ type: input.type, result: calculator(input.type || 'Unit Converter', input.a, input.b) }); }
    catch (err) { return error(err instanceof Error ? err.message : 'Invalid calculator input', 400); }
  }],
  'POST /api/estimation/calculate': [async ({ body }) => {
    const input = body as { items?: unknown[]; wastagePercent?: unknown; overheadPercent?: unknown };
    try {
      return json(estimationCalculate(input.items, input.wastagePercent, input.overheadPercent));
    } catch (err) {
      return error(err instanceof Error ? err.message : 'Invalid estimation input', 400);
    }
  }],
  'POST /api/survey/calculate': [async ({ body }) => {
    const input = body as { mode?: string; values?: Record<string, unknown> };
    if (!input.mode) return error('Survey mode is required', 400);
    try { return json({ solution: surveyCalculate(input.mode, input.values || {}) }); }
    catch (err) { return error(err instanceof Error ? err.message : 'Invalid survey input', 400); }
  }],
  'GET /api/_healthcheck': [async () => json({ message: 'Civil Study OS backend online', version: 'college-rag' })],
  'GET /api/materials': [async ({ query }) => {
    const result = await db.list<MaterialRecord>('college_materials', { limit: 50 });
    const items = query.semester ? result.items.filter(item => String(item.semester) === query.semester) : result.items;
    return json({ items });
  }],
  'GET /api/knowledge/search': [async ({ query }) => {
    const semester = Number(query.semester) || 1;
    const q = (query.q || '').trim().toLowerCase();
    const subject = (query.subject || '').trim().toLowerCase();
    const result = await db.list<MaterialRecord>('college_materials', { limit: 100 });
    const words = q.split(/[^a-z0-9]+/).filter(word => word.length > 2);
    const phrase = q.replace(/[^a-z0-9 ]+/g, ' ').trim();
    const items = result.items
      .filter(item => Number(item.semester) === semester && item.extractedText)
      .filter(item => !subject || (item.subject || '').toLowerCase() === subject)
      .map(item => {
        const text = item.extractedText || '';
        const title = (item.name || '').toLowerCase();
        const haystack = `${title} ${(item.subject || '').toLowerCase()} ${(item.unit || '').toLowerCase()} ${(item.topic || '').toLowerCase()} ${text.toLowerCase()}`;
        const tokenScore = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
        const phraseBonus = phrase && haystack.includes(phrase) ? 4 : 0;
        const titleBonus = words.reduce((sum, word) => sum + (title.includes(word) ? 2 : 0), 0);
        const versionBonus = Math.min(Number(item.version) || 1, 5) * 0.05;
        const score = tokenScore + phraseBonus + titleBonus + versionBonus;
        const hitPositions = words.map(word => text.toLowerCase().indexOf(word)).filter(pos => pos >= 0);
        const hit = hitPositions.length ? Math.min(...hitPositions) : 0;
        const start = hit > 180 ? hit - 180 : 0;
        const snippet = text.slice(start, start + 560).replace(/\s+/g, ' ').trim();
        const hierarchy = item.hierarchy?.length ? item.hierarchy : inferHierarchy(item);
        return { id: item.id, name: item.name, subject: item.subject, type: item.type, source: item.source, status: item.status, fileUrl: item.fileUrl, version: Number(item.version) || 1, hierarchy, score: Number(score.toFixed(2)), snippet };
      })
      .filter(item => !words.length || item.score > 0)
      .sort((a, b) => b.score - a.score || b.version - a.version)
      .slice(0, 15);
    return json({ semester, query: q, subject: subject || 'All subjects', items });
  }],
  'GET /api/knowledge/hierarchy': [async ({ query }) => {
    const semester = Number(query.semester) || 1;
    const result = await db.list<MaterialRecord>('college_materials', { limit: 100 });
    const scoped = result.items.filter(item => Number(item.semester) === semester);
    const tree: Record<string, Record<string, Record<string, { topic: string; materialId?: string; version: number }[]>>> = {};
    for (const item of scoped) {
      const subject = item.subject || 'Unassigned';
      const hierarchy = item.hierarchy?.length ? item.hierarchy : inferHierarchy(item);
      if (!tree[subject]) tree[subject] = {};
      for (const node of hierarchy) {
        if (!tree[subject][node.unit]) tree[subject][node.unit] = {};
        const topic = node.topic || 'Unmapped Topic';
        if (!tree[subject][node.unit][topic]) tree[subject][node.unit][topic] = [];
        tree[subject][node.unit][topic].push({ topic, materialId: item.id, version: Number(item.version) || 1 });
      }
    }
    return json({ semester, subjects: Object.entries(tree).map(([subject, units]) => ({ subject, units: Object.entries(units).map(([unit, topics]) => ({ unit, topics: Object.entries(topics).map(([topic, sources]) => ({ topic, sources })) })) })) });
  }],
  'POST /api/materials': [async ({ body }) => {
    const input = body as MaterialInput;
    if (!input.name?.trim()) return error('Material name is required', 400);
    const existing = await db.list<MaterialRecord>('college_materials', { limit: 100 });
    const record = { name: input.name.trim(), type: input.type || 'Other', source: input.source || 'College Material', semester: Number(input.semester) || 1, subject: input.subject || 'Unassigned', unit: input.unit || '', topic: input.topic || '', version: materialVersion(existing.items, input), status: 'Indexed metadata', createdAt: new Date().toISOString() };
    const hierarchy = inferHierarchy(record);
    const [id] = await db.add('college_materials', [{ ...record, hierarchy }]);
    if (!id) return error('Could not save material', 500);
    return json({ material: { id, ...record } }, 201);
  }],
  'POST /api/question-bank/analyze': [async ({ body }) => {
    const input = body as { materialId?: string };
    if (!input.materialId?.trim()) return error('Question bank material ID is required', 400);
    try {
      const [item] = await db.get<MaterialRecord>('college_materials', [input.materialId.trim()]);
      if (!item) return error('Question bank not found', 404);
      if (item.type !== 'Question Bank') return error('Selected material is not a Question Bank', 400);
      const content = (item.extractedText || '').trim();
      if (!content) return error('This question bank has no extracted text. Upload a text-readable PDF first.', 422);
      const result = await ai.extract({
        system: 'You classify college question-bank content. Do not invent questions. Preserve the source wording where possible and return counts plus short topic/unit labels.',
        prompt: 'Analyze this Civil Engineering question bank and classify the supplied questions into MCQ, theory, numerical, drawing/practical, and other. Identify units/topics only when supported by the source.',
        content: content.slice(0, 50000),
        schema: {
          type: 'object',
          properties: {
            totalQuestions: { type: 'integer', minimum: 0 },
            categories: {
              type: 'object',
              properties: {
                mcq: { type: 'integer', minimum: 0 },
                theory: { type: 'integer', minimum: 0 },
                numerical: { type: 'integer', minimum: 0 },
                drawingPractical: { type: 'integer', minimum: 0 },
                other: { type: 'integer', minimum: 0 },
              },
              required: ['mcq', 'theory', 'numerical', 'drawingPractical', 'other'],
            },
            unitsOrTopics: { type: 'array', items: { type: 'string' }, maxItems: 20 },
            studyAdvice: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          },
          required: ['totalQuestions', 'categories', 'unitsOrTopics', 'studyAdvice'],
        },
        thinkingMode: 'FAST',
        maxTokens: 1800,
        temperature: 0.1,
      });
      return json({ material: { id: item.id, name: item.name, subject: item.subject, source: item.source }, analysis: result.data });
    } catch (err) { console.error('question_bank_analysis_error', err); return error('Question bank analysis failed', 502); }
  }],
  'POST /api/question-bank/practice': [async ({ body }) => {
    const input = body as { materialId?: string; count?: number };
    if (!input.materialId?.trim()) return error('Question bank material ID is required', 400);
    try {
      const [item] = await db.get<MaterialRecord>('college_materials', [input.materialId.trim()]);
      if (!item) return error('Question bank not found', 404);
      if (item.type !== 'Question Bank') return error('Selected material is not a Question Bank', 400);
      const content = (item.extractedText || '').trim();
      if (!content) return error('This question bank has no extracted text. Upload a text-readable PDF first.', 422);
      const count = Math.min(Math.max(Number(input.count) || 8, 5), 12);
      const result = await ai.extract({
        system: 'You extract existing questions from a college question bank. Do not invent questions. Preserve wording as closely as possible. Only include an answer when an answer is explicitly present in the supplied source; otherwise answer must be null.',
        prompt: 'Extract up to ' + count + ' usable questions for practice. Classify each as MCQ, theory, numerical, drawing/practical, or other. Identify a topic only when supported by the source.',
        content: content.slice(0, 50000),
        schema: { type: 'object', properties: { questions: { type: 'array', minItems: 5, maxItems: count, items: { type: 'object', properties: { type: { type: 'string', enum: ['MCQ', 'Theory', 'Numerical', 'Drawing/Practical', 'Other'] }, question: { type: 'string' }, answer: { type: ['string', 'null'] }, topic: { type: 'string' } }, required: ['type', 'question', 'answer'] } } }, required: ['questions'] },
        thinkingMode: 'FAST',
        maxTokens: 2200,
        temperature: 0.1,
      });
      const extracted = result.data as { questions?: Array<{ type: string; question: string; answer?: string | null; topic?: string }> };
      return json({ material: { id: input.materialId.trim(), name: item.name, subject: item.subject, source: item.source }, questions: extracted.questions || [] });
    } catch (err) {
      console.error('question_bank_practice_error', err);
      return error('Question bank practice extraction failed', 502);
    }
  }],
  'POST /api/study/adaptive-plan': [async ({ body }) => {
    const input = body as { semester?: number; subject?: string; score?: number; total?: number; topics?: string[] };
    const semester = Number(input.semester) || 1;
    const subject = input.subject?.trim() || 'Current subject';
    const score = Number(input.score) || 0;
    const total = Math.max(Number(input.total) || 1, 1);
    const topics = Array.isArray(input.topics) ? input.topics.filter(Boolean).slice(0, 12) : [];
    try {
      const context = await collegeContext(semester, subject + ' ' + topics.join(' '));
      const result = await ai.extract({
        system: 'You are an adaptive Civil Engineering study planner. Use the student performance and supplied college material to create a short revision plan. Do not invent college-specific facts. Prioritize weak areas when score is below 70%.',
        prompt: 'Build a practical revision plan for Semester ' + semester + ', subject ' + subject + '. Score: ' + score + '/' + total + ' (' + Math.round((score / total) * 100) + '%). Topics detected from the practice set: ' + (topics.join(', ') || 'not available') + '. Return 3-6 actions with priority, topic, reason and minutes.',
        content: context,
        schema: { type: 'object', properties: { summary: { type: 'string' }, actions: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', properties: { priority: { type: 'string', enum: ['High', 'Medium', 'Low'] }, topic: { type: 'string' }, reason: { type: 'string' }, action: { type: 'string' }, minutes: { type: 'integer', minimum: 5, maximum: 120 } }, required: ['priority', 'topic', 'reason', 'action', 'minutes'] } } }, required: ['summary', 'actions'] },
        thinkingMode: 'FAST',
        maxTokens: 1800,
        temperature: 0.15,
      });
      return json({ semester, subject, score, total, plan: result.data });
    } catch (err) {
      console.error('adaptive_plan_error', err);
      return error('Adaptive study plan failed', 502);
    }
  }],
  'POST /api/materials/file': [async ({ body }) => {
    const input = body as MaterialInput & { filename?: string; contentType?: string; data?: string };
    if (!input.filename || !input.data) return error('File data is required', 400);
    if (input.data.length > 7000000) return error('File is too large', 413);
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = 'college-materials/sem-' + (Number(input.semester) || 1) + '/' + Date.now() + '-' + safeName;
    const [ok] = await storage.write([{ path, content: input.data, contentType: input.contentType || 'application/octet-stream' }]);
    if (!ok) return error('Could not store file', 500);
    const [urlInfo] = await storage.url([path]);
    const extractedText = input.extractedText?.slice(0, 50000) || '';
    const existing = await db.list<MaterialRecord>('college_materials', { limit: 100 });
    const record = { name: input.name?.trim() || input.filename, type: input.type || 'Other', source: input.source || 'College Material', semester: Number(input.semester) || 1, subject: input.subject || 'Unassigned', unit: input.unit || '', topic: input.topic || '', version: materialVersion(existing.items, input), status: extractedText ? 'File stored; text indexed' : 'File stored; text indexing pending', filePath: path, fileUrl: urlInfo?.url || '', extractedText, createdAt: new Date().toISOString() };
    const hierarchy = inferHierarchy(record);
    Object.assign(record, { hierarchy });
    const [id] = await db.add('college_materials', [record]);
    if (!id) return error('File stored but metadata could not be saved', 500);
    return json({ material: { id, name: record.name, type: record.type, source: record.source, semester: record.semester, subject: record.subject, status: record.status, fileUrl: record.fileUrl } }, 201);
  }],
  'POST /api/ai/teacher': [async ({ body }) => {
    const input = body as { topic?: string; semester?: number };
    if (!input.topic?.trim()) return error('Topic is required', 400);
    try {
      const semester = Number(input.semester) || 1;
      const context = await collegeContext(semester, input.topic.trim());
      const result = await ai.generate({ system: 'You are a patient Civil Engineering professor. Explain clearly for a B.Tech student. Use intuition, definition, core concept, worked example, exam points and common mistakes. College material below is PRIMARY SOURCE when relevant. Never invent missing college-specific facts.\n\nCOLLEGE MATERIAL:\n' + context, prompt: 'Semester ' + semester + '. Topic: ' + input.topic.trim(), thinkingMode: 'FAST', maxTokens: 1600, temperature: 0.2 });
      return json({ answer: result.text });
    } catch (err) { console.error('teacher_ai_error', err); return error('AI Teacher service failed', 502); }
  }],
  'POST /api/ai/exam-mcq': [async ({ body }) => {
    const input = body as McqInput;
    try {
      const semester = Number(input.semester) || 1;
      const subject = input.subject?.trim() || 'Civil Engineering';
      const count = Math.min(Math.max(Number(input.count) || 10, 5), 20);
      const context = await collegeContext(semester, subject);
      const result = await ai.generate({
        system: 'You are an exam question writer for a B.Tech Civil Engineering student. College material is PRIMARY SOURCE when supplied. Create exactly ' + count + ' multiple-choice questions for the requested subject. Each question must have exactly four options and exactly one correct answer. Avoid ambiguous questions. Return ONLY valid JSON matching the supplied schema. Do not invent college-specific facts that are absent from the source.\n\nCOLLEGE MATERIAL:\n' + context,
        prompt: 'Semester ' + semester + '. Subject: ' + subject + '. Create the MCQ practice set.',
        schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
                  correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
                  explanation: { type: 'string' },
                  topic: { type: 'string' },
                },
                required: ['question', 'options', 'correctIndex', 'explanation'],
              },
              minItems: count,
              maxItems: count,
            },
          },
          required: ['questions'],
        },
        thinkingMode: 'FAST',
        maxTokens: 3600,
        temperature: 0.2,
      });
      let parsed: { questions?: McqQuestion[] };
      try { parsed = JSON.parse(result.text); } catch { return error('AI returned an invalid MCQ set. Generate again.', 502); }
      const questions = (parsed.questions || []).filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4).slice(0, count);
      if (questions.length < 5) return error('AI returned too few valid MCQs. Generate again.', 502);
      return json({ subject, semester, questions });
    } catch (err) { console.error('exam_mcq_error', err); return error('Exam MCQ service failed', 502); }
  }],
  'POST /api/exam/theory-evaluate': [async ({ body }) => {
    const input=body as {semester?:number;subject?:string;question?:string;answer?:string}; if(!input.question?.trim()||!input.answer?.trim()) return error('Question and answer are required',400);
    try { const semester=Number(input.semester)||1; const subject=input.subject?.trim()||'Civil Engineering'; const context=await collegeContext(semester,subject+' '+input.question);
      const result=await ai.extract({system:'Fair B.Tech Civil Engineering theory evaluator. Score 0-10 for correctness, relevance, completeness and clarity. Do not invent university marking rules.',prompt:'Evaluate this answer and provide missing points plus an improved exam-ready answer.',content:context,schema:{type:'object',properties:{score:{type:'integer',minimum:0,maximum:10},maxScore:{type:'integer'},verdict:{type:'string'},feedback:{type:'string'},strengths:{type:'array',items:{type:'string'}},missingPoints:{type:'array',items:{type:'string'}},improvedAnswer:{type:'string'},topic:{type:'string'}},required:['score','maxScore','verdict','feedback','strengths','missingPoints','improvedAnswer','topic']},thinkingMode:'FAST',maxTokens:1400,temperature:0.1});
      return json({evaluation:result.data}); } catch(err){console.error('theory_eval_error',err);return error('Theory evaluation failed',502);}
  }],
  'POST /api/exam/mock': [async ({ body }) => {
    const input=body as {semester?:number;subject?:string;count?:number};
    try { const semester=Number(input.semester)||1; const subject=input.subject?.trim()||'Civil Engineering'; const count=Math.min(Math.max(Number(input.count)||10,5),15); const context=await collegeContext(semester,subject);
      const result=await ai.extract({system:'Create a Civil Engineering mock exam. Generate exactly the requested MCQs, four options each, one correct answer. Use college material when supplied.',prompt:'Create a '+count+' question mock exam for Semester '+semester+', '+subject+'.',content:context,schema:{type:'object',properties:{questions:{type:'array',minItems:count,maxItems:count,items:{type:'object',properties:{question:{type:'string'},options:{type:'array',items:{type:'string'},minItems:4,maxItems:4},correctIndex:{type:'integer',minimum:0,maximum:3},explanation:{type:'string'},topic:{type:'string'}},required:['question','options','correctIndex','explanation']}}},required:['questions']},thinkingMode:'FAST',maxTokens:3000,temperature:0.15});
      return json({questions:result.data}); } catch(err){console.error('mock_exam_error',err);return error('Mock exam generation failed',502);}
  }],
  'POST /api/viva/question': [async ({ body }) => {
    const input = body as { semester?: number; subject?: string; previousTopic?: string; weakTopics?: string[] };
    const semester = Number(input.semester) || 1;
    const subject = input.subject?.trim() || 'Civil Engineering';
    const weakTopics = Array.isArray(input.weakTopics) ? input.weakTopics.slice(0, 8) : [];
    try {
      const context = await collegeContext(semester, subject + ' ' + (input.previousTopic || '') + ' ' + weakTopics.join(' '));
      const result = await ai.extract({
        system: 'You are a Civil Engineering viva examiner. Generate exactly one clear viva question. Prefer weak topics when supplied. Do not claim college-specific facts unless supported by the source. Keep the question answerable in 1-3 minutes.',
        prompt: 'Semester ' + semester + ', subject: ' + subject + '. Previous topic: ' + (input.previousTopic || 'none') + '. Weak topics: ' + (weakTopics.join(', ') || 'none') + '. Generate the next viva question and a concise topic label.',
        content: context,
        schema: { type: 'object', properties: { question: { type: 'string' }, topic: { type: 'string' } }, required: ['question', 'topic'] },
        thinkingMode: 'FAST', maxTokens: 500, temperature: 0.2,
      });
      const vivaQuestion = result.data as { question?: string; topic?: string };
      return json({ question: vivaQuestion.question || '', topic: vivaQuestion.topic || subject, subject, semester });
    } catch (err) { console.error('viva_question_error', err); return error('Viva question generation failed', 502); }
  }],
  'POST /api/viva/evaluate': [async ({ body }) => {
    const input = body as { semester?: number; subject?: string; question?: string; answer?: string; topic?: string };
    if (!input.question?.trim() || !input.answer?.trim()) return error('Question and answer are required', 400);
    const semester = Number(input.semester) || 1;
    const subject = input.subject?.trim() || 'Civil Engineering';
    try {
      const context = await collegeContext(semester, subject + ' ' + (input.topic || '') + ' ' + input.question);
      const result = await ai.extract({
        system: 'You are a fair Civil Engineering viva evaluator. Score the student answer from 0 to 10 based on technical correctness, relevance, completeness and clarity. Do not penalize simple English. Do not invent college-specific marking rules. Give concise feedback and exactly one useful follow-up question.',
        prompt: 'Subject: ' + subject + '. Question: ' + input.question.trim() + '. Topic: ' + (input.topic || subject) + '. Student answer: ' + input.answer.trim() + '. Evaluate the answer using the supplied college material when relevant.',
        content: context,
        schema: { type: 'object', properties: { score: { type: 'integer', minimum: 0, maximum: 10 }, verdict: { type: 'string' }, feedback: { type: 'string' }, strengths: { type: 'array', items: { type: 'string' }, maxItems: 4 }, improvements: { type: 'array', items: { type: 'string' }, maxItems: 4 }, followUpQuestion: { type: 'string' }, topic: { type: 'string' } }, required: ['score', 'verdict', 'feedback', 'strengths', 'improvements', 'followUpQuestion', 'topic'] },
        thinkingMode: 'FAST', maxTokens: 1000, temperature: 0.1,
      });
      return json({ evaluation: result.data });
    } catch (err) { console.error('viva_evaluation_error', err); return error('Viva evaluation failed', 502); }
  }],
  'POST /api/ai/drawing': [async ({ body }) => {
    const input = body as { semester?: number; subject?: string; mode?: string; data?: string; mimeType?: string; filename?: string };
    if (!input.data) return error('Image data is required', 400);
    if (input.data.length > 8500000) return error('Image is too large', 413);
    const semester = Number(input.semester) || 1;
    const subject = input.subject?.trim() || 'Civil Engineering';
    const mode = input.mode?.trim() || 'Explain the drawing step by step for a beginner';
    try {
      const result = await ai.generate({
        system: 'You are a Civil Engineering drawing tutor. Analyze only what is visibly supported by the supplied image. Do not invent dimensions, labels, standards or construction facts. If the image is unclear, say what cannot be read. Explain simply, then give exam/viva points when useful. Never certify construction safety or final engineering correctness.',
        prompt: 'Semester ' + semester + ', subject: ' + subject + '. Task: ' + mode + '. Image filename: ' + (input.filename || 'drawing') + '.',
        images: [{ data: input.data, mimeType: input.mimeType || 'image/jpeg' }],
        thinkingMode: 'FAST', maxTokens: 2200, temperature: 0.15,
      });
      return json({ answer: result.text, semester, subject, mode });
    } catch (err) { console.error('drawing_ai_error', err); return error('Drawing AI service failed', 502); }
  }],
  'POST /api/ai/numerical': [async ({ body }) => {
    const input = body as { question?: string; semester?: number };
    if (!input.question?.trim()) return error('Question is required', 400);
    try {
      const semester = Number(input.semester) || 1;
      const context = await collegeContext(semester, input.question.trim());
      const result = await ai.generate({ system: 'You are a Civil Engineering numerical-solving tutor. Use Given, Find, Formula, Unit conversion, Substitution, Calculation, Final answer with units, and Verification. College material below is PRIMARY SOURCE when relevant; do not invent missing data.\n\nCOLLEGE MATERIAL:\n' + context, prompt: 'Semester ' + semester + '. Solve: ' + input.question.trim(), thinkingMode: 'DEEP', maxTokens: 2200, temperature: 0.1 });
      return json({ answer: result.text });
    } catch (err) { console.error('numerical_ai_error', err); return error('Numerical AI service failed', 502); }
  }],
  'POST /api/ai/workbench': [async ({ body }) => {
    const input = body as WorkbenchInput;
    if (!input.prompt?.trim()) return error('Prompt is required', 400);
    const mode = input.mode && modeInstructions[input.mode] ? input.mode : 'study';
    try {
      const semester = Number(input.semester) || 1;
      const context = await collegeContext(semester, input.prompt.trim());
      const result = await ai.generate({ system: modeInstructions[mode] + ' College material is the primary source when supplied. Clearly label assumptions and verification needs.\n\nCOLLEGE MATERIAL:\n' + context, prompt: 'Semester ' + semester + '. ' + input.prompt.trim(), thinkingMode: mode === 'project' ? 'DEEP' : 'FAST', maxTokens: 2600, temperature: 0.15 });
      return json({ answer: result.text, mode });
    } catch (err) { console.error('workbench_ai_error', err); return error('AI workbench service failed', 502); }
  }],
});
