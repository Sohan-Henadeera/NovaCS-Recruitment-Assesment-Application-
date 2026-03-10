/* ═══════════════════════════════════════════════════════════════
   NovaCS — Supabase Client  |  js/supabase-client.js
   v2.0 — March 2026

   SECURITY RULES:
   ─ ANON KEY only in frontend — never the service_role key
   ─ All sensitive writes go through RLS + SECURITY DEFINER functions
   ─ No raw SQL from the client ever
   ─ Session persisted in localStorage under key 'novaCS_auth_session'

   TO ACTIVATE:
   1. Set SUPABASE_URL + SUPABASE_ANON_KEY in Vercel environment vars
   2. Uncomment the import and export lines below
   3. Replace DB.* calls in each page with the matching supabase.* calls
      documented in db.js above each function
═══════════════════════════════════════════════════════════════ */

// ── ENV  (injected by api/env.js on Vercel, falls back to placeholders) ──
const SUPABASE_URL      = window.__ENV?.SUPABASE_URL      || 'REPLACE_WITH_PROJECT_URL';
const SUPABASE_ANON_KEY = window.__ENV?.SUPABASE_ANON_KEY || 'REPLACE_WITH_ANON_KEY';

// ── IMPORT (uncomment when going live) ──
// import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── CLIENT ──
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//   auth: {
//     autoRefreshToken:   true,
//     persistSession:     true,
//     detectSessionInUrl: true,
//     storage:            window.localStorage,
//     storageKey:         'novaCS_auth_session',
//   },
//   global: {
//     headers: { 'X-Client-Info': 'novaCS-web/2.0' }
//   }
// });

// ── AUTH STATE LISTENER ──
// Redirects to login if session expires mid-session on a protected page.
// supabase.auth.onAuthStateChange((event, session) => {
//   const PROTECTED = [
//     'dashboard', 'candidates', 'candidate-profile',
//     'assessments', 'settings', 'admin',
//   ];
//   if (event === 'SIGNED_OUT') {
//     const onProtected = PROTECTED.some(p => window.location.pathname.includes(p));
//     if (onProtected) {
//       window.location.href = '/pages/login.html?reason=session_expired';
//     }
//   }
//   if (event === 'TOKEN_REFRESHED') {
//     console.log('[NovaCS] Session token refreshed');
//   }
// });


// ══════════════════════════════════════════════════════════════
// LIVE SWAP REFERENCE
// The functions below mirror db.js exactly.
// When going live, replace each DB.fn() call in your pages
// with the matching supabase call shown here.
// ══════════════════════════════════════════════════════════════

/*

── SIGN IN ──
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
const { data: profile } = await supabase
  .from('recruiter_profiles')
  .select('*, organisations(*)')
  .eq('id', data.user.id)
  .single();

── SIGN OUT ──
await supabase.auth.signOut();

── GET CURRENT USER ──
const { data: { user } } = await supabase.auth.getUser();
const { data: profile }   = await supabase
  .from('recruiter_profiles')
  .select('*, organisations(*)')
  .eq('id', user.id)
  .single();

── GET CANDIDATES ──
const { data } = await supabase
  .from('candidates')
  .select('*, assessment_sessions(*)')
  .eq('organisation_id', orgId)
  .order('created_at', { ascending: false });

── GET CANDIDATE BY ID ──
const { data } = await supabase
  .from('candidates')
  .select('*, assessment_sessions(*)')
  .eq('id', candidateId)
  .single();

── UPDATE CANDIDATE ──
const { data } = await supabase
  .from('candidates')
  .update(patch)
  .eq('id', candidateId)
  .select()
  .single();

── GET ACCESS CODES ──
const { data } = await supabase
  .from('access_codes')
  .select('*, candidates(name, email, role)')
  .eq('organisation_id', orgId)
  .order('issued_at', { ascending: false });

── ISSUE ACCESS CODE ──
// Insert candidate first, then call the SECURITY DEFINER function:
const { data: code } = await supabase.rpc('generate_access_code', {
  p_candidate_id:    candidateId,
  p_organisation_id: orgId,
  p_issued_by:       recruiterId,
  p_expires_at:      null,
});

── REVOKE CODE ──
await supabase
  .from('access_codes')
  .update({ status: 'revoked' })
  .eq('id', codeId);

── VALIDATE CODE (candidate portal) ──
const { data } = await supabase
  .from('access_codes')
  .select('*, candidates(name, email, phone_last4, role)')
  .eq('code', code.toUpperCase())
  .eq('status', 'active')
  .single();

── SUBMIT ASSESSMENT ──
// Insert session answers, then call the score calculator:
await supabase.rpc('calculate_weighted_score', { p_session_id: sessionId });

── GET ASSESSMENT CONFIG ──
const { data } = await supabase
  .from('assessment_configs')
  .select('*')
  .eq('organisation_id', orgId)
  .single();

── UPDATE ASSESSMENT CONFIG ──
await supabase
  .from('assessment_configs')
  .update(patch)
  .eq('organisation_id', orgId);

── GET INVITE BATCHES ──
const { data } = await supabase
  .from('invite_batches')
  .select('*')
  .eq('organisation_id', orgId)
  .order('created_at', { ascending: false });

── GET AUDIT LOG (admin) ──
const { data } = await supabase
  .from('audit_log')
  .select('*')
  .order('occurred_at', { ascending: false })
  .limit(100);

── GET LOGIN HISTORY (admin) ──
const { data } = await supabase
  .from('login_history')
  .select('*')
  .order('occurred_at', { ascending: false })
  .limit(50);

── GET ORG SUBSCRIPTIONS (superadmin) ──
const { data } = await supabase
  .from('org_subscriptions')
  .select('*, organisations(name, slug), billing_plans(*)')
  .order('created_at');

── GET PLATFORM CONFIG (superadmin) ──
const { data } = await supabase
  .from('platform_config')
  .select('*');

── UPDATE PLATFORM CONFIG (superadmin) ──
await supabase
  .from('platform_config')
  .upsert({ key, value: String(newValue), updated_by: recruiterId });

── GET ROLE PERMISSIONS (superadmin) ──
const { data } = await supabase
  .from('role_permissions')
  .select('*')
  .order('role');

── UPDATE ROLE PERMISSION (superadmin) ──
await supabase
  .from('role_permissions')
  .update({ allowed, updated_by: recruiterId })
  .eq('role', role)
  .eq('permission', permission);

── GET SUPPORT TICKETS (admin) ──
const { data } = await supabase
  .from('support_tickets')
  .select('*, organisations(name)')
  .order('created_at', { ascending: false });

── SUBMIT CONTACT ENQUIRY (public) ──
await supabase
  .from('contact_enquiries')
  .insert({ first_name, last_name, email, company_name, ... });

── PASSWORD RESET ──
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/pages/password-reset.html`,
});

── UPDATE PASSWORD ──
await supabase.auth.updateUser({ password: newPassword });

*/

// ── PLACEHOLDER EXPORT ──
// Remove this and uncomment the real client above when going live.
window.__supabaseReady = false;