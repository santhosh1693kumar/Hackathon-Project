import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import { ClipboardList, Search, Filter, ChevronDown, RefreshCw, Shield, MessageSquare, FileText } from 'lucide-react';
import type { AuditLog } from '../types';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  QUERY_SUBMITTED: <MessageSquare className="w-3.5 h-3.5 text-sky-400" />,
  ACCESSIBILITY_CHECK_SUBMITTED: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
  TEST_REPORT_GENERATED: <FileText className="w-3.5 h-3.5 text-amber-400" />,
};

const ACTION_COLORS: Record<string, string> = {
  QUERY_SUBMITTED: 'bg-sky-500/10 border-sky-500/20',
  ACCESSIBILITY_CHECK_SUBMITTED: 'bg-emerald-500/10 border-emerald-500/20',
  TEST_REPORT_GENERATED: 'bg-amber-500/10 border-amber-500/20',
};

export default function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => { if (user) loadLogs(); }, [user, page]);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setLogs(data || []);
    setLoading(false);
  }

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name.toLowerCase().includes(search.toLowerCase());
    const matchResource = resourceFilter === 'all' || log.resource_type.toLowerCase().includes(resourceFilter);
    return matchSearch && matchResource;
  });

  const actionLabel = (action: string) => action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const resourceLabel = (type: string) => type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Audit Log</h2>
          <p className="text-slate-400 text-sm mt-0.5">Complete activity trail for compliance and governance</p>
        </div>
        <button
          onClick={() => { setPage(0); loadLogs(); }}
          className="flex items-center gap-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3.5 py-2 text-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Policy Queries', count: logs.filter(l => l.resource_type === 'query_log').length, color: 'text-sky-400', icon: MessageSquare },
          { label: 'A11y Reviews', count: logs.filter(l => l.resource_type === 'accessibility_check').length, color: 'text-emerald-400', icon: Shield },
          { label: 'Test Reports', count: logs.filter(l => l.resource_type === 'test_report').length, color: 'text-amber-400', icon: FileText },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.count}</p>
                <p className="text-slate-500 text-xs">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search actions, resources..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <select
            value={resourceFilter}
            onChange={e => setResourceFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg pl-8 pr-8 py-2.5 text-sm focus:outline-none focus:border-slate-600 appearance-none transition-colors"
          >
            <option value="all">All Resources</option>
            <option value="query">Policy Queries</option>
            <option value="accessibility">Accessibility Checks</option>
            <option value="test">Test Reports</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Log table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-6 h-6 text-slate-600 mx-auto mb-2 animate-spin" />
            <p className="text-slate-500 text-sm">Loading audit logs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No audit logs found</p>
            <p className="text-slate-600 text-xs mt-1">Activity will appear here as you use the platform</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <div className="col-span-3">Action</div>
              <div className="col-span-3">Resource</div>
              <div className="col-span-2">User</div>
              <div className="col-span-2">Details</div>
              <div className="col-span-2 text-right">Timestamp</div>
            </div>
            <div className="divide-y divide-slate-800/50">
              {filtered.map(log => (
                <div key={log.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors text-sm">
                  <div className="col-span-3 flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 ${ACTION_COLORS[log.action] || 'bg-slate-800 border-slate-700'}`}>
                      {ACTION_ICONS[log.action] || <ClipboardList className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <span className="text-white text-xs font-medium truncate">{actionLabel(log.action)}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-slate-400 text-xs truncate">{resourceLabel(log.resource_type)}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="text-slate-400 text-xs truncate">{log.user_name}</span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <span className="text-slate-500 text-xs truncate">
                        {Object.entries(log.details as Record<string, unknown>).slice(0, 1).map(([k, v]) =>
                          `${k}: ${typeof v === 'string' ? v.slice(0, 20) : JSON.stringify(v).slice(0, 20)}`
                        ).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-xs">—</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-slate-500 text-xs">{new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
              <p className="text-slate-500 text-xs">Showing {filtered.length} entries</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="text-xs text-slate-400 hover:text-white disabled:opacity-30 border border-slate-700 rounded px-2.5 py-1 transition-colors"
                >
                  Previous
                </button>
                <span className="text-slate-500 text-xs">Page {page + 1}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={logs.length < PAGE_SIZE}
                  className="text-xs text-slate-400 hover:text-white disabled:opacity-30 border border-slate-700 rounded px-2.5 py-1 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
