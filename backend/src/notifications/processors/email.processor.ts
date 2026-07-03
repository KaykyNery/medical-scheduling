import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import * as sgMail from '@sendgrid/mail';

@Processor('notifications')
export class EmailProcessor {
  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey && apiKey !== 'SG.xxxx' && apiKey !== 'SG.placeholder') {
      sgMail.setApiKey(apiKey);
    }
  }

  @Process('sendEmail')
  async handleSendEmail(job: any) {
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
      console.warn(`[EmailProcessor] Appointment not found for ID: ${appointmentId}`);
      return;
    }

    const emailSubject = type === 'CONFIRMATION'
      ? 'Confirmação de Consulta Médica'
      : 'Lembrete de Consulta Médica (24h)';
      
    const emailBody = `Olá ${appointment.patient.name},\n\n` +
      `Sua consulta com o(a) Dr(a). ${appointment.professional.user.name} está agendada para: ` +
      `${new Date(appointment.startsAt).toLocaleString('pt-BR')}.\n\n` +
      `Especialidade: ${appointment.professional.specialty}.\n` +
      `Status: ${appointment.status}.\n\n` +
      `Caso precise cancelar, favor realizar com antecedência.\n\n` +
      `Atenciosamente,\nSua Clínica`;

    console.log(`[EmailProcessor] Sending ${type} email to ${appointment.patient.email}...`);
    console.log(`[Email Mock Subject] ${emailSubject}`);
    console.log(`[Email Mock Body]\n${emailBody}\n`);

    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey && apiKey !== 'SG.xxxx' && apiKey !== 'SG.placeholder') {
      try {
        await sgMail.send({
          to: appointment.patient.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@suaclinica.com.br',
          subject: emailSubject,
          text: emailBody,
        });
      } catch (err) {
        console.error('[EmailProcessor] Error sending email via SendGrid:', err);
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
