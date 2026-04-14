const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Kết nối vào DB hệ thống để tạo DB mới
  password: 'YourStrongPassword',
  port: 5432,
};

async function restore() {
  const client = new Client(config);
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();

    // 1. Tạo Database openclaw
    console.log('Creating database "openclaw"...');
    try {
      await client.query('CREATE DATABASE openclaw');
      console.log('✅ Database created successfully.');
    } catch (err) {
      if (err.code === '42P04') {
        console.log('⚠️ Database "openclaw" already exists, skipping creation.');
      } else {
        throw err;
      }
    }
    await client.end();

    // 2. Sử dụng psql để nạp dữ liệu (psql mới hiểu được các lệnh \-command)
    console.log('Importing backup.sql using psql tool...');
    const { execSync } = require('child_process');
    const backupPath = path.join(__dirname, '..', 'backup.sql');
    
    // Đặt mật khẩu vào biến môi trường để psql không hỏi
    process.env.PGPASSWORD = config.password;
    
    try {
      const cmd = `"${path.join('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe')}" -U ${config.user} -p ${config.port} -d openclaw -f "${backupPath}"`;
      console.log(`Executing: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
      console.log('🚀 SYSTEM RESTORED SUCCESSFULLY!');
    } catch (importErr) {
      console.error('❌ IMPORT ERROR:', importErr.message);
      throw importErr;
    }
  } catch (error) {
    console.error('❌ RESTORE FAILED:', error.message);
    process.exit(1);
  } finally {
    delete process.env.PGPASSWORD;
  }
}

restore();
