import pg from 'pg';
const { Client } = pg;

async function test() {
  const connectionStrings = [
    'postgresql://postgres:YourStrongPassword@127.0.0.1:5432/openclaw',
    'postgresql://postgres@127.0.0.1:5432/openclaw',
    'postgresql://postgres:postgres@127.0.0.1:5432/openclaw',
    'postgresql://postgres:OpenClaw@2024@127.0.0.1:5432/openclaw'
  ];

  for (const str of connectionStrings) {
    console.log(`Testing: ${str}`);
    const client = new Client({ connectionString: str });
    try {
      await client.connect();
      console.log('SUCCESS!');
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  process.exit(1);
}

test();
