import React from 'react';
import { Outlet, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Home, Users, Briefcase, Clock, FileText, Shield } from 'lucide-react';
import clsx from 'clsx';

export function Layout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-800 border-t-transparent"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: Home, to: '/', roles: ['admin', 'chefe', 'funcionario'] },
    { label: 'Funcionários', icon: Users, to: '/admin/users', roles: ['admin'] },
    { label: 'Tipos de Trabalho', icon: Briefcase, to: '/admin/work-types', roles: ['admin'] },
    { label: 'Obras', icon: Briefcase, to: '/obras', roles: ['admin', 'chefe'] },
    { label: 'Aprovar Horas', icon: FileText, to: '/admin/approvals', roles: ['admin'] },
    { label: 'Relatórios', icon: FileText, to: '/admin/reports', roles: ['admin'] },
    
    { label: 'Registrar Horas (Equipe)', icon: Clock, to: '/chefe/log-team', roles: ['chefe'] },
    { label: 'Validar Tarefas', icon: FileText, to: '/chefe/validate', roles: ['chefe'] },
    
    { label: 'Minhas Horas', icon: Clock, to: '/worker/log', roles: ['funcionario'] },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col md:flex-row">
      {/* Dark Executive Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0">
        <div className="p-6 md:p-7 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-lg shadow-sm">
              🏗️
            </div>
            <div>
              <h1 className="text-white text-xl font-black tracking-tight leading-none flex items-center gap-1.5">
                <span>WorkFort</span>
                <span className="text-[11px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded tracking-wider">
                  Manager
                </span>
              </h1>
              <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-wider">
                Gestão de Obras & Equipes
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(profile.role)).map(item => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold",
                  isActive
                    ? "bg-slate-800 text-white shadow-xs border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent"
                )}
              >
                <item.icon className={clsx("w-4 h-4", isActive ? "text-amber-400" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/70 bg-slate-900/60 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center text-slate-200 font-bold uppercase text-xs shadow-xs">
              {profile.name.substring(0, 2)}
            </div>
            <div className="text-xs text-white font-bold leading-tight truncate">
              <span className="truncate block">{profile.name}</span>
              <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider">
                {profile.role === 'admin' ? 'Administrador' : profile.role === 'chefe' ? 'Chefe de Obra' : 'Funcionário'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/40 transition-colors"
          >
            <LogOut className="w-4 h-4 opacity-70" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
