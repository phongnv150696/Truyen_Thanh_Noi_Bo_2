import bcrypt from 'bcrypt';
import fs from 'fs';

const password = 'OpenClaw@2024';
const hash = bcrypt.hashSync(password, 10);
fs.writeFileSync('new_hash.txt', hash);
console.log('Hash written to new_hash.txt');
console.log('Length:', hash.length);
