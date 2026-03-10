/* ═══════════════════════════════════════════════════════════════════
   NovaCS — Mock Database  |  js/db.js
   v2.0 — March 2026

   Single source of truth for ALL demo data.
   Every page reads from window.DB — no more inline CANDS[] arrays.

   TO GO LIVE:
   Replace each function body with the matching Supabase call.
   The public API signatures stay identical — nothing else changes.
═══════════════════════════════════════════════════════════════════ */

const DB = (() => {

  // ─────────────────────────────────────────────────────────────
  // SESSION  (logged-in recruiter)
  // Live: supabase.auth.getUser() + JOIN recruiter_profiles
  // ─────────────────────────────────────────────────────────────
  const SESSION = {
    recruiter: {
      id:       'rec-001',
      name:     'Sarah Mitchell',
      email:    'sarah.mitchell@acmecorp.com',
      role:     'admin',        // viewer | recruiter | admin | superadmin
      initials: 'SM',
      color:    '#1e3a5f',
    },
    org: {
      id:          'org-001',
      name:        'Acme Corp',
      slug:        'acme-corp',
      accent:      '#2452a0',
      logo:        null,
      plan:        'Professional',
      memberSince: '2025-09-01',
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CONFIG  (per-org assessment settings)
  // Live: SELECT * FROM assessment_configs WHERE organisation_id = :orgId
  // ─────────────────────────────────────────────────────────────
  const CONFIG = {
    weights: { judgement: 0.35, numerical: 0.25, verbal: 0.20, situational: 0.20 },
    passThreshold:        65,
    timeLimitMinutes:     25,
    randomiseQuestions:   true,
    randomiseOptions:     true,
    showScoreToCandidate: false,
  };

  // ─────────────────────────────────────────────────────────────
  // ORGANISATIONS
  // Live: SELECT * FROM organisations (superadmin) or WHERE id = :orgId
  // ─────────────────────────────────────────────────────────────
  const ORGS = [
    { id:'org-001', name:'Acme Corp',         slug:'acme-corp',         accent:'#2452a0', initials:'AC', color:'#1e3a5f', plan:'Professional', industry:'Technology',  users:3, candidates:10, assessments:8,  status:'active' },
    { id:'org-002', name:'NexGen Talent',      slug:'nexgen-talent',     accent:'#0f6b3a', initials:'NT', color:'#0f6b3a', plan:'Starter',      industry:'Recruitment', users:2, candidates:7,  assessments:14, status:'active' },
    { id:'org-003', name:'Vertex Consulting',  slug:'vertex-consulting', accent:'#6b3fd4', initials:'VC', color:'#6b3fd4', plan:'Enterprise',   industry:'Consulting',  users:3, candidates:15, assessments:12, status:'active' },
    { id:'org-004', name:'ClearPath',          slug:'clearpath',         accent:'#854d0e', initials:'CP', color:'#854d0e', plan:'Starter',      industry:'Finance',     users:1, candidates:8,  assessments:6,  status:'active' },
  ];

  // ─────────────────────────────────────────────────────────────
  // USERS  (all recruiter profiles — used in admin panel)
  // Live: SELECT * FROM recruiter_profiles ORDER BY created_at
  // ─────────────────────────────────────────────────────────────
  const USERS = [
    { id:'rec-001', name:'Sarah Mitchell', email:'sarah.mitchell@acmecorp.com', org:'Acme Corp',         orgId:'org-001', role:'admin',      status:'active', last:'Mar 8 2026' },
    { id:'rec-002', name:'James Porter',   email:'j.porter@acmecorp.com',       org:'Acme Corp',         orgId:'org-001', role:'recruiter',  status:'active', last:'Mar 7 2026' },
    { id:'rec-003', name:'Nina Osei',      email:'n.osei@acmecorp.com',         org:'Acme Corp',         orgId:'org-001', role:'viewer',     status:'active', last:'Mar 5 2026' },
    { id:'rec-004', name:'Tobias Kraft',   email:'t.kraft@nexgen.io',           org:'NexGen Talent',     orgId:'org-002', role:'admin',      status:'active', last:'Mar 6 2026' },
    { id:'rec-005', name:'Anika Sharma',   email:'a.sharma@nexgen.io',          org:'NexGen Talent',     orgId:'org-002', role:'recruiter',  status:'active', last:'Mar 4 2026' },
    { id:'rec-006', name:'Chris Walton',   email:'c.walton@vertex.com',         org:'Vertex Consulting', orgId:'org-003', role:'admin',      status:'active', last:'Mar 7 2026' },
    { id:'rec-007', name:'Mei Lin',        email:'m.lin@vertex.com',            org:'Vertex Consulting', orgId:'org-003', role:'recruiter',  status:'active', last:'Mar 3 2026' },
    { id:'rec-008', name:'David Park',     email:'d.park@vertex.com',           org:'Vertex Consulting', orgId:'org-003', role:'viewer',     status:'active', last:'Feb 28 2026' },
    { id:'rec-009', name:'Lena Fischer',   email:'l.fischer@clearpath.com',     org:'ClearPath',         orgId:'org-004', role:'admin',      status:'active', last:'Mar 6 2026' },
    { id:'rec-010', name:'NovaCS Admin',   email:'admin@novacs.io',             org:'NovaCS',            orgId:'org-000', role:'superadmin', status:'active', last:'Mar 8 2026' },
  ];

  // ─────────────────────────────────────────────────────────────
  // CANDIDATES
  // Live: SELECT * FROM candidates WHERE organisation_id = :orgId
  // ─────────────────────────────────────────────────────────────
  let CANDIDATES = [
    {
      id:1, name:'Maya Patel',       initials:'MP', color:'#1e3a5f',
      email:'maya.p@email.com',      role:'Customer Success Manager',
      org:'org-001', status:'completed', decision:'shortlisted', stage:'Interview',
      date:'Mar 3', scores:{judgement:95,numerical:88,verbal:91,situational:90},
      time:'9:42', answered:25, flagged:false, code:'MP9X2A', phone:'4821',
      notes:'Strong communicator, excellent situational awareness. Top candidate for CSM role.',
      activity:[
        {type:'invited',   text:'Access code MP9X2A issued',            date:'Mar 1'},
        {type:'started',   text:'Candidate began assessment',            date:'Mar 3'},
        {type:'submitted', text:'Assessment submitted — 25/25 answered', date:'Mar 3'},
        {type:'decision',  text:'Marked as shortlisted by Sarah M.',     date:'Mar 3'},
        {type:'stage',     text:'Stage updated to Interview',            date:'Mar 4'},
        {type:'note',      text:'Recruiter notes saved',                 date:'Mar 4'},
      ]
    },
    {
      id:2, name:'James Okafor',     initials:'JO', color:'#0f6b3a',
      email:'j.okafor@email.com',    role:'Operations Analyst',
      org:'org-001', status:'completed', decision:'shortlisted', stage:'Interview',
      date:'Mar 4', scores:{judgement:84,numerical:92,verbal:78,situational:85},
      time:'13:11', answered:25, flagged:false, code:'JO4K8B', phone:'7732',
      notes:'Exceptional numerical reasoning. Methodical approach to problem solving.',
      activity:[
        {type:'invited',   text:'Access code JO4K8B issued',            date:'Mar 2'},
        {type:'started',   text:'Candidate began assessment',            date:'Mar 4'},
        {type:'submitted', text:'Assessment submitted — 25/25 answered', date:'Mar 4'},
        {type:'decision',  text:'Marked as shortlisted by Sarah M.',     date:'Mar 5'},
        {type:'stage',     text:'Stage updated to Interview',            date:'Mar 5'},
      ]
    },
    {
      id:3, name:'Liam Torres',      initials:'LT', color:'#0e4e6e',
      email:'l.torres@email.com',    role:'Data Analyst',
      org:'org-001', status:'completed', decision:'shortlisted', stage:'Final Round',
      date:'Mar 4', scores:{judgement:88,numerical:96,verbal:82,situational:87},
      time:'11:20', answered:25, flagged:false, code:'LT5X9G', phone:'6641',
      notes:'Outstanding numerical reasoning. Recommend fast-track to final round.',
      activity:[
        {type:'invited',   text:'Access code LT5X9G issued',            date:'Feb 26'},
        {type:'started',   text:'Candidate began assessment',            date:'Mar 4'},
        {type:'submitted', text:'Assessment submitted — 25/25 answered', date:'Mar 4'},
        {type:'decision',  text:'Marked as shortlisted by Sarah M.',     date:'Mar 5'},
        {type:'stage',     text:'Stage updated to Final Round',          date:'Mar 6'},
      ]
    },
    {
      id:4, name:'Sophie Tan',       initials:'ST', color:'#7c3aed',
      email:'sophie.t@email.com',    role:'Project Manager',
      org:'org-001', status:'completed', decision:'none', stage:'Screening',
      date:'Mar 4', scores:{judgement:80,numerical:70,verbal:85,situational:78},
      time:'17:55', answered:24, flagged:true, code:'ST3N1C', phone:'2209',
      notes:'Tab switch flagged. Strong verbal scores but review integrity flag before progressing.',
      activity:[
        {type:'invited',   text:'Access code ST3N1C issued',            date:'Mar 2'},
        {type:'started',   text:'Candidate began assessment',            date:'Mar 4'},
        {type:'flag',      text:'⚠ Tab switch detected during session',  date:'Mar 4'},
        {type:'submitted', text:'Assessment submitted — 24/25 answered', date:'Mar 4'},
      ]
    },
    {
      id:5, name:'Fatima Al-Hassan', initials:'FA', color:'#0e7490',
      email:'fatima.a@email.com',    role:'Marketing Manager',
      org:'org-001', status:'completed', decision:'none', stage:'Phone Screen',
      date:'Mar 5', scores:{judgement:67,numerical:58,verbal:80,situational:65},
      time:'19:30', answered:25, flagged:false, code:'FA9P2H', phone:'3398',
      notes:'Good verbal scores, borderline pass. Worth a phone screen.',
      activity:[
        {type:'invited',   text:'Access code FA9P2H issued',            date:'Feb 25'},
        {type:'started',   text:'Candidate began assessment',            date:'Mar 5'},
        {type:'submitted', text:'Assessment submitted — 25/25 answered', date:'Mar 5'},
        {type:'stage',     text:'Stage updated to Phone Screen',         date:'Mar 6'},
      ]
    },
    {
      id:6, name:'Carlos Ruiz',      initials:'CR', color:'#6d28d9',
      email:'c.ruiz@email.com',      role:'Sales Associate',
      org:'org-001', status:'completed', decision:'none', stage:'',
      date:'Mar 5', scores:{judgement:70,numerical:60,verbal:75,situational:72},
      time:'20:10', answered:25, flagged:false, code:'CR6W5D', phone:'5560',
      notes:'',
      activity:[
        {type:'invited',   text:'Access code CR6W5D issued',            date:'Mar 3'},
        {type:'started',   text:'Candidate began assessment',            date:'Mar 5'},
        {type:'submitted', text:'Assessment submitted — 25/25 answered', date:'Mar 5'},
      ]
    },
    {
      id:7, name:'Aisha Mensah',     initials:'AM', color:'#991b1b',
      email:'aisha.m@email.com',     role:'HR Coordinator',
      org:'org-001', status:'completed', decision:'rejected', stage:'',
      date:'Mar 5', scores:{judgement:55,numerical:48,verbal:60,situational:50},
      time:'22:30', answered:23, flagged:false, code:'AM2Q7E', phone:'1143',
      notes:'Below threshold. Did not complete 2 questions in time.',
      activity:[
        {type:'invited',   text:'Access code AM2Q7E issued',            date:'Mar 3'},
        {type:'started',   text:'Candidate began assessment',            date:'Mar 5'},
        {type:'submitted', text:'Assessment submitted — 23/25 answered', date:'Mar 5'},
        {type:'decision',  text:'Marked as rejected by Sarah M.',        date:'Mar 6'},
      ]
    },
    {
      id:8, name:'Noah Williams',    initials:'NW', color:'#854d0e',
      email:'n.williams@email.com',  role:'Sales Associate',
      org:'org-001', status:'completed', decision:'rejected', stage:'',
      date:'Mar 6', scores:{judgement:42,numerical:38,verbal:50,situational:44},
      time:'24:07', answered:22, flagged:true, code:'NW1R6K', phone:'9912',
      notes:'Timed out. Multiple tab switches flagged.',
      activity:[
        {type:'invited',   text:'Access code NW1R6K issued',             date:'Feb 23'},
        {type:'started',   text:'Candidate began assessment',             date:'Mar 6'},
        {type:'flag',      text:'⚠ Tab switch detected (3 times)',        date:'Mar 6'},
        {type:'timeout',   text:'Assessment auto-submitted — time expired',date:'Mar 6'},
        {type:'decision',  text:'Marked as rejected by Sarah M.',         date:'Mar 6'},
      ]
    },
    {
      id:9, name:'Alex Chen',        initials:'AC', color:'#713f12',
      email:'alex@email.com',        role:'Customer Success Manager',
      org:'org-001', status:'pending', decision:'none', stage:'',
      date:'Mar 6', scores:null, time:null, answered:null, flagged:false,
      code:'AX7K2M', phone:'3317', notes:'',
      activity:[
        {type:'invited', text:'Access code AX7K2M issued',    date:'Mar 6'},
        {type:'opened',  text:'Candidate opened invite email', date:'Mar 7'},
      ]
    },
    {
      id:10, name:'Priya Nair',      initials:'PN', color:'#0e7490',
      email:'priya.n@email.com',     role:'Operations Analyst',
      org:'org-001', status:'invited', decision:'none', stage:'',
      date:'Mar 6', scores:null, time:null, answered:null, flagged:false,
      code:'PN8R3F', phone:'8829', notes:'',
      activity:[
        {type:'invited', text:'Access code PN8R3F issued', date:'Mar 6'},
      ]
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // ACCESS CODES  (derived from candidates on init, mutated live)
  // Live: SELECT * FROM access_codes WHERE organisation_id = :orgId
  // ─────────────────────────────────────────────────────────────
  let ACCESS_CODES = CANDIDATES.map(c => ({
    id:      `code-${c.id}`,
    code:    c.code,
    candId:  c.id,
    name:    c.name,
    role:    c.role,
    email:   c.email,
    orgId:   c.org,
    status:  c.status === 'completed' ? 'used' : c.status === 'pending' ? 'opened' : 'active',
    issued:  c.date,
    used:    c.status === 'completed' ? c.date : null,
    expires: null,
  }));

  // ─────────────────────────────────────────────────────────────
  // INVITE BATCHES
  // Live: SELECT * FROM invite_batches WHERE organisation_id = :orgId
  // ─────────────────────────────────────────────────────────────
  const BATCHES = [
    { id:'batch-003', name:'March 2026 — Customer Success',   role:'Customer Success Manager', date:'Mar 1', total:4, completed:3, pass:2, opened:1, sent:0 },
    { id:'batch-002', name:'March 2026 — Operations Analyst', role:'Operations Analyst',       date:'Feb 20',total:4, completed:4, pass:3, opened:0, sent:0 },
    { id:'batch-001', name:'Feb 2026 — Data & Finance',       role:'Data Analyst',             date:'Feb 10',total:2, completed:2, pass:2, opened:0, sent:0 },
  ];

  // ─────────────────────────────────────────────────────────────
  // ANALYTICS
  // Live: Aggregated queries on assessment_sessions grouped by week
  // ─────────────────────────────────────────────────────────────
  const ANALYTICS = {
    completionTrend: [
      {week:'Jan 13',completed:3,invited:5},{week:'Jan 20',completed:4,invited:6},
      {week:'Jan 27',completed:2,invited:4},{week:'Feb 3', completed:5,invited:7},
      {week:'Feb 10',completed:6,invited:8},{week:'Feb 17',completed:4,invited:5},
      {week:'Feb 24',completed:5,invited:6},{week:'Mar 3', completed:7,invited:9},
    ],
    scoreTrend: [
      {week:'Jan 13',judgement:71,numerical:68,verbal:74,situational:70},
      {week:'Jan 20',judgement:74,numerical:70,verbal:76,situational:72},
      {week:'Jan 27',judgement:72,numerical:65,verbal:78,situational:69},
      {week:'Feb 3', judgement:76,numerical:72,verbal:79,situational:74},
      {week:'Feb 10',judgement:78,numerical:74,verbal:80,situational:76},
      {week:'Feb 17',judgement:75,numerical:71,verbal:77,situational:73},
      {week:'Feb 24',judgement:79,numerical:76,verbal:82,situational:77},
      {week:'Mar 3', judgement:82,numerical:79,verbal:84,situational:80},
    ],
    distribution: [
      {range:'0–49',count:2},{range:'50–64',count:2},{range:'65–74',count:2},
      {range:'75–84',count:2},{range:'85–100',count:4},
    ],
  };

  // ─────────────────────────────────────────────────────────────
  // BILLING PLANS
  // Live: SELECT * FROM billing_plans WHERE is_public = true
  // ─────────────────────────────────────────────────────────────
  const BILLING_PLANS = [
    { id:'starter',      name:'Starter',      monthly:79,  annual:63,  seats:3,  assessments:20,   features:['All 4 categories','Weighted scoring','CSV export','Email support'] },
    { id:'professional', name:'Professional', monthly:299, annual:239, seats:5,  assessments:50,   features:['Everything in Starter','Bulk CSV invites','Batch management','Priority support','Custom branding','Analytics'] },
    { id:'enterprise',   name:'Enterprise',   monthly:599, annual:479, seats:15, assessments:null, features:['Everything in Professional','Unlimited assessments','Dedicated account manager','Custom SLA','SSO (coming)','ATS integration (Q3)'] },
  ];

  // ─────────────────────────────────────────────────────────────
  // ORG SUBSCRIPTIONS
  // Live: SELECT * FROM org_subscriptions WHERE organisation_id = :orgId
  // ─────────────────────────────────────────────────────────────
  const SUBSCRIPTIONS = [
    { orgId:'org-001', planId:'professional', cycle:'monthly', status:'active', used:8,  seats:3, renewal:'Apr 14 2026' },
    { orgId:'org-002', planId:'starter',      cycle:'monthly', status:'active', used:14, seats:2, renewal:'Apr 28 2026' },
    { orgId:'org-003', planId:'enterprise',   cycle:'monthly', status:'active', used:12, seats:3, renewal:'May 1 2026'  },
    { orgId:'org-004', planId:'starter',      cycle:'monthly', status:'active', used:6,  seats:1, renewal:'May 12 2026' },
  ];

  // ─────────────────────────────────────────────────────────────
  // LOGIN HISTORY
  // Live: SELECT * FROM login_history ORDER BY occurred_at DESC LIMIT 50
  // ─────────────────────────────────────────────────────────────
  const LOGIN_HISTORY = [
    { id:1, email:'sarah.mitchell@acmecorp.com', org:'Acme Corp',         result:'success', ip:'203.0.113.45',  country:'AU', city:'Sydney',    device:'desktop', browser:'Chrome',  time:'Today 14:01' },
    { id:2, email:'t.kraft@nexgen.io',           org:'NexGen Talent',     result:'success', ip:'198.51.100.12', country:'DE', city:'Berlin',    device:'desktop', browser:'Firefox', time:'Today 10:48' },
    { id:3, email:'j.porter@acmecorp.com',       org:'Acme Corp',         result:'success', ip:'203.0.113.88',  country:'AU', city:'Melbourne', device:'desktop', browser:'Chrome',  time:'Today 09:20' },
    { id:4, email:'sarah.mitchell@acmecorp.com', org:'Acme Corp',         result:'failed',  ip:'196.188.82.14', country:'NG', city:'Lagos',     device:'mobile',  browser:'Chrome',  time:'Mar 9  23:14' },
    { id:5, email:'sarah.mitchell@acmecorp.com', org:'Acme Corp',         result:'failed',  ip:'196.188.82.14', country:'NG', city:'Lagos',     device:'mobile',  browser:'Chrome',  time:'Mar 9  23:13' },
    { id:6, email:'l.fischer@clearpath.com',     org:'ClearPath',         result:'success', ip:'85.214.0.199',  country:'DE', city:'Hamburg',   device:'mobile',  browser:'Safari',  time:'Mar 9  17:30' },
    { id:7, email:'c.walton@vertex.com',         org:'Vertex Consulting', result:'success', ip:'51.68.142.11',  country:'GB', city:'London',    device:'mobile',  browser:'Safari',  time:'Mar 9  09:05' },
    { id:8, email:'sarah.mitchell@acmecorp.com', org:'Acme Corp',         result:'success', ip:'203.0.113.45',  country:'AU', city:'Sydney',    device:'desktop', browser:'Chrome',  time:'Mar 8  08:44' },
  ];

  // ─────────────────────────────────────────────────────────────
  // AUDIT LOG
  // Live: SELECT * FROM audit_log ORDER BY occurred_at DESC
  // ─────────────────────────────────────────────────────────────
  const AUDIT_LOG = [
    { id:1,  time:'Today  14:22', actor:'Sarah Mitchell', action:'issued access code AX7K2M to Alex Chen',                org:'Acme Corp',         dot:'#2d64c8' },
    { id:2,  time:'Today  11:05', actor:'Tobias Kraft',   action:'marked Maya Patel as shortlisted',                       org:'NexGen Talent',     dot:'#0f6b3a' },
    { id:3,  time:'Today  09:47', actor:'System',         action:'Alex Chen started assessment — code AX7K2M activated',   org:'Acme Corp',         dot:'#94a3b8' },
    { id:4,  time:'Mar 7   18:30',actor:'Chris Walton',   action:'updated pass threshold from 65% to 70%',                 org:'Vertex Consulting', dot:'#854d0e' },
    { id:5,  time:'Mar 7   15:11',actor:'Sarah Mitchell', action:'exported candidate CSV — 10 records',                    org:'Acme Corp',         dot:'#2d64c8' },
    { id:6,  time:'Mar 7   12:00',actor:'System',         action:'Noah Williams submitted — tab-switch flag triggered',     org:'Acme Corp',         dot:'#991b1b' },
    { id:7,  time:'Mar 6   16:44',actor:'Lena Fischer',   action:'invited Priya Nair for Operations Analyst role',          org:'ClearPath',         dot:'#2d64c8' },
    { id:8,  time:'Mar 6   09:30',actor:'NovaCS Admin',   action:'registered new organisation: ClearPath (Starter plan)',   org:'Platform',          dot:'#92700a' },
    { id:9,  time:'Mar 5   14:15',actor:'Anika Sharma',   action:'rejected candidate Aisha Mensah',                        org:'NexGen Talent',     dot:'#991b1b' },
    { id:10, time:'Mar 4   11:00',actor:'NovaCS Admin',   action:'enabled feature flag: Bulk CSV Candidate Invites',        org:'Platform',          dot:'#92700a' },
  ];

  // ─────────────────────────────────────────────────────────────
  // SUPPORT TICKETS
  // Live: SELECT * FROM support_tickets ORDER BY created_at DESC
  // ─────────────────────────────────────────────────────────────
  let SUPPORT_TICKETS = [
    { id:'TKT-001', title:'Candidate cannot enter their access code',         org:'Acme Corp',         orgId:'org-001', type:'access_issue',     status:'open',       priority:'high',   date:'Mar 8' },
    { id:'TKT-002', title:'Pass threshold is not saving correctly',           org:'Vertex Consulting', orgId:'org-003', type:'bug',              status:'open',       priority:'normal', date:'Mar 7' },
    { id:'TKT-003', title:'How do I invite multiple candidates at once?',     org:'ClearPath',         orgId:'org-004', type:'general',          status:'in_progress',priority:'normal', date:'Mar 6' },
    { id:'TKT-004', title:'CSV export is missing verbal scores',              org:'NexGen Talent',     orgId:'org-002', type:'bug',              status:'resolved',   priority:'normal', date:'Mar 4' },
    { id:'TKT-005', title:'Can the candidate welcome message be customised?', org:'Acme Corp',         orgId:'org-001', type:'feature_request',  status:'resolved',   priority:'low',    date:'Mar 3' },
  ];

  // ─────────────────────────────────────────────────────────────
  // PLATFORM CONFIG
  // Live: SELECT * FROM platform_config
  // ─────────────────────────────────────────────────────────────
  let PLATFORM_CONFIG = {
    defaultPassThreshold:    65,
    defaultTimeLimitMinutes: 25,
    defaultTabSwitchLimit:   3,
    supportEmail:            'support@novacs.io',
    flags: {
      bulkCsvInvites:       true,
      aiQuestionGen:        false,
      atsPush:              false,
      candidateScoreReveal: false,
      customBranding:       true,
      sso:                  false,
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ROLE PERMISSIONS
  // Live: SELECT * FROM role_permissions
  // ─────────────────────────────────────────────────────────────
  const ROLE_PERMISSIONS = {
    viewer:    { 'candidates.view':true, 'candidates.issue_code':false, 'candidates.shortlist':false, 'candidates.export':false, 'assessments.view_results':true, 'assessments.edit_questions':false, 'assessments.manage_invites':false, 'settings.view':false, 'settings.edit':false, 'settings.invite_members':false, 'settings.change_weights':false },
    recruiter: { 'candidates.view':true, 'candidates.issue_code':true,  'candidates.shortlist':true,  'candidates.export':true,  'assessments.view_results':true, 'assessments.edit_questions':false, 'assessments.manage_invites':true,  'settings.view':false, 'settings.edit':false, 'settings.invite_members':false, 'settings.change_weights':false },
    admin:     { 'candidates.view':true, 'candidates.issue_code':true,  'candidates.shortlist':true,  'candidates.export':true,  'assessments.view_results':true, 'assessments.edit_questions':true,  'assessments.manage_invites':true,  'settings.view':true,  'settings.edit':true,  'settings.invite_members':true,  'settings.change_weights':true },
  };

  // ─────────────────────────────────────────────────────────────
  // CONTACT ENQUIRIES
  // Live: SELECT * FROM contact_enquiries ORDER BY submitted_at DESC
  // ─────────────────────────────────────────────────────────────
  let CONTACT_ENQUIRIES = [
    { id:'ENQ-001', name:'Rachel Obi',    email:'r.obi@talentbridge.io',  company:'TalentBridge', size:'11–50',  type:'demo',    status:'demo_booked', date:'Mar 8' },
    { id:'ENQ-002', name:'Wei Zhang',     email:'w.zhang@techrecruit.co', company:'TechRecruit',  size:'51–200', type:'general', status:'new',         date:'Mar 9' },
    { id:'ENQ-003', name:'Aaron Brandt',  email:'a.brandt@staffing.com',  company:'StaffingCo',   size:'1–10',   type:'access',  status:'contacted',   date:'Mar 7' },
  ];


  // ═══════════════════════════════════════════════════════════════
  // SCORE HELPERS
  // ═══════════════════════════════════════════════════════════════

  function wScore(scores, weights) {
    if (!scores) return null;
    const w = weights || CONFIG.weights;
    return Math.round(
      scores.judgement   * w.judgement   +
      scores.numerical   * w.numerical   +
      scores.verbal      * w.verbal      +
      scores.situational * w.situational
    );
  }

  function scoreColor(s) {
    if (s === null || s === undefined) return 'var(--slate-400)';
    if (s >= 80) return 'var(--success)';
    if (s >= CONFIG.passThreshold) return 'var(--navy-600)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
  }

  function passFail(s) {
    if (s === null || s === undefined) return null;
    return s >= CONFIG.passThreshold ? 'pass' : 'fail';
  }


  // ═══════════════════════════════════════════════════════════════
  // CANDIDATE QUERIES
  // ═══════════════════════════════════════════════════════════════

  function rankCandidates() {
    return [...CANDIDATES]
      .filter(c => c.scores)
      .sort((a, b) => (wScore(b.scores) || 0) - (wScore(a.scores) || 0));
  }

  function getRankOf(id) {
    const ranked = rankCandidates();
    const i = ranked.findIndex(c => c.id === id);
    return i === -1 ? null : i + 1;
  }

  // Live: SELECT count(*), avg(score_weighted) ... FROM assessment_sessions WHERE org = :orgId
  function getDashboardStats() {
    const completed   = CANDIDATES.filter(c => c.status === 'completed');
    const passed      = completed.filter(c => wScore(c.scores) >= CONFIG.passThreshold);
    const scores      = completed.map(c => wScore(c.scores));
    return {
      total:       CANDIDATES.length,
      completed:   completed.length,
      pending:     CANDIDATES.filter(c => c.status === 'pending').length,
      invited:     CANDIDATES.filter(c => c.status === 'invited').length,
      passRate:    completed.length ? Math.round((passed.length / completed.length) * 100) : 0,
      avgScore:    scores.length    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      shortlisted: CANDIDATES.filter(c => c.decision === 'shortlisted').length,
      rejected:    CANDIDATES.filter(c => c.decision === 'rejected').length,
      flagged:     CANDIDATES.filter(c => c.flagged).length,
    };
  }

  // Live: SELECT * FROM candidates WHERE org = :orgId AND ...filters ORDER BY ...sort
  function getCandidates(filters = {}) {
    let list = [...CANDIDATES];
    if (filters.status   && filters.status   !== 'all') list = list.filter(c => c.status   === filters.status);
    if (filters.decision && filters.decision !== 'all') {
      if (filters.decision === 'none') list = list.filter(c => c.decision === 'none');
      else list = list.filter(c => c.decision === filters.decision);
    }
    if (filters.role)    list = list.filter(c => c.role === filters.role);
    if (filters.flagged !== undefined) list = list.filter(c => c.flagged === filters.flagged);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q)  ||
        c.email.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q)  ||
        c.code.toLowerCase().includes(q)
      );
    }
    const sort = filters.sort || 'rank';
    if (sort === 'score_desc') list.sort((a, b) => (wScore(b.scores) ?? -1) - (wScore(a.scores) ?? -1));
    else if (sort === 'score_asc') list.sort((a, b) => (wScore(a.scores) ?? -1) - (wScore(b.scores) ?? -1));
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'date') list.sort((a, b) => b.id - a.id);
    else list.sort((a, b) => (getRankOf(a.id) || 999) - (getRankOf(b.id) || 999));
    return list;
  }

  // Live: SELECT * FROM candidates WHERE id = :id
  function getCandidateById(id) {
    // Accept string or number
    return CANDIDATES.find(c => c.id == id) || null;
  }

  // Live: UPDATE candidates SET ... WHERE id = :id
  function updateCandidate(id, patch) {
    const i = CANDIDATES.findIndex(c => c.id == id);
    if (i === -1) return null;
    CANDIDATES[i] = { ...CANDIDATES[i], ...patch };
    const today = new Date().toLocaleDateString('en-GB', {day:'numeric',month:'short'});
    if (patch.decision && patch.decision !== 'none') {
      CANDIDATES[i].activity.push({ type:'decision', text:`Marked as ${patch.decision} by ${SESSION.recruiter.name.split(' ')[0]} M.`, date:today });
    }
    if (patch.stage !== undefined && patch.stage) {
      CANDIDATES[i].activity.push({ type:'stage', text:`Stage updated to ${patch.stage}`, date:today });
    }
    if (patch.notes !== undefined) {
      CANDIDATES[i].activity.push({ type:'note', text:'Recruiter notes saved', date:today });
    }
    return CANDIDATES[i];
  }


  // ═══════════════════════════════════════════════════════════════
  // ACCESS CODE QUERIES
  // ═══════════════════════════════════════════════════════════════

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (ACCESS_CODES.find(c => c.code === code));
    return code;
  }

  // Live: call generate_access_code() SECURITY DEFINER function
  function issueCode(candidateData) {
    const code  = generateCode();
    const today = new Date().toLocaleDateString('en-GB', {day:'numeric',month:'short'});
    const colors = ['#1e3a5f','#0f6b3a','#6d28d9','#991b1b','#0e4e6e','#713f12','#0e7490','#854d0e'];
    const newCand = {
      id:        Date.now(),
      name:      candidateData.name,
      initials:  candidateData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      color:     colors[CANDIDATES.length % colors.length],
      email:     candidateData.email,
      role:      candidateData.role || '—',
      org:       SESSION.org.id,
      status:    'invited',
      decision:  'none',
      stage:     '',
      date:      today,
      code,
      phone:     candidateData.phone || '0000',
      answered:  null,
      flagged:   false,
      time:      null,
      notes:     '',
      scores:    null,
      activity:  [{ type:'invited', text:`Access code ${code} issued`, date:today }],
    };
    CANDIDATES.push(newCand);
    ACCESS_CODES.push({
      id:      `code-${newCand.id}`,
      code,
      candId:  newCand.id,
      name:    newCand.name,
      role:    newCand.role,
      email:   newCand.email,
      orgId:   SESSION.org.id,
      status:  'active',
      issued:  today,
      used:    null,
      expires: null,
    });
    return { candidate: newCand, code };
  }

  // Live: UPDATE access_codes SET status = 'revoked' WHERE id = :id
  function revokeCode(codeId) {
    const i = ACCESS_CODES.findIndex(c => c.id === codeId);
    if (i !== -1) ACCESS_CODES[i].status = 'revoked';
  }

  // Live: SELECT * FROM access_codes WHERE code = :code AND status = 'active'
  function validateCode(code) {
    const ac = ACCESS_CODES.find(c => c.code === code.toUpperCase().trim());
    if (!ac)                       return { valid:false, reason:'not_found' };
    if (ac.status === 'used')      return { valid:false, reason:'already_used' };
    if (ac.status === 'revoked')   return { valid:false, reason:'revoked' };
    if (ac.status === 'expired')   return { valid:false, reason:'expired' };
    const cand = getCandidateById(ac.candId);
    return { valid:true, candidate:cand, codeId:ac.id };
  }

  // Live: SELECT * FROM candidates WHERE id = :id — compare phone_last4, email, name
  function verifyIdentity(candId, { name, email, phone }) {
    const c = getCandidateById(candId);
    if (!c) return false;
    return (
      c.name.toLowerCase().trim()  === name.toLowerCase().trim()  &&
      c.email.toLowerCase().trim() === email.toLowerCase().trim() &&
      String(c.phone).trim()       === String(phone).trim()
    );
  }

  // Live: UPDATE assessment_configs SET ... WHERE organisation_id = :orgId
  function updateConfig(patch) {
    if (patch.weights) Object.assign(CONFIG.weights, patch.weights);
    const { weights, ...rest } = patch;
    Object.assign(CONFIG, rest);
  }


  // ═══════════════════════════════════════════════════════════════
  // ADMIN QUERIES  (superadmin only)
  // ═══════════════════════════════════════════════════════════════

  function getSubscriptionForOrg(orgId) {
    const sub  = SUBSCRIPTIONS.find(s => s.orgId === orgId);
    const plan = BILLING_PLANS.find(p => p.id === sub?.planId);
    return sub && plan ? { ...sub, plan } : null;
  }

  function getAllSubscriptions() {
    return SUBSCRIPTIONS.map(s => ({
      ...s,
      org:  ORGS.find(o => o.id === s.orgId),
      plan: BILLING_PLANS.find(p => p.id === s.planId),
    }));
  }

  function getPlatformMRR() {
    return SUBSCRIPTIONS.reduce((total, s) => {
      const plan = BILLING_PLANS.find(p => p.id === s.planId);
      return total + (s.cycle === 'annual' ? plan.annual : plan.monthly);
    }, 0);
  }

  function updatePlatformConfig(patch) {
    if (patch.flags) Object.assign(PLATFORM_CONFIG.flags, patch.flags);
    const { flags, ...rest } = patch;
    Object.assign(PLATFORM_CONFIG, rest);
  }

  function updateRolePermission(role, permission, allowed) {
    if (ROLE_PERMISSIONS[role]) {
      ROLE_PERMISSIONS[role][permission] = allowed;
    }
  }

  function resolveTicket(ticketId, note) {
    const t = SUPPORT_TICKETS.find(t => t.id === ticketId);
    if (t) { t.status = 'resolved'; t.resolution = note || ''; }
  }


  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    // Raw data refs (read-only intent)
    session:           SESSION,
    config:            CONFIG,
    orgs:              ORGS,
    users:             USERS,
    analytics:         ANALYTICS,
    batches:           BATCHES,
    billingPlans:      BILLING_PLANS,
    subscriptions:     SUBSCRIPTIONS,
    loginHistory:      LOGIN_HISTORY,
    auditLog:          AUDIT_LOG,
    supportTickets:    SUPPORT_TICKETS,
    platformConfig:    PLATFORM_CONFIG,
    rolePermissions:   ROLE_PERMISSIONS,
    contactEnquiries:  CONTACT_ENQUIRIES,

    // Score helpers
    wScore,
    scoreColor,
    passFail,
    getRankOf,

    // Candidates
    getDashboardStats,
    getCandidates,
    getCandidateById,
    updateCandidate,

    // Access codes
    generateCode,
    issueCode,
    revokeCode,
    validateCode,
    verifyIdentity,
    getAccessCodes: () => ACCESS_CODES,

    // Config
    updateConfig,

    // Admin
    getSubscriptionForOrg,
    getAllSubscriptions,
    getPlatformMRR,
    updatePlatformConfig,
    updateRolePermission,
    resolveTicket,
  };

})();

window.DB = DB;