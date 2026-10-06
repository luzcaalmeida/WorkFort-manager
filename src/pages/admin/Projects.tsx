import React, { useState, useEffect } from 'react';
import { 
  collection, query, getDocs, addDoc, doc, updateDoc, setDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, UserProfile } from '../../lib/auth';
import { Project, TimeLog, WorkType } from '../../types';
import { 
  Briefcase, Plus, Save, X, Users, Clock, CheckCircle2, AlertCircle, 
  MapPin, Check, ChevronDown, ChevronUp, UserCheck, Search, Filter, 
  ExternalLink, Calendar, ArrowRight, XCircle, RotateCcw, AlertTriangle,
  UserPlus, UserMinus, Edit, Settings, Hammer
} from 'lucide-react';
import clsx from 'clsx';
import { CityAutocomplete } from '../../components/CityAutocomplete';
import { format } from 'date-fns';

export function Projects() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'chefe';

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [workTypesList, setWorkTypesList] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');
  const [onlyMyProjects, setOnlyMyProjects] = useState(false);

  // Modal / Detail state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);

  // Quick link worker state inside modal
  const [selectedWorkerToAssign, setSelectedWorkerToAssign] = useState<string>('');
  const [assigningWorker, setAssigningWorker] = useState(false);

  // Form Data (New or Edit Project)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    managerId: '',
    status: 'active' as 'active' | 'completed' | 'on_hold',
    requiredWorkers: 0,
    availableWorkTypes: [] as string[]
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projSnap, usersSnap, logsSnap, workTypesSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'))),
        getDocs(query(collection(db, 'users'))),
        getDocs(query(collection(db, 'timeLogs'))),
        getDocs(query(collection(db, 'work_types')))
      ]);

      const loadedProjects = projSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      const loadedUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      const loadedLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog));
      const loadedWorkTypes = workTypesSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkType));

      setProjects(loadedProjects);
      setUsers(loadedUsers);
      setTimeLogs(loadedLogs);
      setWorkTypesList(loadedWorkTypes);

      // If a project is currently open in modal, keep its reference updated
      if (selectedProject) {
        const updatedSelected = loadedProjects.find(p => p.id === selectedProject.id);
        if (updatedSelected) {
          setSelectedProject(updatedSelected);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados de obras:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateForm = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      location: '',
      managerId: profile?.role === 'chefe' ? profile.uid : '',
      status: 'active',
      requiredWorkers: 0,
      availableWorkTypes: []
    });
    setShowCreateForm(true);
  };

  const handleOpenEditForm = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setFormData({
      name: proj.name,
      location: proj.location || '',
      managerId: proj.managerId || '',
      status: proj.status || 'active',
      requiredWorkers: proj.requiredWorkers || 0,
      availableWorkTypes: proj.availableWorkTypes || []
    });
    setShowCreateForm(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const projectPayload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        managerId: formData.managerId,
        status: formData.status,
        requiredWorkers: Math.max(0, Number(formData.requiredWorkers) || 0),
        availableWorkTypes: formData.availableWorkTypes || []
      };

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), projectPayload);
        setProjects(prev => prev.map(p => p.id === editingProject.id ? { 
          ...p, 
          ...projectPayload
        } : p));
        if (selectedProject && selectedProject.id === editingProject.id) {
          setSelectedProject(prev => prev ? {
            ...prev,
            ...projectPayload
          } : null);
        }
      } else {
        await addDoc(collection(db, 'projects'), {
          ...projectPayload,
          createdAt: new Date().toISOString()
        });
        fetchData();
      }
      setShowCreateForm(false);
      setEditingProject(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar obra.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: 'active' | 'completed' | 'on_hold') => {
    try {
      await updateDoc(doc(db, 'projects', projectId), { status: newStatus });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Erro ao atualizar status da obra:", error);
      alert("Erro ao atualizar status da obra.");
    }
  };

  // Vincular funcionário a esta obra
  const handleAssignWorker = async (workerUid: string, projectId: string) => {
    if (!workerUid) return;
    setAssigningWorker(true);
    try {
      await updateDoc(doc(db, 'users', workerUid), { assignedProjectId: projectId });
      setUsers(prev => prev.map(u => u.uid === workerUid ? { ...u, assignedProjectId: projectId } : u));
      setSelectedWorkerToAssign('');
      alert("Funcionário vinculado à obra com sucesso!");
    } catch (err: any) {
      console.error("Erro ao vincular funcionário à obra:", err);
      alert("Erro ao vincular funcionário: " + (err?.message || "Verifique permissões"));
    } finally {
      setAssigningWorker(false);
    }
  };

  // Desvincular funcionário desta obra
  const handleUnassignWorker = async (workerUid: string) => {
    if (!confirm("Tem certeza que deseja desvincular este colaborador desta obra?")) return;
    try {
      await updateDoc(doc(db, 'users', workerUid), { assignedProjectId: '' });
      setUsers(prev => prev.map(u => u.uid === workerUid ? { ...u, assignedProjectId: '' } : u));
      alert("Colaborador desvinculado com sucesso.");
    } catch (err: any) {
      console.error("Erro ao desvincular funcionário:", err);
      alert("Erro ao desvincular: " + (err?.message || "Verifique permissões"));
    }
  };

  const handleUpdateLogStatus = async (logId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    setUpdatingLogId(logId);
    try {
      await updateDoc(doc(db, 'timeLogs', logId), { status: newStatus });
      setTimeLogs(prev => prev.map(l => l.id === logId ? { ...l, status: newStatus } : l));
    } catch (error) {
      console.error("Erro ao atualizar status do registro:", error);
      alert("Erro ao validar registro de horas.");
    } finally {
      setUpdatingLogId(null);
    }
  };

  const handleApproveAllPending = async (projectId: string) => {
    const pendingLogs = timeLogs.filter(l => l.projectId === projectId && l.status === 'pending');
    if (pendingLogs.length === 0) {
      alert("Não há horas pendentes de validação nesta obra.");
      return;
    }

    if (!confirm(`Deseja aprovar e validar todas as ${pendingLogs.length} horas pendentes desta obra?`)) {
      return;
    }

    try {
      for (const log of pendingLogs) {
        await updateDoc(doc(db, 'timeLogs', log.id), { status: 'approved' });
      }
      setTimeLogs(prev => prev.map(l => l.projectId === projectId && l.status === 'pending' ? { ...l, status: 'approved' } : l));
      alert(`Todas as ${pendingLogs.length} pendências foram validadas com sucesso!`);
    } catch (error) {
      console.error("Erro ao aprovar em lote:", error);
      alert("Erro ao aprovar horas em lote.");
    }
  };

  // Managers list for creation/edit form
  const managers = users.filter(u => u.role === 'chefe' || u.role === 'admin');

  // Helper: Obter todos os funcionários vinculados a uma obra
  const getLinkedWorkers = (projectId: string): UserProfile[] => {
    // 1. Usuários que têm assignedProjectId apontando para a obra
    const directlyAssigned = users.filter(u => u.assignedProjectId === projectId);
    
    // 2. Usuários que registraram horas nesta obra (caso assignedProjectId não tenha sido preenchido)
    const workerIdsWithLogs = new Set(timeLogs.filter(l => l.projectId === projectId).map(l => l.workerId));
    const workersWithLogs = users.filter(u => workerIdsWithLogs.has(u.uid) && !directlyAssigned.some(da => da.uid === u.uid));

    return [...directlyAssigned, ...workersWithLogs];
  };

  // Helper: Obter controle de funcionários e capacidade da obra
  const getProjectStaffing = (project: Project) => {
    const directlyAssigned = users.filter(u => u.assignedProjectId === project.id);
    const required = project.requiredWorkers || 0;
    const assigned = directlyAssigned.length;
    const remaining = Math.max(0, required - assigned);
    const isFull = required > 0 && assigned >= required;
    const isOver = required > 0 && assigned > required;
    const percentage = required > 0 ? Math.min(100, Math.round((assigned / required) * 100)) : 0;

    return {
      required,
      assigned,
      remaining,
      isFull,
      isOver,
      percentage,
      directlyAssigned
    };
  };

  // Helper: Obter estatísticas globais de uma obra
  const getProjectStats = (projectId: string) => {
    const projLogs = timeLogs.filter(l => l.projectId === projectId);
    const totalHours = projLogs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const validatedHours = projLogs.filter(l => l.status === 'approved').reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const pendingHours = projLogs.filter(l => l.status === 'pending').reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const rejectedHours = projLogs.filter(l => l.status === 'rejected').reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const linkedWorkers = getLinkedWorkers(projectId);

    const validationPercentage = totalHours > 0 ? Math.round((validatedHours / totalHours) * 100) : 0;

    return {
      totalHours,
      validatedHours,
      pendingHours,
      rejectedHours,
      validationPercentage,
      workersCount: linkedWorkers.length
    };
  };

  // Helper: Obter horas feitas e validadas por um colaborador específico nesta obra
  const getWorkerStatsInProject = (workerId: string, projectId: string) => {
    const workerLogs = timeLogs.filter(l => l.projectId === projectId && l.workerId === workerId);
    const hoursMade = workerLogs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const hoursValidated = workerLogs.filter(l => l.status === 'approved').reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const hoursPending = workerLogs.filter(l => l.status === 'pending').reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const hoursRejected = workerLogs.filter(l => l.status === 'rejected').reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
    const totalDays = workerLogs.length;
    const dailyCount = workerLogs.filter(l => l.hasDailyAllowance).length;

    const validationPct = hoursMade > 0 ? Math.round((hoursValidated / hoursMade) * 100) : 0;

    const sortedLogs = [...workerLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      hoursMade,
      hoursValidated,
      hoursPending,
      hoursRejected,
      totalDays,
      dailyCount,
      validationPct,
      logs: sortedLogs
    };
  };

  // Filtragem de Obras
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesMyProjects = !onlyMyProjects || (profile && p.managerId === profile.uid);

    return matchesSearch && matchesStatus && matchesMyProjects;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Gestão de Obras</span>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-200">
              {projects.length} {projects.length === 1 ? 'obra' : 'obras'}
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Abra qualquer obra para vincular funcionários, visualizar horas feitas e validar lançamentos.
          </p>
        </div>

        {(isAdmin || isManager) && (
          <button
            onClick={handleOpenCreateForm}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Nova Obra</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome da obra ou cidade/localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isManager && (
            <button
              onClick={() => setOnlyMyProjects(!onlyMyProjects)}
              className={clsx(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5",
                onlyMyProjects
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Obras Sob Minha Responsabilidade</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
            >
              <option value="all">Todas as Obras</option>
              <option value="active">Ativas</option>
              <option value="on_hold">Em Espera</option>
              <option value="completed">Concluídas</option>
            </select>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT OBRA MODAL */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  🏗️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {editingProject ? 'Editar Obra' : 'Cadastrar Nova Obra'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingProject ? 'Atualize as informações cadastrais e responsável' : 'Defina o nome, localidade e o chefe responsável'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingProject(null);
                }} 
                className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nome da Obra *
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Residencial Porto Sul - Bloco B"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm font-semibold" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Localização / Cidade *
                </label>
                <CityAutocomplete 
                  value={formData.location} 
                  onChange={val => setFormData({...formData, location: val})} 
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" 
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Chefe de Obra Responsável *
                  </label>
                  <select 
                    required 
                    value={formData.managerId} 
                    onChange={e => setFormData({...formData, managerId: e.target.value})} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white font-medium"
                  >
                    <option value="">Selecione o chefe responsável...</option>
                    {managers.map(m => (
                      <option key={m.uid} value={m.uid}>
                        {m.name} ({m.role === 'admin' ? 'Administrador' : 'Chefe de Obra'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Status da Obra *
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white font-medium"
                  >
                    <option value="active">Ativa</option>
                    <option value="on_hold">Em Espera</option>
                    <option value="completed">Concluída</option>
                  </select>
                </div>
              </div>

              {/* CONTROLE DE FUNCIONÁRIOS REQUERIDOS */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Número de Funcionários Requeridos</span>
                  <span className="text-[10px] text-slate-500 font-semibold lowercase">Controle de Vagas</span>
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Ex: 5 (quantidade necessária)"
                    value={formData.requiredWorkers === 0 ? '' : formData.requiredWorkers} 
                    onChange={e => setFormData({...formData, requiredWorkers: Math.max(0, parseInt(e.target.value) || 0)})} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold text-slate-900 pr-10" 
                  />
                  <Users className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cada funcionário adicionado à obra diminuirá deste total solicitado para controlar as vagas restantes.
                </p>
              </div>

              {/* TIPOS DE TRABALHO DISPONÍVEIS NA OBRA */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tipos de Trabalho Disponíveis nesta Obra
                  </label>
                  {workTypesList.length > 0 && (
                    <span className="text-[11px] text-slate-600 font-bold">
                      {formData.availableWorkTypes.length} selecionado(s)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Selecione as especialidades e trabalhos cadastrados que estão disponíveis para execução nesta obra:
                </p>

                {workTypesList.length === 0 ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span>Nenhum tipo de trabalho cadastrado no sistema ainda.</span>
                    <a 
                      href="/admin/work-types" 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-bold text-slate-900 underline hover:text-slate-700 shrink-0"
                    >
                      Cadastrar em Tipos de Trabalho →
                    </a>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                      {workTypesList.map(wt => {
                        const isSelected = formData.availableWorkTypes.includes(wt.name);
                        return (
                          <button
                            key={wt.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormData({
                                  ...formData,
                                  availableWorkTypes: formData.availableWorkTypes.filter(name => name !== wt.name)
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  availableWorkTypes: [...formData.availableWorkTypes, wt.name]
                                });
                              }
                            }}
                            className={clsx(
                              "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none",
                              isSelected
                                ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900"
                                : "bg-white text-slate-700 border border-slate-300 hover:border-slate-800 hover:bg-slate-100"
                            )}
                          >
                            <Check className={clsx("w-3.5 h-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                            <span>{wt.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2 flex justify-between items-center border-t border-slate-200 text-[11px]">
                      <span className="text-slate-400">
                        Clique para marcar os trabalhos da obra
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, availableWorkTypes: workTypesList.map(w => w.name) })}
                          className="text-slate-900 font-bold hover:underline"
                        >
                          Selecionar Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, availableWorkTypes: [] })}
                          className="text-slate-500 font-medium hover:underline"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingProject(null);
                  }} 
                  className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-sm text-slate-600"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-md shadow-slate-900/10 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : editingProject ? 'Salvar Alterações' : 'Cadastrar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECTS GRID */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-800 border-t-transparent mb-2"></div>
          <p className="text-sm font-medium">Carregando obras e equipes...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 shadow-sm">
          <Briefcase className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
          <p className="text-base font-bold text-slate-700">Nenhuma obra encontrada</p>
          <p className="text-sm text-slate-400 mt-1">Verifique os filtros de busca ou cadastre uma nova obra.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(p => {
            const manager = users.find(m => m.uid === p.managerId);
            const stats = getProjectStats(p.id);
            const isManagerOfThis = profile && p.managerId === profile.uid;

            return (
              <div 
                key={p.id} 
                onClick={() => {
                  setSelectedProject(p);
                  setExpandedWorkerId(null);
                }}
                className="bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-slate-800 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group select-none"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedProject(p);
                    setExpandedWorkerId(null);
                  }
                }}
              >
                <div className="p-6">
                  {/* Top tags */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform">
                      🏗️
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isManagerOfThis && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded-md border border-slate-800">
                          Sua Obra
                        </span>
                      )}
                      <span className={clsx(
                        "px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider",
                        p.status === 'active' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        p.status === 'completed' ? "bg-slate-100 text-slate-700 border border-slate-300" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      )}>
                        {p.status === 'active' ? 'Ativa' : p.status === 'completed' ? 'Concluída' : 'Em Espera'}
                      </span>
                      {(isAdmin || isManagerOfThis) && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditForm(p, e)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors ml-0.5"
                          title="Editar Obra"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Location */}
                  <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 mb-3.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{p.location || 'Localização não definida'}</span>
                  </div>

                  {/* CONTROLE DE FUNCIONÁRIOS REQUERIDOS / VAGAS RESTANTES */}
                  {(() => {
                    const staffing = getProjectStaffing(p);
                    return (
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 mb-3.5">
                        <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                          <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-800" />
                            Quadro de Funcionários
                          </span>
                          {staffing.required > 0 ? (
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md font-black uppercase text-[10px]",
                              staffing.remaining > 0 ? "bg-amber-100 text-amber-900 border border-amber-300" :
                              staffing.isOver ? "bg-rose-100 text-rose-900 border border-rose-300" :
                              "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            )}>
                              {staffing.remaining > 0 ? `Faltam ${staffing.remaining} vagas` :
                               staffing.isOver ? `+${staffing.assigned - staffing.required} excedente` :
                               'Equipe Completa'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[10px]">Sem meta</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Instalados: <strong className="text-slate-900">{staffing.assigned}</strong></span>
                          {staffing.required > 0 ? (
                            <span className="text-slate-500 text-[11px] font-semibold">
                              Solicitados: <strong>{staffing.required}</strong> ({staffing.remaining} restantes)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal">vinculados à obra</span>
                          )}
                        </div>

                        {staffing.required > 0 && (
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className={clsx(
                                "h-full rounded-full transition-all duration-300",
                                staffing.remaining === 0 ? "bg-emerald-600" :
                                staffing.isOver ? "bg-rose-600" : "bg-slate-900"
                              )}
                              style={{ width: `${Math.min(100, Math.round((staffing.assigned / staffing.required) * 100))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TRABALHOS DISPONÍVEIS NA OBRA */}
                  {p.availableWorkTypes && p.availableWorkTypes.length > 0 && (
                    <div className="mb-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-600" />
                        Trabalhos Disponíveis ({p.availableWorkTypes.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {p.availableWorkTypes.slice(0, 3).map((wtName, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-[10px] font-bold border border-slate-200">
                            🔨 {wtName}
                          </span>
                        ))}
                        {p.availableWorkTypes.length > 3 && (
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold">
                            +{p.availableWorkTypes.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick stats pills */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4 text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Equipe</span>
                      <span className="text-sm font-black text-slate-800 flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-700" />
                        {stats.workersCount}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Feitas</span>
                      <span className="text-sm font-black text-slate-800">
                        {stats.totalHours.toFixed(1)}h
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Validadas</span>
                      <span className="text-sm font-black text-emerald-600 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {stats.validatedHours.toFixed(1)}h
                      </span>
                    </div>
                  </div>

                  {/* Validation Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Progresso de Validação</span>
                      <span className={clsx(
                        stats.validationPercentage === 100 ? "text-emerald-600" : "text-slate-900"
                      )}>
                        {stats.validationPercentage}% validado
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          stats.validationPercentage === 100 ? "bg-emerald-500" : "bg-slate-900"
                        )}
                        style={{ width: `${stats.validationPercentage}%` }}
                      />
                    </div>
                    {stats.pendingHours > 0 && (
                      <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 pt-0.5">
                        <AlertCircle className="w-3 h-3" />
                        <span>{stats.pendingHours.toFixed(1)}h aguardando validação</span>
                      </p>
                    )}
                  </div>

                  {/* Responsible Manager */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Chefe:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[170px]">
                      {manager?.name || 'Não atribuído'}
                    </span>
                  </div>
                </div>

                {/* Footer indicator showing whole card is clickable */}
                <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-slate-900 group-hover:bg-slate-100 transition-colors">
                  <span>Abrir detalhes da obra & equipe</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform text-slate-700" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POP-UP MODAL: DETALHES COMPLETOS DA OBRA & FUNCIONÁRIOS VINCULADOS */}
      {selectedProject && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedProject(null)}
        >
          <div 
            className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl shadow-md shadow-slate-900/20">
                  🏗️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {selectedProject.name}
                    </h3>
                    <span className={clsx(
                      "px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider",
                      selectedProject.status === 'active' ? "bg-emerald-100 text-emerald-800" :
                      selectedProject.status === 'completed' ? "bg-slate-200 text-slate-800" :
                      "bg-amber-100 text-amber-800"
                    )}>
                      {selectedProject.status === 'active' ? 'Ativa' : selectedProject.status === 'completed' ? 'Concluída' : 'Em Espera'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-600" />
                      {selectedProject.location || 'Localização não informada'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                      Chefe Responsável: <strong className="text-slate-700">{users.find(u => u.uid === selectedProject.managerId)?.name || 'Não atribuído'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {(isAdmin || (profile && selectedProject.managerId === profile.uid)) && (
                  <button
                    onClick={() => handleOpenEditForm(selectedProject)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-700" />
                    <span>Editar Obra</span>
                  </button>
                )}

                {isAdmin && (
                  <select
                    value={selectedProject.status}
                    onChange={(e) => handleUpdateProjectStatus(selectedProject.id, e.target.value as any)}
                    className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="active">Marcar como Ativa</option>
                    <option value="on_hold">Marcar como Em Espera</option>
                    <option value="completed">Marcar como Concluída</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TRABALHOS DISPONÍVEIS NA OBRA (BANNER DO MODAL) */}
            <div className="px-6 py-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Briefcase className="w-3.5 h-3.5 text-slate-800" />
                Trabalhos Disponíveis nesta Obra:
              </span>
              {selectedProject.availableWorkTypes && selectedProject.availableWorkTypes.length > 0 ? (
                selectedProject.availableWorkTypes.map((wt, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1">
                    <span>🔨</span>
                    <span>{wt}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Nenhum tipo de trabalho selecionado ainda. (Clique em "Editar Obra" para selecionar)
                </span>
              )}
            </div>

            {/* KPI Summary Cards */}
            {(() => {
              const projectStats = getProjectStats(selectedProject.id);
              const linkedWorkers = getLinkedWorkers(selectedProject.id);
              const staffing = getProjectStaffing(selectedProject);

              return (
                <div className="p-6 bg-slate-50/60 border-b border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Controle de Equipe</span>
                        <Users className="w-4 h-4 text-slate-700" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{staffing.assigned}</span>
                        {staffing.required > 0 ? (
                          <span className="text-xs font-bold text-slate-400">/ {staffing.required} solicitados</span>
                        ) : (
                          <span className="text-xs text-slate-400">(sem meta)</span>
                        )}
                      </div>
                      <div className="mt-1">
                        {staffing.required > 0 ? (
                          staffing.remaining > 0 ? (
                            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Restam {staffing.remaining} vagas
                            </span>
                          ) : staffing.isOver ? (
                            <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              +{staffing.assigned - staffing.required} excedente
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ✓ Equipe completa
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">vinculados à obra</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Horas Feitas</span>
                        <Clock className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="text-2xl font-black text-slate-800">
                        {projectStats.totalHours.toFixed(1)}h
                      </div>
                      <span className="text-[11px] text-slate-400">apontamentos totais</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Horas Validadas</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-black text-emerald-600">
                        {projectStats.validatedHours.toFixed(1)}h
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        {projectStats.validationPercentage}% aprovado
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Pendentes</span>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className={clsx(
                        "text-2xl font-black",
                        projectStats.pendingHours > 0 ? "text-amber-600" : "text-slate-400"
                      )}>
                        {projectStats.pendingHours.toFixed(1)}h
                      </div>
                      <span className="text-[11px] text-slate-400">aguardando validação</span>
                    </div>
                  </div>

                  {/* Batch validation action */}
                  {projectStats.pendingHours > 0 && (isAdmin || isManager) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Existem <strong>{projectStats.pendingHours.toFixed(1)} horas</strong> aguardando validação nesta obra.
                        </span>
                      </div>
                      <button
                        onClick={() => handleApproveAllPending(selectedProject.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>Validar Todas as Horas Pendentes</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Body: List of Linked Workers & Direct Assignment Bar */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {/* SECTION: VINCULAR FUNCIONÁRIO A ESTA OBRA */}
              {(isAdmin || isManager) && (() => {
                const staffing = getProjectStaffing(selectedProject);
                return (
                  <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 text-slate-900">
                        <UserPlus className="w-4 h-4 text-slate-800" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          Vincular Funcionário à Obra "{selectedProject.name}"
                        </span>
                      </div>
                      {staffing.required > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500">
                            Vagas Restantes:
                          </span>
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-lg text-xs font-black",
                            staffing.remaining > 0 ? "bg-amber-100 text-amber-900 border border-amber-300" :
                            staffing.isOver ? "bg-rose-100 text-rose-900 border border-rose-300" :
                            "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          )}>
                            {staffing.remaining} de {staffing.required} solicitados
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Selecione um colaborador abaixo para adicioná-lo à equipe. Cada colaborador vinculado diminuirá as vagas restantes do total solicitado.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <select
                        value={selectedWorkerToAssign}
                        onChange={(e) => setSelectedWorkerToAssign(e.target.value)}
                        className="w-full sm:flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                      >
                        <option value="">Selecione um funcionário para vincular...</option>
                        {users
                          .filter(u => u.assignedProjectId !== selectedProject.id)
                          .map(u => {
                            const currentAssigned = projects.find(p => p.id === u.assignedProjectId);
                            return (
                              <option key={u.uid} value={u.uid}>
                                {u.name} ({u.role}) — {currentAssigned ? `Atualmente na obra "${currentAssigned.name}"` : 'Sem obra atribuída'}
                              </option>
                            );
                          })}
                      </select>

                      <button
                        type="button"
                        disabled={!selectedWorkerToAssign || assigningWorker}
                        onClick={() => handleAssignWorker(selectedWorkerToAssign, selectedProject.id)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{assigningWorker ? 'Vinculando...' : 'Adicionar à Obra'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="mb-4 flex justify-between items-center">
                <div>
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-800" />
                    <span>Funcionários Vinculados à Obra</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Acompanhe o rendimento individual, horas feitas e horas validadas de cada colaborador.
                  </p>
                </div>
              </div>

              {(() => {
                const linkedWorkers = getLinkedWorkers(selectedProject.id);

                if (linkedWorkers.length === 0) {
                  return (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50/50">
                      <Users className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                      <h5 className="font-bold text-slate-700 text-base">Nenhum funcionário vinculado a esta obra</h5>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                        Utilize o campo acima para vincular colaboradores a esta obra, ou selecione a obra correspondente na página de <strong>Funcionários</strong>.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-xs">
                    {/* List Header */}
                    <div className="bg-slate-50/80 px-4 sm:px-5 py-2.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <span>Colaborador</span>
                      <div className="flex items-center gap-6 sm:gap-10 pr-2 sm:pr-4">
                        <span className="w-16 text-center">Horas Feitas</span>
                        <span className="w-20 text-center">Validadas</span>
                        <span className="w-28 text-right">Lançamentos</span>
                      </div>
                    </div>

                    {linkedWorkers.map(worker => {
                      const workerStats = getWorkerStatsInProject(worker.uid, selectedProject.id);
                      const isExpanded = expandedWorkerId === worker.uid;
                      const isDirectlyAssigned = worker.assignedProjectId === selectedProject.id;

                      return (
                        <div key={worker.uid} className="transition-colors hover:bg-slate-50/50">
                          {/* Worker Summarized Row */}
                          <div className="p-3.5 sm:px-5 flex items-center justify-between gap-3">
                            {/* Left: Avatar, Name, Role badge */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-xs uppercase shrink-0">
                                {worker.name.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm truncate">
                                    {worker.name}
                                  </span>
                                  <span className={clsx(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                                    worker.role === 'admin' ? "bg-slate-900 text-white" :
                                    worker.role === 'chefe' ? "bg-amber-100 text-amber-900" :
                                    "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  )}>
                                    {worker.role}
                                  </span>
                                  {isDirectlyAssigned && (
                                    <span className="text-[10px] font-bold text-white bg-slate-900 px-1.5 py-0.2 rounded shrink-0">
                                      Vinculado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Middle: Horas Feitas & Horas Validadas */}
                            <div className="flex items-center gap-6 sm:gap-10 shrink-0">
                              <div className="w-16 text-center">
                                <span className="text-sm font-black text-slate-900">
                                  {workerStats.hoursMade.toFixed(1)}h
                                </span>
                              </div>

                              <div className="w-20 text-center">
                                <span className="text-sm font-black text-emerald-600 inline-flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {workerStats.hoursValidated.toFixed(1)}h
                                </span>
                              </div>

                              {/* Right: Actions (Expand & Unlink) */}
                              <div className="w-28 flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedWorkerId(isExpanded ? null : worker.uid)}
                                  className={clsx(
                                    "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border",
                                    isExpanded
                                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                  )}
                                  title="Ver histórico de registros deste colaborador"
                                >
                                  <span>{isExpanded ? 'Fechar' : 'Ver'}</span>
                                  <span className={clsx(
                                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                    isExpanded ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
                                  )}>
                                    {workerStats.logs.length}
                                  </span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                {(isAdmin || isManager) && isDirectlyAssigned && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignWorker(worker.uid)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                    title="Desvincular colaborador desta obra"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details: Worker Time Logs List */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                              <div className="mb-3 flex justify-between items-center">
                                <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                  Histórico de Registros de Horas nesta Obra ({worker.name})
                                </h6>
                                <span className="text-xs text-slate-400 font-medium">
                                  Taxa: €{(worker.hourlyRate || 0).toFixed(2)}/h {worker.dailyRate ? `• Diária: €${worker.dailyRate.toFixed(2)}` : ''}
                                </span>
                              </div>

                              {workerStats.logs.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border border-slate-200">
                                  Nenhum registro de horas efetuado por este colaborador nesta obra até o momento.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden border border-slate-200 text-xs">
                                    <thead>
                                      <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Horas Feitas</th>
                                        <th className="p-3">Serviço / Tarefa</th>
                                        <th className="p-3 text-center">Diária</th>
                                        <th className="p-3 text-center">Status</th>
                                        {(isAdmin || isManager) && <th className="p-3 text-right">Ação de Validação</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {workerStats.logs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                          <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                                            {format(new Date(log.date), 'dd/MM/yyyy')}
                                          </td>

                                          <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                                            {log.hours}h
                                          </td>

                                          <td className="p-3 text-slate-600">
                                            <span className="font-medium text-slate-800">{log.workType || 'Geral'}</span>
                                            {log.notes && (
                                              <p className="text-[10px] text-slate-400 truncate max-w-xs">{log.notes}</p>
                                            )}
                                          </td>

                                          <td className="p-3 text-center">
                                            {log.hasDailyAllowance ? (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Sim (+€{log.dailyRateApplied || worker.dailyRate || 0})
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-slate-400">Não</span>
                                            )}
                                          </td>

                                          <td className="p-3 text-center whitespace-nowrap">
                                            <span className={clsx(
                                              "px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1",
                                              log.status === 'approved' ? "bg-emerald-100 text-emerald-800" :
                                              log.status === 'rejected' ? "bg-rose-100 text-rose-800" :
                                              "bg-amber-100 text-amber-800"
                                            )}>
                                              {log.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                              {log.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                              {log.status === 'pending' && <AlertCircle className="w-3 h-3" />}
                                              {log.status === 'approved' ? 'Validada' : log.status === 'rejected' ? 'Rejeitada' : 'Pendente'}
                                            </span>
                                          </td>

                                          {(isAdmin || isManager) && (
                                            <td className="p-3 text-right whitespace-nowrap">
                                              <div className="flex items-center justify-end gap-1.5">
                                                {log.status !== 'approved' && (
                                                  <button
                                                    onClick={() => handleUpdateLogStatus(log.id, 'approved')}
                                                    disabled={updatingLogId === log.id}
                                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    title="Validar e Aprovar Horas"
                                                  >
                                                    <Check className="w-3 h-3" />
                                                    <span>Validar</span>
                                                  </button>
                                                )}

                                                {log.status !== 'rejected' && (
                                                  <button
                                                    onClick={() => handleUpdateLogStatus(log.id, 'rejected')}
                                                    disabled={updatingLogId === log.id}
                                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                                    title="Rejeitar Registro"
                                                  >
                                                    <X className="w-3 h-3" />
                                                    <span>Rejeitar</span>
                                                  </button>
                                                )}

                                                {log.status !== 'pending' && (
                                                  <button
                                                    onClick={() => handleUpdateLogStatus(log.id, 'pending')}
                                                    disabled={updatingLogId === log.id}
                                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                                                    title="Voltar para Pendente"
                                                  >
                                                    <RotateCcw className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Visualizando obra <strong>{selectedProject.name}</strong> • {getLinkedWorkers(selectedProject.id).length} funcionários vinculados
              </span>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
