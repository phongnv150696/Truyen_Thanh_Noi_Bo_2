import bcrypt from 'bcrypt';

const password = 'OpenClaw@2024';
const hash = '$2b$10$dsxYwZUFcCbT.NX7suWNHua3g74Gj24ULX6ChmDmDjffyMVCR.nZKa';

async function test() {
  const result = await bcrypt.compare(password, hash);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log(`Match: ${result}`);
}

test();
