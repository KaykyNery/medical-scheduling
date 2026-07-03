# Conexão com o Banco de Dados MySQL

Esta página descreve os detalhes de conexão para acessar a base de dados do sistema de agendamento médico.

## Credenciais de Acesso

### Usuário Padrão (Acesso do Aplicativo)
- **Host**: `localhost`
- **Porta**: `3306`
- **Banco de Dados**: `agendamento`
- **Usuário**: `user`
- **Senha**: `password`

### Usuário Administrador (Root)
- **Host**: `localhost`
- **Porta**: `3306`
- **Banco de Dados**: `agendamento`
- **Usuário**: `root`
- **Senha**: `rootpassword`

---

## Instruções de Conexão no MySQL Workbench

1. Abra o **MySQL Workbench**.
2. Clique no ícone **"+"** ao lado de "MySQL Connections" para criar uma nova conexão.
3. Preencha os campos da seguinte forma:
   - **Connection Name**: `Clínica Diamantina`
   - **Connection Method**: `Standard (TCP/IP)`
   - **Hostname**: `localhost`
   - **Port**: `3306`
   - **Username**: `user` (ou `root` para acesso completo)
4. Clique em **"Store in Vault..."** no campo *Password* e insira a senha correspondente (`password` para o usuário `user`, ou `rootpassword` para o usuário `root`).
5. No campo **Default Schema**, preencha com `agendamento`.
6. Clique no botão **"Test Connection"** no canto inferior direito para verificar a conexão.
7. Clique em **"OK"** para salvar e abrir a conexão.
