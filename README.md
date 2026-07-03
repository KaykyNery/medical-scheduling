# Sistema de Agendamento Médico

Este projeto possui um backend em **NestJS** e um frontend em **Next.js**.

---

## Como Executar o Projeto

Siga os passos abaixo no seu terminal (na raiz do projeto):

### 1. Configurar o Path do Node.js (se necessário no Windows)
Caso o Node.js não esteja configurado globalmente, adicione o caminho local ao seu terminal:
```powershell
$env:Path = "C:\Users\Privat\.gemini\antigravity-ide\scratch\node-v22.13.0-win-x64;" + $env:Path
```

### 2. Iniciar Banco de Dados & Redis (Docker)
Certifique-se de que o Docker Desktop está aberto e execute:
```powershell
docker compose up -d
```
*Isso inicializa o **MySQL** (porta `3306`) e o **Redis** (porta `6379`).*

### 3. Rodar as Migrations do Banco de Dados
Acesse a pasta `backend/` e crie as tabelas executando:
```powershell
cd backend
npx prisma migrate deploy
cd ..
```

### 4. Iniciar a Aplicação (Backend & Frontend)
Na raiz do projeto, execute o script para rodar ambos em paralelo:
```powershell
node start-all.js
```

A aplicação estará disponível em:
- **Frontend (Interface)**: `http://localhost:3000`
- **Backend (API/Swagger)**: `http://localhost:3001/api`

---

## Acesso e Conexão ao Banco
As credenciais e detalhes do banco de dados MySQL estão disponíveis em [DATABASE_CONNECTION.md](file:///c:/Users/Privat/.gemini/antigravity-ide/scratch/medical-scheduling/DATABASE_CONNECTION.md).
