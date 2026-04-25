const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  throw new Error('Could not detect a local IPv4 address.');
}

function getPortFromEnv(content) {
  const match = content.match(/^PORT=(\d+)$/m);
  return match ? Number(match[1]) : 5000;
}

function updateBaseUrl(ip) {
  const envPath = path.resolve(__dirname, '../.env');
  let content = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  const port = getPortFromEnv(content);
  const newLine = `BASE_URL=http://${ip}:${port}`;

  if (content.match(/^BASE_URL=.*/m)) {
    content = content.replace(/^BASE_URL=.*/m, newLine);
  } else {
    content = content.trimEnd();
    content = (content ? `${content}\n` : '') + `${newLine}\n`;
  }

  fs.writeFileSync(envPath, content);
  console.log(`Updated .env -> ${newLine}`);
}

try {
  const ip = getLocalIP();
  updateBaseUrl(ip);
} catch (err) {
  console.error('IP detection failed:', err.message);
  console.error('Proceeding with existing BASE_URL value.');
}
