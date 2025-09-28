import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowDownIcon, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import SlippageSettings from './SlippageSettings';
import type { EnvironmentConfig } from '../../config/environments';

interface SwapInterfaceProps {
  airService: any;
  isLoggedIn: boolean;
  userAddress: string | null;
  environmentConfig: EnvironmentConfig;
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
}

interface PoolInfo {
  address: string;
  token0: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  symbol: string;
}

export default function SwapInterface({
  airService,
  isLoggedIn,
  userAddress,
  environmentConfig
}: SwapInterfaceProps) {
  const [fromToken, setFromToken] = useState<'ETH' | 'TOKEN'>('ETH');
  const [toToken, setToToken] = useState<'TOKEN' | 'ETH'>('TOKEN');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [priceImpact, setPriceImpact] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [ethBalance, setEthBalance] = useState('0');
  const [exchangeRate, setExchangeRate] = useState('0');

  useEffect(() => {
    if (isLoggedIn && userAddress) {
      loadAvailableTokens();
      loadEthBalance();
    }
  }, [isLoggedIn, userAddress]);

  useEffect(() => {
    if (selectedToken) {
      loadPoolInfo(selectedToken.address);
    }
  }, [selectedToken]);

  useEffect(() => {
    if (fromAmount && selectedPool) {
      calculateSwapAmount();
    } else {
      setToAmount('');
      setPriceImpact(0);
    }
  }, [fromAmount, selectedPool, fromToken]);

  const loadEthBalance = async () => {
    if (!airService?.provider || !userAddress) return;

    try {
      const provider = new ethers.BrowserProvider(airService.provider);
      const balance = await provider.getBalance(userAddress);
      setEthBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error loading ETH balance:', error);
    }
  };

  const loadAvailableTokens = async () => {
    if (!airService?.provider) return;

    try {
      const provider = new ethers.BrowserProvider(airService.provider);
      const factoryAddress = environmentConfig.contracts?.poolFactory;

      if (!factoryAddress) {
        console.error('Pool factory address not configured');
        return;
      }

      const factoryAbi = [
        'function getAllPools() external view returns (address[])',
        'function getPoolInfo(address pool) external view returns (address token, uint256 reserve0, uint256 reserve1)'
      ];

      const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
      const pools = await factory.getAllPools();

      const tokens: TokenInfo[] = [];
      for (const poolAddress of pools) {
        try {
          const poolInfo = await factory.getPoolInfo(poolAddress);
          const tokenContract = new ethers.Contract(poolInfo.token, [
            'function symbol() view returns (string)',
            'function name() view returns (string)',
            'function decimals() view returns (uint8)',
            'function balanceOf(address) view returns (uint256)'
          ], provider);

          const [symbol, name, decimals, balance] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals(),
            userAddress ? tokenContract.balanceOf(userAddress) : '0'
          ]);

          tokens.push({
            address: poolInfo.token,
            symbol,
            name,
            decimals,
            balance: ethers.formatUnits(balance, decimals)
          });
        } catch (error) {
          console.error('Error loading token info:', error);
        }
      }

      setAvailableTokens(tokens);
      if (tokens.length > 0 && !selectedToken) {
        setSelectedToken(tokens[0]);
      }
    } catch (error) {
      console.error('Error loading available tokens:', error);
    }
  };

  const loadPoolInfo = async (tokenAddress: string) => {
    if (!airService?.provider) return;

    try {
      const provider = new ethers.BrowserProvider(airService.provider);
      const factoryAddress = environmentConfig.contracts?.poolFactory;

      if (!factoryAddress) {
        console.error('Pool factory address not configured');
        return;
      }

      const factoryAbi = [
        'function getPool(address token) external view returns (address)'
      ];

      const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
      const poolAddress = await factory.getPool(tokenAddress);

      if (poolAddress === ethers.ZeroAddress) {
        console.log('No pool exists for this token');
        setSelectedPool(null);
        return;
      }

      const poolAbi = [
        'function token0() view returns (address)',
        'function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)',
        'function totalSupply() view returns (uint256)',
        'function symbol() view returns (string)'
      ];

      const pool = new ethers.Contract(poolAddress, poolAbi, provider);
      const [token0, reserves, totalSupply, symbol] = await Promise.all([
        pool.token0(),
        pool.getReserves(),
        pool.totalSupply(),
        pool.symbol()
      ]);

      setSelectedPool({
        address: poolAddress,
        token0,
        reserve0: reserves[0].toString(),
        reserve1: reserves[1].toString(),
        totalSupply: totalSupply.toString(),
        symbol
      });

      const rate = Number(ethers.formatEther(reserves[1])) / Number(ethers.formatUnits(reserves[0], selectedToken?.decimals || 18));
      setExchangeRate(rate.toFixed(6));
    } catch (error) {
      console.error('Error loading pool info:', error);
    }
  };

  const calculateSwapAmount = () => {
    if (!selectedPool || !fromAmount || !selectedToken) return;

    try {
      const inputAmount = ethers.parseUnits(fromAmount, fromToken === 'ETH' ? 18 : selectedToken.decimals);
      const reserve0 = BigInt(selectedPool.reserve0);
      const reserve1 = BigInt(selectedPool.reserve1);

      let outputAmount: bigint;
      let priceImpactPercent: number;

      if (fromToken === 'ETH') {
        const amountInWithFee = inputAmount * 997n;
        const numerator = amountInWithFee * reserve0;
        const denominator = (reserve1 * 1000n) + amountInWithFee;
        outputAmount = numerator / denominator;

        const spotPrice = Number(ethers.formatEther(reserve1)) / Number(ethers.formatUnits(reserve0, selectedToken.decimals));
        const executionPrice = Number(ethers.formatEther(inputAmount)) / Number(ethers.formatUnits(outputAmount, selectedToken.decimals));
        priceImpactPercent = ((executionPrice - spotPrice) / spotPrice) * 100;
      } else {
        const amountInWithFee = inputAmount * 997n;
        const numerator = amountInWithFee * reserve1;
        const denominator = (reserve0 * 1000n) + amountInWithFee;
        outputAmount = numerator / denominator;

        const spotPrice = Number(ethers.formatUnits(reserve0, selectedToken.decimals)) / Number(ethers.formatEther(reserve1));
        const executionPrice = Number(ethers.formatUnits(inputAmount, selectedToken.decimals)) / Number(ethers.formatEther(outputAmount));
        priceImpactPercent = ((executionPrice - spotPrice) / spotPrice) * 100;
      }

      setToAmount(ethers.formatUnits(outputAmount, fromToken === 'ETH' ? selectedToken.decimals : 18));
      setPriceImpact(Math.abs(priceImpactPercent));
    } catch (error) {
      console.error('Error calculating swap amount:', error);
    }
  };

  const handleSwap = async () => {
    if (!airService?.provider || !selectedPool || !selectedToken || !userAddress) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(airService.provider);
      const signer = await provider.getSigner();

      const poolAbi = [
        'function swapExactETHForTokens(uint256 amountOutMin, address to, uint256 deadline) payable returns (uint256 amountOut)',
        'function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address to, uint256 deadline) returns (uint256 amountOut)'
      ];

      const pool = new ethers.Contract(selectedPool.address, poolAbi, signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const slippageMultiplier = (100 - slippageTolerance) / 100;
      const minAmountOut = ethers.parseUnits(
        (parseFloat(toAmount) * slippageMultiplier).toString(),
        fromToken === 'ETH' ? selectedToken.decimals : 18
      );

      if (fromToken === 'ETH') {
        const tx = await pool.swapExactETHForTokens(
          minAmountOut,
          userAddress,
          deadline,
          { value: ethers.parseEther(fromAmount) }
        );
        await tx.wait();
      } else {
        const tokenContract = new ethers.Contract(selectedToken.address, [
          'function approve(address spender, uint256 amount) returns (bool)'
        ], signer);

        const approveTx = await tokenContract.approve(
          selectedPool.address,
          ethers.parseUnits(fromAmount, selectedToken.decimals)
        );
        await approveTx.wait();

        const tx = await pool.swapExactTokensForETH(
          ethers.parseUnits(fromAmount, selectedToken.decimals),
          minAmountOut,
          userAddress,
          deadline
        );
        await tx.wait();
      }

      setFromAmount('');
      setToAmount('');
      loadAvailableTokens();
      loadEthBalance();
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchTokens = () => {
    setFromToken(fromToken === 'ETH' ? 'TOKEN' : 'ETH');
    setToToken(toToken === 'ETH' ? 'TOKEN' : 'ETH');
    setFromAmount('');
    setToAmount('');
  };

  const getPriceImpactColor = () => {
    if (priceImpact < 1) return 'text-green-500';
    if (priceImpact < 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!isLoggedIn) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please connect your wallet to trade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Swap Tokens</CardTitle>
            <CardDescription>Trade tokens instantly</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSlippageSettings(!showSlippageSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSlippageSettings && (
            <SlippageSettings
              slippageTolerance={slippageTolerance}
              onSlippageChange={setSlippageTolerance}
            />
          )}

          <div className="space-y-1">
            <Label>From</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1"
              />
              <Select value={fromToken} onValueChange={(v: 'ETH' | 'TOKEN') => setFromToken(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="TOKEN">
                    {selectedToken?.symbol || 'Select'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Balance: {fromToken === 'ETH' ? ethBalance : selectedToken?.balance || '0'}
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={switchTokens}
              className="rounded-full"
            >
              <ArrowDownIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <Label>To</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.0"
                value={toAmount}
                readOnly
                className="flex-1"
              />
              {toToken === 'TOKEN' ? (
                <Select
                  value={selectedToken?.address || ''}
                  onValueChange={(addr) => setSelectedToken(availableTokens.find(t => t.address === addr) || null)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" className="w-32" disabled>
                  ETH
                </Button>
              )}
            </div>
          </div>

          {selectedPool && fromAmount && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Exchange Rate</span>
                <span>1 {fromToken === 'ETH' ? 'ETH' : selectedToken?.symbol} = {exchangeRate} {toToken === 'ETH' ? 'ETH' : selectedToken?.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Price Impact</span>
                <span className={getPriceImpactColor()}>{priceImpact.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Min Received</span>
                <span>{(parseFloat(toAmount) * (100 - slippageTolerance) / 100).toFixed(6)} {toToken === 'ETH' ? 'ETH' : selectedToken?.symbol}</span>
              </div>
            </div>
          )}

          {priceImpact > 3 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-500">High price impact! Consider reducing trade size.</p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSwap}
            disabled={!fromAmount || !toAmount || isLoading || !selectedPool}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Swapping...
              </>
            ) : (
              'Swap'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}