# ⚙️ Medical Scheduling - Backend API (NestJS)

> API RESTful desenvolvida com NestJS, Prisma ORM, MySQL e arquitetura de filas de mensagens assíncronas atrelada ao Redis.

---

## 🏛️ Arquitetura do Sistema

```
                         +------------------------+
                         |   Next.js Frontend     |
                         +-----------+------------+
                                     | (HTTP/REST)
                                     v
                         +------------------------+
                         |      NestJS API        |
                         +-----+------------+-----+
                               |            |
             +-----------------+            +-----------------+
             |                              |                 |
             v                              v                 v
     +---------------+              +---------------+ +---------------+
     |  MySQL (8.0)  |              | Redis (Bull)  | | SendGrid/SMS  |
     | (Prisma ORM)  |              | (Queue Jobs)  | |  (Providers)  |
     +---------------+              +---------------+ +---------------+
```

---

## 📦 Módulos Principais

- **`AuthModule`**: Autenticação via JWT, rota de login, registro, refresh token e guardas de permissão (`RolesGuard`).
- **`UsersModule`**: Gestão de usuários e perfis.
- **`ProfessionalsModule`**: Gestão de médicos, CRM, especialidades e disponibilidade de horários.
- **`SchedulingModule`**: Algoritmo de geração de slots livres, agendamento com trava concorrente (`FOR UPDATE`), confirmação e cancelamento com validações de data.
- **`NotificationsModule`**: Integração com Bull Queue (Redis), envio de e-mails via SendGrid com política de Exponential Backoff e envio de SMS via Twilio.
- **`ProceduresModule`**: Cadastro e manutenção de procedimentos médicos.

---

## 🔧 Comandos Úteis

### **Desenvolvimento**
```bash
npm run start:dev  # Inicia a aplicação no modo Watch (hot-reload)
```

### **Build e Produção**
```bash
npm run build      # Compila o projeto TypeScript para dist/
npm run start:prod # Inicia a aplicação em modo de produção
```

### **Banco de Dados (Prisma)**
```bash
npx prisma studio          # Abre o painel visual de gerenciamento do banco
npx prisma migrate dev     # Cria e aplica uma nova migração
npx prisma db seed         # Executa o script de população de dados iniciais
```

---

## 📖 Swagger API Documentation

A documentação interativa das rotas pode ser acessada em:
`http://localhost:3001/api/docs`
