import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      // Clean up test data if needed
      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test-e2e-auth-',
          },
        },
      });
    }
    await app.close();
  });

  const testEmail = `test-e2e-auth-${Date.now()}@example.com`;
  const testPassword = 'password123';
  const testName = 'Test User E2E';
  let accessToken: string;
  let refreshToken: string;

  describe('/auth/register (POST)', () => {
    it('should successfully register a new user and not return passwordHash', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
          phone: '(11) 98888-7777',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testEmail);
      expect(response.body.name).toBe(testName);
      expect(response.body.role).toBe('PATIENT');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail to register with the same email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
          phone: '(11) 98888-7777',
        })
        .expect(409);

      expect(response.body.message).toContain('E-mail já cadastrado');
    });

    it('should fail validation with invalid email or short password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
          name: testName,
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should successfully login and return access and refresh tokens, excluding passwordHash', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user).not.toHaveProperty('passwordHash');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail to login with wrong credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    it('should successfully return the profile for an authenticated user, excluding passwordHash', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testEmail);
      expect(response.body.name).toBe(testName);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should block unauthorized access', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should successfully refresh the access and refresh tokens', async () => {
      // Wait 1 second to ensure new token has different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(accessToken);
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should fail to refresh with an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });
});
