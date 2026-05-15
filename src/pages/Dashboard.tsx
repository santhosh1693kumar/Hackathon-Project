import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import {
  MessageSquare, Shield, FileText, ClipboardList,
  TrendingUp, CheckCircle, AlertCircle, Clock, ArrowRight
} from 'lucide-react';

interface Stats {
  totalQueries: number;
  accessibilityChecks: number;
  testReports: number;
  auditLogs: number;
  recentQueries: Array<{ question: string; category: string; created_at: string; status: string }>;
  recentChecks: Array<{ component_name: string; wcag_score: number; status: string; created_at: string }>;
  recentReports: Array<{ report_title: string; passed_tests: number; total_tests: number; status: string; created_at: string }>;
}

function StatCard({ icon: Icon, label, value, color, trend }: { icon: React.ElementType; label: string; value: number; color: string; trend?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );
}

export default function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalQueries: 0, accessibilityChecks: 0, testReports: 0, auditLogs: 0,
    recentQueries: [], recentChecks: [], recentReports: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [q, a, t, al, rq, ra, rr] = await Promise.all([
        supabase.from('query_logs').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('accessibility_checks').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('test_reports').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('query_logs').select('question, category, created_at, status').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(4),
        supabase.from('accessibility_checks').select('component_name, wcag_score, status, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(4),
        supabase.from('test_reports').select('report_title, passed_tests, total_tests, status, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(4),
      ]);
      setStats({
        totalQueries: q.count || 0,
        accessibilityChecks: a.count || 0,
        testReports: t.count || 0,
        auditLogs: al.count || 0,
        recentQueries: rq.data || [],
        recentChecks: ra.data || [],
        recentReports: rr.data || [],
      });
      setLoading(false);
    }
    load();
  }, [user]);

  const categoryColors: Record<string, string> = {
    allowance: 'bg-sky-500/20 text-sky-400',
    excess: 'bg-amber-500/20 text-amber-400',
    mishandled: 'bg-red-500/20 text-red-400',
    interline: 'bg-emerald-500/20 text-emerald-400',
    operational: 'bg-blue-500/20 text-blue-400',
    settlement: 'bg-orange-500/20 text-orange-400',
    general: 'bg-slate-500/20 text-slate-400',
  };

  const quickActions = [
    { id: 'baggage-assistant', label: 'Ask Baggage Policy AI', icon: MessageSquare, color: 'bg-sky-500', desc: 'Instant IATA-grounded answers', roles: ['support_agent', 'ops_manager', 'admin'] },
    { id: 'accessibility', label: 'Check Accessibility', icon: Shield, color: 'bg-emerald-600', desc: 'WCAG 2.1 AA compliance check', roles: ['fe_engineer', 'admin'] },
    { id: 'test-reports', label: 'Run Tests & Report', icon: FileText, color: 'bg-amber-600', desc: 'Generate AI release notes', roles: ['qa_engineer', 'fe_engineer', 'admin'] },
    { id: 'audit-log', label: 'View Audit Trail', icon: ClipboardList, color: 'bg-slate-600', desc: 'Activity and compliance log', roles: ['ops_manager', 'admin'] },
  ].filter(a => a.roles.includes(user?.role || ''));

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-sky-900/40 to-slate-900 border border-sky-800/30 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">
          Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
        </h2>
        <p className="text-slate-400 text-sm">
          {user?.department} · {user?.role === 'support_agent' ? 'Ready to assist customers with IATA baggage queries' :
            user?.role === 'fe_engineer' ? 'Review your latest accessibility checks and test reports' :
            user?.role === 'qa_engineer' ? 'Monitor test coverage and generate release documentation' :
            'Monitor platform activity and AI-powered workflows'}
        </p>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={MessageSquare} label="Policy Queries" value={stats.totalQueries} color="bg-sky-600" trend="+12%" />
          <StatCard icon={Shield} label="A11y Checks" value={stats.accessibilityChecks} color="bg-emerald-600" trend="+5%" />
          <StatCard icon={FileText} label="Test Reports" value={stats.testReports} color="bg-amber-600" trend="+8%" />
          <StatCard icon={ClipboardList} label="Audit Events" value={stats.auditLogs} color="bg-slate-600" />
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onNavigate(action.id)}
                  className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-all group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{action.label}</p>
                    <p className="text-slate-500 text-xs">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Policy Queries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Recent Policy Queries</h3>
            <button onClick={() => onNavigate('baggage-assistant')} className="text-sky-400 text-xs hover:text-sky-300 transition-colors">View all</button>
          </div>
          {stats.recentQueries.length === 0 ? (
            <div className="text-center py-6">
              <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No queries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentQueries.map((q, i) => (
                <div key={i} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                  <p className="text-white text-xs font-medium truncate mb-1">{q.question}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${categoryColors[q.category] || 'bg-slate-500/20 text-slate-400'}`}>{q.category}</span>
                    <span className="text-slate-600 text-xs">{new Date(q.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent A11y Checks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Accessibility Reviews</h3>
            <button onClick={() => onNavigate('accessibility')} className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors">View all</button>
          </div>
          {stats.recentChecks.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No checks yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${c.wcag_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' : c.wcag_score >= 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                    {c.wcag_score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{c.component_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {c.status === 'passed' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : c.status === 'failed' ? <AlertCircle className="w-3 h-3 text-red-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                      <span className="text-slate-500 text-xs capitalize">{c.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Test Reports */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Test Reports</h3>
            <button onClick={() => onNavigate('test-reports')} className="text-amber-400 text-xs hover:text-amber-300 transition-colors">View all</button>
          </div>
          {stats.recentReports.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs">No reports yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentReports.map((r, i) => (
                <div key={i} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                  <p className="text-white text-xs font-medium truncate mb-1">{r.report_title}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.passed_tests === r.total_tests ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: r.total_tests > 0 ? `${(r.passed_tests / r.total_tests) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-slate-400 text-xs flex-shrink-0">{r.passed_tests}/{r.total_tests}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
