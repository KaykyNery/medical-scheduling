const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '=== Iniciando Backend (NestJS) e Frontend (Next.js) em paralelo... ===\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Iniciar o Backend
const backend = spawn(npmCmd, ['run', 'start:dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Iniciar o Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

// Tratar encerramento do processo (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n\x1b[31m%s\x1b[0m', '=== Desconectando servidores... ===');
  
  if (isWindows) {
    // No Windows, encerra a árvore de processos do shell
    spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
    spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
  } else {
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
  }
  
  process.exit();
});
