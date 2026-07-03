import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async handleAppointmentCreated(appointmentId: string, startsAt: Date) {
    const startsTime = new Date(startsAt).getTime();
    const now = Date.now();

    // 1. Immediate confirmation email
    const confirmationReminder = await this.prisma.reminder.create({
      data: {
        appointmentId,
        type: 'EMAIL',
        scheduledAt: new Date(now),
        status: 'PENDING',
      },
    });

    await this.notificationsQueue.add('sendEmail', {
      reminderId: confirmationReminder.id,
      appointmentId,
      type: 'CONFIRMATION',
    });

    // 2. 24h reminder (Email)
    const time24h = startsTime - 24 * 60 * 60 * 1000;
    const delay24h = time24h - now;
    if (delay24h > 0) {
      const reminder24h = await this.prisma.reminder.create({
        data: {
          appointmentId,
          type: 'EMAIL',
          scheduledAt: new Date(time24h),
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add('sendEmail', {
        reminderId: reminder24h.id,
        appointmentId,
        type: 'REMINDER_24H',
      }, { delay: delay24h });
    }

    // 3. 2h reminder (SMS)
    const time2h = startsTime - 2 * 60 * 60 * 1000;
    const delay2h = time2h - now;
    if (delay2h > 0) {
      const reminder2h = await this.prisma.reminder.create({
        data: {
          appointmentId,
          type: 'SMS',
          scheduledAt: new Date(time2h),
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add('sendSMS', {
        reminderId: reminder2h.id,
        appointmentId,
        type: 'REMINDER_2H',
      }, { delay: delay2h });
    }
  }
}
