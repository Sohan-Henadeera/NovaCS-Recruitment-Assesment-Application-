-- ═══════════════════════════════════════════════════════════════════════════
-- NovaCS — Complete Supabase Schema
-- Version 2.0  |  Updated March 2026
--
-- Run this entire file in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: all CREATE statements use IF NOT EXISTS or ON CONFLICT
--
-- TABLE ORDER (dependency-safe):
--   1.  organisations
--   2.  recruiter_profiles
--   3.  assessment_configs
--   4.  candidates
--   5.  access_codes
--   6.  assessment_sessions
--   7.  session_answers
--   8.  invite_batches
--   9.  contact_enquiries
--   10. audit_log
--   11. billing_plans            (new v2)
--   12. org_subscriptions        (new v2)
--   13. login_history            (new v2)
--   14. platform_config          (new v2)
--   15. role_permissions         (new v2)
--   16. support_tickets          (new v2)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ORGANISATIONS
--    Each client company using the NovaCS platform
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organisations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,        -- e.g. "acme-corp", used in URLs
  logo_url        TEXT,                               -- stored in Supabase Storage bucket
  accent_color    TEXT        DEFAULT '#2452a0',      -- hex, used for white-label UI tinting
  industry        TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  suspended_at    TIMESTAMPTZ,
  suspended_by    UUID,                               -- recruiter_profiles.id (set after table exists)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organisations_slug   ON organisations(slug);
CREATE INDEX IF NOT EXISTS idx_organisations_active ON organisations(is_active);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RECRUITER PROFILES
--    Linked to Supabase Auth — one recruiter belongs to one org
--    Roles: viewer → recruiter → admin → superadmin
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recruiter_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,               -- mirrors auth.users.email
  role            TEXT        NOT NULL DEFAULT 'recruiter'
                              CHECK (role IN ('viewer', 'recruiter', 'admin', 'superadmin')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_org   ON recruiter_profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_email ON recruiter_profiles(email);
CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_role  ON recruiter_profiles(role);

-- Add deferred FK on organisations.suspended_by now that recruiter_profiles exists
ALTER TABLE organisations
  ADD CONSTRAINT IF NOT EXISTS fk_organisations_suspended_by
  FOREIGN KEY (suspended_by)
  REFERENCES recruiter_profiles(id)
  ON DELETE SET NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ASSESSMENT CONFIGS
--    Per-org scoring weights and assessment behaviour settings
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS assessment_configs (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id       UUID        NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,

  -- Category weights — must sum to exactly 1.000
  weight_judgement      NUMERIC(4,3) NOT NULL DEFAULT 0.350,
  weight_numerical      NUMERIC(4,3) NOT NULL DEFAULT 0.250,
  weight_verbal         NUMERIC(4,3) NOT NULL DEFAULT 0.200,
  weight_situational    NUMERIC(4,3) NOT NULL DEFAULT 0.200,

  pass_threshold        INTEGER     NOT NULL DEFAULT 65  CHECK (pass_threshold    BETWEEN 1 AND 100),
  time_limit_minutes    INTEGER     NOT NULL DEFAULT 25  CHECK (time_limit_minutes BETWEEN 5 AND 120),

  randomise_questions   BOOLEAN     NOT NULL DEFAULT TRUE,
  randomise_options     BOOLEAN     NOT NULL DEFAULT TRUE,
  allow_section_intro   BOOLEAN     NOT NULL DEFAULT TRUE,
  show_score_to_candidate BOOLEAN   NOT NULL DEFAULT FALSE,

  CONSTRAINT weights_sum_to_one CHECK (
    ROUND((weight_judgement + weight_numerical + weight_verbal + weight_situational)::NUMERIC, 3) = 1.000
  ),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CANDIDATES
--    People being assessed — one row per person per organisation
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS candidates (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,

  -- Identity
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  role_applied    TEXT,                               -- job title they applied for
  phone_last4     CHAR(4),                            -- last 4 digits only, for identity check at assessment start

  -- Recruiter-facing pipeline fields
  stage           TEXT        DEFAULT ''
                              CHECK (stage IN ('', 'Screening', 'Phone Screen', 'Interview', 'Final Round', 'Offer')),
  decision        TEXT        DEFAULT 'none'
                              CHECK (decision IN ('none', 'shortlisted', 'rejected')),
  recruiter_notes TEXT        DEFAULT '',

  -- Invite tracking
  invited_at      TIMESTAMPTZ,
  invite_batch_id UUID,                               -- FK added after invite_batches table is created

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_candidate_email_org UNIQUE (email, organisation_id)
);

CREATE INDEX IF NOT EXISTS idx_candidates_org      ON candidates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email    ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_decision ON candidates(decision);
CREATE INDEX IF NOT EXISTS idx_candidates_stage    ON candidates(stage);


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ACCESS CODES
--    Single-use codes issued to candidates — 6 alphanumeric characters
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS access_codes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT        NOT NULL UNIQUE,        -- e.g. "AX7K2M"
  candidate_id    UUID        NOT NULL REFERENCES candidates(id)         ON DELETE CASCADE,
  organisation_id UUID        NOT NULL REFERENCES organisations(id)      ON DELETE RESTRICT,
  issued_by       UUID                 REFERENCES recruiter_profiles(id) ON DELETE SET NULL,

  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'used', 'expired', 'revoked')),

  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,                        -- NULL = no expiry set
  used_at         TIMESTAMPTZ,

  -- SHA-256 hash stored alongside plain text (plain shown only once at generation)
  code_hash       TEXT GENERATED ALWAYS AS (encode(digest(code, 'sha256'), 'hex')) STORED
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code      ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_candidate ON access_codes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_org       ON access_codes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_status    ON access_codes(status);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ASSESSMENT SESSIONS
--    One row per candidate attempt — the core scoring record
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id        UUID        NOT NULL REFERENCES candidates(id)        ON DELETE RESTRICT,
  organisation_id     UUID        NOT NULL REFERENCES organisations(id)     ON DELETE RESTRICT,
  access_code_id      UUID        NOT NULL UNIQUE REFERENCES access_codes(id) ON DELETE RESTRICT,

  -- Lifecycle state machine:
  -- pending → identity_verified → in_progress → submitted | timed_out | abandoned
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending', 'identity_verified', 'in_progress',
                                    'submitted', 'timed_out', 'abandoned'
                                  )),

  started_at          TIMESTAMPTZ,
  submitted_at        TIMESTAMPTZ,
  time_taken_seconds  INTEGER,

  -- Raw scores per category (0–100)
  score_judgement     NUMERIC(5,2),
  score_numerical     NUMERIC(5,2),
  score_verbal        NUMERIC(5,2),
  score_situational   NUMERIC(5,2),

  -- Final weighted score — computed on submission by calculate_weighted_score()
  score_weighted      NUMERIC(5,2),

  -- Pass/fail — evaluated against org threshold at time of submission
  passed              BOOLEAN,
  threshold_at_submit INTEGER,                        -- snapshot so historic records stay accurate

  -- Snapshots of the weights used — so historic scores are always reproducible
  weight_judgement    NUMERIC(4,3),
  weight_numerical    NUMERIC(4,3),
  weight_verbal       NUMERIC(4,3),
  weight_situational  NUMERIC(4,3),

  -- Integrity monitoring
  questions_answered  INTEGER     DEFAULT 0,
  tab_switch_count    INTEGER     DEFAULT 0,
  flagged             BOOLEAN     DEFAULT FALSE,
  flag_reason         TEXT,

  -- Network / device (anonymise before storing)
  ip_address          INET,
  user_agent          TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_candidate  ON assessment_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org        ON assessment_sessions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_submitted  ON assessment_sessions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_passed     ON assessment_sessions(passed);


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SESSION ANSWERS
--    Individual question-level responses per session
--    Enables per-question analytics and future adaptive scoring
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS session_answers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID        NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id     TEXT        NOT NULL,               -- key in the question bank (e.g. "J-042")
  category        TEXT        NOT NULL
                              CHECK (category IN ('judgement', 'numerical', 'verbal', 'situational')),
  answer_given    TEXT,                               -- the option ID selected
  is_correct      BOOLEAN,
  time_spent_ms   INTEGER,                            -- milliseconds spent on this question
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answers_session  ON session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON session_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_category ON session_answers(category);


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. INVITE BATCHES
--    Groups of candidates invited together (e.g. for a bulk intake)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invite_batches (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID        NOT NULL REFERENCES organisations(id)      ON DELETE RESTRICT,
  created_by      UUID                 REFERENCES recruiter_profiles(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,               -- e.g. "Batch 004 — Sales Intake Mar 2026"
  role_name       TEXT,                               -- role this batch was created for
  deadline        DATE,
  total_invited   INTEGER     DEFAULT 0,
  total_started   INTEGER     DEFAULT 0,
  total_completed INTEGER     DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deferred FK from candidates back to invite_batches
ALTER TABLE candidates
  ADD CONSTRAINT IF NOT EXISTS fk_candidates_batch
  FOREIGN KEY (invite_batch_id)
  REFERENCES invite_batches(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invite_batches_org ON invite_batches(organisation_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. CONTACT ENQUIRIES
--    Submissions from the public contact / demo-request form
--    Public INSERT is allowed (unauthenticated); reads are superadmin-only
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name        TEXT        NOT NULL,
  last_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  company_name      TEXT        NOT NULL,
  company_size      TEXT,
  industry          TEXT,
  volume_estimate   TEXT,                             -- e.g. "50–100 candidates/month"
  features_wanted   TEXT[],                           -- array of ticked feature interests
  notes             TEXT,
  preferred_contact TEXT        DEFAULT 'Email',
  enquiry_type      TEXT        DEFAULT 'general'
                                CHECK (enquiry_type IN ('general', 'demo', 'access', 'support', 'billing')),
  ref_number        TEXT        UNIQUE,               -- shown to submitter on confirmation page
  status            TEXT        DEFAULT 'new'
                                CHECK (status IN ('new', 'contacted', 'demo_booked', 'closed_won', 'closed_lost')),
  assigned_to       UUID        REFERENCES recruiter_profiles(id) ON DELETE SET NULL,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON contact_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_email  ON contact_enquiries(email);
CREATE INDEX IF NOT EXISTS idx_enquiries_type   ON contact_enquiries(enquiry_type);


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. AUDIT LOG
--     Append-only record of every sensitive action on the platform
--     Never UPDATE or DELETE rows in this table
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL   PRIMARY KEY,
  actor_id        UUID,                               -- recruiter_profiles.id, or NULL for system events
  actor_email     TEXT,
  actor_role      TEXT,
  organisation_id UUID,                               -- NULL for platform-level actions
  action          TEXT        NOT NULL,               -- dot-namespaced verb, e.g. 'code.issued'
  target_type     TEXT,                               -- e.g. 'candidate', 'access_code', 'session'
  target_id       UUID,
  metadata        JSONB       DEFAULT '{}',           -- any extra structured context
  ip_address      INET,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No UPDATE or DELETE allowed — enforced by RLS (no update/delete policies)
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_org      ON audit_log(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_occurred ON audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_log(target_type, target_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 11. BILLING PLANS  (new v2)
--     Master plan definitions — referenced by org_subscriptions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS billing_plans (
  id                  TEXT        PRIMARY KEY,        -- e.g. 'starter', 'professional', 'enterprise'
  display_name        TEXT        NOT NULL,
  price_monthly       INTEGER     NOT NULL,           -- in cents (USD)
  price_annual        INTEGER     NOT NULL,           -- in cents per month when billed annually
  max_recruiter_seats INTEGER,                        -- NULL = unlimited
  max_assessments_mo  INTEGER,                        -- NULL = unlimited
  features            JSONB       DEFAULT '{}',       -- feature flags included in this plan
  is_public           BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order          INTEGER     DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed plan definitions
INSERT INTO billing_plans (id, display_name, price_monthly, price_annual, max_recruiter_seats, max_assessments_mo, sort_order)
VALUES
  ('starter',      'Starter',      7900,  6300,  3,    20,        1),
  ('professional', 'Professional', 29900, 23900, 5,    50,        2),
  ('enterprise',   'Enterprise',   59900, 47900, 15,   NULL,      3)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 12. ORG SUBSCRIPTIONS  (new v2)
--     One active subscription per organisation
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS org_subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id     UUID        NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
  plan_id             TEXT        NOT NULL REFERENCES billing_plans(id),
  billing_cycle       TEXT        NOT NULL DEFAULT 'monthly'
                                  CHECK (billing_cycle IN ('monthly', 'annual')),
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'suspended')),

  -- Trial period
  trial_ends_at       TIMESTAMPTZ,

  -- Current billing period
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,

  -- External billing reference (Stripe, etc.)
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,

  -- Usage counters — reset monthly by a scheduled function
  assessments_used_this_month INTEGER DEFAULT 0,
  recruiter_seats_used        INTEGER DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org    ON org_subscriptions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON org_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan   ON org_subscriptions(plan_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 13. LOGIN HISTORY  (new v2)
--     Record of every sign-in attempt across the platform
--     Powers the Security & Sessions view in the admin panel
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS login_history (
  id              BIGSERIAL   PRIMARY KEY,
  recruiter_id    UUID        REFERENCES recruiter_profiles(id) ON DELETE SET NULL,
  email_attempted TEXT        NOT NULL,               -- the email entered at login
  organisation_id UUID        REFERENCES organisations(id) ON DELETE SET NULL,
  result          TEXT        NOT NULL DEFAULT 'success'
                              CHECK (result IN ('success', 'failed', 'mfa_required', 'locked_out')),
  ip_address      INET,
  country_code    CHAR(2),                            -- derived from IP geolocation
  city            TEXT,
  device_type     TEXT,                               -- e.g. 'desktop', 'mobile', 'tablet'
  browser         TEXT,
  os              TEXT,
  session_id      TEXT,                               -- Supabase session token (partial)
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_recruiter ON login_history(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_login_org       ON login_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_login_result    ON login_history(result);
CREATE INDEX IF NOT EXISTS idx_login_occurred  ON login_history(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_ip        ON login_history(ip_address);


-- ═══════════════════════════════════════════════════════════════════════════
-- 14. PLATFORM CONFIG  (new v2)
--     Key-value store for global platform settings and feature flags
--     Managed by superadmins only via the Admin → Platform Config panel
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS platform_config (
  key             TEXT        PRIMARY KEY,
  value           TEXT        NOT NULL,
  value_type      TEXT        NOT NULL DEFAULT 'string'
                              CHECK (value_type IN ('string', 'integer', 'boolean', 'json')),
  label           TEXT,                               -- human-readable label for admin UI
  description     TEXT,                               -- explanation shown in admin panel
  is_feature_flag BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_by      UUID        REFERENCES recruiter_profiles(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default config values
INSERT INTO platform_config (key, value, value_type, label, description, is_feature_flag)
VALUES
  -- Global defaults
  ('default_pass_threshold',     '65',    'integer', 'Default Pass Threshold (%)',     'Applied to new orgs unless overridden in their settings',        FALSE),
  ('default_time_limit_minutes', '25',    'integer', 'Default Time Limit (minutes)',   'Applied to new orgs at setup',                                   FALSE),
  ('default_tab_switch_limit',   '3',     'integer', 'Tab-Switch Warning Threshold',   'Number of switches before the assessment is auto-flagged',        FALSE),
  ('support_email',              'support@novacs.io', 'string', 'Support Email', 'Shown on error pages and contact forms',                              FALSE),
  ('platform_name',              'NovaCS', 'string', 'Platform Display Name',          'Used in emails and white-label contexts',                         FALSE),
  -- Feature flags
  ('flag_bulk_csv_invites',      'true',  'boolean', 'Bulk CSV Candidate Invites',     'Allow recruiters to upload CSVs to invite multiple candidates',    TRUE),
  ('flag_ai_question_gen',       'false', 'boolean', 'AI Question Generation',         'Generate questions automatically from a job description (beta)',   TRUE),
  ('flag_ats_push',              'false', 'boolean', 'ATS Push Integration',           'Push results directly to Workable / Greenhouse / Lever',           TRUE),
  ('flag_candidate_score_reveal','false', 'boolean', 'Candidate Score Reveal',         'Allow orgs to show candidates their own score after submission',   TRUE),
  ('flag_custom_branding',       'true',  'boolean', 'Custom Organisation Branding',   'Let orgs set a logo and accent colour for the candidate portal',   TRUE),
  ('flag_sso',                   'false', 'boolean', 'SSO / SAML Login',               'Enterprise SSO sign-in support (Enterprise plan only)',            TRUE)
ON CONFLICT (key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 15. ROLE PERMISSIONS  (new v2)
--     Defines exactly what each role can do — read by the app at runtime
--     Updated by superadmins via Admin → Role Permissions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS role_permissions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  role            TEXT        NOT NULL
                              CHECK (role IN ('viewer', 'recruiter', 'admin')),
                              -- superadmin always has all permissions — not stored here
  permission      TEXT        NOT NULL,               -- dot-namespaced, e.g. 'candidates.export'
  allowed         BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_by      UUID        REFERENCES recruiter_profiles(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_role_permission UNIQUE (role, permission)
);

-- Seed default permissions matrix
INSERT INTO role_permissions (role, permission, allowed)
VALUES
  -- Candidates
  ('viewer',    'candidates.view',          TRUE),
  ('viewer',    'candidates.issue_code',    FALSE),
  ('viewer',    'candidates.shortlist',     FALSE),
  ('viewer',    'candidates.export',        FALSE),
  ('recruiter', 'candidates.view',          TRUE),
  ('recruiter', 'candidates.issue_code',    TRUE),
  ('recruiter', 'candidates.shortlist',     TRUE),
  ('recruiter', 'candidates.export',        TRUE),
  ('admin',     'candidates.view',          TRUE),
  ('admin',     'candidates.issue_code',    TRUE),
  ('admin',     'candidates.shortlist',     TRUE),
  ('admin',     'candidates.export',        TRUE),
  -- Assessments
  ('viewer',    'assessments.view_results', TRUE),
  ('viewer',    'assessments.edit_questions', FALSE),
  ('viewer',    'assessments.manage_invites', FALSE),
  ('recruiter', 'assessments.view_results', TRUE),
  ('recruiter', 'assessments.edit_questions', FALSE),
  ('recruiter', 'assessments.manage_invites', TRUE),
  ('admin',     'assessments.view_results', TRUE),
  ('admin',     'assessments.edit_questions', TRUE),
  ('admin',     'assessments.manage_invites', TRUE),
  -- Settings
  ('viewer',    'settings.view',            FALSE),
  ('viewer',    'settings.edit',            FALSE),
  ('viewer',    'settings.invite_members',  FALSE),
  ('viewer',    'settings.change_weights',  FALSE),
  ('recruiter', 'settings.view',            FALSE),
  ('recruiter', 'settings.edit',            FALSE),
  ('recruiter', 'settings.invite_members',  FALSE),
  ('recruiter', 'settings.change_weights',  FALSE),
  ('admin',     'settings.view',            TRUE),
  ('admin',     'settings.edit',            TRUE),
  ('admin',     'settings.invite_members',  TRUE),
  ('admin',     'settings.change_weights',  TRUE)
ON CONFLICT (role, permission) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role);


-- ═══════════════════════════════════════════════════════════════════════════
-- 16. SUPPORT TICKETS  (new v2)
--     Internal ticket tracking for platform-level support issues
--     Distinct from contact_enquiries (which are pre-sales leads)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref             TEXT        NOT NULL UNIQUE,        -- e.g. "TKT-006"
  organisation_id UUID        REFERENCES organisations(id) ON DELETE SET NULL,
  submitted_by    UUID        REFERENCES recruiter_profiles(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  ticket_type     TEXT        NOT NULL DEFAULT 'general'
                              CHECK (ticket_type IN ('access_issue', 'bug', 'general', 'billing', 'feature_request')),
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  priority        TEXT        NOT NULL DEFAULT 'normal'
                              CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to     UUID        REFERENCES recruiter_profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_org      ON support_tickets(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_ref      ON support_tickets(ref);


-- ═══════════════════════════════════════════════════════════════════════════
-- 17. UPDATED_AT TRIGGERS
--     Automatically stamp updated_at on every row change
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_organisations_updated_at
    BEFORE UPDATE ON organisations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_recruiter_profiles_updated_at
    BEFORE UPDATE ON recruiter_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_assessment_configs_updated_at
    BEFORE UPDATE ON assessment_configs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_sessions_updated_at
    BEFORE UPDATE ON assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_enquiries_updated_at
    BEFORE UPDATE ON contact_enquiries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON org_subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 18. ACCESS CODE GENERATOR
--     SECURITY DEFINER function — generates and inserts a unique 6-char code
--     Call from app server; never called directly from client
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_access_code(
  p_candidate_id    UUID,
  p_organisation_id UUID,
  p_issued_by       UUID,
  p_expires_at      TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_code   TEXT;
  v_exists BOOLEAN;
  v_chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- omits I, O, 0, 1 to avoid confusion
  v_i      INTEGER;
BEGIN
  LOOP
    v_code := '';
    FOR v_i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::INT, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM access_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO access_codes (code, candidate_id, organisation_id, issued_by, expires_at)
  VALUES (v_code, p_candidate_id, p_organisation_id, p_issued_by, p_expires_at);

  -- Audit the code issuance
  PERFORM write_audit_log(
    'code.issued',
    'access_code', NULL,
    jsonb_build_object('candidate_id', p_candidate_id, 'code', v_code)
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════
-- 19. WEIGHTED SCORE CALCULATOR
--     Called on session submission — computes and writes the final score
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION calculate_weighted_score(p_session_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_session assessment_sessions%ROWTYPE;
  v_score   NUMERIC;
BEGIN
  SELECT * INTO v_session FROM assessment_sessions WHERE id = p_session_id;

  v_score := ROUND(
    (v_session.score_judgement   * v_session.weight_judgement   +
     v_session.score_numerical   * v_session.weight_numerical   +
     v_session.score_verbal      * v_session.weight_verbal      +
     v_session.score_situational * v_session.weight_situational)::NUMERIC,
    2
  );

  UPDATE assessment_sessions
  SET
    score_weighted = v_score,
    passed         = (v_score >= v_session.threshold_at_submit),
    status         = 'submitted',
    submitted_at   = NOW()
  WHERE id = p_session_id;

  -- Audit the submission
  PERFORM write_audit_log(
    'session.submitted',
    'session', p_session_id,
    jsonb_build_object(
      'score_weighted', v_score,
      'passed', (v_score >= v_session.threshold_at_submit)
    )
  );

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════
-- 20. ASSESSMENT USAGE COUNTER
--     Increments the subscription usage counter when a session is submitted
--     Triggered automatically after session submission
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_assessment_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    UPDATE org_subscriptions
    SET assessments_used_this_month = assessments_used_this_month + 1
    WHERE organisation_id = NEW.organisation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER trg_increment_assessment_usage
    AFTER UPDATE ON assessment_sessions
    FOR EACH ROW EXECUTE FUNCTION increment_assessment_usage();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 21. AUDIT LOG WRITER
--     The ONLY way to write to audit_log — called from all other functions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION write_audit_log(
  p_action        TEXT,
  p_target_type   TEXT    DEFAULT NULL,
  p_target_id     UUID    DEFAULT NULL,
  p_metadata      JSONB   DEFAULT '{}',
  p_ip_address    INET    DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_actor recruiter_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM recruiter_profiles WHERE id = auth.uid();

  INSERT INTO audit_log (
    actor_id, actor_email, actor_role,
    organisation_id, action,
    target_type, target_id,
    metadata, ip_address
  ) VALUES (
    auth.uid(),
    COALESCE(v_actor.email, 'system'),
    COALESCE(v_actor.role,  'system'),
    v_actor.organisation_id,
    p_action,
    p_target_type,
    p_target_id,
    p_metadata,
    p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════
-- 22. SUPPORT TICKET REF GENERATOR
--     Auto-assigns a TKT-NNN reference on insert
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION assign_ticket_ref()
RETURNS TRIGGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ref FROM 5) AS INTEGER)), 0) + 1
  INTO v_next
  FROM support_tickets;

  NEW.ref := 'TKT-' || LPAD(v_next::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_assign_ticket_ref
    BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION assign_ticket_ref();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 23. RLS HELPER FUNCTIONS
--     Stable, security-definer functions used inside RLS policies
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT organisation_id
  FROM recruiter_profiles
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_recruiter_role()
RETURNS TEXT AS $$
  SELECT role
  FROM recruiter_profiles
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM recruiter_profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 24. ROW LEVEL SECURITY
--     Enable RLS on every table, then define policies
--     General rule: superadmins bypass all org-scoping
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE organisations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_enquiries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets     ENABLE ROW LEVEL SECURITY;


-- ── ORGANISATIONS ──────────────────────────────────────────────────────────
CREATE POLICY "Recruiter sees own org"
  ON organisations FOR SELECT
  USING (id = current_org_id() OR is_superadmin());

CREATE POLICY "Superadmin manages orgs"
  ON organisations FOR ALL
  USING (is_superadmin());


-- ── RECRUITER PROFILES ─────────────────────────────────────────────────────
CREATE POLICY "Recruiter sees own org teammates"
  ON recruiter_profiles FOR SELECT
  USING (organisation_id = current_org_id() OR is_superadmin());

CREATE POLICY "Recruiter updates own profile"
  ON recruiter_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Superadmin manages all profiles"
  ON recruiter_profiles FOR ALL
  USING (is_superadmin());


-- ── ASSESSMENT CONFIGS ─────────────────────────────────────────────────────
CREATE POLICY "Recruiter sees own config"
  ON assessment_configs FOR SELECT
  USING (organisation_id = current_org_id() OR is_superadmin());

CREATE POLICY "Admin updates config"
  ON assessment_configs FOR UPDATE
  USING (organisation_id = current_org_id()
    AND current_recruiter_role() IN ('admin', 'superadmin'));


-- ── CANDIDATES ─────────────────────────────────────────────────────────────
CREATE POLICY "Recruiter sees own org candidates"
  ON candidates FOR SELECT
  USING (organisation_id = current_org_id() OR is_superadmin());

CREATE POLICY "Recruiter inserts candidates"
  ON candidates FOR INSERT
  WITH CHECK (organisation_id = current_org_id());

CREATE POLICY "Recruiter updates candidates"
  ON candidates FOR UPDATE
  USING (organisation_id = current_org_id());

CREATE POLICY "Admin deletes candidates"
  ON candidates FOR DELETE
  USING (organisation_id = current_org_id()
    AND current_recruiter_role() IN ('admin', 'superadmin'));


-- ── ACCESS CODES ───────────────────────────────────────────────────────────
CREATE POLICY "Recruiter sees own org codes"
  ON access_codes FOR SELECT
  USING (organisation_id = current_org_id() OR is_superadmin());

CREATE POLICY "Recruiter issues codes"
  ON access_codes FOR INSERT
  WITH CHECK (organisation_id = current_org_id());

CREATE POLICY "Recruiter revokes codes"
  ON access_codes FOR UPDATE
  USING (organisation_id = current_org_id());


-- ── ASSESSMENT SESSIONS ────────────────────────────────────────────────────
-- All session writes go through SECURITY DEFINER functions only
CREATE POLICY "Recruiter sees own org sessions"
  ON assessment_sessions FOR SELECT
  USING (organisation_id = current_org_id() OR is_superadmin());


-- ── SESSION ANSWERS ────────────────────────────────────────────────────────
CREATE POLICY "Recruiter reads own org answers"
  ON session_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_sessions s
      WHERE s.id = session_id
        AND (s.organisation_id = current_org_id() OR is_superadmin())
    )
  );


-- ── INVITE BATCHES ─────────────────────────────────────────────────────────
CREATE POLICY "Recruiter sees own org batches"
  ON invite_batches FOR SELECT
  USING (organisation_id = current_org_id() OR is_superadmin());

CREATE POLICY "Recruiter creates batches"
  ON invite_batches FOR INSERT
  WITH CHECK (organisation_id = current_org_id());


-- ── CONTACT ENQUIRIES ──────────────────────────────────────────────────────
CREATE POLICY "Public submits enquiry"
  ON contact_enquiries FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Superadmin reads enquiries"
  ON contact_enquiries FOR SELECT
  USING (is_superadmin());

CREATE POLICY "Superadmin updates enquiry status"
  ON contact_enquiries FOR UPDATE
  USING (is_superadmin());


-- ── AUDIT LOG ──────────────────────────────────────────────────────────────
CREATE POLICY "Admin reads own org audit"
  ON audit_log FOR SELECT
  USING (organisation_id = current_org_id()
    AND current_recruiter_role() IN ('admin', 'superadmin'));

CREATE POLICY "Superadmin reads all audit"
  ON audit_log FOR SELECT
  USING (is_superadmin());
-- No INSERT policy here — writes only via write_audit_log() SECURITY DEFINER


-- ── BILLING PLANS ──────────────────────────────────────────────────────────
CREATE POLICY "Anyone reads public plans"
  ON billing_plans FOR SELECT
  USING (is_public = TRUE OR is_superadmin());

CREATE POLICY "Superadmin manages plans"
  ON billing_plans FOR ALL
  USING (is_superadmin());


-- ── ORG SUBSCRIPTIONS ──────────────────────────────────────────────────────
CREATE POLICY "Admin sees own org subscription"
  ON org_subscriptions FOR SELECT
  USING (organisation_id = current_org_id()
    AND current_recruiter_role() IN ('admin', 'superadmin'));

CREATE POLICY "Superadmin manages all subscriptions"
  ON org_subscriptions FOR ALL
  USING (is_superadmin());


-- ── LOGIN HISTORY ──────────────────────────────────────────────────────────
-- Written server-side only (SECURITY DEFINER on Supabase edge functions)
CREATE POLICY "Admin reads own org logins"
  ON login_history FOR SELECT
  USING (organisation_id = current_org_id()
    AND current_recruiter_role() IN ('admin', 'superadmin'));

CREATE POLICY "Superadmin reads all logins"
  ON login_history FOR SELECT
  USING (is_superadmin());


-- ── PLATFORM CONFIG ────────────────────────────────────────────────────────
CREATE POLICY "Any recruiter reads config"
  ON platform_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin manages config"
  ON platform_config FOR ALL
  USING (is_superadmin());


-- ── ROLE PERMISSIONS ───────────────────────────────────────────────────────
CREATE POLICY "Any recruiter reads permissions"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmin manages permissions"
  ON role_permissions FOR ALL
  USING (is_superadmin());


-- ── SUPPORT TICKETS ────────────────────────────────────────────────────────
CREATE POLICY "Admin sees own org tickets"
  ON support_tickets FOR SELECT
  USING (organisation_id = current_org_id()
    AND current_recruiter_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admin creates tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (organisation_id = current_org_id()
    AND current_recruiter_role() IN ('admin', 'superadmin'));

CREATE POLICY "Superadmin manages all tickets"
  ON support_tickets FOR ALL
  USING (is_superadmin());


-- ═══════════════════════════════════════════════════════════════════════════
-- 25. STORAGE BUCKETS
--     Run in Supabase Dashboard → Storage, or via this SQL
-- ═══════════════════════════════════════════════════════════════════════════

-- Organisation logos (private — served via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  FALSE,
  2097152,   -- 2 MB max
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
) ON CONFLICT DO NOTHING;

CREATE POLICY "Recruiter manages own org logo"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1] = current_org_id()::TEXT
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 26. SEED DATA  (run once — safe to re-run via ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════════════════

-- NovaCS internal org
INSERT INTO organisations (id, name, slug, accent_color)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'NovaCS',
  'novaCS',
  '#2452a0'
) ON CONFLICT DO NOTHING;

-- Demo org: Acme Corp
INSERT INTO organisations (id, name, slug, accent_color, industry)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Acme Corp',
  'acme-corp',
  '#1e3a5f',
  'Technology'
) ON CONFLICT DO NOTHING;

-- Demo org: NexGen Talent
INSERT INTO organisations (id, name, slug, accent_color, industry)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'NexGen Talent',
  'nexgen-talent',
  '#0f6b3a',
  'Recruitment'
) ON CONFLICT DO NOTHING;

-- Demo org: Vertex Consulting
INSERT INTO organisations (id, name, slug, accent_color, industry)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Vertex Consulting',
  'vertex-consulting',
  '#6b3fd4',
  'Consulting'
) ON CONFLICT DO NOTHING;

-- Demo org: ClearPath
INSERT INTO organisations (id, name, slug, accent_color, industry)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'ClearPath',
  'clearpath',
  '#854d0e',
  'Finance'
) ON CONFLICT DO NOTHING;

-- Default assessment configs for all demo orgs
INSERT INTO assessment_configs (organisation_id)
VALUES
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- Default subscriptions for demo orgs
INSERT INTO org_subscriptions (organisation_id, plan_id, billing_cycle, status, current_period_start, current_period_end)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'professional', 'monthly', 'active', '2026-03-01', '2026-04-01'),
  ('00000000-0000-0000-0000-000000000003', 'starter',      'monthly', 'active', '2026-03-01', '2026-04-01'),
  ('00000000-0000-0000-0000-000000000004', 'enterprise',   'monthly', 'active', '2026-03-01', '2026-04-01'),
  ('00000000-0000-0000-0000-000000000005', 'starter',      'monthly', 'active', '2026-03-01', '2026-04-01')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════