import { useState } from 'react';
import { useAuth } from './AuthContext';
import {
  Plane, LayoutDashboard, MessageSquare, Shield, FileText,
  ClipboardList, LogOut, Menu, X, ChevronRight, Bell
} from 'lucide-react';
import type { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['support_agent', 'ops_manager', 'fe_engineer', 'qa_engineer', 'admin'] },
  { id: 'baggage-assistant', label: 'Baggage Policy AI', icon: MessageSquare, roles: ['support_agent', 'ops_manager', 'admin'] },
  { id: 'accessibility', label: 'Accessibility Checker', icon: Shield, roles: ['fe_engineer', 'admin'] },
  { id: 'test-reports', label: 'Test Reports', icon: FileText, roles: ['qa_engineer', 'fe_engineer', 'admin'] },
  { id: 'audit-log', label: 'Audit Log', icon: ClipboardList, roles: ['ops_manager', 'admin'] },
];

const roleLabels: Record<UserRole, string> = {
  support_agent: 'Support Agent',
  ops_manager: 'Ops Manager',
  fe_engineer: 'FE Engineer',
  qa_engineer: 'QA Engineer',
  admin: 'Administrator',
};

const roleBadgeColors: Record<UserRole, string> = {
  support_agent: 'bg-sky-500/20 text-sky-400',
  ops_manager: 'bg-amber-500/20 text-amber-400',
  fe_engineer: 'bg-emerald-500/20 text-emerald-400',
  qa_engineer: 'bg-violet-500/20 text-violet-400',
  admin: 'bg-red-500/20 text-red-400',
};

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = navItems.filter(item => !user || item.roles.includes(user.role));

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Plane className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">SkyAir AI</p>
          <p className="text-slate-500 text-xs truncate">Operations Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-sky-400" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 mb-2">
          <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{user?.avatar_initials || 'U'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{user?.full_name || 'User'}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColors[user?.role as UserRole] || 'bg-slate-500/20 text-slate-400'}`}>
              {roleLabels[user?.role as UserRole] || user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-sm capitalize truncate">
              {navItems.find(n => n.id === currentPage)?.label || 'Dashboard'}
            </h1>
            <p className="text-slate-500 text-xs">{user?.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-sky-500 rounded-full" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 bg-sky-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user?.avatar_initials || 'U'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
