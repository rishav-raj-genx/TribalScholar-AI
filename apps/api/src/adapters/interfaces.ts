/**
 * External Government Integration Adapter Interfaces.
 *
 * Architecture Rule: Every adapter response must explicitly declare `isSimulatedMock: true`
 * so mock and sandbox outputs can never be misrepresented as authoritative live government records.
 */

// ==============================================================================
// 1. DigiLocker Document Verification & Retrieval Adapter
// ==============================================================================

export interface DigiLockerVerifyRequest {
  documentType: string; // e.g. 'CASTE_CERTIFICATE', 'INCOME_CERTIFICATE', 'AADHAAR'
  documentId: string; // Certificate / Identifier number
  issuerId?: string | undefined; // State / Authority code (e.g. 'IN-JH-REV')
  candidateName?: string | undefined;
}

export interface DigiLockerVerifyResult {
  isSimulatedMock: true;
  isVerified: boolean;
  documentUri: string;
  issuer: string;
  issuedTo: string;
  issueDate: string;
  documentType: string;
  certificateNumber: string;
  verificationTimestamp: string;
  metadata: Record<string, unknown>;
}

export interface DigiLockerMetadataResult {
  isSimulatedMock: true;
  documentUri: string;
  docType: string;
  description: string;
  mimeType: string;
  sizeBytes: number;
  verified: boolean;
  issuerName: string;
  timestamp: string;
}

export interface IDigiLockerAdapter {
  verifyDocument(params: DigiLockerVerifyRequest): Promise<DigiLockerVerifyResult>;
  fetchDocumentMetadata(documentUri: string): Promise<DigiLockerMetadataResult>;
}

// ==============================================================================
// 2. Direct Benefit Transfer (DBT / PFMS) Adapter
// ==============================================================================

export interface DbtStatusRequest {
  applicationId: string;
  beneficiaryId?: string | undefined;
  accountNumberHash?: string | undefined;
}

export interface DbtDisbursementRecord {
  disbursementCycle: string;
  installmentNumber: number;
  amount: number;
  status: 'PENDING' | 'PROCESSED' | 'CREDITED' | 'FAILED';
  pfmsTransactionId: string;
  creditDate: string | null;
  bankReferenceNumber: string | null;
  failureReason?: string | null | undefined;
}

export interface DbtStatusResult {
  isSimulatedMock: true;
  applicationId: string;
  beneficiaryId: string;
  totalSanctionedAmount: number;
  totalDisbursedAmount: number;
  pendingAmount: number;
  disbursements: DbtDisbursementRecord[];
  lastCheckedAt: string;
}

export interface DbtTriggerRequest {
  applicationId: string;
  amount: number;
  installmentNumber: number;
  bankIfsc?: string | undefined;
}

export interface DbtTriggerResult {
  isSimulatedMock: true;
  trackingId: string;
  applicationId: string;
  amount: number;
  status: 'INITIATED' | 'QUEUED';
  pfmsReference: string;
  initiatedAt: string;
}

export interface IDbtAdapter {
  getDisbursementStatus(params: DbtStatusRequest): Promise<DbtStatusResult>;
  simulatePaymentTrigger(params: DbtTriggerRequest): Promise<DbtTriggerResult>;
}

// ==============================================================================
// 3. BHASHINI Indic Regional Translation Adapter
// ==============================================================================

export interface TranslationRequest {
  sourceLanguage: string; // e.g. 'en', 'hi', 'sat'
  targetLanguage: string; // e.g. 'hi', 'sat', 'or', 'bn', 'te'
  text: string;
}

export interface TranslationResult {
  isSimulatedMock: true;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  confidenceScore: number;
  engine: string;
}

export interface SupportedLanguageItem {
  code: string;
  name: string;
  nativeName: string;
  isTribalLanguage: boolean;
}

export interface SupportedLanguagesResult {
  isSimulatedMock: true;
  languages: SupportedLanguageItem[];
}

export interface ITranslationAdapter {
  translateText(params: TranslationRequest): Promise<TranslationResult>;
  getSupportedLanguages(): Promise<SupportedLanguagesResult>;
}
