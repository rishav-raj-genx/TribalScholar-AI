import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { mockDigiLockerAdapter } from '../adapters/mockDigiLocker.adapter.js';
import { mockDbtAdapter } from '../adapters/mockDbt.adapter.js';
import { mockBhashiniAdapter } from '../adapters/mockBhashini.adapter.js';

describe('External Government Adapters & Simulation Verification', () => {
  describe('MockDigiLockerAdapter (Unit & Mock Guarantees)', () => {
    it('should verify legitimate document with isSimulatedMock: true', async () => {
      const result = await mockDigiLockerAdapter.verifyDocument({
        documentType: 'CASTE_CERTIFICATE',
        documentId: 'JH-ST-2023-99120',
        issuerId: 'IN-JH-REV',
        candidateName: 'Birsa Munda',
      });

      expect(result.isSimulatedMock).toBe(true);
      expect(result.isVerified).toBe(true);
      expect(result.documentUri).toBe('in.gov.digilocker.caste_certificate.JH-ST-2023-99120');
      expect(result.issuer).toBe('IN-JH-REV');
      expect(result.issuedTo).toBe('Birsa Munda');
      expect(result.metadata.digitalSignatureValid).toBe(true);
    });

    it('should reject invalid document and preserve isSimulatedMock: true', async () => {
      const result = await mockDigiLockerAdapter.verifyDocument({
        documentType: 'INCOME_CERTIFICATE',
        documentId: 'INVALID-DOC-000',
      });

      expect(result.isSimulatedMock).toBe(true);
      expect(result.isVerified).toBe(false);
      expect(result.metadata.authenticityScore).toBe(0.0);
    });

    it('should fetch document metadata with isSimulatedMock: true', async () => {
      const result = await mockDigiLockerAdapter.fetchDocumentMetadata(
        'in.gov.digilocker.caste_certificate.JH-ST-2023-99120'
      );

      expect(result.isSimulatedMock).toBe(true);
      expect(result.docType).toBe('CASTE_CERTIFICATE');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.verified).toBe(true);
    });
  });

  describe('MockDbtAdapter (Unit & Mock Guarantees)', () => {
    it('should return disbursement history with isSimulatedMock: true', async () => {
      const result = await mockDbtAdapter.getDisbursementStatus({
        applicationId: 'APP-NFST-2026-001',
      });

      expect(result.isSimulatedMock).toBe(true);
      expect(result.applicationId).toBe('APP-NFST-2026-001');
      expect(result.totalSanctionedAmount).toBe(350000.0);
      expect(result.disbursements.length).toBeGreaterThan(0);
      expect(result.disbursements[0]?.status).toBe('CREDITED');
      expect(result.disbursements[0]?.pfmsTransactionId).toContain('PFMS-TXN');
    });

    it('should return simulated failure records for failed application status', async () => {
      const result = await mockDbtAdapter.getDisbursementStatus({
        applicationId: 'APP-FAILED-DISBURSEMENT-99',
      });

      expect(result.isSimulatedMock).toBe(true);
      expect(result.disbursements[0]?.status).toBe('FAILED');
      expect(result.disbursements[0]?.failureReason).toBeDefined();
    });

    it('should simulate payment trigger order with isSimulatedMock: true', async () => {
      const result = await mockDbtAdapter.simulatePaymentTrigger({
        applicationId: 'APP-NFST-2026-001',
        amount: 87500.0,
        installmentNumber: 3,
        bankIfsc: 'SBIN0000123',
      });

      expect(result.isSimulatedMock).toBe(true);
      expect(result.status).toBe('INITIATED');
      expect(result.trackingId).toMatch(/^DBT-TRK-/);
      expect(result.pfmsReference).toContain('INST3');
    });
  });

  describe('MockBhashiniAdapter (Unit & Mock Guarantees)', () => {
    it('should translate domain terms into Hindi and Santali with isSimulatedMock: true', async () => {
      const hiResult = await mockBhashiniAdapter.translateText({
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        text: 'Caste Certificate',
      });

      expect(hiResult.isSimulatedMock).toBe(true);
      expect(hiResult.translatedText).toBe('जाति प्रमाण पत्र');
      expect(hiResult.engine).toContain('Simulated');

      const satResult = await mockBhashiniAdapter.translateText({
        sourceLanguage: 'en',
        targetLanguage: 'sat',
        text: 'Caste Certificate',
      });

      expect(satResult.isSimulatedMock).toBe(true);
      expect(satResult.translatedText).toBe('ᱡᱟᱹᱛ ᱥᱟᱨᱴᱤᱯᱷᱤᱠᱮᱴ');
    });

    it('should translate arbitrary notification strings with simulated prefix', async () => {
      const result = await mockBhashiniAdapter.translateText({
        sourceLanguage: 'en',
        targetLanguage: 'or',
        text: 'Please upload scanned copy of passbook within 7 days',
      });

      expect(result.isSimulatedMock).toBe(true);
      expect(result.translatedText).toContain('[BHASHINI-OR]:');
    });

    it('should list supported languages including Scheduled Tribe languages', async () => {
      const result = await mockBhashiniAdapter.getSupportedLanguages();

      expect(result.isSimulatedMock).toBe(true);
      const tribalLangs = result.languages.filter((l) => l.isTribalLanguage);
      expect(tribalLangs.length).toBeGreaterThanOrEqual(4);
      expect(tribalLangs.some((l) => l.code === 'sat')).toBe(true); // Santali
      expect(tribalLangs.some((l) => l.code === 'gon')).toBe(true); // Gondi
      expect(tribalLangs.some((l) => l.code === 'hoc')).toBe(true); // Ho
      expect(tribalLangs.some((l) => l.code === 'brx')).toBe(true); // Bodo
    });
  });

  describe('Integration HTTP API Endpoints (/api/v1/integrations)', () => {
    it('POST /api/v1/integrations/digilocker/verify should return 200 with isSimulatedMock: true', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/digilocker/verify')
        .send({
          documentType: 'CASTE_CERTIFICATE',
          documentId: 'JH-REV-2023-001',
          candidateName: 'Birsa Munda',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.isSimulatedMock).toBe(true);
      expect(res.body.data.isSimulatedMock).toBe(true);
      expect(res.body.data.isVerified).toBe(true);
    });

    it('POST /api/v1/integrations/digilocker/verify should return 400 on invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/digilocker/verify')
        .send({
          documentType: '', // invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('GET /api/v1/integrations/digilocker/metadata/:documentUri should return 200 with isSimulatedMock: true', async () => {
      const res = await request(app).get(
        '/api/v1/integrations/digilocker/metadata/in.gov.digilocker.caste_certificate.JH-ST-123'
      );

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.isSimulatedMock).toBe(true);
      expect(res.body.data.mimeType).toBe('application/pdf');
    });

    it('GET /api/v1/integrations/dbt/status/:applicationId should return 200 with isSimulatedMock: true', async () => {
      const res = await request(app).get('/api/v1/integrations/dbt/status/APP-NFST-2026-TEST');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.isSimulatedMock).toBe(true);
      expect(res.body.data.totalSanctionedAmount).toBe(350000.0);
    });

    it('POST /api/v1/integrations/dbt/simulate-disbursement should return 200 with isSimulatedMock: true', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/dbt/simulate-disbursement')
        .send({
          applicationId: 'APP-NFST-2026-TEST',
          amount: 87500.0,
          installmentNumber: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.isSimulatedMock).toBe(true);
      expect(res.body.data.status).toBe('INITIATED');
    });

    it('POST /api/v1/integrations/dbt/simulate-disbursement should return 400 on negative amount', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/dbt/simulate-disbursement')
        .send({
          applicationId: 'APP-NFST-2026-TEST',
          amount: -500,
          installmentNumber: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('POST /api/v1/integrations/bhashini/translate should return 200 with isSimulatedMock: true', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/bhashini/translate')
        .send({
          sourceLanguage: 'en',
          targetLanguage: 'hi',
          text: 'Income Certificate',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.isSimulatedMock).toBe(true);
      expect(res.body.data.translatedText).toBe('आय प्रमाण पत्र');
    });

    it('GET /api/v1/integrations/bhashini/languages should return 200 with isSimulatedMock: true', async () => {
      const res = await request(app).get('/api/v1/integrations/bhashini/languages');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.isSimulatedMock).toBe(true);
      expect(res.body.data.languages.length).toBeGreaterThanOrEqual(10);
    });
  });
});
