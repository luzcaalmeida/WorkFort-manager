import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TimeLog, Project } from '../../types';
import { UserProfile } from '../../lib/auth';
import { Search, MapPin, Briefcase, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function Reports() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const uSnap = await getDocs(query(collection(db, 'users')));
      setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      
      const pSnap = await getDocs(query(collection(db, 'projects')));
      setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));

      const lSnap = await getDocs(query(collection(db, 'work_logs'), where('status', '==', 'approved')));
      setLogs(lSnap.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog)));
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const uniqueCities = useMemo(() => {
    const cities = new Set(projects.map(p => p.location).filter(Boolean));
    return Array.from(cities);
  }, [projects]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const user = users.find(u => u.uid === log.userId);
      const project = projects.find(p => p.id === log.projectId);
      
      const matchesName = user?.name.toLowerCase().includes(searchName.toLowerCase());
      const matchesProject = selectedProjectId ? log.projectId === selectedProjectId : true;
      const matchesCity = selectedCity ? project?.location === selectedCity : true;

      return matchesName && matchesProject && matchesCity;
    });
  }, [logs, users, projects, searchName, selectedProjectId, selectedCity]);

  // Aggregate by User
  const aggregatedData = useMemo(() => {
    const data: Record<string, { user: UserProfile, totalHours: number, totalEarnings: number }> = {};
    
    filteredLogs.forEach(log => {
      const user = users.find(u => u.uid === log.userId);
      if (!user) return;
      
      if (!data[log.userId]) {
        data[log.userId] = { user, totalHours: 0, totalEarnings: 0 };
      }
      
      data[log.userId].totalHours += log.hours;
      data[log.userId].totalEarnings += (log.hours * (user.hourlyRate || 0));
    });

    return Object.values(data);
  }, [filteredLogs, users]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Horas Trabalhadas", 14, 15);
    (doc as any).autoTable({
      startY: 25,
      head: [['Colaborador', 'Horas Totais', 'Valor Total (€)']],
      body: aggregatedData.map(row => [
        row.user.name,
        row.totalHours.toFixed(1),
        `€ ${row.totalEarnings.toFixed(2)}`
      ]),
    });
    doc.save("relatorio_horas.pdf");
  };

  const exportExcel = () => {
    const wsData = aggregatedData.map(row => ({
      'Colaborador': row.user.name,
      'Horas Totais': row.totalHours,
      'Valor Total (€)': row.totalEarnings
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, "relatorio_horas.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Relatórios de Horas</h2>
        <div className="flex gap-3">
          <button onClick={exportPDF} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 transition-colors text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportExcel} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-800/10 transition-colors text-sm border border-slate-700">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pesquisar por colaborador..." 
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium"
            />
          </div>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <select 
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none appearance-none font-medium text-slate-700"
            >
              <option value="">Todas as obras</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <select 
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none appearance-none font-medium text-slate-700"
            >
              <option value="">Todas as cidades</option>
              {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
              <th className="p-4">Colaborador</th>
              <th className="p-4 text-center">Total de Horas</th>
              <th className="p-4 text-right">Total a Pagar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">Carregando dados...</td></tr>
            ) : aggregatedData.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nenhum registro encontrado para os filtros selecionados.</td></tr>
            ) : (
              aggregatedData.map(row => (
                <tr key={row.user.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{row.user.name}</p>
                    <p className="text-xs text-slate-500">{row.user.role.toUpperCase()}</p>
                  </td>
                  <td className="p-4 text-center text-slate-700 font-medium">
                    {row.totalHours.toFixed(1)}h
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-slate-800">€ {row.totalEarnings.toFixed(2)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
