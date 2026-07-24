import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import sgMail from '@sendgrid/mail';

function sanitizeHtml(value: string): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

interface TemplateData {
  patientName: string;
  doctorName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  type: string;
}

function getPrecompiledHtmlTemplate(data: TemplateData): string {
  const isConfirmation = data.type === 'CONFIRMATION';
  const title = isConfirmation
    ? 'Consulta Confirmada!'
    : 'Lembrete de Consulta';
  const headerColor = '#4f46e5'; // Indigo/violet premium color

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
        .header { background-color: ${headerColor}; padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.05em; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111827; }
        .intro { font-size: 16px; line-height: 1.5; color: #4b5563; margin-bottom: 24px; }
        .instructions { background-color: #eef2ff; border-left: 4px solid ${headerColor}; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; }
        .instructions-title { font-size: 15px; font-weight: 600; color: #3730a3; margin-bottom: 4px; }
        .instructions-text { font-size: 14px; color: #4338ca; line-height: 1.4; margin: 0; }
        .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <div class="greeting">Olá, ${data.patientName}!</div>
            <p class="intro">
              ${isConfirmation
      ? 'Sua consulta foi confirmada com sucesso! Confira abaixo todos os detalhes do seu agendamento.'
      : 'Este é um lembrete amigável de que você possui uma consulta agendada para amanhã.'
    }
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #6b7280; font-weight: 500;">Profissional:</td>
                <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; font-weight: 600;">Dr(a). ${data.doctorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #6b7280; font-weight: 500;">Especialidade:</td>
                <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; font-weight: 600;">${data.specialty}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #6b7280; font-weight: 500;">Data:</td>
                <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; font-weight: 600;">${data.appointmentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #6b7280; font-weight: 500;">Horário:</td>
                <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; font-weight: 600;">${data.appointmentTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Local:</td>
                <td align="right" style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">${data.clinicAddress}</td>
              </tr>
            </table>
            <div class="instructions">
              <div class="instructions-title">Instruções Importantes</div>
              <p class="instructions-text">
                Recomendamos chegar com 15 minutos de antecedência. Lembre-se de trazer um documento de identificação com foto e eventuais exames anteriores relevantes.
              </p>
            </div>
          </div>
          <div class="footer">
            <p><strong>${data.clinicName}</strong></p>
            <p>Telefone de contato: ${data.clinicPhone}</p>
            <p>&copy; ${new Date().getFullYear()} ${data.clinicName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

@Processor('email-notification-queue')
export class EmailProcessor {
  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey && apiKey !== 'SG.xxxx' && apiKey !== 'SG.placeholder') {
      sgMail.setApiKey(apiKey);
    }
  }

  @Process('sendEmail')
  async handleSendEmail(job: Job) {
    const { reminderId, appointmentId, type } = job.data as {
      reminderId: string;
      appointmentId: string;
      type: string;
    };

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
      console.warn(
        `[EmailProcessor] Appointment not found for ID: ${appointmentId}`,
      );
      return;
    }

    const emailSubject =
      type === 'CONFIRMATION'
        ? 'Confirmação de Consulta Médica'
        : 'Lembrete de Consulta Médica (24h)';

    // Format startsAt date and time to PT-BR (e.g. 14/07/2026, 19:49)
    const startsAtDate = new Date(appointment.startsAt);
    const appointmentDateFormatted = startsAtDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const appointmentTimeFormatted = startsAtDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Basic plain text body for fallback/fallback-text
    const emailBody =
      `Olá ${appointment.patient.name},\n\n` +
      `Sua consulta com o(a) Dr(a). ${appointment.professional.user.name} está agendada para: ` +
      `${appointmentDateFormatted} às ${appointmentTimeFormatted}.\n\n` +
      `Especialidade: ${appointment.professional.specialty}.\n` +
      `Status: ${appointment.status}.\n\n` +
      `Caso precise cancelar, favor realizar com antecedência.\n\n` +
      `Atenciosamente,\nSua Clínica`;

    console.log(
      `[EmailProcessor] Sending ${type} email to ${appointment.patient.email}...`,
    );

    const apiKey = process.env.SENDGRID_API_KEY;
    const templateId = process.env.SENDGRID_TEMPLATE_ID;
    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL || 'agendamento@clincadiamantina.com';
    const clinicName = process.env.CLINIC_NAME || 'Clínica Diamantina';
    const clinicAddress =
      process.env.CLINIC_ADDRESS ||
      'RUA A, 1000, Bairro A, Diamantina - MG';
    const clinicPhone = process.env.CLINIC_PHONE || '(11) 3200-0000';

    if (apiKey && apiKey !== 'SG.xxxx' && apiKey !== 'SG.placeholder') {
      try {
        if (templateId) {
          // Send via SendGrid Dynamic Templates
          await sgMail.send({
            to: appointment.patient.email,
            from: fromEmail,
            templateId: templateId,
            dynamicTemplateData: {
              patientName: sanitizeHtml(appointment.patient.name),
              doctorName: sanitizeHtml(appointment.professional.user.name),
              specialty: sanitizeHtml(appointment.professional.specialty),
              appointmentDate: appointmentDateFormatted,
              appointmentTime: appointmentTimeFormatted,
              clinicName: sanitizeHtml(clinicName),
              clinicAddress: sanitizeHtml(clinicAddress),
              clinicPhone: sanitizeHtml(clinicPhone),
              isConfirmation: type === 'CONFIRMATION',
            },
          });
        } else {
          // Fallback to secure pre-compiled HTML template
          const htmlContent = getPrecompiledHtmlTemplate({
            patientName: sanitizeHtml(appointment.patient.name),
            doctorName: sanitizeHtml(appointment.professional.user.name),
            specialty: sanitizeHtml(appointment.professional.specialty),
            appointmentDate: appointmentDateFormatted,
            appointmentTime: appointmentTimeFormatted,
            clinicName: sanitizeHtml(clinicName),
            clinicAddress: sanitizeHtml(clinicAddress),
            clinicPhone: sanitizeHtml(clinicPhone),
            type,
          });

          await sgMail.send({
            to: appointment.patient.email,
            from: fromEmail,
            subject: emailSubject,
            html: htmlContent,
            text: emailBody,
          });
        }
      } catch (err) {
        console.error(
          '[EmailProcessor] Error sending email via SendGrid:',
          err,
        );
        throw err; // Rethrow to trigger Bull retry & backoff
      }
    } else {
      console.log(`[Email Mock Subject] ${emailSubject}`);
      console.log(`[Email Mock Body]\n${emailBody}\n`);
    }

    // Update reminder status in DB to SENT
    await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  @OnQueueFailed()
  async handleFailedJob(job: Job, err: Error) {
    const { reminderId } = job.data as { reminderId: string };
    if (!reminderId) return;

    const maxAttempts = job.opts.attempts || 1;
    if (job.attemptsMade >= maxAttempts) {
      try {
        await this.prisma.reminder.update({
          where: { id: reminderId },
          data: {
            status: 'FAILED',
          },
        });
        console.error(
          `[EmailProcessor] Job ${job.id} for Reminder ${reminderId} has FAILED after reaching maximum attempts (${job.attemptsMade}).`,
        );
      } catch (dbErr) {
        console.error(
          `[EmailProcessor] Failed to update reminder status to FAILED in database:`,
          dbErr,
        );
      }
    } else {
      console.warn(
        `[EmailProcessor] Job ${job.id} for Reminder ${reminderId} failed (Attempt ${job.attemptsMade}/${maxAttempts}). Retrying later. Error: ${err.message}`,
      );
    }
  }
}
