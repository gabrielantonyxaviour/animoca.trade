import pkg from 'pg';
const { Client } = pkg;

async function testDatabase() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Testing Supabase connection...');
    await client.connect();
    console.log('✅ Connected to database');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database query successful:', result.rows[0].current_time);

    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'credentials', 'token_generations')
      ORDER BY table_name
    `);

    if (tables.rows.length === 3) {
      console.log('✅ All tables exist:', tables.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('⚠️  Missing tables. Run migration first: node migrate.js');
      console.log('Found tables:', tables.rows.map(r => r.table_name).join(', '));
    }

    // Test insert/select (create a test user)
    try {
      const testWallet = '0x1234567890123456789012345678901234567890';

      // Try to insert test user
      await client.query(`
        INSERT INTO users (wallet_address, reputation_score, total_tokens_generated)
        VALUES ($1, $2, $3)
        ON CONFLICT (wallet_address) DO NOTHING
      `, [testWallet, 100, '1000']);

      // Select the user
      const user = await client.query('SELECT * FROM users WHERE wallet_address = $1', [testWallet]);

      if (user.rows.length > 0) {
        console.log('✅ Database read/write working');
        console.log('Test user:', {
          id: user.rows[0].id,
          wallet: user.rows[0].wallet_address,
          reputation: user.rows[0].reputation_score
        });
      }

    } catch (err) {
      console.log('⚠️  Tables exist but read/write failed:', err.message);
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

testDatabase();