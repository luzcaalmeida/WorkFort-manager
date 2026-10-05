import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { WorkType } from '../../types';
import { Briefcase, Plus, Save, X, Trash2 } from 'lucide-react';

export function WorkTypes() {
  const [types, setTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', active: true });

  const fetchTypes = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'work_types')));
    setTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkType)));
    setLoading(false);
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'work_types'), formData);
      setShowForm(false);
      setFormData({ name: '', description: '', active: true });
      fetchTypes();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar tipo de trabalho.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este tipo de trabalho?')) return;
    try {
      await deleteDoc(doc(db, 'work_types', id));
      fetchTypes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tipos de Trabalho</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Tipo</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-100/80 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900">Cadastrar Tipo de Trabalho</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Nome *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm font-semibold bg-white" placeholder="Ex: Pedreiro, Eletricista..." />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Descrição</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white" placeholder="Breve descrição da função..." />
            </div>
            
            <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-slate-300 bg-white rounded-xl hover:bg-slate-50 font-bold text-sm text-slate-700">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-md shadow-slate-900/10 disabled:opacity-50">
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Tipo'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
              <th className="p-4">Nome</th>
              <th className="p-4">Descrição</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">Carregando...</td></tr>
            ) : types.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nenhum tipo cadastrado.</td></tr>
            ) : (
              types.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{t.name}</td>
                  <td className="p-4 text-slate-600">{t.description}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
