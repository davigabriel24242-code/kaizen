export type UserRole = 'operator' | 'leader' | 'admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  area?: string;
  shift?: string;
  profileCompleted?: boolean;
  photoURL?: string;
}

export type KaizenStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'implemented' | 'verified' | 'rejected';

export interface Collaborator {
  name: string;
  shift: string;
  photoURL?: string;
  uid?: string;
}

export interface RiskMatrix {
  safety: string;
  health: string;
  environment: string;
}

export interface ModificationRequest {
  type: 'edit' | 'delete';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
}

export interface Kaizen {
  id: string;
  title: string;
  unit?: string;
  area: string;
  month?: string;
  startDate?: string;
  endDate?: string;
  method?: string;
  classification?: string;
  problem: string;
  solution?: string;
  improvementDimensions?: string[];
  achievedResults?: string;
  resultsDetails?: string;
  riskMatrixBefore?: RiskMatrix;
  riskMatrixAfter?: RiskMatrix;
  mocNumber?: string;
  mocType?: string;
  status: KaizenStatus;
  postedOnWorkplace?: boolean;
  shiftLeader?: string;
  collaborators?: Collaborator[];
  evidences?: string[]; // Base64 or URLs
  beforeImage?: string; // Base64
  afterImage?: string; // Base64
  createdBy: string;
  createdAt: number; // Timestamp ms
  updatedAt: number; // Timestamp ms
  modificationRequest?: ModificationRequest;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
