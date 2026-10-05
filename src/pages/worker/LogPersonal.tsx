import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { Project, TimeLog, WorkType } from '../../types';
import { Clock, Plus, Save, X, Calendar, CheckCircle, Clock3 } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { calculatePortugueseTaxes } from '../../lib/taxes';

export function LogPersonal() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    hours: 8,
    workType: '',
    hasDailyAllowance: false,
    notes: ''
  });

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    
    // Fetch active projects
    const pQuery = query(collection(db, 'projects'), where('status', '==', 'active'));
    const pSnap = await getDocs(pQuery);
    setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));

    
    const wQuery = query(collection(db, 'work_types'), where('active', '==', true));
    const wSnap = await getDocs(wQuery);
    setWorkTypes(wSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkType)));

    // Fetch personal logs
    const lQuery = query(collection(db, 'timeLogs'), where('workerId', '==', profile.uid));
    const lSnap = await getDocs(lQuery);
    const sortedLogs = lSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as TimeLog))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setLogs(sortedLogs);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'timeLogs'), {
        ...formData,
        workerId: profile.uid,
        status: 'pending',
        hasDailyAllowance: formData.hasDailyAllowance,
        dailyRateApplied: formData.hasDailyAllowance ? (profile.dailyRate || 0) : 0,
        projectId: profile.assignedProjectId || formData.projectId,
        submittedBy: profile.uid,
        photos: [],
        createdAt: serverTimestamp()
      });
      setShowForm(false);
      setFormData({ ...formData, hours: 8, workType: '', notes: '', hasDailyAllowance: false });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar horas.");
    } finally {
      setSaving(false);
    }
  };

  const totalHours = logs.reduce((acc, log) => acc + Number(log.hours), 0);

  
  const currentMonthLogs = logs.filter(l => new Date(l.date).getMonth() === new Date().getMonth());
  const currentMonthGross = currentMonthLogs.reduce((acc, log) => {
    return acc + (log.hours * (profile?.hourlyRate || 0)) + (log.hasDailyAllowance ? (log.dailyRateApplied || 0) : 0);
  }, 0);
  
  const taxInfo = calculatePortugueseTaxes(currentMonthGross);

  return (
    <div className="space-y-6">
      <div className="bg-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <h3 className="font-bold text-slate-400 mb-1 uppercase tracking-widest text-xs">Estimativa Salarial (Mês Atual)</h3>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
          <div>
            <p className="text-4xl md:text-5xl font-black text-white">€ {taxInfo.net.toFixed(2)}</p>
            <p className="text-slate-300 text-sm mt-1 font-medium">Líquido a receber estimado</p>
          </div>
          <div className="flex gap-4 text-sm bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <p className="text-slate-400 text-xs font-semibold">Bruto</p>
              <p className="font-bold text-white">€ {taxInfo.gross.toFixed(2)}</p>
            </div>
            <div className="w-px bg-slate-800"></div>
            <div>
              <p className="text-slate-400 text-xs font-semibold">IRS ({taxInfo.irsRate.toFixed(1)}%)</p>
              <p className="font-bold text-rose-300">- € {taxInfo.irsValue.toFixed(2)}</p>
            </div>
            <div className="w-px bg-slate-800"></div>
            <div>
              <p className="text-slate-400 text-xs font-semibold">SS ({taxInfo.ssRate.toFixed(1)}%)</p>
              <p className="font-bold text-rose-300">- € {taxInfo.ssValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Minhas Horas</h2>
          <p className="text-sm text-slate-500">Total acumulado: {totalHours} horas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Registrar Trabalho
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-100/90 p-6 rounded-3xl border border-slate-300 shadow-sm flex flex-col mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900">Lançamento de Horas</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!profile?.assignedProjectId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Obra / Projeto (Manual)</label>
                <select required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                  <option value="">Selecione a obra...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Horas</label>
              <input type="number" step="0.5" min="0.5" max="24" required value={formData.hours} onChange={e => setFormData({...formData, hours: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Trabalho</label>
              <select required value={formData.workType} onChange={e => setFormData({...formData, workType: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                  <option value="">Selecione o tipo...</option>
                  {workTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-center mt-6">
              <input type="checkbox" id="diaria" checked={formData.hasDailyAllowance} onChange={e => setFormData({...formData, hasDailyAllowance: e.target.checked})} className="w-5 h-5 text-slate-900 rounded border-gray-300 focus:ring-slate-900" />
              <label htmlFor="diaria" className="ml-2 text-sm font-medium text-gray-700">Receber Diária (€ {profile?.dailyRate?.toFixed(2) || '0.00'})</label>
            </div>

            <div className="md:col-span-2">

              <label className="block text-sm font-medium text-gray-700 mb-1">Observações (Opcional)</label>
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white"></textarea>
            </div>

            <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-slate-300 bg-white rounded-xl hover:bg-slate-200 font-bold text-slate-700">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 disabled:opacity-50">
                <Save className="w-5 h-5" />
                {saving ? 'Registrando...' : 'Registrar Horas'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Histórico de Registros</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
                <th className="p-4">Data</th>
                <th className="p-4">Obra</th>
                <th className="p-4">Trabalho</th>
                <th className="p-4">Horas</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando registros...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum registro de horas encontrado.</td></tr>
            ) : (
              logs.map(log => {
                const project = projects.find(p => p.id === log.projectId);
                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{format(new Date(log.date), 'dd/MM/yyyy')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-800 font-medium">{project?.name || 'Obra Desconhecida'}</td>
                    <td className="p-4">
                      <p className="text-slate-800">{log.workType}</p>
                      {log.notes && <p className="text-xs text-slate-500 truncate max-w-[200px]">{log.notes}</p>}
                    </td>
                    <td className="p-4 text-slate-800 font-bold">
                      {log.hours}h
                    </td>
                    <td className="p-4">
                      {log.status === 'approved' ? (
                        <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-1 rounded-full w-max text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Aprovado
                        </div>
                      ) : log.status === 'rejected' ? (
                        <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-1 rounded-full w-max text-sm font-medium">
                          <X className="w-4 h-4" />
                          Rejeitado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full w-max text-sm font-medium">
                          <Clock3 className="w-4 h-4" />
                          Pendente
                        </div>
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
