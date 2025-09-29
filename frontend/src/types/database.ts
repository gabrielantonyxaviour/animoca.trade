// Database types for Supabase integration

export interface User {
  id: string
  wallet_address: string
  reputation_score: number
  total_tokens_generated: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  wallet_address: string
}

export interface UpdateUserData {
  reputation_score?: number
}

export const CredentialStatus = {
  PENDING: 'pending',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
} as const;

export type CredentialStatus = typeof CredentialStatus[keyof typeof CredentialStatus];

export interface Credential {
  id: string
  user_id: string
  name: string
  description?: string
  credential_hash: string
  credential_data: any
  aizk_proof: any
  status: CredentialStatus
  token_address?: string
  token_symbol?: string
  created_at: string
  updated_at: string
}

export interface CreateCredentialData {
  user_id: string
  name: string
  description?: string
  credential_hash: string
  credential_data: any
  aizk_proof: any
}

export interface UpdateCredentialData {
  status?: CredentialStatus
  token_address?: string
  token_symbol?: string
}

export const TokenGenerationStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type TokenGenerationStatus = typeof TokenGenerationStatus[keyof typeof TokenGenerationStatus];

export interface TokenGeneration {
  id: string
  user_id: string
  credential_id: string
  token_address: string
  amount: string
  transaction_hash: string
  status: TokenGenerationStatus
  block_number: number
  generated_at: string
}

export interface CreateTokenGenerationData {
  user_id: string
  credential_id: string
  token_address: string
  amount: string
  transaction_hash: string
  block_number: number
}

export interface UpdateTokenGenerationData {
  status?: TokenGenerationStatus
  transaction_hash?: string
  block_number?: number
}