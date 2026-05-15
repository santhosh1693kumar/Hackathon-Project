import { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { Plane, Shield, Zap, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('support_agent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoUsers = [
    { email: 'agent@skyair.com', password: 'Demo1234!', label: 'Support Agent', role: 'support_agent' },
    { email: 'ops@skyair.com', password: 'Demo1234!', label: 'Ops Manager', role: 'ops_manager' },
    { email: 'dev@skyair.com', password: 'Demo1234!', label: 'FE Engineer', role: 'fe_engineer' },
    { email: 'qa@skyair.com', password: 'Demo1234!', label: 'QA Engineer', role: 'qa_engineer' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'login') {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    } else {
      const { error: err } = await signUp(email, password, fullName, role);
      if (err) setError(err);
      else setMode('login');
    }
    setLoading(false);
  }

  async function handleDemoLogin(demo: typeof demoUsers[0]) {
    setLoading(true);
    setError('');
    const { error: signUpErr } = await signUp(demo.email, demo.password, demo.label + ' Demo', demo.role);
    if (signUpErr && !signUpErr.includes('already')) {
      setError(signUpErr);
      setLoading(false);
      return;
    }
    const { error: err } = await signIn(demo.email, demo.password);
    if (err) setError(err);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-xl">SkyAir AI Platform</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Airline Operations<br />
            <span className="text-sky-400">Powered by AI</span>
          </h1>
          <p className="text-slate-400 text-lg mb-10">
            Intelligent baggage policy search, accessibility compliance, and automated test reporting — all in one enterprise platform.
          </p>
          <div className="space-y-4">
            {[
              { icon: BookOpen, title: 'IATA Policy Assistant', desc: 'Instant answers from official IATA baggage standards' },
              { icon: Shield, title: 'Accessibility Checker', desc: 'WCAG 2.1 AA compliance review for UI components' },
              { icon: Zap, title: 'Test Report Generator', desc: 'AI-generated release notes from automated test runs' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-sky-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{title}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-sm">© 2026 SkyAir AI Platform. Built with IATA Standards.</p>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">SkyAir AI Platform</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            {mode === 'login' ? 'Sign in to your SkyAir workspace' : 'Join the SkyAir operations team'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                  >
                    <option value="support_agent">Customer Support Agent</option>
                    <option value="ops_manager">Operations Manager</option>
                    <option value="fe_engineer">Front-End Engineer</option>
                    <option value="qa_engineer">QA Engineer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="you@skyair.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
            </button>
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-slate-900 text-slate-500">Quick demo access</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {demoUsers.map(demo => (
                <button
                  key={demo.email}
                  onClick={() => handleDemoLogin(demo)}
                  disabled={loading}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 hover:text-white transition-colors text-left disabled:opacity-50"
                >
                  <div className="font-medium">{demo.label}</div>
                  <div className="text-slate-500 text-xs truncate">{demo.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
