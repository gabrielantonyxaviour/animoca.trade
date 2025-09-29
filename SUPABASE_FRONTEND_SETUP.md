# Frontend-Only Supabase Setup Guide

You're right! No backend needed. Here's how to connect your React app directly to Supabase.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **"Start your project"** → **"New project"**
2. Fill in:
   - **Name**: `air-credential-platform`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
3. Click **"Create new project"** (takes ~2 minutes)

## Step 2: Get Your Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Service Role Key**: `eyJ...` (the long one, NOT anon key)

## Step 3: Run Database Migration

```bash
# Install pg temporarily for migration
cd backend
npm install pg

# Run migration (replace with your actual connection string)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres" node migrate.js
```

You should see:
```
✅ Connected to database
✅ Migration completed successfully
✅ Created tables: credentials, token_generations, users
```

## Step 4: Setup Frontend Environment

```bash
# Copy environment file
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Your other existing variables...
VITE_MOCA_RPC_URL=https://devnet-rpc.mocachain.org
VITE_CHAIN_ID=5151
VITE_AIR_KIT_API_KEY=your-airkit-api-key
```

## Step 5: Test Database Connection

Add the test component to your app temporarily:

```tsx
// Add to your App.tsx or create a test page
import { DatabaseTest } from './components/DatabaseTest'

function App() {
  return (
    <div>
      {/* Your existing app */}
      <DatabaseTest />
    </div>
  )
}
```

Start your dev server:
```bash
npm run dev
```

Click **"Test Database Connection"** button. You should see:
```
✅ User created successfully
✅ Credential created successfully
✅ Token generation created successfully
✅ All database tests passed!
```

## Step 6: Use in Your Components

Now you can use the database services directly in your React components:

```tsx
import { UserService, CredentialService, TokenGenerationService } from './services/database'

// Example: Create a user when wallet connects
const handleWalletConnect = async (walletAddress: string) => {
  try {
    const user = await UserService.createUser({ wallet_address: walletAddress })
    console.log('User created/found:', user)
  } catch (error) {
    console.error('Error:', error)
  }
}

// Example: Get user's credentials
const loadUserCredentials = async (userId: string) => {
  try {
    const credentials = await CredentialService.findByUserId(userId)
    setCredentials(credentials)
  } catch (error) {
    console.error('Error loading credentials:', error)
  }
}

// Example: Record token generation
const recordTokenGeneration = async (data: CreateTokenGenerationData) => {
  try {
    const tokenGen = await TokenGenerationService.createTokenGeneration(data)
    console.log('Token generation recorded:', tokenGen)
  } catch (error) {
    console.error('Error recording token generation:', error)
  }
}
```

## What You Get

✅ **Direct database access** from your React app
✅ **No backend to host** - just Supabase + Vercel frontend
✅ **TypeScript types** for all your data models
✅ **Simple service functions** for all CRUD operations
✅ **Optimized for Supabase** with proper error handling

## Deploy to Vercel

1. Push your code to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - Your other env vars...
4. Deploy!

Your frontend will be able to access Supabase directly over HTTPS. No backend hosting needed! 🎯

## Important Notes

- **Service Role Key**: Bypasses all auth/security (perfect for your use case)
- **Data Validation**: Add validation in your React components since there's no backend
- **Error Handling**: All database errors are thrown as JavaScript errors
- **Caching**: Consider using React Query or SWR for data caching/refetching