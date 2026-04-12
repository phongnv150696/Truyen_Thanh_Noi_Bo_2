import fs from 'fs';
import pg from 'pg';

const sql = fs.readFileSync('c:/Users/Admin/OneDrive/Tệp đính kèm/Truyen_Thanh_Noi_Bo/backend/database/init_step6_rbac.sql', 'utf8');
const client = new pg.Pool({
  connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw'
});

client.query(sql).then(() => {
  console.log("Migration successful");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
