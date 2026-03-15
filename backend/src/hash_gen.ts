import bcrypt from 'bcrypt';
const password = 'OpenClaw@2024';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Valid Hash:', hash);
});
