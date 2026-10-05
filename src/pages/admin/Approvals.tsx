import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TimeLog, Project } from '../../types';
import { UserProfile } from '../../lib/auth';
import { Check, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export function Approvals() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [lSnap, pSnap, wSnap] = await Promise.all([
      getDocs(query(collection(db, 'timeLogs'))),
      getDocs(query(collection(db, 'projects'))),
      getDocs(query(collection(db, 'users')))
    ]);
    
    // Sort logs descending by date
    const sortedLogs = lSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as TimeLog))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    setLogs(sortedLogs);
    setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    setWorkers(wSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (logId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'timeLogs', logId), { status });
      setLogs(logs.map(log => log.id === logId ? { ...log, status } : log));
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar status.");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório Mensal de Horas Trabalhadas', 14, 20);
    
    let y = 30;
    logs.filter(l => l.status === 'approved').forEach((log, index) => {
      const worker = workers.find(w => w.uid === log.workerId);
      const project = projects.find(p => p.id === log.projectId);
      const text = `${format(new Date(log.date), 'dd/MM/yyyy')} | ${worker?.name || 'Unknown'} | ${project?.name} | ${log.hours}h - €${((worker?.hourlyRate || 0) * log.hours).toFixed(2)}`;
      doc.text(text, 14, y);
      y += 10;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    
    doc.save('relatorio_horas.pdf');
  };

  const exportExcel = () => {
    const data = logs.filter(l => l.status === 'approved').map(log => {
      const worker = workers.find(w => w.uid === log.workerId);
      const project = projects.find(p => p.id === log.projectId);
      return {
        Data: format(new Date(log.date), 'dd/MM/yyyy'),
        Funcionario: worker?.name || 'Desconhecido',
        Obra: project?.name || 'Desconhecida',
        Tarefa: log.workType,
        Horas: log.hours,
        ValorHora: worker?.hourlyRate || 0,
        Total: (worker?.hourlyRate || 0) * log.hours
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Horas Aprovadas");
    XLSX.writeFile(wb, "relatorio_horas.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Relatórios Mensais & Folha</h2>
          <p className="text-sm text-slate-500">Aprove as horas registradas para contabilizar no fechamento.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportPDF} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 transition-colors text-sm">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
          <button onClick={exportExcel} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-800/10 transition-colors text-sm border border-slate-700">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-900 flex justify-between items-center">
          <h3 className="font-black text-white uppercase text-xs tracking-widest">Aprovações Pendentes & Histórico</h3>
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">
            Folha e Horas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
                <th className="p-4">Data / Obra</th>
                <th className="p-4">Funcionário</th>
                <th className="p-4">Registro</th>
                <th className="p-4 text-right">Valor a Pagar</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
            ) : (
              logs.map(log => {
                const worker = workers.find(w => w.uid === log.workerId);
                const project = projects.find(p => p.id === log.projectId);
                const totalPagar = (worker?.hourlyRate || 0) * log.hours;
                
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{format(new Date(log.date), 'dd/MM/yyyy')}</p>
                      <p className="text-sm text-gray-500">{project?.name || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-800">{worker?.name || 'Desconhecido'}</p>
                      <p className="text-xs text-gray-500">€{worker?.hourlyRate?.toFixed(2)}/h</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-800 font-medium">{log.hours}h - {log.workType}</p>
                      {log.photos && log.photos.length > 0 && (
                        <a href={log.photos[0]} target="_blank" rel="noreferrer" className="text-xs text-slate-800 font-bold hover:underline">Ver Foto Anexa</a>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-gray-900">€ {totalPagar.toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-center">
                      {log.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleUpdateStatus(log.id, 'approved')} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors">
                            Validar
                          </button>
                          <button onClick={() => handleUpdateStatus(log.id, 'rejected')} className="bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                            Recusar
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${log.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
