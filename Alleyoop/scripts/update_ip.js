const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip loopback and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  throw new Error('Could not detect a local IPv4 address.');
}

function updateEnv(ip) {
  const envPath = path.resolve(__dirname, '../.env');
  let content = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  const newLine = `EXPO_PUBLIC_API_BASE_URL=http://${ip}:5000`;
  if (content.match(/^EXPO_PUBLIC_API_BASE_URL=.*/m)) {
    content = content.replace(/^EXPO_PUBLIC_API_BASE_URL=.*/m, newLine);
  } else {
    content = content.trimEnd();
    content = (content ? content + '\n' : '') + newLine + '\n';
  }

  fs.writeFileSync(envPath, content);
  console.log(`✓ Updated .env → ${newLine}`);
}

try {
  const ip = getLocalIP();
  updateEnv(ip);
} catch (err) {
  console.error('⚠ IP detection failed:', err.message);
  console.error('  Proceeding with existing .env value.');
}