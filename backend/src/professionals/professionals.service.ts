import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProfessionalDto) {
    // Check if registrationId (CRM) is already in use
    const existingByCrm = await this.prisma.professional.findUnique({
      where: { registrationId: dto.registrationId },
    });
    if (existingByCrm) {
      throw new ConflictException(
        'CRM já está cadastrado por outro profissional',
      );
    }

    if (dto.userId) {
      const uId = dto.userId;
      // Flow 1: Link existing user
      const user = await this.prisma.user.findUnique({
        where: { id: uId },
      });
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const existingByUser = await this.prisma.professional.findUnique({
        where: { userId: uId },
      });
      if (existingByUser) {
        throw new ConflictException('Usuário já possui perfil de profissional');
      }

      return this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: uId },
          data: { role: 'PROFESSIONAL' },
        });

        const professional = await tx.professional.create({
          data: {
            userId: uId,
            specialty: dto.specialty,
            registrationId: dto.registrationId,
            isActive: true,
          },
        });

        // Create Availabilities if provided
        if (dto.availabilities && dto.availabilities.length > 0) {
          await tx.availability.createMany({
            data: dto.availabilities.map((item) => ({
              professionalId: professional.id,
              dayOfWeek: item.dayOfWeek,
              startTime: item.startTime,
              endTime: item.endTime,
              slotDuration: dto.slotDuration || 30,
              isActive: true,
            })),
          });
        }

        return tx.professional.findUnique({
          where: { id: professional.id },
          include: {
            user: true,
            availabilities: true,
          },
        });
      });
    } else {
      // Flow 2: Create new user + link professional
      if (!dto.name || !dto.email || !dto.phone) {
        throw new BadRequestException(
          'Nome, e-mail e telefone são obrigatórios para novo médico',
        );
      }

      const docName = dto.name;
      const docEmail = dto.email;
      const docPhone = dto.phone;

      const existingUser = await this.prisma.user.findUnique({
        where: { email: docEmail },
      });
      if (existingUser) {
        throw new ConflictException('E-mail já cadastrado');
      }

      const passwordHash = await bcrypt.hash('Teste123', 10);

      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: docName,
            email: docEmail,
            phone: docPhone,
            passwordHash,
            role: 'PROFESSIONAL',
          },
        });

        const professional = await tx.professional.create({
          data: {
            userId: user.id,
            specialty: dto.specialty,
            registrationId: dto.registrationId,
            isActive: true,
          },
        });

        // Create Availabilities if provided
        if (dto.availabilities && dto.availabilities.length > 0) {
          await tx.availability.createMany({
            data: dto.availabilities.map((item) => ({
              professionalId: professional.id,
              dayOfWeek: item.dayOfWeek,
              startTime: item.startTime,
              endTime: item.endTime,
              slotDuration: dto.slotDuration || 30,
              isActive: true,
            })),
          });
        }

        return tx.professional.findUnique({
          where: { id: professional.id },
          include: {
            user: true,
            availabilities: true,
          },
        });
      });
    }
  }

  async updateAvailability(professionalId: string, dto: UpdateAvailabilityDto) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete existing availabilities
      await tx.availability.deleteMany({
        where: { professionalId },
      });

      // Create new availabilities
      await tx.availability.createMany({
        data: dto.availabilities.map((item) => ({
          professionalId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          slotDuration:
            item.slotDuration !== undefined ? item.slotDuration : 30,
          isActive: item.isActive !== undefined ? item.isActive : true,
        })),
      });

      return tx.availability.findMany({
        where: { professionalId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  async listAll(onlyActive = false) {
    return this.prisma.professional.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        user: true,
        availabilities: true,
      },
    });
  }

  async findById(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        user: true,
        availabilities: true,
      },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }
    return professional;
  }

  async listSpecialties(): Promise<string[]> {
    const distinctSpecialties = await this.prisma.professional.findMany({
      where: { isActive: true },
      select: { specialty: true },
      distinct: ['specialty'],
    });
    return distinctSpecialties.map((item) => item.specialty);
  }

  async update(id: string, dto: UpdateProfessionalDto) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    // Check if registrationId (CRM) is already in use by another professional
    if (
      dto.registrationId &&
      dto.registrationId !== professional.registrationId
    ) {
      const existingByCrm = await this.prisma.professional.findUnique({
        where: { registrationId: dto.registrationId },
      });
      if (existingByCrm) {
        throw new ConflictException(
          'CRM já está cadastrado por outro profissional',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update user fields if provided
      if (dto.name || dto.email || dto.phone) {
        // Check email uniqueness if email is changing
        if (dto.email && dto.email !== professional.user.email) {
          const emailExists = await tx.user.findUnique({
            where: { email: dto.email },
          });
          if (emailExists) {
            throw new ConflictException(
              'E-mail já cadastrado por outro usuário',
            );
          }
        }

        await tx.user.update({
          where: { id: professional.userId },
          data: {
            name: dto.name || undefined,
            email: dto.email || undefined,
            phone: dto.phone || undefined,
          },
        });
      }

      // 2. Update professional fields if provided
      if (dto.specialty || dto.registrationId) {
        await tx.professional.update({
          where: { id },
          data: {
            specialty: dto.specialty || undefined,
            registrationId: dto.registrationId || undefined,
          },
        });
      }

      // 3. Update availabilities if provided
      if (dto.availabilities) {
        // Delete old availabilities
        await tx.availability.deleteMany({
          where: { professionalId: id },
        });

        // Create new ones
        if (dto.availabilities.length > 0) {
          await tx.availability.createMany({
            data: dto.availabilities.map((item) => ({
              professionalId: id,
              dayOfWeek: item.dayOfWeek,
              startTime: item.startTime,
              endTime: item.endTime,
              slotDuration: 30,
              isActive: true,
            })),
          });
        }
      }

      return tx.professional.findUnique({
        where: { id },
        include: {
          user: true,
          availabilities: true,
        },
      });
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return this.prisma.professional.update({
      where: { id },
      data: { isActive },
      include: {
        user: true,
        availabilities: true,
      },
    });
  }

  async softDelete(id: string) {
    return this.updateStatus(id, false);
  }
}
