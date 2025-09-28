/**
 * Utility functions for the token generator
 */

import { CredentialMultiplier } from './types';

/**
 * Predefined credential type multipliers
 */
export const CREDENTIAL_MULTIPLIERS: Record<string, CredentialMultiplier> = {
  // Education credentials
  HIGH_SCHOOL: {
    credentialId: 'HIGH_SCHOOL',
    multiplier: 1.0,
    category: 'EDUCATION',
    description: 'High School Diploma',
  },
  BACHELORS: {
    credentialId: 'BACHELORS',
    multiplier: 1.5,
    category: 'EDUCATION',
    description: "Bachelor's Degree",
  },
  MASTERS: {
    credentialId: 'MASTERS',
    multiplier: 2.0,
    category: 'EDUCATION',
    description: "Master's Degree",
  },
  PHD: {
    credentialId: 'PHD',
    multiplier: 3.0,
    category: 'EDUCATION',
    description: 'PhD/Doctorate',
  },

  // Professional certifications
  BASIC_CERT: {
    credentialId: 'BASIC_CERT',
    multiplier: 1.2,
    category: 'PROFESSIONAL',
    description: 'Basic Certification',
  },
  ADVANCED_CERT: {
    credentialId: 'ADVANCED_CERT',
    multiplier: 1.8,
    category: 'PROFESSIONAL',
    description: 'Advanced Certification',
  },
  EXPERT_CERT: {
    credentialId: 'EXPERT_CERT',
    multiplier: 2.5,
    category: 'PROFESSIONAL',
    description: 'Expert Certification',
  },
  LEADER_CERT: {
    credentialId: 'LEADER_CERT',
    multiplier: 4.0,
    category: 'PROFESSIONAL',
    description: 'Industry Leadership',
  },

  // Skills & achievements
  BASIC_SKILL: {
    credentialId: 'BASIC_SKILL',
    multiplier: 0.8,
    category: 'SKILL',
    description: 'Basic Skill Badge',
  },
  INTER_SKILL: {
    credentialId: 'INTER_SKILL',
    multiplier: 1.2,
    category: 'SKILL',
    description: 'Intermediate Skill',
  },
  ADVANCED_SKILL: {
    credentialId: 'ADVANCED_SKILL',
    multiplier: 1.8,
    category: 'SKILL',
    description: 'Advanced Skill',
  },
  MASTER_SKILL: {
    credentialId: 'MASTER_SKILL',
    multiplier: 2.5,
    category: 'SKILL',
    description: 'Master Level',
  },

  // Rare/unique credentials
  COMPETITION: {
    credentialId: 'COMPETITION',
    multiplier: 3.5,
    category: 'RARE',
    description: 'Competition Winner',
  },
  AWARD: {
    credentialId: 'AWARD',
    multiplier: 4.5,
    category: 'RARE',
    description: 'Industry Award',
  },
  PATENT: {
    credentialId: 'PATENT',
    multiplier: 5.0,
    category: 'RARE',
    description: 'Patent Holder',
  },
};

/**
 * Calculate time decay factor based on months since deployment
 * @param deploymentTime Deployment timestamp in seconds
 * @returns Time decay factor (0-1)
 */
export function calculateTimeDecay(deploymentTime: number): number {
  const now = Date.now() / 1000; // Convert to seconds
  const monthsSinceDeployment = Math.floor((now - deploymentTime) / (30 * 24 * 60 * 60));

  if (monthsSinceDeployment <= 0) return 1.0;

  // Apply compound decay: (0.99)^months
  let decayFactor = 1.0;
  for (let i = 0; i < monthsSinceDeployment; i++) {
    decayFactor *= 0.99;
  }

  return Math.max(decayFactor, 0.01); // Minimum 1% of original rate
}

/**
 * Calculate daily emission amount
 * @param baseRate Base emission rate (tokens per day)
 * @param multiplier Credential type multiplier
 * @param timeDecay Time decay factor
 * @param antiInflation Anti-inflation factor
 * @returns Daily emission amount
 */
export function calculateDailyEmission(
  baseRate: number,
  multiplier: number,
  timeDecay: number,
  antiInflation: number
): number {
  return baseRate * multiplier * timeDecay * antiInflation;
}

/**
 * Format time until next claim
 * @param nextClaimTime Timestamp of next available claim
 * @returns Formatted time string
 */
export function formatTimeUntilClaim(nextClaimTime: number): string {
  const now = Date.now() / 1000;
  const secondsRemaining = Math.max(0, nextClaimTime - now);

  if (secondsRemaining === 0) return 'Now';

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format large numbers with abbreviations
 * @param value Number to format
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export function formatLargeNumber(value: number, decimals: number = 2): string {
  if (value < 1000) return value.toFixed(decimals);
  if (value < 1000000) return `${(value / 1000).toFixed(decimals)}K`;
  if (value < 1000000000) return `${(value / 1000000).toFixed(decimals)}M`;
  return `${(value / 1000000000).toFixed(decimals)}B`;
}

/**
 * Get credential category color for UI
 * @param category Credential category
 * @returns Tailwind color class
 */
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'EDUCATION':
      return 'bg-blue-500';
    case 'PROFESSIONAL':
      return 'bg-green-500';
    case 'SKILL':
      return 'bg-purple-500';
    case 'RARE':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get credential category icon
 * @param category Credential category
 * @returns Icon name or emoji
 */
export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'EDUCATION':
      return '🎓';
    case 'PROFESSIONAL':
      return '💼';
    case 'SKILL':
      return '⚡';
    case 'RARE':
      return '🏆';
    default:
      return '📄';
  }
}

/**
 * Calculate estimated earnings
 * @param dailyEmission Daily emission rate
 * @param days Number of days
 * @returns Estimated earnings
 */
export function calculateEstimatedEarnings(dailyEmission: number, days: number): number {
  return dailyEmission * days;
}

/**
 * Check if claim is available
 * @param lastClaimTime Last claim timestamp
 * @param minInterval Minimum interval in seconds
 * @returns Boolean indicating if claim is available
 */
export function isClaimAvailable(lastClaimTime: number, minInterval: number): boolean {
  const now = Date.now() / 1000;
  return now >= lastClaimTime + minInterval;
}

/**
 * Parse credential ID from string
 * @param credentialString Credential string or ID
 * @returns Parsed credential ID
 */
export function parseCredentialId(credentialString: string): string {
  // Remove any non-alphanumeric characters except underscores and hyphens
  return credentialString.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
}

/**
 * Validate credential ID format
 * @param credentialId Credential ID to validate
 * @returns Boolean indicating if ID is valid
 */
export function isValidCredentialId(credentialId: string): boolean {
  // Check if ID is not empty and contains only valid characters
  return /^[A-Z0-9_-]+$/.test(credentialId) && credentialId.length > 0 && credentialId.length <= 64;
}

/**
 * Get emission rate color based on multiplier
 * @param multiplier Emission multiplier
 * @returns Tailwind color class
 */
export function getMultiplierColor(multiplier: number): string {
  if (multiplier < 1) return 'text-gray-500';
  if (multiplier < 1.5) return 'text-green-500';
  if (multiplier < 2.5) return 'text-blue-500';
  if (multiplier < 3.5) return 'text-purple-500';
  return 'text-yellow-500';
}

/**
 * Calculate APY based on emission rate and token price
 * @param dailyEmission Daily emission in tokens
 * @param tokenPrice Token price in USD
 * @param initialInvestment Initial investment in USD
 * @returns APY percentage
 */
export function calculateAPY(
  dailyEmission: number,
  tokenPrice: number,
  initialInvestment: number
): number {
  if (initialInvestment === 0) return 0;

  const dailyReturn = dailyEmission * tokenPrice;
  const dailyYield = dailyReturn / initialInvestment;
  const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;

  return Math.min(apy, 999999); // Cap at reasonable maximum
}