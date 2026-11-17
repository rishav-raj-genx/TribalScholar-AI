import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { Role } from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { authService } from '../modules/auth/auth.service.js';

describe('Auth & RBAC Module Integration Tests', () => {
  const timestamp = Date.now();
  const testApplicantEmail = `test-applicant-${timestamp}@scholar.gov.in`;
  const testApplicantPassword = 'ValidPassword@123';
  let applicantToken: string;
  let scrutinyToken: string;
  let selectionToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Obtain tokens for pre-seeded users
    const scrutinyLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'scrutiny@mota.gov.in', password: 'Password@123' });
    scrutinyToken = scrutinyLogin.body.accessToken || scrutinyLogin.body.data.accessToken;

    const selectionLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'selection@mota.gov.in', password: 'Password@123' });
    selectionToken = selectionLogin.body.accessToken || selectionLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@mota.gov.in', password: 'Password@123' });
    adminToken = adminLogin.body.accessToken || adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up created test user accounts
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-applicant-',
        },
      },
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new applicant successfully and return JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testApplicantEmail,
          password: testApplicantPassword,
          fullName: 'Sita Soren',
          phone: '+919876543299',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('accessToken');
      expect(typeof data.accessToken).toBe('string');
      expect(data.user).toMatchObject({
        email: testApplicantEmail,
        fullName: 'Sita Soren',
        role: Role.APPLICANT,
        isActive: true,
      });

      applicantToken = data.accessToken;
    });

    it('should reject registration if email is already registered (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testApplicantEmail,
          password: testApplicantPassword,
          fullName: 'Duplicate Scholar',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration with invalid email or weak password (400 Validation Error)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: '123', // less than 8 chars
          fullName: 'A', // less than 2 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in newly registered applicant', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testApplicantEmail,
          password: testApplicantPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const data = res.body.data || res.body;
      expect(data.accessToken).toBeDefined();
      expect(data.user.email).toBe(testApplicantEmail);
      expect(data.user.role).toBe(Role.APPLICANT);
    });

    it('should successfully log in seeded users for all roles', async () => {
      const rolesToTest = [
        { email: 'applicant@demo.in', role: Role.APPLICANT },
        { email: 'scrutiny@mota.gov.in', role: Role.SCRUTINY_OFFICER },
        { email: 'selection@mota.gov.in', role: Role.SELECTION_OFFICER },
        { email: 'admin@mota.gov.in', role: Role.ADMIN },
      ];

      for (const credential of rolesToTest) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: credential.email,
            password: 'Password@123',
          });

        expect(res.status).toBe(200);
        const data = res.body.data || res.body;
        expect(data.user.role).toBe(credential.role);
        expect(data.accessToken).toBeDefined();
      }
    });

    it('should reject login with incorrect password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testApplicantEmail,
          password: 'WrongPassword@999',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject login for non-existent email (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent-user-404@mota.gov.in',
          password: 'Password@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the current user profile when valid Bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(200);
      const user = res.body.data || res.body.user;
      expect(user.email).toBe(testApplicantEmail);
      expect(user.fullName).toBe('Sita Soren');
      expect(user.role).toBe(Role.APPLICANT);
      expect(user.isActive).toBe(true);
    });

    it('should reject request when Authorization header is missing (401)', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authorization header missing');
    });

    it('should reject request when Authorization header is malformed (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `InvalidScheme ${applicantToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Invalid authorization format');
    });

    it('should reject request when token is invalid or tampered (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('JWT Expiration Handling', () => {
    it('should reject request when JWT is expired (401 Token expired)', async () => {
      // Generate a token that expired 10 seconds ago
      const expiredToken = authService.generateToken(
        {
          id: 'test-expired-user-id',
          email: 'expired@demo.in',
          role: Role.APPLICANT,
        },
        -10
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toBe('Token expired');
    });
  });

  describe('RBAC Middleware & Route Guards', () => {
    it('should reject APPLICANT trying to access officer-only route (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/officer-only')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Insufficient permissions');
    });

    it('should allow SCRUTINY_OFFICER to access officer-only route (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/officer-only')
        .set('Authorization', `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Welcome to the officer evaluation portal');
    });

    it('should allow SELECTION_OFFICER to access officer-only route (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/officer-only')
        .set('Authorization', `Bearer ${selectionToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should allow ADMIN to access officer-only route (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/officer-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should reject SCRUTINY_OFFICER from admin-only route (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow ADMIN to access admin-only route (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe('Welcome to the system administration console');
    });
  });
});
