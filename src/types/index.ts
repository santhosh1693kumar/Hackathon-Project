export type UserRole = 'support_agent' | 'ops_manager' | 'fe_engineer' | 'qa_engineer' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  avatar_initials: string;
  created_at: string;
  updated_at: string;
}

export interface QueryLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  question: string;
  ai_answer: string;
  source_sections: string[];
  confidence_score: number;
  category: 'allowance' | 'excess' | 'mishandled' | 'interline' | 'operational' | 'settlement' | 'general';
  status: 'answered' | 'escalated' | 'pending';
  feedback: 'helpful' | 'not_helpful' | null;
  created_at: string;
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  wcag_criterion: string;
  description: string;
  suggestion: string;
  line?: number;
}

export interface AccessibilityCheck {
  id: string;
  user_id: string;
  user_name: string;
  component_name: string;
  component_type: 'button' | 'menu' | 'form' | 'navigation' | 'modal' | 'table' | 'other';
  html_code: string;
  brand_colors: Record<string, string>;
  ai_review: string;
  issues_found: AccessibilityIssue[];
  wcag_score: number;
  status: 'pending' | 'reviewing' | 'passed' | 'failed' | 'needs_revision';
  created_at: string;
  reviewed_at: string | null;
}

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error?: string;
}

export interface TestReport {
  id: string;
  user_id: string;
  user_name: string;
  report_title: string;
  test_suite: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  test_results: TestCase[];
  ai_release_note: string;
  ai_summary: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'running' | 'completed' | 'failed';
  duration_ms: number;
  created_at: string;
  completed_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
