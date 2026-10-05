import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { TimeLog } from '../types';
import { Users, Briefcase, Clock, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    pendingApprovals: 0,
    totalHoursLogged: 0,
  });
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;
      
      if (profile.role === 'admin') {
        const uSnap = await getDocs(query(collection(db, 'users')));
        const pSnap = await getDocs(query(collection(db, 'projects')));
        const lSnap = await getDocs(query(collection(db, 'timeLogs'), where('status', '==', 'pending')));
        
        setStats({
          totalUsers: uSnap.size,
          totalProjects: pSnap.size,
          pendingApprovals: lSnap.size,
          totalHoursLogged: 0, // Unused for admin overview
        });
      } else if (profile.role === 'funcionario') {
        const lSnap = await getDocs(query(collection(db, 'timeLogs'), where('workerId', '==', profile.uid)));
        const hours = lSnap.docs.reduce((acc, doc) => acc + Number(doc.data().hours), 0);
        
        setStats(s => ({ ...s, totalHoursLogged: hours }));
      }
    };
    
    fetchStats();
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Painel de Monitoramento</h2>
        <p className="text-sm text-slate-500 font-medium">Olá, {profile.name}! Bem-vindo ao <strong className="text-slate-800 font-bold">WorkFort Manager</strong>.</p>
      </div>

      {profile.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={Users} label="Colaboradores Cadastrados" value={stats.totalUsers} color="dark" />
          <StatCard icon={Briefcase} label="Obras Ativas" value={stats.totalProjects} color="dark" />
          <StatCard icon={Clock} label="Horas Pendentes de Aprovação" value={stats.pendingApprovals} color="amber" />
        </div>
      )}

      {profile.role === 'funcionario' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard icon={CheckCircle} label="Total de Horas Registradas" value={stats.totalHoursLogged} color="emerald" />
        </div>
      )}
      
      {profile.role === 'chefe' && (
        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 flex flex-col justify-center items-center text-center shadow-lg text-white">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-2xl shadow-sm">
            🏗️
          </div>
          <h3 className="text-xl font-black text-white">Gestão de Equipe & Obras</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            Utilize o menu lateral para registrar horas de sua equipe, acompanhar alocações e validar apontamentos em tempo real.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  const colorMap: Record<string, string> = {
    dark: "text-slate-900",
    amber: "text-amber-600",
    emerald: "text-emerald-700",
  };
  
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="text-slate-400 text-xs font-black uppercase tracking-wider mb-2">{label}</div>
        <div className={`text-4xl font-black ${colorMap[color] || 'text-slate-900'}`}>{value}</div>
      </div>
      <div className="mt-5 flex items-center text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl w-fit">
        <Icon className="w-3.5 h-3.5 mr-1.5 opacity-70" /> Atualizado hoje
      </div>
    </div>
  );
}
