import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

const isHttps = process.argv.includes('--https');

console.log('\n=============================================================');
console.log('🩺 CareLink Rural Telemedicine: Unified Dev Server');
console.log('📡 Starting Backend (Port 5000) & Frontend (Port 5173)...');
console.log('🌐 Frontend (Vite Dev):  http://127.0.0.1:5173 / http://localhost:5173');
console.log('🏥 Backend & Live App:   http://127.0.0.1:5000 / http://localhost:5000');
console.log('💡 Note: If your browser reports ERR_NETWORK_CHANGED on localhost,');
console.log('   navigate to http://127.0.0.1:5173 or http://127.0.0.1:5000');
console.log('=============================================================\n');

// 1. Spawn Backend Process
const backendCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const backend = spawn(backendCmd, ['run', 'dev'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '5000' },
});

// 2. Spawn Frontend Process
const frontendArgs = isHttps ? ['run', 'dev:https'] : ['run', 'dev:frontend'];
const frontend = spawn(backendCmd, frontendArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\nStopping CareLink development services...');
  try {
    if (backend.pid) process.kill(backend.pid);
  } catch {}
  try {
    if (frontend.pid) process.kill(frontend.pid);
  } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

backend.on('error', (err) => console.error('[Backend Error]:', err));
frontend.on('error', (err) => console.error('[Frontend Error]:', err));

backend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[Backend exited with code ${code}]`);
  }
});
frontend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[Frontend exited with code ${code}]`);
  }
});
