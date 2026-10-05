import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, UserProfile } from '../../lib/auth';
import { Project, TimeLog, WorkType } from '../../types';
import { Save, Camera, Users } from 'lucide-react';

export function LogTeam() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    hours: 8,
    workType: '',
    hasDailyAllowance: false,
    notes: ''
  });

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    
    // Fetch projects where manager is assigned
    const pQuery = query(collection(db, 'projects'), where('managerId', '==', profile.uid));
    const pSnap = await getDocs(pQuery);
    setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));

    
    const wTypeQuery = query(collection(db, 'work_types'), where('active', '==', true));
    const wTypeSnap = await getDocs(wTypeQuery);
    setWorkTypes(wTypeSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkType)));

    // Fetch all workers to assign hours
    const wQuery = query(collection(db, 'users'), where('role', '==', 'funcionario'));
    const wSnap = await getDocs(wQuery);
    setWorkers(wSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    
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
      
      const selectedWorker = workers.find(w => w.uid === formData.workerId);
      await addDoc(collection(db, 'timeLogs'), {
        ...formData,
        hasDailyAllowance: formData.hasDailyAllowance,
        dailyRateApplied: formData.hasDailyAllowance ? (selectedWorker?.dailyRate || 0) : 0,
        status: 'pending',
 // Admins must approve
        submittedBy: profile.uid,
        photos: ['https://placehold.co/600x400?text=Foto+Obra'], // Simulated photo upload
        createdAt: serverTimestamp()
      });
      alert('Horas e fotografia enviadas para aprovação do Administrador.');
      setFormData({ ...formData, hours: 8, workType: '', notes: '', hasDailyAllowance: false });
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar horas.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Lançamento da Equipe</h2>
        <p className="text-sm text-slate-500">Envie o registro de horas e fotos diárias para a administração.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Obra / Projeto</label>
            <select required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white">
              <option value="">Selecione sua obra...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <select required value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})} className="w-full pl-10 pr-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                <option value="">Selecione o trabalhador...</option>
                {workers.map(w => (
                  <option key={w.uid} value={w.uid}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Trabalho</label>
            <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horas Trabalhadas</label>
            <input type="number" step="0.5" min="0.5" max="24" required value={formData.hours} onChange={e => setFormData({...formData, hours: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white" />
          </div>

          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Trabalho / Tarefa</label>
            <select required value={formData.workType} onChange={e => setFormData({...formData, workType: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                <option value="">Selecione o tipo...</option>
                {workTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          
          <div className="md:col-span-2 flex items-center">
            <input type="checkbox" id="diaria_team" checked={formData.hasDailyAllowance} onChange={e => setFormData({...formData, hasDailyAllowance: e.target.checked})} className="w-5 h-5 text-slate-900 rounded border-gray-300 focus:ring-slate-900" />
            <label htmlFor="diaria_team" className="ml-2 text-sm font-medium text-gray-700">Adicionar Diária ao Funcionário Selecionado</label>
          </div>

          <div className="md:col-span-2">

            <label className="block text-sm font-medium text-gray-700 mb-1">Fotografia do Trabalho (Obrigatório)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
              <Camera className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">Clique para tirar ou enviar foto (Simulado)</p>
            </div>
          </div>

          <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-slate-200">
            <button type="submit" disabled={saving || !formData.projectId || !formData.workerId} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md shadow-slate-900/10 disabled:opacity-50 transition-colors">
              <Save className="w-5 h-5" />
              {saving ? 'Enviando...' : 'Enviar para Administração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
