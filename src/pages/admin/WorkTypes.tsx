import React, { useState, useEffect } from 'react';
import { 
  collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { WorkType } from '../../types';
import { Briefcase, Plus, Save, X, Trash2, Edit2, CheckCircle2, Sparkles, Search } from 'lucide-react';

const COMMON_SUGGESTIONS = [
  { name: 'Pedreiro', description: 'Alvenaria, assentamento de tijolos, reboco e estrutura' },
  { name: 'Eletricista', description: 'Instalações elétricas, quadros de distribuição e cablagens' },
  { name: 'Canalizador / Picheleiro', description: 'Tubagens de água, saneamento e redes de esgoto' },
  { name: 'Carpinteiro / Marceneiro', description: 'Cofragens, portas, soalhos e estruturas em madeira' },
  { name: 'Pintor', description: 'Pintura interior, exterior e preparação de superfícies' },
  { name: 'Plaquista / Gesseiro', description: 'Placas de gesso cartonado (pladur) e tetos falsos' },
  { name: 'Serralheiro', description: 'Caixilharias, estruturas metálicas e portões' },
  { name: 'Servente / Ajudante', description: 'Apoio geral de carga, limpeza e preparação de materiais' }
];

export function WorkTypes() {
  const [types, setTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', active: true });

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'work_types')));
      setTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkType)));
    } catch (err) {
      console.error("Erro ao carregar tipos de trabalho:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchTypes(); 
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', active: true });
    setShowForm(true);
  };

  const handleOpenEdit = (t: WorkType) => {
    setEditingId(t.id);
    setFormData({ name: t.name, description: t.description || '', active: t.active ?? true });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'work_types', editingId), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          active: formData.active
        });
      } else {
        await addDoc(collection(db, 'work_types'), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          active: formData.active
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', active: true });
      fetchTypes();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar tipo de trabalho.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir o tipo de trabalho "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'work_types', id));
      fetchTypes();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir tipo de trabalho.');
    }
  };

  const handleQuickAdd = async (sug: { name: string; description: string }) => {
    if (types.some(t => t.name.toLowerCase() === sug.name.toLowerCase())) {
      alert(`O tipo "${sug.name}" já está cadastrado.`);
      return;
    }
    try {
      await addDoc(collection(db, 'work_types'), {
        name: sug.name,
        description: sug.description,
        active: true
      });
      fetchTypes();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTypes = types.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tipos de Trabalho</h2>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
              {types.length} cadastrados
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre os serviços e especialidades que sua empresa realiza. Estes trabalhos poderão ser selecionados na criação de cada obra.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Tipo de Trabalho</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">
            🔨
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Integração com o Módulo de Obras</h4>
            <p className="text-xs text-slate-300">
              Ao criar ou editar uma obra, você poderá selecionar exatamente quais destes trabalhos estão disponíveis nela.
            </p>
          </div>
        </div>
      </div>

      {/* FORM MODAL / COLLAPSIBLE */}
      {showForm && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col animate-in fade-in duration-150">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {editingId ? 'Editar Tipo de Trabalho' : 'Cadastrar Novo Tipo de Trabalho'}
              </h3>
            </div>
            <button 
              onClick={() => setShowForm(false)} 
              className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nome da Função / Trabalho *
              </label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold bg-white text-slate-900" 
                placeholder="Ex: Pedreiro, Eletricista, Pintor..." 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Descrição da Atividade
              </label>
              <input 
                type="text" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white text-slate-900" 
                placeholder="Breve resumo das atividades desempenhadas..." 
              />
            </div>

            <div className="flex items-center gap-2 pt-1 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 accent-slate-900"
                />
                <span>Ativo (disponível para novas obras e apontamentos)</span>
              </label>
            </div>
            
            <div className="md:col-span-2 pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-5 py-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 font-bold text-sm text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-md shadow-slate-900/10 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Tipo'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Suggestions (if less than 5 types or for convenience) */}
      {types.length < 8 && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sugestões Rápidas de Especialidades para Adicionar:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMMON_SUGGESTIONS.filter(s => !types.some(t => t.name.toLowerCase() === s.name.toLowerCase())).map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickAdd(sug)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>{sug.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tipo de trabalho..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Mostrando {filteredTypes.length} de {types.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
                <th className="p-4 pl-6">Nome da Função</th>
                <th className="p-4">Descrição das Atividades</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-900 border-t-transparent mb-2"></div>
                    <p className="text-xs font-semibold">Carregando tipos de trabalho...</p>
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-bold text-slate-700">Nenhum tipo de trabalho encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Tente outro termo na busca.' : 'Cadastre ou utilize as sugestões acima para adicionar.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTypes.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          🔨
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{t.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm max-w-md">
                      {t.description || <span className="text-slate-300 italic text-xs">Sem descrição</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.active !== false 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {t.active !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(t)} 
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar Tipo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id, t.name)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Tipo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
