import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Minus, AlertCircle, RefreshCw } from 'lucide-react';
import type { EnvironmentConfig } from '../../config/environments';

interface LiquidityProviderProps {
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
  lpBalance?: string;
}

export default function LiquidityProvider({
  airService,
  isLoggedIn,
  userAddress,
  environmentConfig
}: LiquidityProviderProps) {
  const [activeTab, setActiveTab] = useState('add');
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [lpTokenAmount, setLpTokenAmount] = useState('');
  const [estimatedTokens, setEstimatedTokens] = useState({ token: '0', eth: '0' });
  const [isLoading, setIsLoading] = useState(false);
  const [ethBalance, setEthBalance] = useState('0');
  const [shareOfPool, setShareOfPool] = useState(0);

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
    if (selectedPool && tokenAmount && activeTab === 'add') {
      calculateRequiredEth();
    }
  }, [tokenAmount, selectedPool, activeTab]);

  useEffect(() => {
    if (selectedPool && lpTokenAmount && activeTab === 'remove') {
      calculateWithdrawAmounts();
    }
  }, [lpTokenAmount, selectedPool, activeTab]);

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
    if (!airService?.provider || !userAddress) return;

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
        'function symbol() view returns (string)',
        'function balanceOf(address) view returns (uint256)'
      ];

      const pool = new ethers.Contract(poolAddress, poolAbi, provider);
      const [token0, reserves, totalSupply, symbol, lpBalance] = await Promise.all([
        pool.token0(),
        pool.getReserves(),
        pool.totalSupply(),
        pool.symbol(),
        pool.balanceOf(userAddress)
      ]);

      setSelectedPool({
        address: poolAddress,
        token0,
        reserve0: reserves[0].toString(),
        reserve1: reserves[1].toString(),
        totalSupply: totalSupply.toString(),
        symbol,
        lpBalance: ethers.formatEther(lpBalance)
      });
    } catch (error) {
      console.error('Error loading pool info:', error);
    }
  };

  const calculateRequiredEth = () => {
    if (!selectedPool || !tokenAmount || !selectedToken) return;

    try {
      const tokenAmountWei = ethers.parseUnits(tokenAmount, selectedToken.decimals);
      const reserve0 = BigInt(selectedPool.reserve0);
      const reserve1 = BigInt(selectedPool.reserve1);

      const requiredEth = (tokenAmountWei * reserve1) / reserve0;
      setEthAmount(ethers.formatEther(requiredEth));

      const totalSupply = BigInt(selectedPool.totalSupply);
      let liquidityMinted: bigint;

      if (totalSupply === 0n) {
        liquidityMinted = ethers.parseEther('1000');
      } else {
        const liquidity0 = (tokenAmountWei * totalSupply) / reserve0;
        const liquidity1 = (requiredEth * totalSupply) / reserve1;
        liquidityMinted = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
      }

      const newShare = (Number(ethers.formatEther(liquidityMinted)) /
        (Number(ethers.formatEther(totalSupply)) + Number(ethers.formatEther(liquidityMinted)))) * 100;
      setShareOfPool(newShare);
    } catch (error) {
      console.error('Error calculating required ETH:', error);
    }
  };

  const calculateWithdrawAmounts = () => {
    if (!selectedPool || !lpTokenAmount || !selectedToken) return;

    try {
      const lpAmount = ethers.parseEther(lpTokenAmount);
      const totalSupply = BigInt(selectedPool.totalSupply);
      const reserve0 = BigInt(selectedPool.reserve0);
      const reserve1 = BigInt(selectedPool.reserve1);

      const tokenAmount = (lpAmount * reserve0) / totalSupply;
      const ethAmount = (lpAmount * reserve1) / totalSupply;

      setEstimatedTokens({
        token: ethers.formatUnits(tokenAmount, selectedToken.decimals),
        eth: ethers.formatEther(ethAmount)
      });
    } catch (error) {
      console.error('Error calculating withdraw amounts:', error);
    }
  };

  const handleAddLiquidity = async () => {
    if (!airService?.provider || !selectedPool || !selectedToken || !userAddress) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(airService.provider);
      const signer = await provider.getSigner();

      const tokenContract = new ethers.Contract(selectedToken.address, [
        'function approve(address spender, uint256 amount) returns (bool)'
      ], signer);

      const tokenAmountWei = ethers.parseUnits(tokenAmount, selectedToken.decimals);
      const ethAmountWei = ethers.parseEther(ethAmount);

      const approveTx = await tokenContract.approve(selectedPool.address, tokenAmountWei);
      await approveTx.wait();

      const poolAbi = [
        'function addLiquidity(uint256 amountTokenDesired, address to, uint256 deadline) payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)'
      ];

      const pool = new ethers.Contract(selectedPool.address, poolAbi, signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await pool.addLiquidity(
        tokenAmountWei,
        userAddress,
        deadline,
        { value: ethAmountWei }
      );

      await tx.wait();

      setTokenAmount('');
      setEthAmount('');
      loadPoolInfo(selectedToken.address);
      loadAvailableTokens();
      loadEthBalance();
    } catch (error) {
      console.error('Add liquidity failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!airService?.provider || !selectedPool || !selectedToken || !userAddress) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(airService.provider);
      const signer = await provider.getSigner();

      const poolAbi = [
        'function removeLiquidity(uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) returns (uint256 amountToken, uint256 amountETH)'
      ];

      const pool = new ethers.Contract(selectedPool.address, poolAbi, signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const lpAmountWei = ethers.parseEther(lpTokenAmount);
      const minTokenAmount = ethers.parseUnits(
        (parseFloat(estimatedTokens.token) * 0.95).toString(),
        selectedToken.decimals
      );
      const minEthAmount = ethers.parseEther((parseFloat(estimatedTokens.eth) * 0.95).toString());

      const tx = await pool.removeLiquidity(
        lpAmountWei,
        minTokenAmount,
        minEthAmount,
        userAddress,
        deadline
      );

      await tx.wait();

      setLpTokenAmount('');
      setEstimatedTokens({ token: '0', eth: '0' });
      loadPoolInfo(selectedToken.address);
      loadAvailableTokens();
      loadEthBalance();
    } catch (error) {
      console.error('Remove liquidity failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please connect your wallet to provide liquidity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Management</CardTitle>
          <CardDescription>Add or remove liquidity from pools</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Add Liquidity</TabsTrigger>
              <TabsTrigger value="remove">Remove Liquidity</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Token</Label>
                <Select
                  value={selectedToken?.address || ''}
                  onValueChange={(addr) => setSelectedToken(availableTokens.find(t => t.address === addr) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a token" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol} - {token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPool && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{selectedToken?.symbol} Amount</Label>
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Balance: {selectedToken?.balance || '0'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>ETH Amount</Label>
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={ethAmount}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Balance: {ethBalance}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pool Token Supply</span>
                      <span>{parseFloat(ethers.formatEther(selectedPool.totalSupply)).toFixed(4)} LP</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Your Share</span>
                      <span>{shareOfPool.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pool Reserves</span>
                      <span>
                        {parseFloat(ethers.formatUnits(selectedPool.reserve0, selectedToken?.decimals || 18)).toFixed(2)} {selectedToken?.symbol} / {parseFloat(ethers.formatEther(selectedPool.reserve1)).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleAddLiquidity}
                    disabled={!tokenAmount || !ethAmount || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Adding Liquidity...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Liquidity
                      </>
                    )}
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="remove" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Token Pool</Label>
                <Select
                  value={selectedToken?.address || ''}
                  onValueChange={(addr) => setSelectedToken(availableTokens.find(t => t.address === addr) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a token pool" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol} - {token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPool && selectedPool.lpBalance && parseFloat(selectedPool.lpBalance) > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>LP Token Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={lpTokenAmount}
                      onChange={(e) => setLpTokenAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Balance: {selectedPool.lpBalance} LP
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium mb-2">You will receive:</p>
                    <div className="flex justify-between text-sm">
                      <span>{selectedToken?.symbol}</span>
                      <span>{estimatedTokens.token}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ETH</span>
                      <span>{estimatedTokens.eth}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={handleRemoveLiquidity}
                    disabled={!lpTokenAmount || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Removing Liquidity...
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 mr-2" />
                        Remove Liquidity
                      </>
                    )}
                  </Button>
                </>
              )}

              {selectedPool && (!selectedPool.lpBalance || parseFloat(selectedPool.lpBalance) === 0) && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">You don't have any LP tokens for this pool</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}