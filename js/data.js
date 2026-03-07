/* ═══════════════════════════════════════════
   NovaCS — Data Store
   js/data.js
   Single source of truth for all mock data.
   Replace with API calls in production.
═══════════════════════════════════════════ */

const ORGS = {
  acme:    { name: 'Acme Corp',            initials: 'AC', color: '#1e3a5f' },
  nexgen:  { name: 'NexGen Talent Ltd',    initials: 'NT', color: '#0f6b3a' },
  vertex:  { name: 'Vertex Consulting',    initials: 'VC', color: '#6d28d9' },
  clear:   { name: 'ClearPath Recruitment',initials: 'CP', color: '#0e4e6e' },
};

const SECTIONS = [
  { key: 'judgement',   title: 'Judgement & Decision Making', icon: '⚖️',  sub: 'Workplace scenarios & ethical choices',  weight: 0.35 },
  { key: 'numerical',   title: 'Numerical Reasoning',          icon: '🔢',  sub: 'Data interpretation & calculations',    weight: 0.25 },
  { key: 'verbal',      title: 'Verbal & Communication',       icon: '💬',  sub: 'Comprehension, clarity & articulation', weight: 0.20 },
  { key: 'situational', title: 'Situational Scenarios',        icon: '🎭',  sub: 'Real-world role-based decisions',       weight: 0.20 },
];

let CANDS = [
  { id:1, name:'Maya Patel',    email:'maya.p@email.com',   role:'Customer Success Manager', org:'acme',   status:'completed', date:'2026-03-03', scores:{judgement:95,numerical:88,verbal:91,situational:90}, initials:'MP', color:'#1e3a5f', time:'9:42',  answered:25, flagged:false, decision:'shortlisted', stage:'Interview',   code:'MP9X2A', phone:'4821', notes:'' },
  { id:2, name:'James Okafor', email:'j.okafor@email.com',  role:'Operations Analyst',       org:'nexgen', status:'completed', date:'2026-03-04', scores:{judgement:84,numerical:92,verbal:78,situational:85}, initials:'JO', color:'#0f6b3a', time:'13:11', answered:25, flagged:false, decision:'shortlisted', stage:'Interview',   code:'JO4K8B', phone:'7732', notes:'' },
  { id:3, name:'Sophie Tan',   email:'sophie.t@email.com',  role:'Project Manager',          org:'acme',   status:'completed', date:'2026-03-04', scores:{judgement:80,numerical:70,verbal:85,situational:78}, initials:'ST', color:'#0e4e6e', time:'17:55', answered:24, flagged:true,  decision:'none',        stage:'',            code:'ST3N1C', phone:'2209', notes:'' },
  { id:4, name:'Carlos Ruiz',  email:'c.ruiz@email.com',    role:'Sales Associate',          org:'vertex', status:'completed', date:'2026-03-05', scores:{judgement:70,numerical:60,verbal:75,situational:72}, initials:'CR', color:'#6d28d9', time:'20:10', answered:25, flagged:false, decision:'none',        stage:'',            code:'CR6W5D', phone:'5560', notes:'' },
  { id:5, name:'Aisha M.',     email:'aisha.m@email.com',   role:'HR Coordinator',           org:'acme',   status:'completed', date:'2026-03-05', scores:{judgement:55,numerical:48,verbal:60,situational:50}, initials:'AM', color:'#991b1b', time:'22:30', answered:23, flagged:false, decision:'rejected',    stage:'',            code:'AM2Q7E', phone:'1143', notes:'' },
  { id:6, name:'Alex Chen',    email:'alex@email.com',      role:'Customer Success Manager', org:'acme',   status:'pending',   date:'2026-03-06', scores:null, initials:'AC', color:'#713f12', time:null, answered:null, flagged:false, decision:'none', stage:'', code:'AX7K2M', phone:'3317', notes:'' },
  { id:7, name:'Priya Nair',   email:'priya.n@email.com',   role:'Operations Analyst',       org:'nexgen', status:'invited',   date:'2026-03-06', scores:null, initials:'PN', color:'#0e7490', time:null, answered:null, flagged:false, decision:'none', stage:'', code:'PN8R3F', phone:'8829', notes:'' },
];

// Scoring helpers
function wScore(scores) {
  if (!scores) return null;
  return Math.round(
    scores.judgement   * 0.35 +
    scores.numerical   * 0.25 +
    scores.verbal      * 0.20 +
    scores.situational * 0.20
  );
}

function rankOf(id) {
  const ranked = CANDS.filter(c => c.scores).sort((a,b) => wScore(b.scores) - wScore(a.scores));
  const i = ranked.findIndex(c => c.id === id);
  return i === -1 ? null : i + 1;
}

function scoreColor(s) {
  if (s === null) return 'var(--slate-400)';
  if (s >= 80) return 'var(--success)';
  if (s >= 65) return 'var(--navy-600)';
  if (s >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

function getCandById(id) { return CANDS.find(c => c.id === id) || null; }
function updateCand(id, patch) {
  const i = CANDS.findIndex(c => c.id === id);
  if (i !== -1) CANDS[i] = { ...CANDS[i], ...patch };
}
