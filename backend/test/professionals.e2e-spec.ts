import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('ProfessionalsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken: string;
  let patientToken: string;
  let targetUserForProfId: string;
  let targetUserForProfToken: string;
  let professionalId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // Setup users for test
    const passwordHash = await bcrypt.hash('password123', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: `test-e2e-admin-${Date.now()}@example.com`,
        passwordHash,
        name: 'Admin User',
        role: 'ADMIN',
      },
    });

    const patientUser = await prisma.user.create({
      data: {
        email: `test-e2e-patient-${Date.now()}@example.com`,
        passwordHash,
        name: 'Patient User',
        role: 'PATIENT',
      },
    });

    const targetUser = await prisma.user.create({
      data: {
        email: `test-e2e-profuser-${Date.now()}@example.com`,
        passwordHash,
        name: 'Professional User',
        role: 'PATIENT', // Will be updated to PROFESSIONAL
      },
    });
    targetUserForProfId = targetUser.id;

    // Login users to get tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    const patientLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: patientUser.email, password: 'password123' });
    patientToken = patientLogin.body.accessToken;

    const profLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: targetUser.email, password: 'password123' });
    targetUserForProfToken = profLogin.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.availability.deleteMany({
        where: {
          professional: {
            user: { email: { startsWith: 'test-e2e-prof' } },
          },
        },
      });

      await prisma.professional.deleteMany({
        where: {
          user: { email: { startsWith: 'test-e2e-prof' } },
        },
      });

      await prisma.user.deleteMany({
        where: {
          OR: [
            { email: { startsWith: 'test-e2e-admin-' } },
            { email: { startsWith: 'test-e2e-patient-' } },
            { email: { startsWith: 'test-e2e-profuser-' } },
          ],
        },
      });
    }
    await app.close();
  });

  describe('POST /professionals', () => {
    it('should fail if user is not authorized (Patient role)', async () => {
      await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          userId: targetUserForProfId,
          specialty: 'Pediatria',
          registrationId: 'CRM/SP 999999',
        })
        .expect(403);
    });

    it('should succeed if user is Admin, updating target user role to PROFESSIONAL', async () => {
      const response = await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: targetUserForProfId,
          specialty: 'Pediatria',
          registrationId: 'CRM/SP 999999',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(targetUserForProfId);
      expect(response.body.specialty).toBe('Pediatria');
      expect(response.body.registrationId).toBe('CRM/SP 999999');
      expect(response.body.user.role).toBe('PROFESSIONAL');

      professionalId = response.body.id;
    });

    it('should fail with conflict if profile already exists', async () => {
      await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: targetUserForProfId,
          specialty: 'Cardiologia',
          registrationId: 'CRM/SP 888888',
        })
        .expect(409);
    });
  });

  describe('GET /professionals', () => {
    it('should return list of professionals', async () => {
      const response = await request(app.getHttpServer())
        .get('/professionals')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      const prof = response.body.find((p: any) => p.id === professionalId);
      expect(prof).toBeDefined();
      expect(prof.specialty).toBe('Pediatria');
    });
  });

  describe('GET /professionals/specialties', () => {
    it('should return list of distinct specialties', async () => {
      const response = await request(app.getHttpServer())
        .get('/professionals/specialties')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('Pediatria');
    });
  });

  describe('PUT /professionals/:id/availability', () => {
    it('should fail if user is Patient', async () => {
      await request(app.getHttpServer())
        .put(`/professionals/${professionalId}/availability`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          availabilities: [
            {
              dayOfWeek: 1,
              startTime: '08:00',
              endTime: '12:00',
              slotDuration: 30,
              isActive: true,
            },
          ],
        })
        .expect(403);
    });

    it('should successfully update availability when requested by the professional', async () => {
      // Re-login professional user to get updated role claims in token!
      const user = await prisma.user.findUnique({
        where: { id: targetUserForProfId },
      });
      const profLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user?.email, password: 'password123' });
      targetUserForProfToken = profLogin.body.accessToken;

      const response = await request(app.getHttpServer())
        .put(`/professionals/${professionalId}/availability`)
        .set('Authorization', `Bearer ${targetUserForProfToken}`)
        .send({
          availabilities: [
            {
              dayOfWeek: 1, // Monday
              startTime: '08:00',
              endTime: '12:00',
              slotDuration: 30,
              isActive: true,
            },
            {
              dayOfWeek: 2, // Tuesday
              startTime: '14:00',
              endTime: '18:00',
              slotDuration: 20,
              isActive: true,
            },
          ],
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].dayOfWeek).toBe(1);
      expect(response.body[0].startTime).toBe('08:00');
      expect(response.body[0].endTime).toBe('12:00');
      expect(response.body[0].slotDuration).toBe(30);

      expect(response.body[1].dayOfWeek).toBe(2);
      expect(response.body[1].startTime).toBe('14:00');
      expect(response.body[1].endTime).toBe('18:00');
      expect(response.body[1].slotDuration).toBe(20);
    });
  });

  describe('GET /professionals/:id', () => {
    it('should return details with availabilities', async () => {
      const response = await request(app.getHttpServer())
        .get(`/professionals/${professionalId}`)
        .expect(200);

      expect(response.body.id).toBe(professionalId);
      expect(response.body.availabilities.length).toBe(2);
      expect(response.body.user.name).toBe('Professional User');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });
  });
});
