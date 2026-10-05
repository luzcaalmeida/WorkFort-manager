import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { Project, MaterialLog } from '../../types';
import { Save, Package } from 'lucide-react';
import { format } from 'date-fns';

export function Validate() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<MaterialLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    name: '',
    quantity: 1,
    unit: 'unidade'
  });

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    
    // Fetch projects where manager is assigned
    const pQuery = query(collection(db, 'projects'), where('managerId', '==', profile.uid));
    const pSnap = await getDocs(pQuery);
    setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));

    // Fetch materials logged by this manager
    const mQuery = query(collection(db, 'materials'), where('loggedBy', '==', profile.uid));
    const mSnap = await getDocs(mQuery);
    setMaterials(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaterialLog)));
    
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
      await addDoc(collection(db, 'materials'), {
        ...formData,
        loggedBy: profile.uid,
        createdAt: serverTimestamp()
      });
      alert('Insumo registrado com sucesso.');
      setFormData({ ...formData, name: '', quantity: 1, unit: 'unidade' });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar insumo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gerenciar Insumos e Tarefas</h2>
        <p className="text-sm text-slate-500">Registre a utilização de materiais na obra.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-900">
          <Package className="w-6 h-6 text-slate-700" />
          Registrar Novo Insumo
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Obra</label>
            <select required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white">
              <option value="">Selecione...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Material / Insumo</label>
            <input type="text" placeholder="Ex: Cimento, Tijolos..." required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white" />
          </div>

          <div className="md:col-span-1 flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
              <input type="number" step="0.1" min="0.1" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
              <select required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                <option value="unidade">Un</option>
                <option value="kg">Kg</option>
                <option value="litro">L</option>
                <option value="saco">Saco</option>
                <option value="m2">m²</option>
                <option value="m3">m³</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-4 pt-4 flex justify-end border-t border-slate-200">
            <button type="submit" disabled={saving || !formData.projectId} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 disabled:opacity-50 transition-colors">
              <Save className="w-5 h-5" />
              {saving ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-6 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Histórico de Insumos Registrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
                <th className="p-4">Material</th>
                <th className="p-4">Obra</th>
                <th className="p-4">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {materials.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nenhum insumo registrado.</td></tr>
            ) : (
              materials.map(m => {
                const project = projects.find(p => p.id === m.projectId);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">{m.name}</td>
                    <td className="p-4 text-slate-600 font-medium">{project?.name || 'Desconhecida'}</td>
                    <td className="p-4 text-slate-800 font-bold">{m.quantity} {m.unit}</td>
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
