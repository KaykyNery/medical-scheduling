# 🏥 Sistema de Agendamento Médico

> Uma plataforma de alta performance, resiliente e escalável para agendamento e gestão de consultas médicas. Desenvolvida com arquitetura orientada a eventos para processamento assíncrono de notificações.

---

## 🚀 Tecnologias Utilizadas

### **Backend**
- **Framework**: [NestJS](https://nestjs.com/) (Node.js & TypeScript)
- **Banco de Dados Relacional**: MySQL 8.0 com [Prisma ORM](https://www.prisma.io/)
- **Fila & Cache**: Redis 7 com [Bull Queue](https://github.com/OptimalBits/bull) (Arquitetura Event-Driven)
- **Autenticação**: JWT (JSON Web Tokens) + Passport + Bcrypt (RBAC: `PATIENT`, `PROFESSIONAL`, `RECEPTIONIST`, `ADMIN`)
- **Provedores de Notificação**: SendGrid API (E-mail com retentativa e backoff exponencial) e Twilio (SMS)
- **Documentação da API**: Swagger / OpenAPI (`/api/docs`)

### **Frontend**
- **Framework**: [Next.js](https://nextjs.org/) (App Router & React)
- **Estilização**: TailwindCSS (Design moderno, responsivo e adaptativo)
- **Gerenciamento de Estado**: TanStack Query (React Query) + Axios
- **Ícones**: Lucide React

### **Infraestrutura & DevOps**
- **Containerização**: Docker & Docker Compose (MySQL e Redis)
- **Execução em Paralelo**: Script Node.js concorrente para ambiente de desenvolvimento

---

## ✨ Principais Funcionalidades

### 🔐 **Autenticação & Controle de Acesso (RBAC)**
- Autenticação via JWT com Refresh Tokens.
- Papéis e permissões granulares: Paciente, Profissional de Saúde, Recepcionista e Administrador.

### 📅 **Gestão de Agendamentos & Horários**
- Cálculo dinâmico de horários disponíveis baseado na agenda semanal do profissional.
- Proteção contra **Double-Booking** através de transações de banco com trava seletiva (`FOR UPDATE`).
- Regras de cancelamento estritas: bloqueio automático para consultas passadas ou concluídas.

### ⚡ **Arquitetura Assíncrona de Notificações (Bull & Redis)**
- Envio de e-mails de confirmação e lembretes processados em segundo plano via fila dedicada (`email-notification-queue`).
- **Resiliência & Retry Policy**: Política de até 5 retentativas com **Exponential Backoff** para instabilidades no SendGrid.
- **Proteção LGPD/GDPR**: E-mails contêm apenas informações essenciais de agendamento (sem inclusão de notas médicas ou diagnósticos sensíveis).
- **Segurança Antifraude**: Higienização rigorosa contra **HTML Injection** e suporte a Dynamic Templates do SendGrid.
- **Rastreabilidade**: Tabela de auditoria `Reminder` atualizada com os status `PENDING`, `SENT` ou `FAILED`.

---

## 🛠️ Como Executar o Projeto

### **Pré-requisitos**
- [Node.js](https://nodejs.org/) (v18+ ou v22+)
- [Docker Desktop](https://www.docker.com/) instalado e rodando
- Gerenciador de pacotes `npm`

---

### **1. Clonar o Repositório**
```bash
git clone https://github.com/seu-usuario/medical-scheduling.git
cd medical-scheduling
```

---

### **2. Configurar Variáveis de Ambiente (.env)**

Crie o arquivo `.env` na pasta `backend/` com base no arquivo `.env.example`:

```bash
cp backend/.env.example backend/.env
```

Ajuste as variáveis no `backend/.env` conforme necessário:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=mysql://user:password@localhost:3306/agendamento
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=seu_secret_super_seguro
JWT_EXPIRES_IN=15m
SENDGRID_API_KEY=SG.sua_chave_aqui
SENDGRID_FROM_EMAIL=seu_email_verificado@dominio.com
```

---

### **3. Subir os Serviços (MySQL & Redis)**
Na raiz do projeto, inicie os containers Docker em segundo plano:
```bash
docker compose up -d
```
> Isso iniciará o **MySQL** na porta `3306` e o **Redis** na porta `6379`.

---

### **4. Rodar as Migrações e Seeder do Banco**
Acesse o diretório do backend para executar as migrações do Prisma e alimentar o banco com dados iniciais (profissionais, horários e usuários de teste):

```bash
cd backend
npm install
npx prisma migrate deploy
npm run seed
cd ..
```

---

### **5. Iniciar a Aplicação (Backend & Frontend em Paralelo)**
Na raiz do projeto, instale as dependências e inicie ambos os servidores com um único comando:

```bash
npm install
node start-all.js
```

---

## 📌 URLs da Aplicação

- 💻 **Frontend (Interface do Usuário)**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend (API NestJS)**: [http://localhost:3001](http://localhost:3001)
- 📖 **Documentação Interativa (Swagger)**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## 🧪 Testes e Qualidade de Código

### **Executar Testes do Backend**
```bash
cd backend
npm test          # Testes Unitários
npm run test:e2e  # Testes End-to-End
```

---

## 📄 Licença
Este projeto está sob a licença [MIT](./LICENSE).
