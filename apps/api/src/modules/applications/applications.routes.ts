import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  Role,
  SchemeCode,
  DocumentType,
  ApplicationStatus,
  applicantProfileSchema,
  createApplicationSchema,
  updateApplicationFormSchema,
} from '@tribalscholar/shared';
import { applicationsService } from './applications.service.js';
import { documentUpload } from '../storage/storage.service.js';
import { authenticateJWT, requireRoles } from '../../middleware/auth.js';
import { BadRequestError } from '../../middleware/errorHandler.js';

function getRequestContext(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip || req.socket.remoteAddress;
  return {
    ipAddress: ip ?? null,
    userAgent: (req.headers['user-agent'] as string) ?? null,
  };
}

// ==============================================================================
// Applicant Router (/api/v1/applicant)
// ==============================================================================

export const applicantRouter: Router = Router();

/**
 * GET /api/v1/applicant/profile
 * Retrieves the profile of the authenticated applicant.
 */
applicantRouter.get(
  '/profile',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await applicationsService.getApplicantProfile(req.user!.id);
      res.status(200).json({
        status: 'success',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/applicant/profile
 * Creates or updates the profile of the authenticated applicant.
 */
applicantRouter.put(
  '/profile',
  authenticateJWT,
  requireRoles(Role.APPLICANT),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = applicantProfileSchema.parse(req.body);
      const context = getRequestContext(req);
      const profile = await applicationsService.upsertApplicantProfile(
        req.user!.id,
        validated,
        context
      );

      res.status(200).json({
        status: 'success',
        message: 'Applicant profile saved successfully',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// Applications Router (/api/v1/applications)
// ==============================================================================

export const applicationsRouter: Router = Router();

/**
 * POST /api/v1/applications
 * Initializes a new DRAFT application pinned to an active SchemeVersion.
 */
applicationsRouter.post(
  '/',
  authenticateJWT,
  requireRoles(Role.APPLICANT),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = createApplicationSchema.parse(req.body);
      const context = getRequestContext(req);
      const application = await applicationsService.createDraftApplication(
        req.user!.id,
        validated,
        context
      );

      res.status(201).json({
        status: 'success',
        message: 'Draft application initialized successfully',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/applications
 * Retrieves a list of applications. Applicants only see their own.
 */
applicationsRouter.get(
  '/',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schemeCode, status } = req.query;

      const filters = {
        schemeCode: schemeCode ? (schemeCode as SchemeCode) : undefined,
        status: status ? (status as ApplicationStatus) : undefined,
      };

      const applications = await applicationsService.getApplications(
        req.user!.id,
        req.user!.role,
        filters
      );

      res.status(200).json({
        status: 'success',
        data: applications,
        count: applications.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/applications/:id
 * Retrieves a single application with ownership verification, documents, and status timeline.
 */
applicationsRouter.get(
  '/:id',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      const application = await applicationsService.getApplicationById(
        id,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        status: 'success',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/applications/:id/form
 * Updates application formData. Allowed only in DRAFT or DEFICIENT status.
 */
applicationsRouter.patch(
  '/:id/form',
  authenticateJWT,
  requireRoles(Role.APPLICANT),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      const validated = updateApplicationFormSchema.parse(req.body);
      const context = getRequestContext(req);
      const updated = await applicationsService.updateApplicationFormData(
        id,
        req.user!.id,
        req.user!.role,
        validated.formData,
        context
      );

      res.status(200).json({
        status: 'success',
        message: 'Application form data updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/applications/:id/documents
 * Uploads a document attachment (PDF, PNG, JPEG), stores it in Object Storage,
 * and maintains version history.
 */
applicationsRouter.post(
  '/:id/documents',
  authenticateJWT,
  requireRoles(Role.APPLICANT),
  documentUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      if (!req.file) {
        throw new BadRequestError('File attachment is required (multipart field "file")');
      }

      const rawDocType = (req.body.docType || req.body.documentType || '')
        .toString()
        .trim()
        .toUpperCase();

      if (!rawDocType || !(rawDocType in DocumentType)) {
        throw new BadRequestError(
          `Invalid or missing document type '${rawDocType}'. Allowed types: ${Object.keys(DocumentType).join(', ')}`
        );
      }

      const context = getRequestContext(req);
      const document = await applicationsService.uploadApplicationDocument(
        id,
        req.user!.id,
        req.file,
        rawDocType as DocumentType,
        context
      );

      res.status(201).json({
        status: 'success',
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/applications/:id/documents/:docId/view
 * Generates a presigned view URL or streams file bytes directly for an authorized applicant or officer.
 */
applicationsRouter.get(
  '/:id/documents/:docId/view',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, docId } = req.params;
      if (!id || !docId) {
        throw new BadRequestError('Both application ID and document ID are required');
      }

      const { document, viewUrl, getStream } =
        await applicationsService.getApplicationDocumentForView(
          id,
          docId,
          req.user!.id,
          req.user!.role
        );

      if (req.query.stream === 'true') {
        const stream = await getStream();
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
        (stream as NodeJS.ReadableStream).pipe(res);
        return;
      }

      res.status(200).json({
        status: 'success',
        data: {
          documentId: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          version: document.version,
          isCurrent: document.isCurrent,
          verificationStatus: document.verificationStatus,
          viewUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
