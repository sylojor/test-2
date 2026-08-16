const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  const server = spawn('node', [path.join(__dirname, '..', '.next', 'standalone', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });

  server.stdout.on('data', (data) => {
    console.log(`[SERVER] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[SERVER ERR] ${data.toString().trim()}`);
  });

  server.on('exit', (code, signal) => {
    console.log(`Server exited with code ${code}, signal ${signal}. Restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  server.unref();
  console.log(`Server started with PID ${server.pid}`);
}

startServer();

// Keep the daemon alive
setInterval(() => {
  console.log('Daemon heartbeat at', new Date().toISOString());
}, 30000);
