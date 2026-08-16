// Deploy pipeline feature to OVH server via SSH
const { Client } = require('ssh2');

const HOST = '141.95.55.5';
const USER = 'root';

const conn = new Client();

conn.on('ready', () => {
  console.log('[DEPLOY] Connected to server!');
  
  const commands = [
    'cd /opt/blivo && git fetch origin && git reset --hard origin/main',
    'cd /opt/blivo && docker compose down',
  ];
  
  // Run quick commands first
  let i = 0;
  function runQuick() {
    if (i >= commands.length) {
      // Now build (takes time)
      console.log('[DEPLOY] Building Docker...');
      conn.exec('cd /opt/blivo && docker compose build --no-cache 2>&1 | tail -10', { timeout: 600000 }, (err, stream) => {
        if (err) { console.error('[ERROR]', err); conn.end(); return; }
        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
          console.log('[BUILD] Done:', output.slice(-500));
          // Start
          conn.exec('cd /opt/blivo && docker compose up -d', (err, stream) => {
            if (err) { console.error('[ERROR]', err); conn.end(); return; }
            stream.on('data', (data) => { console.log(data.toString()); });
            stream.on('close', () => {
              console.log('[DEPLOY] Container started!');
              // Verify
              setTimeout(() => {
                conn.exec('curl -s https://demo.blivoai.com/api/payments/webhook 2>&1', (err, stream) => {
                  if (err) { console.error('[VERIFY ERROR]', err); conn.end(); return; }
                  stream.on('data', (data) => { console.log('[VERIFY]', data.toString()); });
                  stream.on('close', () => { conn.end(); });
                });
              }, 15000);
            });
          });
        });
      });
      return;
    }
    
    conn.exec(commands[i], (err, stream) => {
      if (err) { console.error('[ERROR]', err); conn.end(); return; }
      let output = '';
      stream.on('data', (data) => { output += data.toString(); });
      stream.stderr.on('data', (data) => { output += data.toString(); });
      stream.on('close', () => {
        console.log(`[STEP ${i+1}]`, output.slice(-300));
        i++;
        runQuick();
      });
    });
  }
  
  runQuick();
});

conn.on('error', (err) => {
  console.error('[SSH ERROR]', err.message);
  console.log('[INFO] Code has been pushed to GitHub. Deploy manually on server:');
  console.log('  cd /opt/blivo && git pull origin main && docker compose down && docker compose build --no-cache && docker compose up -d');
});

conn.connect({
  host: HOST,
  username: USER,
  readyTimeout: 10000,
  // No password/key — will fail and show manual instructions
});
