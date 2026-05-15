import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import { checkAccessibility } from '../lib/aiService';
import { logAudit } from '../lib/auditService';
import {
  Shield, AlertTriangle, CheckCircle, Info, Loader2,
  Plus, Code2, Eye, X, ExternalLink
} from 'lucide-react';
import type { AccessibilityCheck, AccessibilityIssue } from '../types';

const COMPONENT_TEMPLATES = {
  button: `<button style="background-color: #003399; color: #ffffff; padding: 12px 24px; border: none; border-radius: 4px; font-size: 14px;">
  Book Flight
</button>`,
  nav: `<nav>
  <ul>
    <li><a href="/flights" style="color: #0055cc;">Flights</a></li>
    <li><a href="/hotels" style="color: #0055cc;">Hotels</a></li>
    <li><a href="/baggage" style="color: #888888;">Baggage</a></li>
  </ul>
</nav>`,
  form: `<form>
  <div>
    <input type="text" placeholder="Enter destination" style="border: 1px solid #ccc; padding: 8px;" />
  </div>
  <div>
    <input type="date" style="border: 1px solid #ccc; padding: 8px;" />
  </div>
  <button type="submit" style="background: #ff6600; color: #fff; padding: 10px 20px;">Search</button>
</form>`,
};

const BRAND_COLORS_PRESET = {
  primary: '#003399',
  secondary: '#0055cc',
  accent: '#ff6600',
  background: '#ffffff',
  text: '#333333',
};

export default function AccessibilityChecker() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [componentType, setComponentType] = useState<AccessibilityCheck['component_type']>('button');
  const [htmlCode, setHtmlCode] = useState(COMPONENT_TEMPLATES.button);
  const [brandColors, setBrandColors] = useState(BRAND_COLORS_PRESET);
  const [checks, setChecks] = useState<AccessibilityCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AccessibilityCheck | null>(null);

  useEffect(() => { if (user) loadChecks(); }, [user]);

  async function loadChecks() {
    const { data } = await supabase
      .from('accessibility_checks')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setChecks((data || []).map(d => ({ ...d, issues_found: d.issues_found || [] })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!componentName.trim() || !htmlCode.trim()) return;
    setLoading(true);

    const { review, issues, score } = await checkAccessibility(htmlCode, componentName, brandColors);
    const status: AccessibilityCheck['status'] = score >= 80 ? 'passed' : score >= 60 ? 'needs_revision' : 'failed';

    const { data } = await supabase.from('accessibility_checks').insert({
      user_id: user!.id,
      user_name: user!.full_name,
      component_name: componentName,
      component_type: componentType,
      html_code: htmlCode,
      brand_colors: brandColors,
      ai_review: review,
      issues_found: issues,
      wcag_score: score,
      status,
      reviewed_at: new Date().toISOString(),
    }).select().maybeSingle();

    await logAudit(user, 'ACCESSIBILITY_CHECK_SUBMITTED', 'accessibility_check', data?.id, { component_name: componentName, score, status });
    setShowForm(false);
    setComponentName('');
    setHtmlCode(COMPONENT_TEMPLATES.button);
    await loadChecks();
    if (data) setSelected({ ...data, issues_found: data.issues_found || [] });
    setLoading(false);
  }

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';

  const scoreRing = (score: number) =>
    score >= 80 ? 'stroke-emerald-500' : score >= 60 ? 'stroke-amber-500' : 'stroke-red-500';

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      passed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      needs_revision: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      reviewing: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    };
    return map[status] || 'bg-slate-500/20 text-slate-400';
  };

  const issueIcon = (type: string) => {
    if (type === 'error') return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    if (type === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    return <Info className="w-3.5 h-3.5 text-sky-400" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Accessibility Checker</h2>
          <p className="text-slate-400 text-sm mt-0.5">AI-powered WCAG 2.1 AA compliance review for airline UI components</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Review
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-sky-900/30 border border-sky-800/40 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sky-300 text-sm font-medium">WCAG 2.1 AA Standards</p>
          <p className="text-sky-400/70 text-xs mt-0.5">
            This tool checks components against WCAG 2.1 AA guidelines including color contrast (4.5:1 ratio), ARIA attributes, keyboard navigation, and semantic HTML.{' '}
            <a href="https://webaim.org/articles/contrast/" target="_blank" rel="noopener noreferrer" className="underline hover:text-sky-300 inline-flex items-center gap-0.5">
              WebAIM Reference <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        {showForm && (
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">New Accessibility Review</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Component Name</label>
                  <input
                    type="text"
                    value={componentName}
                    onChange={e => setComponentName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="e.g. Book Flight Button"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Component Type</label>
                  <select
                    value={componentType}
                    onChange={e => {
                      const t = e.target.value as AccessibilityCheck['component_type'];
                      setComponentType(t);
                      if (t === 'button') setHtmlCode(COMPONENT_TEMPLATES.button);
                      else if (t === 'navigation') setHtmlCode(COMPONENT_TEMPLATES.nav);
                      else if (t === 'form') setHtmlCode(COMPONENT_TEMPLATES.form);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="button">Button</option>
                    <option value="menu">Menu</option>
                    <option value="form">Form</option>
                    <option value="navigation">Navigation</option>
                    <option value="modal">Modal</option>
                    <option value="table">Table</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <Code2 className="inline w-3.5 h-3.5 mr-1" /> HTML / Component Code
                </label>
                <textarea
                  value={htmlCode}
                  onChange={e => setHtmlCode(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-800 border border-slate-700 text-green-400 font-mono text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                  placeholder="Paste your HTML or component code here..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Brand Colors (for contrast check)</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(brandColors).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-slate-500 text-xs mb-1 capitalize">{key}</p>
                      <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5">
                        <div className="w-4 h-4 rounded border border-slate-600" style={{ backgroundColor: value }} />
                        <input
                          type="text"
                          value={value}
                          onChange={e => setBrandColors(prev => ({ ...prev, [key]: e.target.value }))}
                          className="flex-1 bg-transparent text-white text-xs focus:outline-none w-0 min-w-0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Shield className="w-4 h-4" /> Run AI Review</>}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Checks list */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm">Review History ({checks.length})</h3>
          {checks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-10 text-center">
              <Shield className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium mb-1">No reviews yet</p>
              <p className="text-slate-600 text-xs mb-4">Submit a component to get an AI-powered WCAG accessibility review</p>
              <button onClick={() => setShowForm(true)} className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
                Start first review →
              </button>
            </div>
          ) : (
            checks.map(check => (
              <button
                key={check.id}
                onClick={() => setSelected(check)}
                className={`w-full text-left bg-slate-900 border rounded-xl p-4 transition-all ${selected?.id === check.id ? 'border-emerald-500/40' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          className={scoreRing(check.wcag_score)}
                          strokeWidth="3"
                          strokeDasharray={`${(check.wcag_score / 100) * 94.2} 94.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor(check.wcag_score)}`}>
                        {check.wcag_score}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{check.component_name}</p>
                      <p className="text-slate-500 text-xs capitalize mb-1.5">{check.component_type}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${statusBadge(check.status)}`}>
                          {check.status === 'passed' ? <CheckCircle className="inline w-2.5 h-2.5 mr-0.5" /> : <AlertTriangle className="inline w-2.5 h-2.5 mr-0.5" />}
                          {check.status.replace('_', ' ')}
                        </span>
                        {check.issues_found?.length > 0 && (
                          <span className="text-xs text-slate-500">{check.issues_found.length} issue{check.issues_found.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm">{selected.component_name}</h3>
                <p className="text-slate-500 text-xs capitalize">{selected.component_type} · {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusBadge(selected.status)}`}>
                  {selected.status.replace('_', ' ')}
                </span>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {/* Score */}
              <div className="px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" className={scoreRing(selected.wcag_score)} strokeWidth="3" strokeDasharray={`${(selected.wcag_score / 100) * 94.2} 94.2`} strokeLinecap="round" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor(selected.wcag_score)}`}>{selected.wcag_score}</span>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${scoreColor(selected.wcag_score)}`}>
                      {selected.wcag_score >= 80 ? 'Passes WCAG 2.1 AA' : selected.wcag_score >= 60 ? 'Needs Revision' : 'Fails WCAG 2.1 AA'}
                    </p>
                    <p className="text-slate-400 text-xs">{selected.issues_found?.length || 0} issue(s) found</p>
                  </div>
                </div>
              </div>

              {/* Issues */}
              {selected.issues_found && selected.issues_found.length > 0 && (
                <div className="px-5 py-4 border-b border-slate-800">
                  <h4 className="text-white font-medium text-xs mb-3">Issues Found</h4>
                  <div className="space-y-2.5">
                    {(selected.issues_found as AccessibilityIssue[]).map((issue, i) => (
                      <div key={i} className={`rounded-lg p-3 border ${issue.type === 'error' ? 'bg-red-500/10 border-red-500/20' : issue.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-sky-500/10 border-sky-500/20'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {issueIcon(issue.type)}
                          <span className="text-white text-xs font-medium">{issue.wcag_criterion}</span>
                        </div>
                        <p className="text-slate-300 text-xs mb-1">{issue.description}</p>
                        <p className="text-slate-400 text-xs"><span className="text-emerald-400">Fix: </span>{issue.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Review */}
              <div className="px-5 py-4">
                <h4 className="text-white font-medium text-xs mb-3">AI Review Summary</h4>
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                  {selected.ai_review}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
