/**
 * Type definitions for the token generator service
 */

export interface CredentialEmission {
  credentialId: string;
  holder: string;
  claimableAmount: string;
  nextClaimTime: number;
  lastClaimTime: number;
  effectiveRate: string;
}

export interface EmissionStats {
  totalMinted: string;
  activeHolders: number;
  averageEmissionRate: string;
  credentialId: string;
}

export interface GlobalStats {
  totalCredentials: number;
  totalTokensMinted: string;
  totalActiveHolders: number;
}

export interface ClaimResult {
  credentialId: string;
  amountClaimed: string;
  transactionHash: string;
  timestamp: number;
}

export interface BatchClaimResult {
  totalClaimed: string;
  individualClaims: ClaimResult[];
  transactionHash: string;
  timestamp: number;
}

export interface CredentialMultiplier {
  credentialId: string;
  multiplier: number;
  category: 'EDUCATION' | 'PROFESSIONAL' | 'SKILL' | 'RARE';
  description: string;
}

export interface EmissionCalculation {
  baseRate: string;
  multiplier: number;
  timeDecay: number;
  antiInflationFactor: number;
  effectiveRate: string;
  dailyEmission: string;
}

export interface GeneratorConfig {
  baseEmissionRate: string;
  antiInflationFactor: number;
  minClaimInterval: number;
  deploymentTime: number;
}