export type UserRole = 'super-admin' | 'admin' | 'analyst' | 'reviewer';

export interface AdminProfile {
  uid: string | null;
  adminId: string;
  email: string;
  role: UserRole;
  displayName: string;
  isActive: boolean;
  claimed?: boolean;
  createdAt: any;
  signatureUrl?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  userRole: UserRole;
  timestamp: any;
  action: string;
  module: string;
  details?: string;
  previousValues?: any;
  updatedValues?: any;
  signatureDetails?: {
    signedBy: string;
    signedAt: any;
    reason?: string;
  };
}

export interface ClientInfo {
  clientName: string;
  salutation: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SampleInfo {
  projectName: string;
  projectNumber: string;
  sampleId: string;
  sampleSubtype: string;
  samplingDate: string;
  samplingTime: string;
  samplePreparationDate: string;
  samplePreparationTime: string;
}

export interface TestResult {
  test: string;
  method: string;
  result: string;
  unit: string;
  rl: string;
}

export interface AnalysisInfo {
  analysisDate: string;
  analysisTime: string;
  analysisBy: string;
  qcReportingBy: string;
}

export type ReportType = 'Biological' | 'Biocide' | 'Potable Water';

export interface AnalysisReport {
  reportId: string;
  reportType: ReportType;
  clientInfo: ClientInfo;
  sampleInfo: SampleInfo;
  testResults: TestResult[];
  analysisInfo: AnalysisInfo;
  createdAt: any;
  createdBy: string;
  signatureUrl?: string;
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
