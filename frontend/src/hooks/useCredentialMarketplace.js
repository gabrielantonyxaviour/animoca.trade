import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { initializeMarketplace, getMarketplace } from '../services/credential-marketplace';

export const useCredentialMarketplace = () => {
  const [marketplace, setMarketplace] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize on mount
  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    try {
      if (window.ethereum) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);

        const mp = initializeMarketplace(web3Provider);
        setMarketplace(mp);

        // Check if already connected
        const accounts = await web3Provider.listAccounts();
        if (accounts.length > 0) {
          await connectWallet();
        }
      } else {
        setError('Please install MetaMask');
      }
    } catch (err) {
      setError('Failed to initialize provider: ' + err.message);
    }
  };

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!provider) {
        throw new Error('Provider not initialized');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const web3Signer = provider.getSigner();
      setSigner(web3Signer);

      const address = await web3Signer.getAddress();
      setAccount(address);

      marketplace.setSigner(web3Signer);
      setIsConnected(true);

    } catch (err) {
      setError('Failed to connect wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [provider, marketplace]);

  const disconnect = useCallback(() => {
    setSigner(null);
    setAccount('');
    setIsConnected(false);
    if (marketplace) {
      marketplace.setSigner(null);
    }
  }, [marketplace]);

  // Token operations
  const createToken = useCallback(async (credentialId, name, symbol, emissionRate = 100, maxSupply = 1000000) => {
    if (!marketplace || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const result = await marketplace.createCredentialToken(
        credentialId,
        name,
        symbol,
        emissionRate,
        maxSupply
      );
      return result;
    } finally {
      setLoading(false);
    }
  }, [marketplace, isConnected]);

  const createMarket = useCallback(async (credentialId, tokenAddress, tokenAmount, usdcAmount) => {
    if (!marketplace || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const result = await marketplace.createMarketWithLiquidity(
        credentialId,
        tokenAddress,
        tokenAmount,
        usdcAmount
      );
      return result;
    } finally {
      setLoading(false);
    }
  }, [marketplace, isConnected]);

  // Trading operations
  const buyTokens = useCallback(async (credentialId, usdcAmount, slippage = 0.005) => {
    if (!marketplace || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const result = await marketplace.buyTokens(credentialId, usdcAmount, slippage);
      return result;
    } finally {
      setLoading(false);
    }
  }, [marketplace, isConnected]);

  const sellTokens = useCallback(async (credentialId, tokenAmount, slippage = 0.005) => {
    if (!marketplace || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const result = await marketplace.sellTokens(credentialId, tokenAmount, slippage);
      return result;
    } finally {
      setLoading(false);
    }
  }, [marketplace, isConnected]);

  // Quote operations
  const getBuyQuote = useCallback(async (credentialId, usdcAmount) => {
    if (!marketplace) return null;
    return await marketplace.getBuyQuote(credentialId, usdcAmount);
  }, [marketplace]);

  const getSellQuote = useCallback(async (credentialId, tokenAmount) => {
    if (!marketplace) return null;
    return await marketplace.getSellQuote(credentialId, tokenAmount);
  }, [marketplace]);

  const getTokenPrice = useCallback(async (credentialId) => {
    if (!marketplace) return null;
    return await marketplace.getTokenPrice(credentialId);
  }, [marketplace]);

  // Pool operations
  const getPoolInfo = useCallback(async (credentialId) => {
    if (!marketplace) return null;
    return await marketplace.getPoolInfo(credentialId);
  }, [marketplace]);

  const addLiquidity = useCallback(async (credentialId, tokenAmount, usdcAmount, slippage = 0.005) => {
    if (!marketplace || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const result = await marketplace.addLiquidity(credentialId, tokenAmount, usdcAmount, slippage);
      return result;
    } finally {
      setLoading(false);
    }
  }, [marketplace, isConnected]);

  // Balance operations
  const getUSDCBalance = useCallback(async (address) => {
    if (!marketplace) return '0';
    const balance = await marketplace.getUSDCBalance(address || account);
    return marketplace.formatUSDC(balance);
  }, [marketplace, account]);

  const getTokenBalance = useCallback(async (tokenAddress, address) => {
    if (!marketplace || !provider) return '0';

    const token = new ethers.Contract(tokenAddress, [
      'function balanceOf(address) view returns (uint256)'
    ], provider);

    const balance = await token.balanceOf(address || account);
    return ethers.utils.formatEther(balance);
  }, [marketplace, provider, account]);

  const mintTestUSDC = useCallback(async (amount = 1000) => {
    if (!marketplace || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const result = await marketplace.mintTestUSDC(amount);
      return result;
    } finally {
      setLoading(false);
    }
  }, [marketplace, isConnected]);

  // Utility functions
  const parseUSDC = useCallback((amount) => {
    if (!marketplace) return ethers.utils.parseUnits('0', 6);
    return marketplace.parseUSDC(amount);
  }, [marketplace]);

  const formatUSDC = useCallback((amount) => {
    if (!marketplace) return '0';
    return marketplace.formatUSDC(amount);
  }, [marketplace]);

  const parseTokens = useCallback((amount) => {
    if (!marketplace) return ethers.utils.parseEther('0');
    return marketplace.parseTokens(amount);
  }, [marketplace]);

  const formatTokens = useCallback((amount) => {
    if (!marketplace) return '0';
    return marketplace.formatTokens(amount);
  }, [marketplace]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const handleError = useCallback((err) => {
    if (marketplace) {
      return marketplace.handleError(err);
    }
    return err.message || 'Unknown error occurred';
  }, [marketplace]);

  return {
    // State
    marketplace,
    provider,
    signer,
    account,
    isConnected,
    loading,
    error,

    // Connection methods
    connectWallet,
    disconnect,
    clearError,

    // Token operations
    createToken,
    createMarket,

    // Trading operations
    buyTokens,
    sellTokens,
    getBuyQuote,
    getSellQuote,
    getTokenPrice,

    // Pool operations
    getPoolInfo,
    addLiquidity,

    // Balance operations
    getUSDCBalance,
    getTokenBalance,
    mintTestUSDC,

    // Utility functions
    parseUSDC,
    formatUSDC,
    parseTokens,
    formatTokens,
    handleError,

    // Constants
    stringToBytes32: marketplace?.stringToBytes32,
    bytes32ToString: marketplace?.bytes32ToString
  };
};