import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import { generateTestReport } from '../lib/aiService';
import { logAudit } from '../lib/auditService';
import {
  Play, FileText, CheckCircle, XCircle, Clock,
  Loader2, ChevronDown, ChevronRight, Download, Eye
} from 'lucide-react';
import type { TestReport, TestCase } from '../types';

const SAMPLE_TEST_SUITES = {
  'Flight Search': [
    { name: 'User can search for one-way flight', status: 'passed', duration_ms: 1240 },
    { name: 'User can search for return flight', status: 'passed', duration_ms: 980 },
    { name: 'Origin and destination cannot be same', status: 'passed', duration_ms: 340 },
    { name: 'Date picker prevents past dates', status: 'passed', duration_ms: 560 },
    { name: 'Search results display flight options', status: 'passed', duration_ms: 2100 },
    { name: 'Filtering by airline works', status: 'failed', duration_ms: 890, error: 'Filter dropdown not found: #airline-filter' },
    { name: 'Sorting by price works', status: 'passed', duration_ms: 430 },
    { name: 'Passenger count can be increased', status: 'passed', duration_ms: 310 },
  ],
  'Baggage Selection': [
    { name: 'Cabin bag option is selectable', status: 'passed', duration_ms: 450 },
    { name: 'Checked bag fee is displayed', status: 'passed', duration_ms: 380 },
    { name: 'Excess weight warning appears', status: 'passed', duration_ms: 620 },
    { name: 'Special items form renders', status: 'failed', duration_ms: 290, error: 'Element not found: #special-items-form' },
    { name: 'Baggage policy link opens', status: 'passed', duration_ms: 510 },
  ],
  'Check-in Flow': [
    { name: 'Boarding pass renders', status: 'passed', duration_ms: 780 },
    { name: 'Seat selection works', status: 'passed', duration_ms: 1340 },
    { name: 'Check-in form validates', status: 'passed', duration_ms: 560 },
    { name: 'Confirmation email is triggered', status: 'skipped', duration_ms: 0 },
    { name: 'QR code is generated', status: 'passed', duration_ms: 890 },
  ],
};

export default function TestReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<TestReport[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState('Flight Search');
  const [selected, setSelected] = useState<TestReport | null>(null);
  const [expandedTests, setExpandedTests] = useState<string | null>(null);

  useEffect(() => { if (user) loadReports(); }, [user]);

  async function loadReports() {
    const { data } = await supabase
      .from('test_reports')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setReports((data || []).map(d => ({ ...d, test_results: d.test_results || [] })));
  }

  async function runTests() {
    setRunning(true);
    const testCases = SAMPLE_TEST_SUITES[selectedSuite as keyof typeof SAMPLE_TEST_SUITES] || [];

    // Simulate running with delays
    const results: TestCase[] = [];
    for (const t of testCases) {
      await new Promise(r => setTimeout(r, 150));
      results.push({
        name: t.name,
        status: t.status as TestCase['status'],
        duration_ms: t.duration_ms + Math.floor(Math.random() * 200),
        error: t.error,
      });
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);

    const { release_note, summary, risk_level } = await generateTestReport(results, selectedSuite);

    const title = `${selectedSuite} – ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    const { data } = await supabase.from('test_reports').insert({
      user_id: user!.id,
      user_name: user!.full_name,
      report_title: title,
      test_suite: selectedSuite,
      total_tests: results.length,
      passed_tests: passed,
      failed_tests: failed,
      skipped_tests: skipped,
      test_results: results,
      ai_release_note: release_note,
      ai_summary: summary,
      risk_level,
      status: 'completed',
      duration_ms: totalDuration,
      completed_at: new Date().toISOString(),
    }).select().maybeSingle();

    await logAudit(user, 'TEST_REPORT_GENERATED', 'test_report', data?.id, { suite: selectedSuite, passed, failed, risk_level });
    await loadReports();
    if (data) setSelected({ ...data, test_results: data.test_results || [] });
    setRunning(false);
  }

  const riskColor = (risk: string) => {
    const map: Record<string, string> = {
      low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      critical: 'bg-red-700/30 text-red-300 border-red-700/40',
    };
    return map[risk] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Test Reports</h2>
          <p className="text-slate-400 text-sm mt-0.5">Automated test execution with AI-generated release notes</p>
        </div>
      </div>

      {/* Run tests panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Run New Test Suite</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Select Test Suite</label>
            <select
              value={selectedSuite}
              onChange={e => setSelectedSuite(e.target.value)}
              disabled={running}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            >
              {Object.keys(SAMPLE_TEST_SUITES).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <button
              onClick={runTests}
              disabled={running}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Running Tests...</>
              ) : (
                <><Play className="w-4 h-4" /> Run & Generate Report</>
              )}
            </button>
          </div>
        </div>
        {running && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-slate-400 text-xs">Playwright executing test suite...</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Reports list */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm">Report History ({reports.length})</h3>
          {reports.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-10 text-center">
              <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium mb-1">No reports yet</p>
              <p className="text-slate-600 text-xs">Run a test suite to generate your first AI-powered report</p>
            </div>
          ) : (
            reports.map(report => {
              const passRate = report.total_tests > 0 ? (report.passed_tests / report.total_tests) * 100 : 0;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelected(report)}
                  className={`w-full text-left bg-slate-900 border rounded-xl p-4 transition-all ${selected?.id === report.id ? 'border-amber-500/40' : 'border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{report.report_title}</p>
                      <p className="text-slate-500 text-xs">{report.test_suite} · {report.total_tests} tests</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${riskColor(report.risk_level)}`}>
                        {report.risk_level} risk
                      </span>
                      <Eye className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${passRate === 100 ? 'bg-emerald-500' : passRate >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-shrink-0">
                      <span className="text-emerald-400">{report.passed_tests} passed</span>
                      {report.failed_tests > 0 && <span className="text-red-400">{report.failed_tests} failed</span>}
                      {report.skipped_tests > 0 && <span className="text-slate-500">{report.skipped_tests} skipped</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm">{selected.report_title}</h3>
                <p className="text-slate-500 text-xs">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([selected.ai_release_note], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `release-note-${selected.id}.txt`;
                  a.click();
                }}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs border border-amber-500/30 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <Download className="w-3 h-3" /> Export
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
              {/* Summary stats */}
              <div className="grid grid-cols-4 border-b border-slate-800">
                {[
                  { label: 'Total', value: selected.total_tests, color: 'text-white' },
                  { label: 'Passed', value: selected.passed_tests, color: 'text-emerald-400' },
                  { label: 'Failed', value: selected.failed_tests, color: 'text-red-400' },
                  { label: 'Skipped', value: selected.skipped_tests, color: 'text-slate-400' },
                ].map(s => (
                  <div key={s.label} className="px-4 py-3 border-r border-slate-800 last:border-0 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-slate-500 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* AI Release Note */}
              <div className="px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-amber-500/20 rounded flex items-center justify-center">
                    <FileText className="w-3 h-3 text-amber-400" />
                  </div>
                  <h4 className="text-white font-medium text-xs">AI-Generated Release Note</h4>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {selected.ai_release_note}
                </div>
              </div>

              {/* Test results */}
              <div className="px-5 py-4">
                <button
                  onClick={() => setExpandedTests(expandedTests === selected.id ? null : selected.id)}
                  className="flex items-center gap-2 text-white font-medium text-xs mb-3 hover:text-slate-300 transition-colors"
                >
                  {expandedTests === selected.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Test Results ({(selected.test_results as TestCase[]).length})
                </button>
                {expandedTests === selected.id && (
                  <div className="space-y-1.5">
                    {(selected.test_results as TestCase[]).map((test, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${
                          test.status === 'passed' ? 'bg-emerald-500/10' :
                          test.status === 'failed' ? 'bg-red-500/10' :
                          'bg-slate-800/50'
                        }`}
                      >
                        {test.status === 'passed' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> :
                         test.status === 'failed' ? <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" /> :
                         <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs">{test.name}</p>
                          {test.error && <p className="text-red-400 text-xs mt-0.5 font-mono">{test.error}</p>}
                        </div>
                        <span className="text-slate-500 text-xs flex-shrink-0">{test.duration_ms}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
