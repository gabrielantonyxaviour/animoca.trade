import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CredentialMarketplace, initializeMarketplace, getMarketplace } from '../services/credential-marketplace';

const CredentialMarketplaceComponent = () => {
  const [marketplace, setMarketplace] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [isConnected, setIsConnected] = useState(false);

  // Form states
  const [credentialId, setCredentialId] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [poolInfo, setPoolInfo] = useState(null);

  // Status states
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    try {
      if (window.ethereum) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);

        // Initialize marketplace
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
      setError('Failed to initialize Web3: ' + err.message);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const web3Signer = provider.getSigner();
      setSigner(web3Signer);

      const address = await web3Signer.getAddress();
      setAccount(address);

      // Update marketplace with signer
      marketplace.setSigner(web3Signer);

      // Get USDC balance
      await updateUSDCBalance(address);

      setIsConnected(true);
      setStatus('Wallet connected successfully');
    } catch (err) {
      setError('Failed to connect wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUSDCBalance = async (address) => {
    try {
      const balance = await marketplace.getUSDCBalance(address);
      setUsdcBalance(marketplace.formatUSDC(balance));
    } catch (err) {
      console.error('Failed to get USDC balance:', err);
    }
  };

  const mintTestUSDC = async () => {
    try {
      setLoading(true);
      setStatus('Minting test USDC...');

      await marketplace.mintTestUSDC(1000); // Mint 1000 USDC
      await updateUSDCBalance(account);

      setStatus('Successfully minted 1000 test USDC');
    } catch (err) {
      setError(marketplace.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    try {
      setLoading(true);
      setStatus('Creating credential token...');

      const result = await marketplace.createCredentialToken(
        credentialId,
        tokenName,
        tokenSymbol,
        100, // 100 tokens per day emission rate
        1000000 // 1M max supply
      );

      setStatus(`Token created successfully at: ${result.tokenAddress}`);

      // Automatically create initial liquidity
      await createInitialLiquidity(result.credentialId, result.tokenAddress);

    } catch (err) {
      setError(marketplace.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const createInitialLiquidity = async (credId, tokenAddress) => {
    try {
      setStatus('Adding initial liquidity...');

      const tokenAmount = marketplace.parseTokens(1000); // 1000 tokens
      const usdcAmount = marketplace.parseUSDC(1000); // 1000 USDC

      await marketplace.createMarketWithLiquidity(
        credId,
        tokenAddress,
        tokenAmount,
        usdcAmount
      );

      setStatus('Market created with initial liquidity');
      await loadPoolInfo(credId);

    } catch (err) {
      setError('Failed to add liquidity: ' + marketplace.handleError(err));
    }
  };

  const loadPoolInfo = async (credId) => {
    try {
      const info = await marketplace.getPoolInfo(credId || credentialId);
      setPoolInfo(info);
    } catch (err) {
      console.error('Failed to load pool info:', err);
    }
  };

  const getBuyQuote = async () => {
    try {
      if (!buyAmount || !credentialId) return;

      const usdcAmount = marketplace.parseUSDC(buyAmount);
      const quoteResult = await marketplace.getBuyQuote(credentialId, usdcAmount);

      setQuote({
        type: 'buy',
        input: buyAmount + ' USDC',
        output: marketplace.formatTokens(quoteResult.tokensOut) + ' tokens',
        fee: marketplace.formatUSDC(quoteResult.fee) + ' USDC',
        effectivePrice: marketplace.formatUSDC(quoteResult.effectivePrice) + ' USDC per token'
      });
    } catch (err) {
      setError('Failed to get quote: ' + marketplace.handleError(err));
    }
  };

  const getSellQuote = async () => {
    try {
      if (!sellAmount || !credentialId) return;

      const tokenAmount = marketplace.parseTokens(sellAmount);
      const quoteResult = await marketplace.getSellQuote(credentialId, tokenAmount);

      setQuote({
        type: 'sell',
        input: sellAmount + ' tokens',
        output: marketplace.formatUSDC(quoteResult.usdcOut) + ' USDC',
        fee: marketplace.formatTokens(quoteResult.fee) + ' tokens',
        effectivePrice: marketplace.formatUSDC(quoteResult.effectivePrice) + ' USDC per token'
      });
    } catch (err) {
      setError('Failed to get quote: ' + marketplace.handleError(err));
    }
  };

  const executeTradeButton = async (type) => {
    try {
      setLoading(true);
      setStatus(`Executing ${type} trade...`);

      if (type === 'buy') {
        const usdcAmount = marketplace.parseUSDC(buyAmount);
        await marketplace.buyTokens(credentialId, usdcAmount);
        setStatus('Buy trade completed successfully');
      } else {
        const tokenAmount = marketplace.parseTokens(sellAmount);
        await marketplace.sellTokens(credentialId, tokenAmount);
        setStatus('Sell trade completed successfully');
      }

      // Update balances and pool info
      await updateUSDCBalance(account);
      await loadPoolInfo();

    } catch (err) {
      setError(marketplace.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setStatus('');
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Credential Marketplace</h1>

      {/* Connection Status */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
        {!isConnected ? (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="space-y-2">
            <p><strong>Account:</strong> {account}</p>
            <p><strong>USDC Balance:</strong> {usdcBalance} USDC</p>
            <button
              onClick={mintTestUSDC}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Mint 1000 Test USDC
            </button>
          </div>
        )}
      </div>

      {/* Token Creation */}
      {isConnected && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create Credential Token</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Credential ID"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Token Name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Token Symbol"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="border p-2 rounded"
            />
            <button
              onClick={createToken}
              disabled={loading || !credentialId || !tokenName || !tokenSymbol}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Create Token & Market
            </button>
          </div>
        </div>
      )}

      {/* Trading Interface */}
      {isConnected && credentialId && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Trading</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buy Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Buy Tokens</h3>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="USDC Amount"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="border p-2 rounded w-full"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={getBuyQuote}
                    disabled={!buyAmount}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    Get Quote
                  </button>
                  <button
                    onClick={() => executeTradeButton('buy')}
                    disabled={loading || !buyAmount}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                  >
                    Buy Tokens
                  </button>
                </div>
              </div>
            </div>

            {/* Sell Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sell Tokens</h3>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Token Amount"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="border p-2 rounded w-full"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={getSellQuote}
                    disabled={!sellAmount}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    Get Quote
                  </button>
                  <button
                    onClick={() => executeTradeButton('sell')}
                    disabled={loading || !sellAmount}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 disabled:opacity-50"
                  >
                    Sell Tokens
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Display */}
          {quote && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <h4 className="font-medium">Quote ({quote.type})</h4>
              <p><strong>Input:</strong> {quote.input}</p>
              <p><strong>Output:</strong> {quote.output}</p>
              <p><strong>Fee:</strong> {quote.fee}</p>
              <p><strong>Effective Price:</strong> {quote.effectivePrice}</p>
            </div>
          )}
        </div>
      )}

      {/* Pool Information */}
      {poolInfo && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Pool Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Token Reserves:</strong> {marketplace.formatTokens(poolInfo.tokenReserves)}</p>
              <p><strong>USDC Reserves:</strong> {marketplace.formatUSDC(poolInfo.usdcReserves)}</p>
            </div>
            <div>
              <p><strong>Total Liquidity:</strong> {marketplace.formatTokens(poolInfo.totalLiquidity)}</p>
              <p><strong>Status:</strong> {poolInfo.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          <button
            onClick={() => loadPoolInfo()}
            className="mt-2 bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Status Messages */}
      {(status || error) && (
        <div className="bg-white p-4 rounded-lg shadow">
          {status && (
            <div className="text-green-600 mb-2">
              <strong>Status:</strong> {status}
            </div>
          )}
          {error && (
            <div className="text-red-600 mb-2">
              <strong>Error:</strong> {error}
            </div>
          )}
          <button
            onClick={clearMessages}
            className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
          >
            Clear Messages
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-center">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialMarketplaceComponent;