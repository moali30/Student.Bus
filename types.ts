
export enum UserRole {
  MAIN_ADMIN = 'MAIN_ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  ASSISTANT = 'ASSISTANT',
  PROFESSOR = 'PROFESSOR'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  assignedCourseIds: string[];
}

export interface Batch {
  id: string;
  name: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  fileId?: string; // Google Sheet File ID
}

export interface GradeConfig {
  totalTargetScore: number;
  
  quizCount: number;
  quizMaxScore: number; 
  quizIndividualMaxScores: number[]; 
  quizBestOf: number;
  
  assignmentCount: number;
  assignmentMaxScore: number; 
  assignmentIndividualMaxScores: number[]; 
  assignmentBestOf: number;
  
  enableBonus: boolean;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  batchId: string;
  professorIds: string[];
  assistantIds: string[];
  config: GradeConfig;
  isPublished?: boolean; 
}

export interface StudentResult {
  id: string;
  studentId: string;
  studentName: string;
  program?: string; // New field: 'General', 'Accounting', or 'Management'
  courseId: string;
  batchId: string;
  quizScores: (number | null)[];
  assignmentScores: (number | null)[];
  bonusScore: number | null;
  calculatedTotal: number;
  isLocked?: boolean; 
  orderIndex?: number; // Preserve original Excel upload order
}

export type DataJobType = 'IMPORT' | 'EXPORT';
export type DataJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DataTransferJob {
  id: string;
  type: DataJobType;
  status: DataJobStatus;
  fileName?: string;
  courseId?: string;
  batchId?: string;
  startedAt: string;
  finishedAt?: string;
  createdBy?: string;
  summary?: string;
  metaJson?: string;
}

export interface ImportRunReport {
  jobId: string;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}
