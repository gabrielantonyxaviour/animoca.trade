# Database Setup for Vercel Deployment

## Quick Setup Options

### Option 1: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy the database URL from Settings > Database
3. Set `DATABASE_URL` in your environment variables
4. Run migrations: `cd backend && DATABASE_URL="your-url" node migrate.js`

### Option 2: Vercel Postgres
1. In your Vercel dashboard, go to Storage tab
2. Create a new Postgres database
3. Copy the connection string
4. Add to your environment variables
5. Run migrations: `cd backend && DATABASE_URL="your-url" node migrate.js`

### Option 3: Railway
1. Go to [railway.app](https://railway.app) and create a project
2. Add a PostgreSQL service
3. Copy the database URL from the Variables tab
4. Set `DATABASE_URL` in your environment
5. Run migrations: `cd backend && DATABASE_URL="your-url" node migrate.js`

### Option 4: Neon (Serverless)
1. Go to [neon.tech](https://neon.tech) and create a database
2. Copy the connection string
3. Set `DATABASE_URL` in your environment
4. Run migrations: `cd backend && DATABASE_URL="your-url" node migrate.js`

## Local Development

For local development, use Docker:

```bash
# Start local PostgreSQL
docker-compose up postgres

# Run migrations
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/credential_platform" node migrate.js
```

## Environment Variables

Make sure to set these in your deployment environment:

```env
DATABASE_URL=postgresql://username:password@host:port/database
MOCA_DEVNET_RPC_URL=https://devnet-rpc.mocachain.org
CHAIN_ID=5151
AIR_KIT_API_KEY=your-airkit-api-key
AIR_KIT_ENVIRONMENT=development
```

## Database Schema

The migration creates 3 simple tables:

- **users**: `id`, `wallet_address`, `reputation_score`, `total_tokens_generated`
- **credentials**: `id`, `user_id`, `name`, `description`, `credential_hash`, `credential_data`, `aizk_proof`, `status`, `token_address`, `token_symbol`
- **token_generations**: `id`, `user_id`, `credential_id`, `token_address`, `amount`, `transaction_hash`, `status`, `block_number`

## Deployment to Vercel

1. Create a hosted database (Supabase/Vercel Postgres/Railway/Neon)
2. Set `DATABASE_URL` environment variable in Vercel
3. Deploy your backend as a separate service or use Vercel Functions
4. Your frontend on Vercel can connect to the backend API

## Notes

- No Redis needed (removed for simplicity)
- No JWT auth (using Moca AirKit)
- Optimized for fast deployment and minimal infrastructure