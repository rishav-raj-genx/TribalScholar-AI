import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfile,
  ApplicantProfileInput,
  CreateApplicationInput,
  Application,
  ApplicationDocument,
  Scheme,
  SchemeCode,
  DocumentType,
  ApplicationStatus,
} from '@tribalscholar/shared';

const TOKEN_KEY = 'ts_auth_token';
const USER_KEY = 'ts_auth_user';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  details?: unknown;
  accessToken?: string;
  user?: UserProfile;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearStoredAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

const getBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const baseUrl = getBaseUrl();
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(fullUrl, config);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string')
        ? payload.message
        : `Request failed with status ${response.status}`;
    const details = payload && typeof payload === 'object' && 'details' in payload ? payload.details : undefined;
    throw new ApiError(errorMessage, response.status, details);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
};

export async function loginUser(credentials: LoginRequest): Promise<AuthResponse> {
  interface LoginEnvelope {
    status: string;
    data: AuthResponse;
    accessToken: string;
    user: UserProfile;
  }
  const result = await apiClient.post<LoginEnvelope>('/api/v1/auth/login', credentials);
  const authResponse: AuthResponse = {
    accessToken: result.accessToken || result.data.accessToken,
    user: result.user || result.data.user,
  };
  setStoredToken(authResponse.accessToken);
  setStoredUser(authResponse.user);
  return authResponse;
}

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  interface RegisterEnvelope {
    status: string;
    data: AuthResponse;
    accessToken: string;
    user: UserProfile;
  }
  const result = await apiClient.post<RegisterEnvelope>('/api/v1/auth/register', payload);
  const authResponse: AuthResponse = {
    accessToken: result.accessToken || result.data.accessToken,
    user: result.user || result.data.user,
  };
  setStoredToken(authResponse.accessToken);
  setStoredUser(authResponse.user);
  return authResponse;
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  interface MeEnvelope {
    status: string;
    data: UserProfile;
    user: UserProfile;
  }
  const result = await apiClient.get<MeEnvelope>('/api/v1/auth/me');
  const user = result.user || result.data;
  setStoredUser(user);
  return user;
}

export async function getApplicantProfile(): Promise<ApplicantProfileInput | null> {
  interface ProfileEnvelope {
    status: string;
    data: ApplicantProfileInput | null;
  }
  const result = await apiClient.get<ProfileEnvelope>('/api/v1/applicant/profile');
  return result.data;
}

export async function upsertApplicantProfile(
  profile: ApplicantProfileInput
): Promise<ApplicantProfileInput> {
  interface ProfileEnvelope {
    status: string;
    data: ApplicantProfileInput;
  }
  const result = await apiClient.put<ProfileEnvelope>('/api/v1/applicant/profile', profile);
  return result.data;
}

export async function getActiveSchemes(): Promise<Scheme[]> {
  interface SchemesEnvelope {
    status: string;
    data: Scheme[];
  }
  const result = await apiClient.get<SchemesEnvelope>('/api/v1/schemes/active');
  return result.data;
}

export async function getApplications(filters?: {
  schemeCode?: SchemeCode;
  status?: ApplicationStatus;
}): Promise<Application[]> {
  const query = new URLSearchParams();
  if (filters?.schemeCode) query.append('schemeCode', filters.schemeCode);
  if (filters?.status) query.append('status', filters.status);
  const qStr = query.toString();
  const endpoint = `/api/v1/applications${qStr ? `?${qStr}` : ''}`;

  interface AppsEnvelope {
    status: string;
    data: Application[];
    count: number;
  }
  const result = await apiClient.get<AppsEnvelope>(endpoint);
  return result.data;
}

export async function getApplicationById(id: string): Promise<Application> {
  interface AppEnvelope {
    status: string;
    data: Application;
  }
  const result = await apiClient.get<AppEnvelope>(`/api/v1/applications/${id}`);
  return result.data;
}

export async function createDraftApplication(
  input: CreateApplicationInput
): Promise<Application> {
  interface AppEnvelope {
    status: string;
    data: Application;
  }
  const result = await apiClient.post<AppEnvelope>('/api/v1/applications', input);
  return result.data;
}

export async function updateApplicationFormData(
  id: string,
  formData: Record<string, unknown>
): Promise<Application> {
  interface AppEnvelope {
    status: string;
    data: Application;
  }
  const result = await apiClient.patch<AppEnvelope>(`/api/v1/applications/${id}/form`, {
    formData,
  });
  return result.data;
}

export async function uploadApplicationDocument(
  id: string,
  docType: DocumentType,
  file: File
): Promise<ApplicationDocument> {
  const form = new FormData();
  form.append('file', file);
  form.append('docType', docType);

  interface UploadEnvelope {
    status: string;
    data: ApplicationDocument;
  }
  const result = await apiClient.post<UploadEnvelope>(
    `/api/v1/applications/${id}/documents`,
    form
  );
  return result.data;
}

export async function submitApplication(id: string): Promise<Application> {
  interface SubmitEnvelope {
    status: string;
    message: string;
    data: Application;
  }
  const result = await apiClient.post<SubmitEnvelope>(`/api/v1/applications/${id}/submit`);
  return result.data;
}

export interface DigiLockerVerifyPayload {
  documentType: string;
  documentId: string;
  issuerId?: string;
  candidateName?: string;
}

export interface DigiLockerVerifyResponse {
  isSimulatedMock: boolean;
  isVerified: boolean;
  documentUri: string;
  issuer: string;
  issuedTo: string;
  issueDate: string;
  documentType: string;
  certificateNumber: string;
  verificationTimestamp: string;
  metadata: {
    authenticityScore: number;
    digitalSignatureValid: boolean;
    issuingAuthority: string;
    format: string;
    stateCode: string;
  };
}

export async function verifyDigiLockerDocument(
  payload: DigiLockerVerifyPayload
): Promise<DigiLockerVerifyResponse> {
  interface VerifyEnvelope {
    status: string;
    isSimulatedMock: boolean;
    data: DigiLockerVerifyResponse;
  }
  const result = await apiClient.post<VerifyEnvelope>(
    '/api/v1/integrations/digilocker/verify',
    payload
  );
  return result.data;
}

export interface ResolveDeficienciesPayload {
  resolutionNote?: string;
  resolutionNotes?: string;
  deficiencyIds?: string[];
  forceOcr?: boolean;
}

export async function resolveApplicationDeficiencies(
  id: string,
  payload: ResolveDeficienciesPayload
): Promise<Application> {
  interface ResolveEnvelope {
    status: string;
    message: string;
    data: Application;
  }
  const result = await apiClient.post<ResolveEnvelope>(
    `/api/v1/applications/${id}/resolve`,
    payload
  );
  return result.data;
}

export interface ScrutinyQueueItem {
  id: string;
  applicationNumber: string;
  schemeCode: string;
  schemeName: string;
  applicantName: string;
  annualIncome: number;
  category: string;
  status: string;
  submittedAt: string | null;
  overallConfidence: number;
  documentCount: number;
  hasAiFlag: boolean;
  flagCount: number;
  aiRecommendation: 'APPROVE' | 'REQUEST_CORRECTION';
}

export interface ScrutinyQueueResponse {
  items: ScrutinyQueueItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ScrutinyDecisionPackage {
  application: {
    id: string;
    applicationNumber: string;
    status: string;
    submittedAt: string | null;
    verifiedAt: string | null;
    createdAt: string;
    formData: Record<string, unknown>;
    applicant: {
      id: string;
      fullName: string;
      email: string;
      phone?: string | null;
      profile?: Record<string, unknown> | null;
    };
    scheme: {
      id: string;
      code: string;
      name: string;
      description: string;
    };
    schemeVersion: {
      id: string;
      versionNumber: number;
      academicYear: string;
      incomeCeiling: number;
      totalSlots: number;
    };
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    version: number;
    isCurrent: boolean;
    verificationStatus: string;
    ocrConfidence: number | null;
    ocrExtractedFields: unknown;
    crossDocValidation: unknown;
    rejectionReason: string | null;
    viewUrl: string;
    uploadedAt: string;
  }>;
  ruleEvaluation: Record<string, unknown>;
  aiFindings: {
    overallConfidence: number;
    overallPassed: boolean;
    blockingFailuresCount: number;
    warningCount: number;
    hasFlag: boolean;
    flagCount: number;
    recommendation: 'APPROVE' | 'REQUEST_CORRECTION';
  };
  deficiencyHistory: unknown[];
  priorReviews: unknown[];
}

export interface SubmitOfficerReviewInput {
  decision: 'APPROVE' | 'REQUEST_CORRECTION' | 'RECOMMENDED_FOR_SELECTION' | 'DEFICIENCY_FLAGGED' | 'REJECTED';
  remarks: string;
  justification?: string;
  overrideUsed?: boolean;
  checklistResults?: Record<string, boolean>;
  deficiencies?: Array<{
    documentId?: string;
    fieldOrCriteria: string;
    deficiencyCode: string;
    description: string;
  }>;
}

export async function getScrutinyQueue(
  filters?: Record<string, unknown>
): Promise<ScrutinyQueueResponse> {
  const query = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
  }
  const qStr = query.toString();
  const endpoint = `/api/v1/scrutiny/queue${qStr ? `?${qStr}` : ''}`;

  interface QueueEnvelope {
    status: string;
    data: ScrutinyQueueResponse;
  }
  const result = await apiClient.get<QueueEnvelope>(endpoint);
  return result.data;
}

export async function getDecisionPackage(
  applicationId: string
): Promise<ScrutinyDecisionPackage> {
  interface DecisionEnvelope {
    status: string;
    data: ScrutinyDecisionPackage;
  }
  const result = await apiClient.get<DecisionEnvelope>(
    `/api/v1/scrutiny/applications/${applicationId}`
  );
  return result.data;
}

export async function submitOfficerReview(
  applicationId: string,
  review: SubmitOfficerReviewInput
): Promise<Application> {
  interface ReviewEnvelope {
    status: string;
    message: string;
    data: Application;
  }
  const result = await apiClient.post<ReviewEnvelope>(
    `/api/v1/scrutiny/applications/${applicationId}/review`,
    review
  );
  return result.data;
}

export interface DecideApplicationPayload {
  decision: 'SELECTED' | 'REJECTED';
  remarks: string;
  sanctionedAmount?: number;
  awardLetterUrl?: string;
  visaStatus?: string;
}

export async function decideApplicationSelection(
  applicationId: string,
  payload: DecideApplicationPayload
): Promise<Application> {
  interface DecideEnvelope {
    status: string;
    message: string;
    data: Application;
  }
  const result = await apiClient.post<DecideEnvelope>(
    `/api/v1/selection/applications/${applicationId}/decide`,
    payload
  );
  return result.data;
}

export interface UpdatePostSelectionPayload {
  institutionalVerification?: boolean;
  joiningReportSubmitted?: boolean;
  joiningDate?: string;
  visaStatus?: string;
  triggerDisbursement?: boolean;
  disbursementAmount?: number;
  installmentNumber?: number;
  remarks?: string;
}

export async function updatePostSelection(
  applicationId: string,
  payload: UpdatePostSelectionPayload
): Promise<unknown> {
  interface PostSelectionEnvelope {
    status: string;
    message: string;
    data: unknown;
  }
  const result = await apiClient.patch<PostSelectionEnvelope>(
    `/api/v1/selection/applications/${applicationId}/post-selection`,
    payload
  );
  return result.data;
}

// ==============================================================================
// Admin Scheme Version DSL & Simulation Helpers
// ==============================================================================

export interface SchemeVersionAdminDTO {
  id: string;
  schemeId: string;
  schemeCode?: SchemeCode;
  versionNumber: number;
  academicYear: string;
  totalSlots: number;
  incomeCeiling: number;
  eligibilityRules: Record<string, unknown>;
  documentRequirements: Array<{
    documentType: string;
    label: string;
    mandatory: boolean;
    maxSizeMb?: number;
    allowedFormats?: string[];
  }>;
  scoringConfig?: Record<string, unknown> | null;
  startDate: string | Date;
  endDate: string | Date;
  isPublished: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateSchemeVersionInput {
  academicYear: string;
  totalSlots: number;
  incomeCeiling: number;
  startDate: string;
  endDate: string;
  eligibilityRules: Record<string, unknown>;
  documentRequirements: unknown[];
  scoringConfig?: Record<string, unknown>;
  isPublished?: boolean;
}

export interface UpdateSchemeVersionInput {
  academicYear?: string;
  totalSlots?: number;
  incomeCeiling?: number;
  startDate?: string;
  endDate?: string;
  eligibilityRules?: Record<string, unknown>;
  documentRequirements?: unknown[];
  scoringConfig?: Record<string, unknown>;
  isPublished?: boolean;
}

export interface SchemeSimulationPayload {
  applicantProfile?: Record<string, unknown>;
  formData?: Record<string, unknown>;
  uploadedDocuments?: unknown[];
  extractedDocuments?: unknown[];
}

export interface SchemeSimulationReport {
  simulationId: string;
  schemeCode: SchemeCode;
  versionNumber: number;
  academicYear: string;
  isEligible: boolean;
  isDocumentComplete: boolean;
  isCrossDocConsistent: boolean;
  overallPassed: boolean;
  requiresOfficerReview: boolean;
  blockingFailuresCount: number;
  warningCount: number;
  deficiencies: Array<{
    type?: string;
    description?: string;
    field?: string;
    severity?: string;
    message?: string;
  }>;
  ruleResults: Array<{
    conditionId: string;
    field: string;
    expectedValue: unknown;
    actualValue: unknown;
    passed: boolean;
    severity: string;
    message: string;
  }>;
  documentResults: {
    isComplete?: boolean;
    missingMandatory?: string[];
    missingOptional?: string[];
  };
  consistencyResults: Array<{
    ruleId?: string;
    checkName?: string;
    passed?: boolean;
    evidence?: string;
    message?: string;
  }>;
  simulatedAt: string;
}

export async function getSchemeVersions(code: SchemeCode | string): Promise<SchemeVersionAdminDTO[]> {
  interface VersionsEnvelope {
    status: string;
    data: SchemeVersionAdminDTO[];
  }
  const result = await apiClient.get<VersionsEnvelope>(`/api/v1/schemes/${code}/versions`);
  return result.data;
}

export async function createSchemeVersion(
  code: SchemeCode | string,
  data: CreateSchemeVersionInput
): Promise<SchemeVersionAdminDTO> {
  interface VersionEnvelope {
    status: string;
    data: SchemeVersionAdminDTO;
  }
  const result = await apiClient.post<VersionEnvelope>(`/api/v1/schemes/${code}/versions`, data);
  return result.data;
}

export async function updateSchemeVersion(
  versionId: string,
  data: UpdateSchemeVersionInput
): Promise<SchemeVersionAdminDTO> {
  interface VersionEnvelope {
    status: string;
    data: SchemeVersionAdminDTO;
  }
  const result = await apiClient.put<VersionEnvelope>(`/api/v1/schemes/versions/${versionId}`, data);
  return result.data;
}

export async function cloneSchemeVersion(versionId: string): Promise<SchemeVersionAdminDTO> {
  interface VersionEnvelope {
    status: string;
    data: SchemeVersionAdminDTO;
  }
  const result = await apiClient.post<VersionEnvelope>(`/api/v1/schemes/versions/${versionId}/clone`, {});
  return result.data;
}

export async function publishSchemeVersion(versionId: string): Promise<SchemeVersionAdminDTO> {
  interface VersionEnvelope {
    status: string;
    data: SchemeVersionAdminDTO;
  }
  const result = await apiClient.patch<VersionEnvelope>(`/api/v1/schemes/versions/${versionId}/publish`, {});
  return result.data;
}

export async function simulateSchemeVersion(
  versionId: string,
  payload: SchemeSimulationPayload
): Promise<SchemeSimulationReport> {
  interface SimulationEnvelope {
    status: string;
    data: SchemeSimulationReport;
  }
  const result = await apiClient.post<SimulationEnvelope>(
    `/api/v1/schemes/versions/${versionId}/simulate`,
    payload
  );
  return result.data;
}

export interface DemoResetSummary {
  durationMs: number;
  timestamp: string;
  counts: {
    users: number;
    schemes: number;
    schemeVersions: number;
    applications: number;
    documents: number;
    deficiencies: number;
    officerReviews: number;
    postSelectionRecords: number;
    auditLogs: number;
  };
  applications: Array<{
    applicationNumber: string;
    schemeCode: string;
    status: string;
    applicantEmail: string;
    description: string;
  }>;
}

export async function resetDemoState(): Promise<DemoResetSummary> {
  interface ResetEnvelope {
    status: string;
    message: string;
    data: DemoResetSummary;
  }
  const result = await apiClient.post<ResetEnvelope>('/api/v1/demo/reset', {});
  return result.data;
}


