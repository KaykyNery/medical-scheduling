import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { Twilio } from 'twilio';

@Processor('notifications')
export class SmsProcessor {
  private twilioClient: Twilio | null = null;

  constructor(private readonly prisma: PrismaService) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token && sid !== 'ACxxxx' && sid !== 'ACplaceholder' && token !== 'xxxx' && token !== 'placeholder') {
      this.twilioClient = new Twilio(sid, token);
    }
  }

  @Process('sendSMS')
  async handleSendSMS(job: any) {
    const { reminderId, appointmentId, type } = job.data as { reminderId: string; appointmentId: string; type: string };

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        professional: {
          include: { user: true },
        },
      },
    });

    if (!appointment) {
      console.warn(`[SmsProcessor] Appointment not found for ID: ${appointmentId}`);
      return;
    }

    const patientPhone = appointment.patient.phone || '';
    if (!patientPhone) {
      console.log(`[SmsProcessor] Patient has no phone number. Skipping SMS.`);
      await this.prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'SKIPPED',
        },
      });
      return;
    }

    const smsBody = `Olá ${appointment.patient.name}, lembrete de consulta com Dr(a). ` +
      `${appointment.professional.user.name} em 2 horas (${new Date(appointment.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}). ` +
      `Sua Clínica.`;

    console.log(`[SmsProcessor] Sending ${type} SMS to ${patientPhone}...`);
    console.log(`[SMS Mock Body] ${smsBody}\n`);

    if (this.twilioClient) {
      try {
        await this.twilioClient.messages.create({
          body: smsBody,
          to: patientPhone,
          from: process.env.TWILIO_FROM_NUMBER || '+5511999999999',
        });
      } catch (err) {
        console.error('[SmsProcessor] Error sending SMS via Twilio:', err);
      }
    }

    // Update reminder status in DB
    await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }
}
