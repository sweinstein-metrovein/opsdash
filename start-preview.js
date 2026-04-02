const fs = require('fs');
const path = require('path');

// Remove Next.js dev lock so preview server can start alongside user's server
const lockFile = path.join(__dirname, '.next', 'dev', 'server.lock');
try { fs.unlinkSync(lockFile); } catch (_) {}

process.chdir(__dirname);
process.argv.push('dev', '--port', '3002');
require('./node_modules/next/dist/bin/next');
