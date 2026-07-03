import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o semeio do banco de dados (seeding)...');

  // Limpar tabelas existentes para garantir um estado limpo
  await prisma.reminder.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.availability.deleteMany({});
  await prisma.professional.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('Teste123', 10);

  // 1. Criar Usuários Administrativos
  const admin = await prisma.user.create({
    data: {
      email: 'admin@suaclinica.com',
      name: 'Administrador do Sistema',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Admin criado: ${admin.email}`);

  const receptionist = await prisma.user.create({
    data: {
      email: 'recepcao@suaclinica.com',
      name: 'Recepcionista Maria',
      passwordHash,
      role: 'RECEPTIONIST',
    },
  });
  console.log(`Recepcionista criada: ${receptionist.email}`);

  // 2. Criar Pacientes de Teste
  const patient1 = await prisma.user.create({
    data: {
      email: 'paciente1@exemplo.com',
      name: 'João Silva',
      phone: '(11) 98888-7777',
      passwordHash,
      role: 'PATIENT',
    },
  });
  console.log(`Paciente 1 criado: ${patient1.email}`);

  const patient2 = await prisma.user.create({
    data: {
      email: 'paciente2@exemplo.com',
      name: 'Mariana Costa',
      phone: '(11) 99999-8888',
      passwordHash,
      role: 'PATIENT',
    },
  });
  console.log(`Paciente 2 criado: ${patient2.email}`);

  // 3. Criar Médicos (Profissionais)
  const userDoctor1 = await prisma.user.create({
    data: {
      email: 'dr.ana@suaclinica.com',
      name: 'Dra. Ana Souza',
      passwordHash,
      role: 'PROFESSIONAL',
    },
  });
  const doc1 = await prisma.professional.create({
    data: {
      userId: userDoctor1.id,
      specialty: 'Cardiologia',
      registrationId: 'CRM/SP-123456',
    },
  });
  console.log(`Médico 1 (Cardiologista) criado: ${userDoctor1.email}`);

  const userDoctor2 = await prisma.user.create({
    data: {
      email: 'dr.roberto@suaclinica.com',
      name: 'Dr. Roberto Alves',
      passwordHash,
      role: 'PROFESSIONAL',
    },
  });
  const doc2 = await prisma.professional.create({
    data: {
      userId: userDoctor2.id,
      specialty: 'Pediatria',
      registrationId: 'CRM/SP-654321',
    },
  });
  console.log(`Médico 2 (Pediatra) criado: ${userDoctor2.email}`);

  // 4. Configurar Disponibilidades Semanais
  // Dra. Ana atende Segunda (1), Quarta (3) e Sexta (5) das 08:00 às 12:00
  const daysAna = [1, 3, 5];
  for (const day of daysAna) {
    await prisma.availability.create({
      data: {
        professionalId: doc1.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '12:00',
        slotDuration: 30,
        isActive: true,
      },
    });
  }

  // Dr. Roberto atende Terça (2) e Quinta (4) das 13:00 às 17:00
  const daysRoberto = [2, 4];
  for (const day of daysRoberto) {
    await prisma.availability.create({
      data: {
        professionalId: doc2.id,
        dayOfWeek: day,
        startTime: '13:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: true,
      },
    });
  }

  console.log('Seeding concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao rodar o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
