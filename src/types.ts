export type UserRole = 'super-admin' | 'admin';

export interface AdminProfile {
  uid: string;
  adminId: string;
  email: string;
  role: UserRole;
  displayName: string;
  isActive: boolean;
  createdAt: any;
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
