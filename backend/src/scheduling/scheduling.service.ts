import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Appointment, AppointmentStatus } from '@prisma/client';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAvailableSlots(professionalId: string, dateStr: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      include: { availabilities: true },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();

    const availability = professional.availabilities.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isActive,
    );
    if (!availability) {
      return [];
    }

    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);

    const slotDuration = availability.slotDuration;
    const slots = [];

    let currentSlotStart = new Date(
      year,
      month - 1,
      day,
      startHour,
      startMin,
      0,
      0,
    );
    const dayEnd = new Date(year, month - 1, day, endHour, endMin, 0, 0);

    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayFinished = new Date(year, month - 1, day, 23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { not: 'CANCELLED' },
        startsAt: {
          gte: dayStart,
          lte: dayFinished,
        },
      },
    });

    const now = new Date();

    while (currentSlotStart < dayEnd) {
      const currentSlotEnd = new Date(
        currentSlotStart.getTime() + slotDuration * 60 * 1000,
      );
      if (currentSlotEnd > dayEnd) {
        break;
      }

      const isPast = currentSlotStart < now;

      const hasConflict = appointments.some((appt) => {
        const apptStart = new Date(appt.startsAt);
        const apptEnd = new Date(appt.endsAt);
        return currentSlotStart < apptEnd && currentSlotEnd > apptStart;
      });

      slots.push({
        startsAt: currentSlotStart.toISOString(),
        endsAt: currentSlotEnd.toISOString(),
        available: !isPast && !hasConflict,
      });

      currentSlotStart = currentSlotEnd;
    }

    return slots;
  }

  async createAppointment(
    dto: CreateAppointmentDto & { patientId: string },
  ): Promise<Appointment> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
      include: { availabilities: true },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    const startsAt = new Date(dto.startsAt);
    const now = new Date();
    if (startsAt < now) {
      throw new BadRequestException('Não é possível agendar no passado');
    }

    const dayOfWeek = startsAt.getDay();
    const availability = professional.availabilities.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isActive,
    );
    if (!availability) {
      throw new BadRequestException(
        'Profissional não tem horário configurado para este dia',
      );
    }

    const slotDuration = availability.slotDuration;
    const endsAt = new Date(startsAt.getTime() + slotDuration * 60 * 1000);

    // Validate that startsAt and endsAt are within availability times
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);

    const avStart = new Date(startsAt);
    avStart.setHours(startHour, startMin, 0, 0);
    const avEnd = new Date(startsAt);
    avEnd.setHours(endHour, endMin, 0, 0);

    if (startsAt < avStart || endsAt > avEnd) {
      throw new BadRequestException(
        'Horário fora da disponibilidade de atendimento do profissional',
      );
    }

    // Run selective FOR UPDATE transaction to lock and prevent double-booking
    const appointment = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM Professional
        WHERE id = ${dto.professionalId}
        FOR UPDATE
      `;

      const conflict: any[] = await tx.$queryRaw`
        SELECT id FROM Appointment
        WHERE professionalId = ${dto.professionalId}
        AND status NOT IN ('CANCELLED')
        AND startsAt < ${endsAt}
        AND endsAt > ${startsAt}
        FOR UPDATE
      `;

      if (conflict.length > 0) {
        throw new ConflictException('Horário indisponível');
      }

      return tx.appointment.create({
        data: {
          patientId: dto.patientId,
          professionalId: dto.professionalId,
          startsAt,
          endsAt,
          status: 'SCHEDULED',
          notes: dto.notes,
        },
        include: {
          patient: true,
          professional: {
            include: { user: true },
          },
        },
      });
    });

    // Call notification triggers outside of the transaction
    await this.notificationsService.handleAppointmentCreated(
      appointment.id,
      appointment.startsAt,
    );

    return appointment;
  }

  async cancelAppointment(
    id: string,
    reason: string,
    requestingUser?: { id: string; role: string },
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (
      requestingUser &&
      requestingUser.role === 'PATIENT' &&
      appointment.patientId !== requestingUser.id
    ) {
      throw new ForbiddenException(
        'Não autorizado a cancelar agendamento de outro paciente',
      );
    }

    if (
      appointment.status === 'COMPLETED' ||
      new Date(appointment.startsAt) < new Date()
    ) {
      throw new BadRequestException(
        'Não é possível cancelar uma consulta que já passou ou foi realizada',
      );
    }

    if (appointment.status === 'CANCELLED') {
      return appointment;
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
      },
    });
  }

  async confirmAppointment(id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
      },
    });

    // Trigger confirmation notification via email queue
    await this.notificationsService.handleAppointmentConfirmed(
      updatedAppointment.id,
    );

    return updatedAppointment;
  }

  async listAppointments(filters: {
    date?: string;
    professionalId?: string;
    status?: AppointmentStatus;
    patientId?: string;
  }): Promise<Appointment[]> {
    const where: any = {};

    if (filters.professionalId) {
      where.professionalId = filters.professionalId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters.date) {
      const [year, month, day] = filters.date.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      where.startsAt = {
        gte: dayStart,
        lte: dayEnd,
      };
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        professional: {
          include: { user: true },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: {
        patientId: userId,
      },
      include: {
        professional: {
          include: { user: true },
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
    });
  }
}
