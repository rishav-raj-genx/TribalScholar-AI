import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { mockDigiLockerAdapter } from '../../adapters/mockDigiLocker.adapter.js';
import { mockDbtAdapter } from '../../adapters/mockDbt.adapter.js';
import { mockBhashiniAdapter } from '../../adapters/mockBhashini.adapter.js';
import { BadRequestError } from '../../middleware/errorHandler.js';

export const integrationsRouter: Router = Router();

// Validation Schemas
const digiLockerVerifySchema = z.object({
  documentType: z.string().min(1, 'documentType is required'),
  documentId: z.string().min(1, 'documentId is required'),
  issuerId: z.string().optional(),
  candidateName: z.string().optional(),
});

const dbtTriggerSchema = z.object({
  applicationId: z.string().min(1, 'applicationId is required'),
  amount: z.number().positive('amount must be positive'),
  installmentNumber: z.number().int().positive('installmentNumber must be positive integer'),
  bankIfsc: z.string().optional(),
});

const translationSchema = z.object({
  sourceLanguage: z.string().min(2, 'sourceLanguage is required'),
  targetLanguage: z.string().min(2, 'targetLanguage is required'),
  text: z.string().min(1, 'text cannot be empty'),
});

// ==============================================================================
// DigiLocker Endpoints
// ==============================================================================

/**
 * POST /api/v1/integrations/digilocker/verify
 * Simulated DigiLocker certificate verification endpoint.
 */
integrationsRouter.post(
  '/digilocker/verify',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = digiLockerVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Invalid DigiLocker verification request', parsed.error.format());
      }

      const result = await mockDigiLockerAdapter.verifyDocument(parsed.data);
      res.status(200).json({
        status: 'success',
        isSimulatedMock: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/integrations/digilocker/metadata/:documentUri
 * Simulated DigiLocker document metadata lookup.
 */
integrationsRouter.get(
  '/digilocker/metadata/:documentUri',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { documentUri } = req.params;
      if (!documentUri) {
        throw new BadRequestError('documentUri is required');
      }

      const result = await mockDigiLockerAdapter.fetchDocumentMetadata(documentUri);
      res.status(200).json({
        status: 'success',
        isSimulatedMock: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// DBT (Direct Benefit Transfer) Endpoints
// ==============================================================================

/**
 * GET /api/v1/integrations/dbt/status/:applicationId
 * Simulated DBT / PFMS scholarship disbursement status lookup.
 */
integrationsRouter.get(
  '/dbt/status/:applicationId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { applicationId } = req.params;
      if (!applicationId) {
        throw new BadRequestError('applicationId is required');
      }

      const result = await mockDbtAdapter.getDisbursementStatus({ applicationId });
      res.status(200).json({
        status: 'success',
        isSimulatedMock: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/integrations/dbt/simulate-disbursement
 * Simulated trigger order dispatching DBT installment to PFMS.
 */
integrationsRouter.post(
  '/dbt/simulate-disbursement',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = dbtTriggerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Invalid DBT payment trigger request', parsed.error.format());
      }

      const result = await mockDbtAdapter.simulatePaymentTrigger(parsed.data);
      res.status(200).json({
        status: 'success',
        isSimulatedMock: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// BHASHINI Translation Endpoints
// ==============================================================================

/**
 * POST /api/v1/integrations/bhashini/translate
 * Simulated regional language translation for scholar notifications and instructions.
 */
integrationsRouter.post(
  '/bhashini/translate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = translationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Invalid translation request', parsed.error.format());
      }

      const result = await mockBhashiniAdapter.translateText(parsed.data);
      res.status(200).json({
        status: 'success',
        isSimulatedMock: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/integrations/bhashini/languages
 * Catalog of supported Indic and Scheduled Tribe regional languages.
 */
integrationsRouter.get(
  '/bhashini/languages',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await mockBhashiniAdapter.getSupportedLanguages();
      res.status(200).json({
        status: 'success',
        isSimulatedMock: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
