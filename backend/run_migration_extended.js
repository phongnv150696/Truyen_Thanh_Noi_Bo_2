import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const migrationPath = 'c:/Users/Admin/OneDrive/Tệp đính kèm/Truyen_Thanh_Noi_Bo/backend/database/migration_extended_profile.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

const client = new Pool({
  connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw'
});

console.log(`Running migration from: ${migrationPath}`);

client.query(sql).then(() => {
  console.log("Migration successful");
  process.exit(0);
}).catch(err => {
  console.error("Migration failed:");
  console.error(err);
  process.exit(1);
});
