/*
  # Airline AI Platform - Initial Schema

  1. New Tables
    - `users` - Platform users with roles
    - `query_logs` - IATA baggage policy query history
    - `accessibility_checks` - Accessibility review submissions and AI results
    - `test_reports` - Automated test run records and AI-generated release notes
    - `audit_logs` - System-wide audit trail

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to manage their own data
    - Admin role policies for full access
*/

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'support_agent' CHECK (role IN ('support_agent', 'ops_manager', 'fe_engineer', 'qa_engineer', 'admin')),
  department text NOT NULL DEFAULT 'Customer Support',
  avatar_initials text NOT NULL DEFAULT 'U',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Query logs for IATA baggage policy searches
CREATE TABLE IF NOT EXISTS query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  question text NOT NULL,
  ai_answer text NOT NULL DEFAULT '',
  source_sections text[] DEFAULT '{}',
  confidence_score numeric(3,2) DEFAULT 0.00,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('allowance', 'excess', 'mishandled', 'interline', 'operational', 'settlement', 'general')),
  status text NOT NULL DEFAULT 'answered' CHECK (status IN ('answered', 'escalated', 'pending')),
  feedback text DEFAULT NULL CHECK (feedback IN ('helpful', 'not_helpful', NULL)),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own query logs"
  ON query_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert query logs"
  ON query_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own query logs"
  ON query_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Accessibility checks
CREATE TABLE IF NOT EXISTS accessibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  component_name text NOT NULL,
  component_type text NOT NULL DEFAULT 'button' CHECK (component_type IN ('button', 'menu', 'form', 'navigation', 'modal', 'table', 'other')),
  html_code text NOT NULL,
  brand_colors jsonb DEFAULT '{}',
  ai_review text NOT NULL DEFAULT '',
  issues_found jsonb DEFAULT '[]',
  wcag_score integer DEFAULT 0 CHECK (wcag_score >= 0 AND wcag_score <= 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'passed', 'failed', 'needs_revision')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL
);

ALTER TABLE accessibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own accessibility checks"
  ON accessibility_checks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert accessibility checks"
  ON accessibility_checks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accessibility checks"
  ON accessibility_checks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Test reports
CREATE TABLE IF NOT EXISTS test_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  report_title text NOT NULL,
  test_suite text NOT NULL DEFAULT 'Flight Search',
  total_tests integer DEFAULT 0,
  passed_tests integer DEFAULT 0,
  failed_tests integer DEFAULT 0,
  skipped_tests integer DEFAULT 0,
  test_results jsonb DEFAULT '[]',
  ai_release_note text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  duration_ms integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT NULL
);

ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own test reports"
  ON test_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert test reports"
  ON test_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test reports"
  ON test_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Audit logs (system-wide)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT 'System',
  user_role text NOT NULL DEFAULT '',
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text DEFAULT NULL,
  details jsonb DEFAULT '{}',
  ip_address text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accessibility_checks_user_id ON accessibility_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
