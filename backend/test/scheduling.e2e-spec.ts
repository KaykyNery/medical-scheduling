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

describe('SchedulingController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let patient1Token: string;
  let patient2Token: string;
  let patient1Id: string;
  let patient2Id: string;
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

    // Setup users
    const passwordHash = await bcrypt.hash('password123', 10);

    const user1 = await prisma.user.create({
      data: {
        email: `test-e2e-sched-p1-${Date.now()}@example.com`,
        passwordHash,
        name: 'Patient One',
        role: 'PATIENT',
      },
    });
    patient1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `test-e2e-sched-p2-${Date.now()}@example.com`,
        passwordHash,
        name: 'Patient Two',
        role: 'PATIENT',
      },
    });
    patient2Id = user2.id;

    const profUser = await prisma.user.create({
      data: {
        email: `test-e2e-sched-prof-${Date.now()}@example.com`,
        passwordHash,
        name: 'Dr. House',
        role: 'PROFESSIONAL',
      },
    });

    const prof = await prisma.professional.create({
      data: {
        userId: profUser.id,
        specialty: 'Infectologia',
        registrationId: `CRM/SP-SCHED-${Date.now()}`,
      },
    });
    professionalId = prof.id;

    // Configure availability for Dr. House (Monday = 1)
    await prisma.availability.create({
      data: {
        professionalId: prof.id,
        dayOfWeek: 1, // Monday
        startTime: '08:00',
        endTime: '12:00',
        slotDuration: 30,
        isActive: true,
      },
    });

    // Login patients
    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user1.email, password: 'password123' });
    patient1Token = login1.body.accessToken;

    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user2.email, password: 'password123' });
    patient2Token = login2.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.reminder.deleteMany({
        where: {
          appointment: {
            professional: {
              user: { email: { startsWith: 'test-e2e-sched-' } },
            },
          },
        },
      });

      await prisma.appointment.deleteMany({
        where: {
          professional: {
            user: { email: { startsWith: 'test-e2e-sched-' } },
          },
        },
      });

      await prisma.availability.deleteMany({
        where: {
          professional: {
            user: { email: { startsWith: 'test-e2e-sched-' } },
          },
        },
      });

      await prisma.professional.deleteMany({
        where: {
          user: { email: { startsWith: 'test-e2e-sched-' } },
        },
      });

      await prisma.user.deleteMany({
        where: {
          email: { startsWith: 'test-e2e-sched-' },
        },
      });
    }
    await app.close();
  });

  // Monday date helper in the future (e.g. 2026-06-29 was a Monday)
  // Let's use a specific future Monday, e.g. 2026-10-12 (which is a Monday)
  const futureMondayDateStr = '2026-10-12';
  const slotStartsAt = '2026-10-12T12:00:00.000Z';

  describe('GET /scheduling/available-slots', () => {
    it('should list slots for the professional', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/scheduling/available-slots?professionalId=${professionalId}&date=${futureMondayDateStr}`,
        )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(8); // 8:00 to 12:00 with 30min slots = 8 slots
      const slot = response.body.find((s: any) => s.startsAt === slotStartsAt);
      expect(slot).toBeDefined();
      expect(slot.available).toBe(true);
    });
  });

  describe('POST /scheduling/appointments (Double-Booking Race Condition Protection)', () => {
    it('should successfully book a slot and reject concurrent double-booking requests', async () => {
      // Simulate concurrent requests trying to book the exact same slot
      const req1 = request(app.getHttpServer())
        .post('/scheduling/appointments')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          professionalId,
          startsAt: slotStartsAt,
          notes: 'First checkup',
        });

      const req2 = request(app.getHttpServer())
        .post('/scheduling/appointments')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          professionalId,
          startsAt: slotStartsAt,
          notes: 'Second checkup',
        });

      // Run parallel
      const [res1, res2] = await Promise.all([req1, req2]);

      // Assert: One must succeed and the other must fail with 409 Conflict
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.message).toContain('Horário indisponível');
    });

    it('should show the booked slot as unavailable', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/scheduling/available-slots?professionalId=${professionalId}&date=${futureMondayDateStr}`,
        )
        .expect(200);

      const slot = response.body.find((s: any) => s.startsAt === slotStartsAt);
      expect(slot.available).toBe(false);
    });
  });
});
