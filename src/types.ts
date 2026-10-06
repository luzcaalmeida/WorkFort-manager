import { UserRole } from './lib/auth';

export interface Project {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'on_hold';
  managerId: string; // Chefe de obra responsável
  requiredWorkers?: number; // Total de funcionários solicitados / requeridos
  availableWorkTypes?: string[]; // Tipos de trabalhos cadastrados disponíveis na obra
  createdAt: string;
}

export interface WorkType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface TimeLog {
  id: string;
  projectId: string;
  workerId: string;
  date: string;
  hours: number;
  workType: string;
  hasDailyAllowance?: boolean;
  dailyRateApplied?: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  photos: string[];
  notes?: string;
  createdAt: string;
}

export interface MaterialLog {
  id: string;
  projectId: string;
  name: string;
  quantity: number;
  unit: string;
  loggedBy: string; // manager
  createdAt: string;
}

export type DocumentCategory = 
  | 'identificacao'
  | 'conducao'
  | 'morada'
  | 'certificados'
  | 'curriculum'
  | 'irs';

export interface UserDocument {
  id: string;
  category: DocumentCategory;
  name: string;
  fileType: string;
  fileData: string;
  fileSize: number;
  uploadedAt: string;
}

