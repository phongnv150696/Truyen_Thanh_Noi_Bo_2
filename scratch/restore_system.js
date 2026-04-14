const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: 'postgres', // Kết nối vào DB hệ thống để tạo DB mới
  password: process.env.POSTGRES_PASSWORD || 'YourStrongPassword',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
};

async function restore() {
  const client = new Client(config);
  try {
    console.log(`Connecting to PostgreSQL at ${config.host}:${config.port}...`);
    await client.connect();

    const targetDB = process.env.POSTGRES_DB || 'openclaw';

    // 1. Tạo Database
    console.log(`Creating database "${targetDB}"...`);
    try {
      await client.query(`CREATE DATABASE ${targetDB}`);
      console.log('✅ Database created successfully.');
    } catch (err) {
      if (err.code === '42P04') {
        console.log(`⚠️ Database "${targetDB}" already exists, skipping creation.`);
      } else {
        throw err;
      }
    }
    await client.end();

    // 2. Sử dụng psql để nạp dữ liệu
    console.log('Importing backup.sql using psql tool...');
    const backupPath = path.join(__dirname, '..', 'backup.sql');
    
    // Đặt mật khẩu vào biến môi trường để psql không hỏi
    process.env.PGPASSWORD = config.password;
    
    try {
      // Tìm psql: thử đường dẫn mặc định Windows, nếu không thấy thì dùng 'psql' (PATH)
      let psqlCmd = 'psql';
      const windowsPsql = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
      if (process.platform === 'win32' && fs.existsSync(windowsPsql)) {
        psqlCmd = `"${windowsPsql}"`;
      }

      const cmd = `${psqlCmd} -h ${config.host} -U ${config.user} -p ${config.port} -d ${targetDB} -f "${backupPath}"`;
      console.log(`Executing: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
      console.log('✅ Data imported successfully.');
    } catch (importErr) {
      console.error('❌ IMPORT ERROR:', importErr.message);
      throw importErr;
    }

    // 3. Reset Admin Password
    console.log('Resetting admin password to "123456"...');
    const dbClient = new Client({ ...config, database: targetDB });
    await dbClient.connect();
    
    const newHash = await bcrypt.hash('123456', 10);
    const updateResult = await dbClient.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [newHash, 'admin']
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Admin password has been reset to: 123456');
    } else {
      console.warn('⚠️ User "admin" not found. Check your backup.sql data.');
    }
    await dbClient.end();

    console.log('🚀 SYSTEM RESTORED AND OPTIMIZED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ RESTORE FAILED:', error.message);
    process.exit(1);
  } finally {
    delete process.env.PGPASSWORD;
  }
}

restore();
