import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

export const getDbClient = () => {
  // Tự động nhận diện môi trường: Codespaces mặc định cổng 5432, Local dùng 5433
  const isCodespaces = process.env.CODESPACE_NAME || process.env.GITHUB_WORKSPACE;
  const defaultPort = isCodespaces ? '5432' : '5433';
  const defaultHost = isCodespaces ? 'postgres' : 'localhost';
  
  const connectionString = process.env.DATABASE_URL || `postgresql://postgres:YourStrongPassword@${defaultHost}:${defaultPort}/openclaw`;
  
  console.log(`🔌 Connecting to database at: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
  
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
