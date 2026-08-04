const fs = require('fs');
const path = require('path');

const harPath = path.join(process.env.USERPROFILE, 'Desktop', 'MAPEAMENTO POKEPIXEL.har');
const fd = fs.openSync(harPath, 'r');
const buf = Buffer.alloc(2000);
fs.readSync(fd, buf, 0, 2000, 0);
fs.closeSync(fd);
console.log(buf.toString('utf8'));
