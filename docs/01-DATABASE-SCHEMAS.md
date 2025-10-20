# Database Schemas & TypeScript Types

This document contains all Supabase table schemas and corresponding TypeScript types for the Animoca Trade platform.

---

## Table of Contents

1. [Core Market Tables](#core-market-tables)
2. [Stake & Slashing Tables](#stake--slashing-tables)
3. [Trading & Analytics Tables](#trading--analytics-tables)
4. [User & Verification Tables](#user--verification-tables)
5. [TypeScript Types](#typescript-types)
6. [Database Functions](#database-functions)

---

## Core Market Tables

### 1. `credentials`

Stores all credential tokens (education, professional, skills).

```sql
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- On-chain identifiers
  credential_id TEXT UNIQUE NOT NULL,  -- bytes32 from contract
  token_address TEXT UNIQUE NOT NULL,

  -- Token metadata
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  description TEXT,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('education', 'professional', 'skill', 'other')),

  -- Issuer information
  issuer_name TEXT NOT NULL,
  issuer_address TEXT NOT NULL,  -- Creator/owner wallet
  issuer_platform TEXT,  -- e.g., 'MIT', 'AWS', 'Google'

  -- Stake (NEW: Issuer stakes USDC to create)
  stake_amount NUMERIC NOT NULL DEFAULT 0,  -- in USDC (6 decimals)
  stake_tx_hash TEXT,

  -- Verification
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_method TEXT,  -- 'ethos', 'manual', 'worldcoin'
  verification_tx_hash TEXT,
  verified_at TIMESTAMPTZ,

  -- Slashing state
  is_slashed BOOLEAN DEFAULT FALSE,
  total_slashed_amount NUMERIC DEFAULT 0,
  last_slashed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional metadata (JSON)
  metadata JSONB DEFAULT '{}'::jsonb
  -- Example: { "logoUrl": "...", "nftImageUrl": "...", "requirements": {...} }
);

-- Indexes
CREATE INDEX idx_credentials_issuer ON credentials(issuer_address);
CREATE INDEX idx_credentials_type ON credentials(credential_type);
CREATE INDEX idx_credentials_verification ON credentials(verification_status);
CREATE INDEX idx_credentials_slashed ON credentials(is_slashed);

-- Full-text search
CREATE INDEX idx_credentials_search ON credentials
  USING gin(to_tsvector('english', token_name || ' ' || COALESCE(description, '')));

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. `personas`

Stores persona tokens (influencers with multiple credentials).

```sql
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- On-chain identifiers
  persona_id TEXT UNIQUE NOT NULL,  -- bytes32 from contract
  token_address TEXT UNIQUE NOT NULL,

  -- Token metadata
  token_name TEXT NOT NULL,  -- e.g., "Vitalik Buterin"
  token_symbol TEXT NOT NULL,  -- e.g., "VITALIK"
  bio TEXT,

  -- Owner (the influencer)
  owner_address TEXT NOT NULL,

  -- Stake (NEW: Owner stakes USDC to create)
  stake_amount NUMERIC NOT NULL DEFAULT 0,  -- in USDC (6 decimals)
  stake_tx_hash TEXT,

  -- Verification
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_method TEXT,  -- 'ethos', 'worldcoin', 'gitcoin_passport'
  verification_score NUMERIC,  -- e.g., EthOS trust score
  verification_tx_hash TEXT,
  verified_at TIMESTAMPTZ,

  -- Slashing state
  is_slashed BOOLEAN DEFAULT FALSE,
  total_slashed_amount NUMERIC DEFAULT 0,
  last_slashed_at TIMESTAMPTZ,

  -- Reputation metrics
  reputation_score NUMERIC DEFAULT 0,
  total_credentials_linked INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional metadata (JSON)
  metadata JSONB DEFAULT '{}'::jsonb
  -- Example: { "avatarUrl": "...", "bannerUrl": "...", "socialLinks": {...} }
);

-- Indexes
CREATE INDEX idx_personas_owner ON personas(owner_address);
CREATE INDEX idx_personas_verification ON personas(verification_status);
CREATE INDEX idx_personas_slashed ON personas(is_slashed);
CREATE INDEX idx_personas_reputation ON personas(reputation_score DESC);

-- Full-text search
CREATE INDEX idx_personas_search ON personas
  USING gin(to_tsvector('english', token_name || ' ' || COALESCE(bio, '')));

-- Updated timestamp trigger
CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. `persona_credentials`

Links personas to their verified credentials (many-to-many).

```sql
CREATE TABLE persona_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  credential_id UUID NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,

  -- Verification
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  proof_tx_hash TEXT,
  proof_data JSONB,  -- Additional proof metadata

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(persona_id, credential_id)
);

-- Indexes
CREATE INDEX idx_persona_credentials_persona ON persona_credentials(persona_id);
CREATE INDEX idx_persona_credentials_credential ON persona_credentials(credential_id);

-- Trigger to update persona's total_credentials_linked
CREATE OR REPLACE FUNCTION update_persona_credential_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE personas
  SET total_credentials_linked = (
    SELECT COUNT(*) FROM persona_credentials WHERE persona_id = NEW.persona_id AND is_active = TRUE
  )
  WHERE id = NEW.persona_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER persona_credential_added
  AFTER INSERT OR UPDATE ON persona_credentials
  FOR EACH ROW EXECUTE FUNCTION update_persona_credential_count();
```

---

## Stake & Slashing Tables

### 4. `stake_deposits`

Tracks all stake deposits (for both credentials and personas).

```sql
CREATE TABLE stake_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Entity type
  entity_type TEXT NOT NULL CHECK (entity_type IN ('credential', 'persona')),

  -- Foreign keys (one will be NULL based on entity_type)
  credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  -- Staker
  staker_address TEXT NOT NULL,  -- issuer or persona owner

  -- Stake details
  amount NUMERIC NOT NULL,  -- in USDC (6 decimals)
  tx_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'slashed', 'withdrawn')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (
    (entity_type = 'credential' AND credential_id IS NOT NULL AND persona_id IS NULL) OR
    (entity_type = 'persona' AND persona_id IS NOT NULL AND credential_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_stake_deposits_credential ON stake_deposits(credential_id);
CREATE INDEX idx_stake_deposits_persona ON stake_deposits(persona_id);
CREATE INDEX idx_stake_deposits_staker ON stake_deposits(staker_address);
CREATE INDEX idx_stake_deposits_status ON stake_deposits(status);
```

---

### 5. `slashing_proposals`

Governance proposals to slash stake for bad behavior.

```sql
CREATE TABLE slashing_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- On-chain proposal ID
  proposal_id NUMERIC UNIQUE NOT NULL,

  -- Target entity
  entity_type TEXT NOT NULL CHECK (entity_type IN ('credential', 'persona')),
  credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  -- Proposer
  proposer_address TEXT NOT NULL,

  -- Proposal details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_links TEXT[],  -- Array of URLs to evidence

  -- Slash amount
  slash_amount NUMERIC NOT NULL,  -- Amount to slash from stake
  slash_percentage NUMERIC,  -- Percentage of total stake

  -- Voting
  votes_for NUMERIC DEFAULT 0,
  votes_against NUMERIC DEFAULT 0,
  quorum_required NUMERIC NOT NULL,
  voting_ends_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passed', 'rejected', 'executed', 'cancelled')),

  -- Execution
  executed_at TIMESTAMPTZ,
  execution_tx_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (
    (entity_type = 'credential' AND credential_id IS NOT NULL AND persona_id IS NULL) OR
    (entity_type = 'persona' AND persona_id IS NOT NULL AND credential_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_proposals_credential ON slashing_proposals(credential_id);
CREATE INDEX idx_proposals_persona ON slashing_proposals(persona_id);
CREATE INDEX idx_proposals_status ON slashing_proposals(status, voting_ends_at);
CREATE INDEX idx_proposals_proposer ON slashing_proposals(proposer_address);
CREATE INDEX idx_proposals_created ON slashing_proposals(created_at DESC);
```

---

### 6. `slashing_votes`

Individual votes on slashing proposals.

```sql
CREATE TABLE slashing_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Proposal reference
  proposal_id UUID NOT NULL REFERENCES slashing_proposals(id) ON DELETE CASCADE,

  -- Voter
  voter_address TEXT NOT NULL,

  -- Vote
  vote_type TEXT NOT NULL CHECK (vote_type IN ('for', 'against', 'abstain')),
  voting_power NUMERIC NOT NULL,  -- Based on token holdings at snapshot block

  -- Transaction
  tx_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(proposal_id, voter_address)
);

-- Indexes
CREATE INDEX idx_votes_proposal ON slashing_votes(proposal_id);
CREATE INDEX idx_votes_voter ON slashing_votes(voter_address);

-- Trigger to update proposal vote counts
CREATE OR REPLACE FUNCTION update_proposal_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE slashing_proposals
  SET
    votes_for = (SELECT COALESCE(SUM(voting_power), 0) FROM slashing_votes WHERE proposal_id = NEW.proposal_id AND vote_type = 'for'),
    votes_against = (SELECT COALESCE(SUM(voting_power), 0) FROM slashing_votes WHERE proposal_id = NEW.proposal_id AND vote_type = 'against')
  WHERE id = NEW.proposal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vote_counts
  AFTER INSERT OR UPDATE ON slashing_votes
  FOR EACH ROW EXECUTE FUNCTION update_proposal_votes();
```

---

## Trading & Analytics Tables

### 7. `pools`

AMM liquidity pools for both credential and persona markets.

```sql
CREATE TABLE pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Market type
  pool_type TEXT NOT NULL CHECK (pool_type IN ('credential', 'persona')),

  -- Foreign keys
  credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,

  -- Contract addresses
  token_address TEXT NOT NULL,
  amm_address TEXT NOT NULL,

  -- Reserves (updated from events)
  token_reserves NUMERIC NOT NULL DEFAULT 0,
  usdc_reserves NUMERIC NOT NULL DEFAULT 0,
  total_liquidity NUMERIC NOT NULL DEFAULT 0,

  -- Calculated fields
  current_price NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN token_reserves > 0 THEN usdc_reserves / token_reserves
      ELSE 0
    END
  ) STORED,

  -- Pool state
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  CHECK (
    (pool_type = 'credential' AND credential_id IS NOT NULL AND persona_id IS NULL) OR
    (pool_type = 'persona' AND persona_id IS NOT NULL AND credential_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_pools_credential ON pools(credential_id);
CREATE INDEX idx_pools_persona ON pools(persona_id);
CREATE INDEX idx_pools_type_active ON pools(pool_type, is_active);
CREATE INDEX idx_pools_token ON pools(token_address);
CREATE INDEX idx_pools_price ON pools(current_price DESC);
```

---

### 8. `swaps`

All swap transactions (buys and sells).

```sql
CREATE TABLE swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Pool reference
  pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,

  -- Market references (denormalized for queries)
  credential_id UUID REFERENCES credentials(id),
  persona_id UUID REFERENCES personas(id),

  -- Trader
  trader_address TEXT NOT NULL,

  -- Swap details
  swap_type TEXT NOT NULL CHECK (swap_type IN ('buy', 'sell')),
  token_amount NUMERIC NOT NULL,  -- Token amount (18 decimals)
  usdc_amount NUMERIC NOT NULL,   -- USDC amount (6 decimals)

  -- Fees (NEW: Different fee routing for persona vs credential)
  fee_amount NUMERIC NOT NULL,
  fee_to_issuer NUMERIC,  -- Fee share to credential issuer or persona owner
  fee_to_protocol NUMERIC,  -- Fee to protocol

  -- Price at time of swap
  price NUMERIC NOT NULL,

  -- Transaction
  tx_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_swaps_pool ON swaps(pool_id, block_timestamp DESC);
CREATE INDEX idx_swaps_trader ON swaps(trader_address, block_timestamp DESC);
CREATE INDEX idx_swaps_credential ON swaps(credential_id, block_timestamp DESC);
CREATE INDEX idx_swaps_persona ON swaps(persona_id, block_timestamp DESC);
CREATE INDEX idx_swaps_timestamp ON swaps(block_timestamp DESC);
CREATE INDEX idx_swaps_tx ON swaps(tx_hash);

-- Trigger to update pool reserves after swap
CREATE OR REPLACE FUNCTION update_pool_reserves_on_swap()
RETURNS TRIGGER AS $$
BEGIN
  -- In production, reserves should be updated from contract events
  -- This is just for tracking swap history
  UPDATE pools SET last_updated = NOW() WHERE id = NEW.pool_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER swap_created
  AFTER INSERT ON swaps
  FOR EACH ROW EXECUTE FUNCTION update_pool_reserves_on_swap();
```

---

### 9. `market_snapshots`

OHLCV (Open, High, Low, Close, Volume) candles for charts.

```sql
CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Market references
  credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  market_type TEXT NOT NULL CHECK (market_type IN ('credential', 'persona')),

  -- Snapshot time
  snapshot_time TIMESTAMPTZ NOT NULL,
  interval_type TEXT NOT NULL CHECK (interval_type IN ('1m', '5m', '15m', '1h', '4h', '1d', '1w')),

  -- OHLCV data
  open_price NUMERIC,
  high_price NUMERIC,
  low_price NUMERIC,
  close_price NUMERIC,
  volume NUMERIC,  -- in USDC

  -- Additional metrics
  trade_count INTEGER DEFAULT 0,
  unique_traders INTEGER DEFAULT 0,
  liquidity NUMERIC,  -- Total liquidity at snapshot time

  UNIQUE(credential_id, persona_id, snapshot_time, interval_type)
);

-- Indexes
CREATE INDEX idx_snapshots_credential ON market_snapshots(credential_id, interval_type, snapshot_time DESC);
CREATE INDEX idx_snapshots_persona ON market_snapshots(persona_id, interval_type, snapshot_time DESC);
CREATE INDEX idx_snapshots_time ON market_snapshots(snapshot_time DESC);
```

---

### 10. `holders`

Token holders for each market.

```sql
CREATE TABLE holders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Token
  token_address TEXT NOT NULL,
  credential_id UUID REFERENCES credentials(id),
  persona_id UUID REFERENCES personas(id),

  -- Holder
  holder_address TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,  -- Token balance (18 decimals)

  -- Timestamps
  first_acquired_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(token_address, holder_address)
);

-- Indexes
CREATE INDEX idx_holders_token ON holders(token_address, balance DESC);
CREATE INDEX idx_holders_address ON holders(holder_address);
CREATE INDEX idx_holders_credential ON holders(credential_id);
CREATE INDEX idx_holders_persona ON holders(persona_id);
```

---

## User & Verification Tables

### 11. `user_profiles`

User profiles and reputation.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Wallet
  wallet_address TEXT UNIQUE NOT NULL,

  -- Profile
  username TEXT UNIQUE,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Persona link (if user created a persona)
  has_persona BOOLEAN DEFAULT FALSE,
  persona_id UUID REFERENCES personas(id),

  -- Trading stats
  total_trades INTEGER DEFAULT 0,
  total_volume_traded NUMERIC DEFAULT 0,  -- in USDC
  total_pnl NUMERIC DEFAULT 0,  -- Profit/Loss

  -- Reputation
  reputation_score NUMERIC DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_wallet ON user_profiles(wallet_address);
CREATE INDEX idx_users_persona ON user_profiles(persona_id);
CREATE INDEX idx_users_reputation ON user_profiles(reputation_score DESC);
```

---

### 12. `verification_proofs`

Verification proofs for credentials and personas.

```sql
CREATE TABLE verification_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Entity type
  entity_type TEXT NOT NULL CHECK (entity_type IN ('credential', 'persona')),
  credential_id UUID REFERENCES credentials(id),
  persona_id UUID REFERENCES personas(id),

  -- Verification method
  verification_method TEXT NOT NULL,  -- 'ethos', 'worldcoin', 'gitcoin_passport', 'manual'

  -- Proof data (JSON)
  proof_data JSONB NOT NULL,
  -- Example for EthOS: { "score": 750, "reviewCount": 15, "credibilityScore": 0.85 }
  -- Example for Worldcoin: { "nullifierHash": "...", "proof": "...", "verified": true }

  -- Verifier
  verified_by TEXT,  -- Address or service name

  -- Status
  status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),

  -- Transaction
  tx_hash TEXT,

  -- Timestamps
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Some verifications may expire

  CHECK (
    (entity_type = 'credential' AND credential_id IS NOT NULL AND persona_id IS NULL) OR
    (entity_type = 'persona' AND persona_id IS NOT NULL AND credential_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_proofs_credential ON verification_proofs(credential_id);
CREATE INDEX idx_proofs_persona ON verification_proofs(persona_id);
CREATE INDEX idx_proofs_method ON verification_proofs(verification_method);
CREATE INDEX idx_proofs_status ON verification_proofs(status);
```

---

### 13. `social_links`

Social media links for personas.

```sql
CREATE TABLE social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Persona reference
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  -- Platform
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'github', 'discord', 'telegram', 'linkedin', 'website')),

  -- Link details
  username TEXT NOT NULL,
  profile_url TEXT,

  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_method TEXT,  -- How link was verified

  -- Metrics (optional, can be updated periodically)
  followers_count INTEGER,
  last_synced TIMESTAMPTZ,

  UNIQUE(persona_id, platform)
);

-- Indexes
CREATE INDEX idx_social_links_persona ON social_links(persona_id);
CREATE INDEX idx_social_links_platform ON social_links(platform);
```

---

## TypeScript Types

### Enums

```typescript
// enums.ts

export enum MarketType {
  CREDENTIAL = 'credential',
  PERSONA = 'persona'
}

export enum CredentialType {
  EDUCATION = 'education',
  PROFESSIONAL = 'professional',
  SKILL = 'skill',
  OTHER = 'other'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

export enum VerificationMethod {
  ETHOS = 'ethos',
  WORLDCOIN = 'worldcoin',
  GITCOIN_PASSPORT = 'gitcoin_passport',
  MANUAL = 'manual'
}

export enum SwapType {
  BUY = 'buy',
  SELL = 'sell'
}

export enum ProposalStatus {
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled'
}

export enum VoteType {
  FOR = 'for',
  AGAINST = 'against',
  ABSTAIN = 'abstain'
}

export enum StakeStatus {
  ACTIVE = 'active',
  SLASHED = 'slashed',
  WITHDRAWN = 'withdrawn'
}

export enum TimeFrame {
  ONE_MIN = '1m',
  FIVE_MIN = '5m',
  FIFTEEN_MIN = '15m',
  ONE_HOUR = '1h',
  FOUR_HOUR = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w'
}

export enum SocialPlatform {
  TWITTER = 'twitter',
  GITHUB = 'github',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  LINKEDIN = 'linkedin',
  WEBSITE = 'website'
}
```

---

### Database Types

```typescript
// database.types.ts

export interface Credential {
  id: string;
  credential_id: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  description?: string;
  credential_type: CredentialType;
  issuer_name: string;
  issuer_address: string;
  issuer_platform?: string;

  // Stake
  stake_amount: number;
  stake_tx_hash?: string;

  // Verification
  verification_status: VerificationStatus;
  verification_method?: VerificationMethod;
  verification_tx_hash?: string;
  verified_at?: string;

  // Slashing
  is_slashed: boolean;
  total_slashed_amount: number;
  last_slashed_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Metadata
  metadata: CredentialMetadata;
}

export interface CredentialMetadata {
  logoUrl?: string;
  nftImageUrl?: string;
  requirements?: Record<string, any>;
  tags?: string[];
  [key: string]: any;
}

export interface Persona {
  id: string;
  persona_id: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  bio?: string;
  owner_address: string;

  // Stake
  stake_amount: number;
  stake_tx_hash?: string;

  // Verification
  verification_status: VerificationStatus;
  verification_method?: VerificationMethod;
  verification_score?: number;
  verification_tx_hash?: string;
  verified_at?: string;

  // Slashing
  is_slashed: boolean;
  total_slashed_amount: number;
  last_slashed_at?: string;

  // Reputation
  reputation_score: number;
  total_credentials_linked: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Metadata
  metadata: PersonaMetadata;
}

export interface PersonaMetadata {
  avatarUrl?: string;
  bannerUrl?: string;
  socialLinks?: Record<SocialPlatform, string>;
  badges?: string[];
  [key: string]: any;
}

export interface PersonaCredential {
  id: string;
  persona_id: string;
  credential_id: string;
  verified_at: string;
  proof_tx_hash?: string;
  proof_data?: Record<string, any>;
  is_active: boolean;
}

export interface StakeDeposit {
  id: string;
  entity_type: MarketType;
  credential_id?: string;
  persona_id?: string;
  staker_address: string;
  amount: number;
  tx_hash: string;
  block_number: number;
  block_timestamp: string;
  status: StakeStatus;
  created_at: string;
}

export interface SlashingProposal {
  id: string;
  proposal_id: number;
  entity_type: MarketType;
  credential_id?: string;
  persona_id?: string;
  proposer_address: string;
  title: string;
  description: string;
  evidence_links: string[];
  slash_amount: number;
  slash_percentage?: number;
  votes_for: number;
  votes_against: number;
  quorum_required: number;
  voting_ends_at: string;
  status: ProposalStatus;
  executed_at?: string;
  execution_tx_hash?: string;
  created_at: string;
}

export interface SlashingVote {
  id: string;
  proposal_id: string;
  voter_address: string;
  vote_type: VoteType;
  voting_power: number;
  tx_hash: string;
  block_number: number;
  voted_at: string;
}

export interface Pool {
  id: string;
  pool_type: MarketType;
  credential_id?: string;
  persona_id?: string;
  token_address: string;
  amm_address: string;
  token_reserves: number;
  usdc_reserves: number;
  total_liquidity: number;
  current_price: number;  // Generated column
  is_active: boolean;
  created_at: string;
  last_updated: string;
}

export interface Swap {
  id: string;
  pool_id: string;
  credential_id?: string;
  persona_id?: string;
  trader_address: string;
  swap_type: SwapType;
  token_amount: number;
  usdc_amount: number;
  fee_amount: number;
  fee_to_issuer?: number;
  fee_to_protocol?: number;
  price: number;
  tx_hash: string;
  block_number: number;
  block_timestamp: string;
  created_at: string;
}

export interface MarketSnapshot {
  id: string;
  credential_id?: string;
  persona_id?: string;
  market_type: MarketType;
  snapshot_time: string;
  interval_type: TimeFrame;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  close_price?: number;
  volume?: number;
  trade_count: number;
  unique_traders: number;
  liquidity?: number;
}

export interface Holder {
  id: string;
  token_address: string;
  credential_id?: string;
  persona_id?: string;
  holder_address: string;
  balance: number;
  first_acquired_at: string;
  last_updated: string;
}

export interface UserProfile {
  id: string;
  wallet_address: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  has_persona: boolean;
  persona_id?: string;
  total_trades: number;
  total_volume_traded: number;
  total_pnl: number;
  reputation_score: number;
  joined_at: string;
  last_active: string;
}

export interface VerificationProof {
  id: string;
  entity_type: MarketType;
  credential_id?: string;
  persona_id?: string;
  verification_method: VerificationMethod;
  proof_data: Record<string, any>;
  verified_by?: string;
  status: VerificationStatus;
  tx_hash?: string;
  verified_at: string;
  expires_at?: string;
}

export interface SocialLink {
  id: string;
  persona_id: string;
  platform: SocialPlatform;
  username: string;
  profile_url?: string;
  verified: boolean;
  verified_at?: string;
  verification_method?: string;
  followers_count?: number;
  last_synced?: string;
}
```

---

### Extended Types for API Responses

```typescript
// api-types.ts

export interface CredentialWithPool extends Credential {
  pool?: Pool;
  holder_count?: number;
  volume_24h?: number;
  volume_7d?: number;
  price_change_24h?: number;
}

export interface PersonaWithDetails extends Persona {
  pool?: Pool;
  credentials?: Credential[];
  social_links?: SocialLink[];
  holder_count?: number;
  volume_24h?: number;
  volume_7d?: number;
  price_change_24h?: number;
  active_proposals?: number;
}

export interface MarketData {
  credential?: CredentialWithPool;
  persona?: PersonaWithDetails;
  market_type: MarketType;
  current_price: number;
  price_change_24h: number;
  volume_24h: number;
  liquidity: number;
  holder_count: number;
  trade_count_24h: number;
}

export interface CandleData {
  time: number;  // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ProposalWithVotes extends SlashingProposal {
  vote_breakdown: {
    for_percentage: number;
    against_percentage: number;
    total_votes: number;
    quorum_percentage: number;
  };
  my_vote?: VoteType;
  can_execute: boolean;
  time_remaining: number;  // seconds
}

export interface LeaderboardEntry {
  rank: number;
  market_type: MarketType;
  credential?: Credential;
  persona?: Persona;
  metric_value: number;  // The value being ranked by
  volume_24h: number;
  holder_count: number;
  reputation_score: number;
}
```

---

## Database Functions

### Get Market Data

```sql
-- Function to get complete market data for a credential or persona
CREATE OR REPLACE FUNCTION get_market_data(
  p_market_type TEXT,
  p_market_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF p_market_type = 'credential' THEN
    SELECT json_build_object(
      'market', row_to_json(c.*),
      'pool', row_to_json(p.*),
      'holder_count', (SELECT COUNT(*) FROM holders WHERE credential_id = c.id),
      'volume_24h', (
        SELECT COALESCE(SUM(usdc_amount), 0)
        FROM swaps
        WHERE credential_id = c.id
        AND block_timestamp > NOW() - INTERVAL '24 hours'
      ),
      'price_change_24h', calculate_price_change_24h('credential', c.id)
    )
    INTO result
    FROM credentials c
    LEFT JOIN pools p ON p.credential_id = c.id
    WHERE c.id = p_market_id;
  ELSE
    SELECT json_build_object(
      'market', row_to_json(per.*),
      'pool', row_to_json(p.*),
      'credentials', (
        SELECT json_agg(row_to_json(c.*))
        FROM credentials c
        INNER JOIN persona_credentials pc ON pc.credential_id = c.id
        WHERE pc.persona_id = per.id AND pc.is_active = TRUE
      ),
      'social_links', (
        SELECT json_agg(row_to_json(sl.*))
        FROM social_links sl
        WHERE sl.persona_id = per.id
      ),
      'holder_count', (SELECT COUNT(*) FROM holders WHERE persona_id = per.id),
      'volume_24h', (
        SELECT COALESCE(SUM(usdc_amount), 0)
        FROM swaps
        WHERE persona_id = per.id
        AND block_timestamp > NOW() - INTERVAL '24 hours'
      ),
      'price_change_24h', calculate_price_change_24h('persona', per.id)
    )
    INTO result
    FROM personas per
    LEFT JOIN pools p ON p.persona_id = per.id
    WHERE per.id = p_market_id;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Calculate Price Change

```sql
-- Function to calculate 24h price change
CREATE OR REPLACE FUNCTION calculate_price_change_24h(
  p_market_type TEXT,
  p_market_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  current_price NUMERIC;
  price_24h_ago NUMERIC;
BEGIN
  -- Get current price from pool
  IF p_market_type = 'credential' THEN
    SELECT current_price INTO current_price
    FROM pools
    WHERE credential_id = p_market_id;

    -- Get price from 24h ago snapshot
    SELECT close_price INTO price_24h_ago
    FROM market_snapshots
    WHERE credential_id = p_market_id
    AND snapshot_time <= NOW() - INTERVAL '24 hours'
    ORDER BY snapshot_time DESC
    LIMIT 1;
  ELSE
    SELECT current_price INTO current_price
    FROM pools
    WHERE persona_id = p_market_id;

    SELECT close_price INTO price_24h_ago
    FROM market_snapshots
    WHERE persona_id = p_market_id
    AND snapshot_time <= NOW() - INTERVAL '24 hours'
    ORDER BY snapshot_time DESC
    LIMIT 1;
  END IF;

  IF price_24h_ago IS NULL OR price_24h_ago = 0 THEN
    RETURN 0;
  END IF;

  RETURN ((current_price - price_24h_ago) / price_24h_ago) * 100;
END;
$$ LANGUAGE plpgsql;
```

### Update Pool Reserves (Called by Backend)

```sql
-- Function to update pool reserves from contract event
CREATE OR REPLACE FUNCTION update_pool_reserves(
  p_pool_id UUID,
  p_token_reserves NUMERIC,
  p_usdc_reserves NUMERIC,
  p_total_liquidity NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE pools
  SET
    token_reserves = p_token_reserves,
    usdc_reserves = p_usdc_reserves,
    total_liquidity = p_total_liquidity,
    last_updated = NOW()
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS)

```sql
-- Enable RLS on public tables
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE slashing_proposals ENABLE ROW LEVEL SECURITY;

-- Public read for verified markets
CREATE POLICY "Public can view verified credentials"
  ON credentials FOR SELECT
  USING (verification_status = 'verified');

CREATE POLICY "Public can view verified personas"
  ON personas FOR SELECT
  USING (verification_status = 'verified');

-- Issuers/owners can update their own markets
CREATE POLICY "Issuers can update own credentials"
  ON credentials FOR UPDATE
  USING (issuer_address = current_setting('request.jwt.claims')::json->>'wallet_address');

CREATE POLICY "Owners can update own personas"
  ON personas FOR UPDATE
  USING (owner_address = current_setting('request.jwt.claims')::json->>'wallet_address');

-- Anyone can view proposals
CREATE POLICY "Public can view proposals"
  ON slashing_proposals FOR SELECT
  USING (true);

-- Authenticated users can create proposals
CREATE POLICY "Users can create proposals"
  ON slashing_proposals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Migrations

Use this order for migrations:

1. Create enums and extensions
2. Create core tables (credentials, personas)
3. Create linking tables (persona_credentials)
4. Create stake tables
5. Create slashing tables
6. Create trading tables
7. Create analytics tables
8. Create user tables
9. Create indexes
10. Create functions
11. Create triggers
12. Enable RLS and create policies

---

## Summary

This database schema provides:

✅ **Dual Market Support**: Separate tables for credentials and personas
✅ **Stake System**: Both issuers and personas stake USDC to create tokens
✅ **Slashing Governance**: Community voting to slash bad actors
✅ **Trading Analytics**: OHLCV candles, volume tracking, holder counts
✅ **Type Safety**: Complete TypeScript types for frontend/backend
✅ **Performance**: Comprehensive indexes for fast queries
✅ **Security**: RLS policies for data protection
✅ **Scalability**: Partitioning-ready for large datasets

Use these schemas as the single source of truth for database operations.
