import type {
  DigiLockerMetadataResult,
  DigiLockerVerifyRequest,
  DigiLockerVerifyResult,
  IDigiLockerAdapter,
} from './interfaces.js';

export class MockDigiLockerAdapter implements IDigiLockerAdapter {
  /**
   * Deterministically simulates verification of government documents via DigiLocker.
   * If documentId contains 'INVALID' or 'REJECT', verification fails.
   */
  async verifyDocument(params: DigiLockerVerifyRequest): Promise<DigiLockerVerifyResult> {
    const isInvalid =
      params.documentId.toUpperCase().includes('INVALID') ||
      params.documentId.toUpperCase().includes('REJECT');

    const cleanDocType = params.documentType.trim().toUpperCase();
    const cleanDocId = params.documentId.trim().toUpperCase();
    const cleanIssuer = params.issuerId?.trim().toUpperCase() || 'IN-GOV-CENTRAL';
    const candidateName = params.candidateName?.trim() || 'Birsa Munda';

    const documentUri = `in.gov.digilocker.${cleanDocType.toLowerCase()}.${cleanDocId}`;

    return {
      isSimulatedMock: true,
      isVerified: !isInvalid,
      documentUri,
      issuer: cleanIssuer,
      issuedTo: candidateName,
      issueDate: '2023-08-15T00:00:00.000Z',
      documentType: cleanDocType,
      certificateNumber: cleanDocId,
      verificationTimestamp: new Date().toISOString(),
      metadata: {
        authenticityScore: isInvalid ? 0.0 : 0.99,
        digitalSignatureValid: !isInvalid,
        issuingAuthority: 'Department of Revenue & Social Welfare (Simulated)',
        format: 'DIGILOCKER_XML_CANONICAL',
        stateCode: cleanIssuer.startsWith('IN-') ? cleanIssuer.split('-')[1] : 'DL',
      },
    };
  }

  /**
   * Deterministically returns simulated metadata for a given DigiLocker URI.
   */
  async fetchDocumentMetadata(documentUri: string): Promise<DigiLockerMetadataResult> {
    const parts = documentUri.split('.');
    const docType = parts[3]?.toUpperCase() || 'DOCUMENT';
    const isInvalid = documentUri.toUpperCase().includes('INVALID');

    return {
      isSimulatedMock: true,
      documentUri,
      docType,
      description: `Official ${docType} retrieved from National DigiLocker Repository (Simulated)`,
      mimeType: 'application/pdf',
      sizeBytes: 184520,
      verified: !isInvalid,
      issuerName: 'Ministry of Tribal Affairs / State Revenue Department (Simulated)',
      timestamp: new Date().toISOString(),
    };
  }
}

export const mockDigiLockerAdapter = new MockDigiLockerAdapter();
