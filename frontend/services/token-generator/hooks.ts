/**
 * React hooks for the token generator service
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { TokenGeneratorService } from './TokenGeneratorService';
import {
  CredentialEmission,
  EmissionStats,
  GlobalStats,
  ClaimResult,
  BatchClaimResult,
  EmissionCalculation,
  GeneratorConfig,
} from './types';

// Service instance singleton
let serviceInstance: TokenGeneratorService | null = null;

/**
 * Hook to get or create the TokenGeneratorService instance
 */
export function useTokenGeneratorService() {
  const provider = useProvider();
  const { data: signer } = useSigner();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initService = async () => {
      try {
        if (!serviceInstance) {
          serviceInstance = new TokenGeneratorService(provider);
        }

        if (signer && !isInitialized) {
          await serviceInstance.initialize(signer);
          setIsInitialized(true);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Failed to initialize TokenGeneratorService:', err);
      }
    };

    initService();
  }, [provider, signer, isInitialized]);

  return { service: serviceInstance, isInitialized, error };
}

/**
 * Hook to claim tokens for a credential
 */
export function useClaimTokens() {
  const { service, isInitialized } = useTokenGeneratorService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ClaimResult | null>(null);

  const claimTokens = useCallback(
    async (credentialId: string) => {
      if (!service || !isInitialized) {
        setError(new Error('Service not initialized'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const claimResult = await service.claimTokens(credentialId);
        setResult(claimResult);
        return claimResult;
      } catch (err) {
        setError(err as Error);
        console.error('Error claiming tokens:', err);
      } finally {
        setLoading(false);
      }
    },
    [service, isInitialized]
  );

  return { claimTokens, loading, error, result };
}

/**
 * Hook to batch claim tokens
 */
export function useBatchClaimTokens() {
  const { service, isInitialized } = useTokenGeneratorService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<BatchClaimResult | null>(null);

  const batchClaimTokens = useCallback(
    async (credentialIds: string[]) => {
      if (!service || !isInitialized) {
        setError(new Error('Service not initialized'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const batchResult = await service.batchClaimTokens(credentialIds);
        setResult(batchResult);
        return batchResult;
      } catch (err) {
        setError(err as Error);
        console.error('Error batch claiming tokens:', err);
      } finally {
        setLoading(false);
      }
    },
    [service, isInitialized]
  );

  return { batchClaimTokens, loading, error, result };
}

/**
 * Hook to fetch claimable tokens for a credential
 */
export function useClaimableTokens(credentialId: string, refreshInterval?: number) {
  const { service, isInitialized } = useTokenGeneratorService();
  const [data, setData] = useState<CredentialEmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchClaimableTokens = useCallback(async () => {
    if (!service || !isInitialized || !credentialId) return;

    setLoading(true);
    setError(null);

    try {
      const emission = await service.getClaimableTokens(credentialId);
      setData(emission);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching claimable tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [service, isInitialized, credentialId]);

  useEffect(() => {
    fetchClaimableTokens();

    if (refreshInterval) {
      const interval = setInterval(fetchClaimableTokens, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchClaimableTokens, refreshInterval]);

  return { data, loading, error, refetch: fetchClaimableTokens };
}

/**
 * Hook to fetch emission statistics for a credential
 */
export function useCredentialStats(credentialId: string) {
  const { service, isInitialized } = useTokenGeneratorService();
  const [data, setData] = useState<EmissionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!service || !isInitialized || !credentialId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await service.getCredentialStats(credentialId);
      setData(stats);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching credential stats:', err);
    } finally {
      setLoading(false);
    }
  }, [service, isInitialized, credentialId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
}

/**
 * Hook to fetch global statistics
 */
export function useGlobalStats(refreshInterval?: number) {
  const { service, isInitialized } = useTokenGeneratorService();
  const [data, setData] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGlobalStats = useCallback(async () => {
    if (!service || !isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await service.getGlobalStats();
      setData(stats);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching global stats:', err);
    } finally {
      setLoading(false);
    }
  }, [service, isInitialized]);

  useEffect(() => {
    fetchGlobalStats();

    if (refreshInterval) {
      const interval = setInterval(fetchGlobalStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGlobalStats, refreshInterval]);

  return { data, loading, error, refetch: fetchGlobalStats };
}

/**
 * Hook to calculate emission for a credential
 */
export function useEmissionCalculation(
  credentialId: string,
  holder: string,
  lastClaimTimestamp: number
) {
  const { service, isInitialized } = useTokenGeneratorService();
  const [data, setData] = useState<EmissionCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculateEmission = useCallback(async () => {
    if (!service || !isInitialized || !credentialId || !holder) return;

    setLoading(true);
    setError(null);

    try {
      const calculation = await service.calculateEmission(
        credentialId,
        holder,
        lastClaimTimestamp
      );
      setData(calculation);
    } catch (err) {
      setError(err as Error);
      console.error('Error calculating emission:', err);
    } finally {
      setLoading(false);
    }
  }, [service, isInitialized, credentialId, holder, lastClaimTimestamp]);

  useEffect(() => {
    calculateEmission();
  }, [calculateEmission]);

  return { data, loading, error, refetch: calculateEmission };
}

/**
 * Hook to validate credential ownership
 */
export function useValidateCredential(credentialId: string, holder: string) {
  const { service, isInitialized } = useTokenGeneratorService();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const validateCredential = useCallback(async () => {
    if (!service || !isInitialized || !credentialId || !holder) return;

    setLoading(true);
    setError(null);

    try {
      const valid = await service.validateCredential(credentialId, holder);
      setIsValid(valid);
    } catch (err) {
      setError(err as Error);
      console.error('Error validating credential:', err);
    } finally {
      setLoading(false);
    }
  }, [service, isInitialized, credentialId, holder]);

  useEffect(() => {
    validateCredential();
  }, [validateCredential]);

  return { isValid, loading, error, refetch: validateCredential };
}

/**
 * Hook to get generator configuration
 */
export function useGeneratorConfig() {
  const { service, isInitialized } = useTokenGeneratorService();
  const [data, setData] = useState<GeneratorConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!service || !isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      const config = await service.getGeneratorConfig();
      setData(config);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching generator config:', err);
    } finally {
      setLoading(false);
    }
  }, [service, isInitialized]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { data, loading, error, refetch: fetchConfig };
}

/**
 * Hook for formatting token amounts
 */
export function useTokenFormatter() {
  const { service } = useTokenGeneratorService();

  const formatAmount = useCallback(
    (amount: string, decimals?: number) => {
      if (!service) return '0';
      return service.formatTokenAmount(amount, decimals);
    },
    [service]
  );

  const parseAmount = useCallback(
    (amount: string, decimals?: number) => {
      if (!service) return '0';
      return service.parseTokenAmount(amount, decimals);
    },
    [service]
  );

  return { formatAmount, parseAmount };
}