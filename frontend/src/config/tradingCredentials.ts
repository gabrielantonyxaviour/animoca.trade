// Trading credential definitions and metadata
export type TradingPlatform = 'Hyperliquid' | 'dYdX' | 'Vertex' | 'ethOS';

export interface TradingCredential {
  platform: TradingPlatform;
  name: string;
  emoji: string;
  description: string;
  color: string;
  requirements: {
    minScore?: number;
    minVolume?: number;
    minPnl?: number;
    minSocialScore?: number;
  };
  nftImage: string;
  logoImage: string;
}

export const TRADING_CREDENTIALS: TradingCredential[] = [
  {
    platform: 'Hyperliquid',
    name: 'Hyperliquid Shark',
    emoji: '🦈',
    description: 'Elite hunter of the liquidation seas. Masters the art of high-frequency perps trading with surgical precision.',
    color: 'from-blue-600 via-cyan-500 to-blue-800',
    requirements: {
      minScore: 80,
      minVolume: 100000,
      minPnl: 10000,
    },
    nftImage: '/cred-nfts/hyperliquid_shark.png',
    logoImage: '/creds/hyperliquid.png',
  },
  {
    platform: 'dYdX',
    name: 'dYdX Derivatives Wizard',
    emoji: '🧙‍♂️',
    description: 'Master of advanced derivatives magic - turning complex instruments into pure profit.',
    color: 'from-purple-600 via-indigo-500 to-purple-800',
    requirements: {
      minScore: 85,
      minVolume: 250000,
      minPnl: 15000,
    },
    nftImage: '/cred-nfts/dydx_derivatives_wizard.png',
    logoImage: '/creds/dydx.jpg',
  },
  {
    platform: 'Vertex',
    name: 'Vertex Edge Lord',
    emoji: '⚡',
    description: 'Geometric precision meets trading prowess - always one edge ahead of the market.',
    color: 'from-emerald-600 via-green-500 to-teal-800',
    requirements: {
      minScore: 82,
      minVolume: 150000,
      minPnl: 12000,
    },
    nftImage: '/cred-nfts/vertex_edge_lord.png',
    logoImage: '/creds/vertex.jpg',
  },
  {
    platform: 'ethOS',
    name: 'ethOS Trust Beacon',
    emoji: '🛡️',
    description: 'Shining light of credibility in the social darkness - guiding others with proven trust.',
    color: 'from-amber-600 via-yellow-500 to-orange-800',
    requirements: {
      minSocialScore: 600,
    },
    nftImage: '/cred-nfts/ethos_trust_beacon.png',
    logoImage: '/creds/ethos.png',
  },
];

export interface UserScore {
  platform: TradingPlatform;
  score: number;
  metrics?: {
    volumeTraded: number;
    totalPnl: number;
    socialScore?: number;
  };
}

export interface CredentialStatus {
  platform: TradingPlatform;
  isMinted: boolean;
  isVerified: boolean;
  verificationTxHash?: string;
  credentialId?: string;
  mintedAt?: Date;
  verifiedAt?: Date;
}

// Helper functions
export const getCredentialByPlatform = (platform: TradingPlatform): TradingCredential | undefined => {
  return TRADING_CREDENTIALS.find(cred => cred.platform === platform);
};

export const isEligibleForCredential = (credential: TradingCredential, score: UserScore): boolean => {
  const { requirements } = credential;

  // For ethOS, check social score
  if (credential.platform === 'ethOS') {
    return score.metrics?.socialScore ? score.metrics.socialScore >= (requirements.minSocialScore || 600) : false;
  }

  // For trading platforms, check score and metrics
  const meetsScore = !requirements.minScore || score.score >= requirements.minScore;
  const meetsVolume = !requirements.minVolume || (score.metrics?.volumeTraded || 0) >= requirements.minVolume;
  const meetsPnl = !requirements.minPnl || (score.metrics?.totalPnl || 0) >= requirements.minPnl;

  return meetsScore && meetsVolume && meetsPnl;
};

export const getEligibilityReason = (credential: TradingCredential, score: UserScore): string => {
  if (isEligibleForCredential(credential, score)) {
    return 'Eligible for credential';
  }

  const { requirements } = credential;
  const reasons: string[] = [];

  if (credential.platform === 'ethOS') {
    const currentScore = score.metrics?.socialScore || 0;
    const required = requirements.minSocialScore || 600;
    if (currentScore < required) {
      reasons.push(`Need ${required - currentScore} more social score`);
    }
  } else {
    if (requirements.minScore && score.score < requirements.minScore) {
      reasons.push(`Score: ${score.score}/${requirements.minScore}`);
    }
    if (requirements.minVolume && (score.metrics?.volumeTraded || 0) < requirements.minVolume) {
      reasons.push(`Volume: $${(score.metrics?.volumeTraded || 0).toLocaleString()}/$${requirements.minVolume.toLocaleString()}`);
    }
    if (requirements.minPnl && (score.metrics?.totalPnl || 0) < requirements.minPnl) {
      reasons.push(`PnL: $${(score.metrics?.totalPnl || 0).toLocaleString()}/$${requirements.minPnl.toLocaleString()}`);
    }
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Requirements not met';
};

// Mock score generation for testing
export const generateMockScores = (isTestingMode: boolean): UserScore[] => {
  const platforms: TradingPlatform[] = ['Hyperliquid', 'dYdX', 'Vertex', 'ethOS'];

  return platforms.map(platform => {
    if (isTestingMode) {
      // High scores for testing mode
      const baseScore = 80 + Math.floor(Math.random() * 20); // 80-100
      return {
        platform,
        score: platform === 'ethOS' ? 0 : baseScore,
        metrics: {
          volumeTraded: 500000 + Math.floor(Math.random() * 500000),
          totalPnl: 20000 + Math.floor(Math.random() * 30000),
          socialScore: platform === 'ethOS' ? 700 + Math.floor(Math.random() * 200) : undefined,
        },
      };
    } else {
      // Low scores for normal mode
      const baseScore = 30 + Math.floor(Math.random() * 30); // 30-60
      return {
        platform,
        score: platform === 'ethOS' ? 0 : baseScore,
        metrics: {
          volumeTraded: 10000 + Math.floor(Math.random() * 50000),
          totalPnl: 1000 + Math.floor(Math.random() * 5000),
          socialScore: platform === 'ethOS' ? 200 + Math.floor(Math.random() * 300) : undefined,
        },
      };
    }
  });
};