import { useState, useEffect, useCallback } from "react";
import { createPublicClient, createWalletClient, http, parseEther, formatEther, type Address } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ABIS } from "@/types/contracts";
import { getContractAddresses } from "@/config/contracts";
import type { Token, CreateTokenParams } from "@/types/contracts";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export const useTokenFactory = (userAddress?: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);

  const contractAddresses = getContractAddresses(sepolia.id);

  const createToken = useCallback(async (params: CreateTokenParams) => {
    if (!userAddress || !contractAddresses.CREDENTIAL_TOKEN_FACTORY) {
      setError("No wallet connected or factory contract not deployed");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletClient = createWalletClient({
        account: userAddress as Address,
        chain: sepolia,
        transport: http(),
      });

      const { request } = await publicClient.simulateContract({
        address: contractAddresses.CREDENTIAL_TOKEN_FACTORY as Address,
        abi: CONTRACT_ABIS.ICredentialTokenFactory,
        functionName: "createToken",
        args: [
          params.credentialId as Address,
          params.name,
          params.symbol,
          BigInt(params.emissionRate),
          parseEther(params.maxSupply.toString()),
        ],
        account: userAddress as Address,
      });

      const hash = await walletClient.writeContract(request);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse TokenCreated event from receipt
      const tokenCreatedEvent = receipt.logs.find(
        (log) => log.topics[0] === "0x..." // Add actual event signature
      );

      if (tokenCreatedEvent) {
        // Extract token address from event
        return tokenCreatedEvent.topics[2] as Address;
      }

      return null;
    } catch (err) {
      console.error("Error creating token:", err);
      setError(err instanceof Error ? err.message : "Failed to create token");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, contractAddresses.CREDENTIAL_TOKEN_FACTORY]);

  const fetchUserTokens = useCallback(async () => {
    if (!userAddress || !contractAddresses.CREDENTIAL_TOKEN_FACTORY) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allTokens = await publicClient.readContract({
        address: contractAddresses.CREDENTIAL_TOKEN_FACTORY as Address,
        abi: CONTRACT_ABIS.ICredentialTokenFactory,
        functionName: "getAllTokens",
      }) as Address[];

      const userTokens: Token[] = [];

      for (const tokenAddress of allTokens) {
        try {
          const [totalSupply, emissionRate, maxSupply, creator, credentialId] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress,
              abi: CONTRACT_ABIS.ICredentialToken,
              functionName: "totalSupply",
            }) as Promise<bigint>,
            publicClient.readContract({
              address: tokenAddress,
              abi: CONTRACT_ABIS.ICredentialToken,
              functionName: "getEmissionRate",
            }) as Promise<bigint>,
            publicClient.readContract({
              address: tokenAddress,
              abi: CONTRACT_ABIS.ICredentialToken,
              functionName: "getMaxSupply",
            }) as Promise<bigint>,
            publicClient.readContract({
              address: tokenAddress,
              abi: CONTRACT_ABIS.ICredentialToken,
              functionName: "getCreator",
            }) as Promise<Address>,
            publicClient.readContract({
              address: tokenAddress,
              abi: CONTRACT_ABIS.ICredentialToken,
              functionName: "getCredentialId",
            }) as Promise<string>,
          ]);

          if (creator.toLowerCase() === userAddress.toLowerCase()) {
            userTokens.push({
              address: tokenAddress,
              credentialId,
              name: `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
              symbol: `TKN${tokenAddress.slice(-4)}`,
              decimals: 18,
              totalSupply,
              emissionRate: Number(emissionRate),
              maxSupply: Number(formatEther(maxSupply)),
              creator,
              createdAt: new Date(), // You might want to get this from events
            });
          }
        } catch (err) {
          console.error(`Error fetching token details for ${tokenAddress}:`, err);
        }
      }

      setTokens(userTokens);
    } catch (err) {
      console.error("Error fetching user tokens:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch tokens");
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, contractAddresses.CREDENTIAL_TOKEN_FACTORY]);

  useEffect(() => {
    if (userAddress) {
      fetchUserTokens();
    }
  }, [userAddress, fetchUserTokens]);

  return {
    tokens,
    createToken,
    fetchUserTokens,
    isLoading,
    error,
  };
};

export const usePassiveTokens = (userAddress?: string | null) => {
  const [claimableTokens, setClaimableTokens] = useState<Map<string, bigint>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractAddresses = getContractAddresses(sepolia.id);

  const fetchClaimableTokens = useCallback(async (credentialIds: string[]) => {
    if (!userAddress || !contractAddresses.PASSIVE_TOKEN_GENERATOR) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const claimable = new Map<string, bigint>();

      for (const credentialId of credentialIds) {
        try {
          const [claimableAmount] = await publicClient.readContract({
            address: contractAddresses.PASSIVE_TOKEN_GENERATOR as Address,
            abi: CONTRACT_ABIS.IPassiveTokenGenerator,
            functionName: "getClaimableTokens",
            args: [credentialId as Address],
          }) as [bigint, bigint];

          claimable.set(credentialId, claimableAmount);
        } catch (err) {
          console.error(`Error fetching claimable tokens for ${credentialId}:`, err);
        }
      }

      setClaimableTokens(claimable);
    } catch (err) {
      console.error("Error fetching claimable tokens:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch claimable tokens");
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, contractAddresses.PASSIVE_TOKEN_GENERATOR]);

  const claimTokens = useCallback(async (credentialId: string) => {
    if (!userAddress || !contractAddresses.PASSIVE_TOKEN_GENERATOR) {
      setError("No wallet connected or passive generator contract not deployed");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletClient = createWalletClient({
        account: userAddress as Address,
        chain: sepolia,
        transport: http(),
      });

      const { request } = await publicClient.simulateContract({
        address: contractAddresses.PASSIVE_TOKEN_GENERATOR as Address,
        abi: CONTRACT_ABIS.IPassiveTokenGenerator,
        functionName: "claimTokens",
        args: [credentialId as Address],
        account: userAddress as Address,
      });

      const hash = await walletClient.writeContract(request);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Refresh claimable tokens after successful claim
      await fetchClaimableTokens([credentialId]);

      return receipt;
    } catch (err) {
      console.error("Error claiming tokens:", err);
      setError(err instanceof Error ? err.message : "Failed to claim tokens");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, contractAddresses.PASSIVE_TOKEN_GENERATOR, fetchClaimableTokens]);

  const batchClaimTokens = useCallback(async (credentialIds: string[]) => {
    if (!userAddress || !contractAddresses.PASSIVE_TOKEN_GENERATOR) {
      setError("No wallet connected or passive generator contract not deployed");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletClient = createWalletClient({
        account: userAddress as Address,
        chain: sepolia,
        transport: http(),
      });

      const { request } = await publicClient.simulateContract({
        address: contractAddresses.PASSIVE_TOKEN_GENERATOR as Address,
        abi: CONTRACT_ABIS.IPassiveTokenGenerator,
        functionName: "batchClaimTokens",
        args: [credentialIds as Address[]],
        account: userAddress as Address,
      });

      const hash = await walletClient.writeContract(request);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Refresh claimable tokens after successful claim
      await fetchClaimableTokens(credentialIds);

      return receipt;
    } catch (err) {
      console.error("Error batch claiming tokens:", err);
      setError(err instanceof Error ? err.message : "Failed to batch claim tokens");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, contractAddresses.PASSIVE_TOKEN_GENERATOR, fetchClaimableTokens]);

  return {
    claimableTokens,
    fetchClaimableTokens,
    claimTokens,
    batchClaimTokens,
    isLoading,
    error,
  };
};

export const useTokenBalance = (tokenAddress: Address | undefined, userAddress?: string | null) => {
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!tokenAddress || !userAddress) return;

      setIsLoading(true);
      try {
        const bal = await publicClient.readContract({
          address: tokenAddress,
          abi: CONTRACT_ABIS.ICredentialToken,
          functionName: "balanceOf",
          args: [userAddress as Address],
        }) as bigint;
        setBalance(bal);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setBalance(BigInt(0));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [tokenAddress, userAddress]);

  return { balance, isLoading };
};