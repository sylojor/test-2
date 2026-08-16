const { exec } = require('child_process');
const http = require('http');

// Start the server as a child process
const child = exec('node .next/standalone/server.js', {
  cwd: '/home/z/my-project',
  env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0', NODE_ENV: 'production' },
});

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('exit', (code) => {
  console.log('Server exited with code', code);
  process.exit(code);
});

// Keep the process alive
function heartbeat() {
  http.get('http://127.0.0.1:3000/api/plans', (res) => {
    console.log('Heartbeat:', res.statusCode, new Date().toISOString());
  }).on('error', (e) => {
    console.log('Heartbeat error:', e.message);
  });
}

setTimeout(() => {
  heartbeat();
  setInterval(heartbeat, 60000);
}, 5000);
