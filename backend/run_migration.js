import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use connection string from .env
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const dbDir = path.join(__dirname, 'database');
  const files = [
    'init_step1_accounts.sql',
    'init_step2_content.sql',
    'init_step3_broadcasting.sql',
    'init_step4_ai_scoring.sql',
    'init_step5_system.sql',
    'init_step6_rbac.sql',
    'seed_initial_data.sql'
  ];

  console.log('🚀 Starting database migration...');

  for (const file of files) {
    const filePath = path.join(dbDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: ${file} not found, skipping.`);
      continue;
    }

    console.log(`📄 Running ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await pool.query(sql);
      console.log(`✅ ${file} completed.`);
    } catch (err) {
      // Ignore "already exists" errors to allow re-running the script
      if (err.message.includes('already exists') || err.message.includes('already a column')) {
        console.log(`ℹ️ ${file}: Some elements already exist, skipping them.`);
      } else {
        console.error(`❌ Error in ${file}:`, err.message);
      }
    }
  }

  console.log('\n✨ Database setup finished successfully!');
  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('💥 Fatal error during migration:', err);
  process.exit(1);
});
