import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function seedSettings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw'
  });

  try {
    await client.connect();
    console.log('Connected to database for seeding settings...');

    // 1. Seed System Config (if not already there)
    const configs = [
      ['api_rate_limit', '100', 'Maximum requests per minute per IP'],
      ['broadcast_auto_archive', 'true', 'Automatically archive broadcast logs after 30 days'],
      ['ai_proposal_auto_approve', 'false', 'Automatically approve AI-generated schedule proposals'],
      ['system_log_level', 'info', 'Logging level for system events (debug, info, warn, error)']
    ];

    for (const [key, value, desc] of configs) {
      await client.query(
        'INSERT INTO system_config (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING',
        [key, value, desc]
      );
    }

    // 2. Seed Health Metrics (Sample history)
    const services = ['auth-service', 'media-service', 'broadcast-engine', 'api-gateway'];
    const now = new Date();

    for (let i = 0; i < 10; i++) {
        const recordedAt = new Date(now.getTime() - i * 3600000); // every hour
        for (const service of services) {
            const cpu = (Math.random() * 20 + 2).toFixed(2);
            const ram = Math.floor(Math.random() * 500000000 + 100000000); // 100MB - 600MB
            const status = Math.random() > 0.1 ? 'healthy' : 'degraded';
            
            await client.query(
                'INSERT INTO health_metrics (service_name, status, cpu_usage, memory_usage, uptime_seconds, recorded_at) VALUES ($1, $2, $3, $4, $5, $6)',
                [service, status, cpu, ram, 86400 * 10 + i * 3600, recordedAt]
            );
        }
    }

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await client.end();
  }
}

seedSettings();

