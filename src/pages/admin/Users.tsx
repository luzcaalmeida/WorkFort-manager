import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { db, secondaryAuth, auth } from '../../lib/firebase';
import { UserProfile, UserRole } from '../../lib/auth';
import { Project, UserDocument, DocumentCategory } from '../../types';
import { 
  UserPlus, Save, X, Search, Edit2, Key, FileText, UploadCloud, 
  Trash2, Eye, Download, CheckCircle2, AlertCircle, File, Image as ImageIcon,
  ArrowRight, ArrowLeft, ExternalLink, ShieldCheck, CreditCard, Car, 
  Home, Award, Briefcase, FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';

interface DocCategoryConfig {
  category: DocumentCategory;
  title: string;
  subtitle: string;
  multiple: boolean;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
}

const DOCUMENT_CATEGORIES: DocCategoryConfig[] = [
  {
    category: 'identificacao',
    title: 'Documento de Identificação',
    subtitle: 'Cartão de Cidadão, Passaporte ou Título de Residência',
    multiple: false,
    icon: CreditCard,
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300'
  },
  {
    category: 'conducao',
    title: 'Documento de Condução',
    subtitle: 'Carta de Condução ou Licença de Máquinas/Operador',
    multiple: false,
    icon: Car,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300'
  },
  {
    category: 'morada',
    title: 'Documento de Morada',
    subtitle: 'Comprovativo de Morada ou Atestado de Residência Junta',
    multiple: false,
    icon: Home,
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  {
    category: 'certificados',
    title: 'Documento de Certificados',
    subtitle: 'Certificações profissionais, segurança no trabalho, formações',
    multiple: true,
    icon: Award,
    badgeColor: 'bg-slate-200 text-slate-900 border-slate-300'
  },
  {
    category: 'curriculum',
    title: 'Documento de Curriculum',
    subtitle: 'Curriculum Vitae atualizado, histórico e cartas de referência',
    multiple: true,
    icon: Briefcase,
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300'
  },
  {
    category: 'irs',
    title: 'Documento de IRS',
    subtitle: 'Modelo 3, Nota de Liquidação ou comprovativos fiscais',
    multiple: true,
    icon: FileSpreadsheet,
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-300'
  }
];

export function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modal Pop-up State
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'documentos'>('geral');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'funcionario' as UserRole,
    phone: '',
    taxAddress: '',
    hourlyRate: 0,
    dailyRate: 0,
    assignedProjectId: ''
  });

  // Attached Documents in the Pop-up
  const [attachedDocs, setAttachedDocs] = useState<UserDocument[]>([]);
  const [deletedDocIds, setDeletedDocIds] = useState<string[]>([]);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const q = query(collection(db, 'projects'));
      const snapshot = await getDocs(q);
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projectsData);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const openNewUserModal = () => {
    setEditingUid(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'funcionario',
      phone: '',
      taxAddress: '',
      hourlyRate: 0,
      dailyRate: 0,
      assignedProjectId: ''
    });
    setAttachedDocs([]);
    setDeletedDocIds([]);
    setActiveTab('geral');
    setShowModal(true);
  };

  const openEditUserModal = async (u: UserProfile) => {
    setEditingUid(u.uid);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'funcionario',
      phone: u.phone || '',
      taxAddress: u.taxAddress || '',
      hourlyRate: u.hourlyRate || 0,
      dailyRate: u.dailyRate || 0,
      assignedProjectId: u.assignedProjectId || ''
    });
    setAttachedDocs([]);
    setDeletedDocIds([]);
    setActiveTab('geral');
    setShowModal(true);

    // Fetch existing documents from subcollection
    setLoadingDocs(true);
    try {
      const docsRef = collection(db, 'users', u.uid, 'documents');
      const snapshot = await getDocs(docsRef);
      const docsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserDocument));
      setAttachedDocs(docsList);
    } catch (err) {
      console.error("Error fetching user documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const processFile = async (file: File): Promise<{ dataUrl: string; size: number } | null> => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');

    if (!isPdf && !isPng && !isJpg) {
      alert(`Formato inválido para "${file.name}". Por favor envie apenas arquivos PDF, PNG ou JPEG.`);
      return null;
    }

    if (isPdf && file.size > 950 * 1024) {
      alert(`O arquivo PDF "${file.name}" tem ${(file.size / 1024).toFixed(0)} KB. O tamanho máximo recomendado para documentos é de 950 KB.`);
      return null;
    }

    return new Promise((resolve) => {
      if (isPng || isJpg) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1400;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const format = isPng ? 'image/png' : 'image/jpeg';
              const compressed = canvas.toDataURL(format, 0.82);
              resolve({
                dataUrl: compressed,
                size: Math.round((compressed.length * 3) / 4)
              });
              return;
            }
            resolve({ dataUrl: e.target?.result as string, size: file.size });
          };
          img.onerror = () => {
            resolve({ dataUrl: e.target?.result as string, size: file.size });
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({ dataUrl: e.target?.result as string, size: file.size });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileUpload = async (category: DocumentCategory, files: FileList | null, multiple: boolean) => {
    if (!files || files.length === 0) return;

    const newDocs: UserDocument[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await processFile(file);
      if (!result) continue;

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      const fileType = isPdf ? 'application/pdf' : isPng ? 'image/png' : 'image/jpeg';

      const docItem: UserDocument = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        category,
        name: file.name,
        fileType,
        fileData: result.dataUrl,
        fileSize: result.size,
        uploadedAt: new Date().toISOString()
      };
      newDocs.push(docItem);

      if (!multiple) {
        // If single, only take the first one
        break;
      }
    }

    if (newDocs.length === 0) return;

    setAttachedDocs(prev => {
      if (multiple) {
        return [...prev, ...newDocs];
      } else {
        // Replace previous doc in this category and mark old id for deletion if it existed
        const oldDocs = prev.filter(d => d.category === category);
        oldDocs.forEach(d => {
          if (!d.id.startsWith('doc_')) {
            setDeletedDocIds(dIds => [...dIds, d.id]);
          }
        });
        return [...prev.filter(d => d.category !== category), ...newDocs];
      }
    });
  };

  const handleRemoveDoc = (docId: string) => {
    setAttachedDocs(prev => prev.filter(d => d.id !== docId));
    if (!docId.startsWith('doc_')) {
      setDeletedDocIds(prev => [...prev, docId]);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("Por favor preencha nome e e-mail.");
      setActiveTab('geral');
      return;
    }

    if (!editingUid && (!formData.password || formData.password.length < 6)) {
      alert("A senha de acesso deve ter pelo menos 6 caracteres.");
      setActiveTab('geral');
      return;
    }

    setSaving(true);
    try {
      let targetUid = editingUid;

      if (!targetUid) {
        // 1. Create auth user with secondaryAuth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        targetUid = userCredential.user.uid;
        await signOut(secondaryAuth);
      }

      // 2. Prepare summary of documents
      const documentsSummary = attachedDocs.map(d => ({
        id: d.id,
        category: d.category,
        name: d.name,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadedAt: d.uploadedAt
      }));

      // 3. Save profile document
      const userDoc: Partial<UserProfile> = {
        role: formData.role,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        taxAddress: formData.taxAddress.trim(),
        hourlyRate: Number(formData.hourlyRate) || 0,
        dailyRate: Number(formData.dailyRate) || 0,
        assignedProjectId: formData.assignedProjectId || '',
        documentsSummary
      };

      await setDoc(doc(db, 'users', targetUid), userDoc, { merge: true });

      // 4. Save documents to subcollection 'users/{uid}/documents/{docId}'
      for (const d of attachedDocs) {
        await setDoc(doc(db, 'users', targetUid, 'documents', d.id), {
          id: d.id,
          category: d.category,
          name: d.name,
          fileType: d.fileType,
          fileData: d.fileData,
          fileSize: d.fileSize,
          uploadedAt: d.uploadedAt
        }, { merge: true });
      }

      // 5. Delete removed documents
      for (const delId of deletedDocIds) {
        try {
          await deleteDoc(doc(db, 'users', targetUid, 'documents', delId));
        } catch (err) {
          console.warn("Error deleting doc", delId, err);
        }
      }

      setShowModal(false);
      setEditingUid(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      alert("Erro ao salvar colaborador: " + (error?.message || "Verifique as permissões."));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, formData.email);
      alert(`E-mail de redefinição de senha enviado com sucesso para ${formData.email}!`);
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Erro ao enviar e-mail de redefinição.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Equipes & RH</span>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-200">
              {users.length} {users.length === 1 ? 'colaborador' : 'colaboradores'}
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gestão cadastral, contratos, taxas horárias/diárias e documentação completa de colaboradores.
          </p>
        </div>

        <button
          onClick={openNewUserModal}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus className="w-5 h-5" />
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="all">Todos os Perfis</option>
            <option value="funcionario">Funcionários</option>
            <option value="chefe">Chefes de Obra</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Colaboradores Cadastrados</h3>
          <span className="text-xs text-slate-400 font-bold">Total: {filteredUsers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-widest text-slate-400">
                <th className="p-4">Colaborador</th>
                <th className="p-4">Obra Correspondente</th>
                <th className="p-4 text-right">Taxas (€)</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-800 border-t-transparent mb-2"></div>
                    <p className="text-sm font-medium">Carregando colaboradores...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-base font-bold text-slate-600">Nenhum colaborador encontrado</p>
                    <p className="text-sm text-slate-400 mt-1">Tente ajustar a busca ou cadastre um novo colaborador.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const assignedProj = projects.find(p => p.id === u.assignedProjectId);

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-base">{u.name}</div>
                      </td>

                      <td className="p-4">
                        {assignedProj ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs">
                            <span>🏗️</span>
                            <span className="truncate max-w-[200px]" title={`${assignedProj.name} - ${assignedProj.location}`}>{assignedProj.name}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            Sem obra vinculada
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-bold text-slate-800 text-sm">€ {(u.hourlyRate || 0).toFixed(2)}/h</div>
                        {u.dailyRate ? (
                          <div className="text-xs font-semibold text-emerald-600">+€ {u.dailyRate.toFixed(2)} diária</div>
                        ) : (
                          <div className="text-xs text-slate-400">Sem diária</div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl transition-colors inline-flex items-center gap-1 font-bold"
                          title="Editar Colaborador & Documentos"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-xs font-bold">Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP-UP MODAL: CADASTRO / EDIÇÃO COM FOCO TOTAL NAS ABAS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/20">
                  {editingUid ? <Edit2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {editingUid ? 'Editar Colaborador' : 'Cadastrar Novo Colaborador'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingUid ? `Atualizando informações de ${formData.name || 'colaborador'}` : 'Preencha os dados e anexe a documentação necessária'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB NAVIGATION BAR */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('geral')}
                className={clsx(
                  "flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-t border-l border-r",
                  activeTab === 'geral'
                    ? "bg-white text-slate-900 border-slate-200 -mb-[1px] shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100"
                )}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Dados Gerais & Contrato</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('documentos')}
                className={clsx(
                  "flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-t border-l border-r",
                  activeTab === 'documentos'
                    ? "bg-white text-slate-900 border-slate-200 -mb-[1px] shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100"
                )}
              >
                <FileText className="w-4 h-4" />
                <span>Documentação</span>
                <span className={clsx(
                  "text-xs px-2 py-0.5 rounded-full font-bold",
                  attachedDocs.length > 0 
                    ? "bg-slate-900 text-white" 
                    : "bg-slate-200 text-slate-600"
                )}>
                  {attachedDocs.length}
                </span>
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <form id="userForm" onSubmit={handleSaveUser}>
                {/* TAB 1: DADOS GERAIS */}
                {activeTab === 'geral' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João Miguel Silva"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        disabled={!!editingUid}
                        placeholder="colaborador@empresa.pt"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    {editingUid ? (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Senha de Acesso
                        </label>
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-800 px-3.5 py-2.5 rounded-xl font-bold hover:bg-slate-100 flex items-center justify-center gap-2 text-sm transition-colors"
                        >
                          <Key className="w-4 h-4" />
                          <span>Enviar Redefinição de Senha por E-mail</span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Senha de Acesso (Mín. 6 dígitos) *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Perfil de Acesso (Role) *
                      </label>
                      <select
                        required
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium bg-white"
                      >
                        <option value="funcionario">Funcionário (Registra horas & serviços)</option>
                        <option value="chefe">Chefe de Obra (Gestão de equipes e materiais)</option>
                        <option value="admin">Administrador (Acesso total)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Telefone / Telemóvel
                      </label>
                      <input
                        type="tel"
                        placeholder="+351 912 345 678"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Morada Fiscal (Portugal)
                      </label>
                      <input
                        type="text"
                        placeholder="Rua, Código Postal, Cidade"
                        value={formData.taxAddress}
                        onChange={e => setFormData({...formData, taxAddress: e.target.value})}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Valor Hora (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.hourlyRate}
                        onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value)})}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Valor da Diária (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.dailyRate}
                        onChange={e => setFormData({...formData, dailyRate: Number(e.target.value)})}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 text-sm font-medium"
                      />
                    </div>

                    {/* SEÇÃO DE OBRA CORRESPONDENTE (DISPONÍVEL NA CRIAÇÃO E EDIÇÃO) */}
                    <div className="md:col-span-2 bg-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
                              Obra Correspondente / Alocação do Colaborador *
                            </label>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Define a qual obra este colaborador está vinculado para apontamento e controle de horas
                            </span>
                          </div>
                        </div>

                        {formData.assignedProjectId && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, assignedProjectId: ''})}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors border border-rose-200"
                          >
                            Desvincular Obra
                          </button>
                        )}
                      </div>

                      <select
                        value={formData.assignedProjectId}
                        onChange={e => setFormData({...formData, assignedProjectId: e.target.value})}
                        className="w-full px-3.5 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none text-slate-900 text-sm font-bold bg-white"
                      >
                        <option value="">Selecione a obra correspondente (ou deixe sem obra)...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            🏗️ {p.name} — {p.location || 'Localização não informada'} {p.status !== 'active' ? `(${p.status})` : ''}
                          </option>
                        ))}
                      </select>

                      {formData.assignedProjectId ? (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-slate-900 font-semibold">
                            <span>🏗️ Obra Selecionada:</span>
                            <strong className="text-slate-900">
                              {projects.find(p => p.id === formData.assignedProjectId)?.name || 'Obra identificada'}
                            </strong>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">
                              {projects.find(p => p.id === formData.assignedProjectId)?.location || 'Localização padrão'}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Obra Ativa
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 mt-2 font-medium bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>Este colaborador não possui nenhuma obra correspondente selecionada. Selecione uma obra para vincular.</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: DOCUMENTAÇÃO COM OS 6 CAMPOS ESPECIFICADOS */}
                {activeTab === 'documentos' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Formatos aceitos:</strong> Documentos em formato <strong>PDF</strong> ou imagens <strong>PNG e JPEG</strong> (até 950KB por arquivo).
                        Você pode anexar os documentos agora ou a qualquer momento durante atualizações cadastrais.
                      </div>
                    </div>

                    {loadingDocs ? (
                      <div className="py-12 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-800 border-t-transparent mb-2"></div>
                        <p className="text-sm font-medium">Carregando documentos do colaborador...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {DOCUMENT_CATEGORIES.map(cat => {
                          const IconComp = cat.icon;
                          const docsInCategory = attachedDocs.filter(d => d.category === cat.category);
                          const inputId = `file_input_${cat.category}`;

                          return (
                            <div 
                              key={cat.category}
                              className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 hover:bg-slate-50/80 transition-colors flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={clsx("p-2 rounded-xl border", cat.badgeColor)}>
                                      <IconComp className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                        {cat.title}
                                      </h4>
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        {cat.multiple ? 'Múltiplos arquivos aceitos' : 'Documento único'}
                                      </span>
                                    </div>
                                  </div>

                                  {docsInCategory.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {docsInCategory.length} {docsInCategory.length === 1 ? 'anexo' : 'anexos'}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-500 mb-3">
                                  {cat.subtitle}
                                </p>

                                {/* List of uploaded files in this category */}
                                {docsInCategory.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    {docsInCategory.map(docItem => (
                                      <div 
                                        key={docItem.id}
                                        className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs shadow-xs"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          {docItem.fileType === 'application/pdf' ? (
                                            <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                                          ) : (
                                            <ImageIcon className="w-5 h-5 text-slate-700 shrink-0" />
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 truncate" title={docItem.name}>
                                              {docItem.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                              {formatFileSize(docItem.fileSize)} • {new Date(docItem.uploadedAt).toLocaleDateString('pt-PT')}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setPreviewDoc(docItem)}
                                            className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Visualizar documento"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>

                                          <a
                                            href={docItem.fileData}
                                            download={docItem.name}
                                            className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Baixar arquivo"
                                          >
                                            <Download className="w-4 h-4" />
                                          </a>

                                          <button
                                            type="button"
                                            onClick={() => handleRemoveDoc(docItem.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Remover documento"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Upload Button / Trigger */}
                              <div>
                                <input
                                  type="file"
                                  id={inputId}
                                  multiple={cat.multiple}
                                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                                  onChange={(e) => {
                                    handleFileUpload(cat.category, e.target.files, cat.multiple);
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />

                                <label
                                  htmlFor={inputId}
                                  className={clsx(
                                    "w-full py-2.5 px-3 border border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold transition-all",
                                    docsInCategory.length > 0 && !cat.multiple
                                      ? "border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400"
                                      : "border-slate-400 text-slate-800 bg-white hover:bg-slate-100 hover:border-slate-600"
                                  )}
                                >
                                  <UploadCloud className="w-4 h-4 text-slate-800" />
                                  <span>
                                    {docsInCategory.length > 0
                                      ? (cat.multiple ? 'Anexar mais arquivos (PDF/PNG/JPEG)' : 'Substituir arquivo (PDF/PNG/JPEG)')
                                      : 'Selecionar arquivo (PDF, PNG ou JPEG)'}
                                  </span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                {activeTab === 'geral' ? (
                  <span>Campos marcados com * são de preenchimento obrigatório.</span>
                ) : (
                  <span>Total de {attachedDocs.length} {attachedDocs.length === 1 ? 'documento anexado' : 'documentos anexados'}.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  form="userForm"
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-slate-900/10 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingUid ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                {previewDoc.fileType === 'application/pdf' ? (
                  <FileText className="w-5 h-5 text-rose-500" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-700" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 truncate max-w-md">
                    {previewDoc.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {formatFileSize(previewDoc.fileSize)} • Enviado em {new Date(previewDoc.uploadedAt).toLocaleString('pt-PT')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.fileData}
                  download={previewDoc.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100/50 min-h-[400px]">
              {previewDoc.fileType === 'application/pdf' ? (
                <div className="w-full h-[65vh] flex flex-col">
                  <iframe
                    src={previewDoc.fileData}
                    className="w-full h-full rounded-2xl border border-slate-200 shadow-inner bg-white"
                    title={previewDoc.name}
                  />
                  <div className="mt-2 text-center">
                    <a
                      href={previewDoc.fileData}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir PDF em tela cheia / nova aba</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="max-h-[65vh] flex items-center justify-center">
                  <img
                    src={previewDoc.fileData}
                    alt={previewDoc.name}
                    className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-md border border-slate-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
