import { spawn } from 'child_process';

console.log("\n🚀 Starting Galaxia Full-Stack Development Tool (Backend + Vite UI)...\n");

const server = spawn('node', ['server/index.mjs'], { stdio: 'inherit', shell: true });
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

function cleanup() {
  server.kill();
  vite.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
