import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required');
    console.error('Example: DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    // Supabase requires SSL
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully');

    // Test the tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'credentials', 'token_generations')
      ORDER BY table_name
    `);

    console.log('✅ Created tables:', result.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();