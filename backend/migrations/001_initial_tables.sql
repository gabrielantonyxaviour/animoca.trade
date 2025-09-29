-- Initial tables for AIR Credential platform
-- Users table: basic user info with wallet address
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  reputation_score INTEGER DEFAULT 0,
  total_tokens_generated TEXT DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credentials table: store credential info and proofs
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  credential_hash VARCHAR(66) UNIQUE NOT NULL,
  credential_data JSONB NOT NULL,
  aizk_proof JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  token_address VARCHAR(42),
  token_symbol VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token generations table: track token generation events
CREATE TABLE IF NOT EXISTS token_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
  token_address VARCHAR(42) NOT NULL,
  amount TEXT NOT NULL,
  transaction_hash VARCHAR(66) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  block_number BIGINT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_token_address ON credentials(token_address);
CREATE INDEX IF NOT EXISTS idx_token_generations_user_id ON token_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_token_generations_credential_id ON token_generations(credential_id);
CREATE INDEX IF NOT EXISTS idx_token_generations_token_address ON token_generations(token_address);
CREATE INDEX IF NOT EXISTS idx_token_generations_transaction_hash ON token_generations(transaction_hash);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();