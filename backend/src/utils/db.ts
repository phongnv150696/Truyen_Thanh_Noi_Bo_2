import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

export const getDbClient = () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw';
  return new Client({
    connectionString,
  });
};

export const runQuery = async (query: string, params: any[] = []) => {
  const client = getDbClient();
  try {
    await client.connect();
    const res = await client.query(query, params);
    return res;
  } finally {
    await client.end();
  }
};
