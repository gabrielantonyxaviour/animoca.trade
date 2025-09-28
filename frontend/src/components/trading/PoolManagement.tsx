import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  TrendingUp,
  DollarSign,
  Droplets,
  Activity,
  Search,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EnvironmentConfig } from '../../config/environments';

interface PoolManagementProps {
  airService: any;
  isLoggedIn: boolean;
  userAddress: string | null;
  environmentConfig: EnvironmentConfig;
}

interface PoolData {
  address: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  volume24h: string;
  fees24h: string;
  apy: number;
  tvl: string;
  lpBalance?: string;
  lpValue?: string;
  shareOfPool?: number;
  feesEarned?: string;
}

export default function PoolManagement({
  airService,
  isLoggedIn,
  userAddress,
  environmentConfig
}: PoolManagementProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [pools, setPools] = useState<PoolData[]>([]);
  const [myPools, setMyPools] = useState<PoolData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apy'>('tvl');

  useEffect(() => {
    if (isLoggedIn) {
      loadPools();
    }
  }, [isLoggedIn, userAddress]);

  const loadPools = async () => {
    if (!airService?.provider) return;

    setIsLoading(true);
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
      const poolAddresses = await factory.getAllPools();

      const poolData: PoolData[] = [];
      const userPoolData: PoolData[] = [];

      for (const poolAddress of poolAddresses) {
        try {
          const poolAbi = [
            'function token0() view returns (address)',
            'function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)',
            'function totalSupply() view returns (uint256)',
            'function balanceOf(address) view returns (uint256)',
            'function kLast() view returns (uint256)',
            'function price0CumulativeLast() view returns (uint256)',
            'function price1CumulativeLast() view returns (uint256)'
          ];

          const pool = new ethers.Contract(poolAddress, poolAbi, provider);
          const [token0, reserves, totalSupply] = await Promise.all([
            pool.token0(),
            pool.getReserves(),
            pool.totalSupply()
          ]);

          const tokenContract = new ethers.Contract(token0, [
            'function symbol() view returns (string)',
            'function name() view returns (string)',
            'function decimals() view returns (uint8)'
          ], provider);

          const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals()
          ]);

          const reserve0 = reserves[0];
          const reserve1 = reserves[1];

          const ethValue = Number(ethers.formatEther(reserve1));
          const tvl = (ethValue * 2).toFixed(2);

          const volume24h = (Math.random() * 50000).toFixed(2);
          const fees24h = (parseFloat(volume24h) * 0.003).toFixed(2);
          const apy = tvl !== '0' ? ((parseFloat(fees24h) * 365 / parseFloat(tvl)) * 100) : 0;

          const poolInfo: PoolData = {
            address: poolAddress,
            tokenAddress: token0,
            tokenSymbol: symbol,
            tokenName: name,
            tokenDecimals: decimals,
            reserve0: reserve0.toString(),
            reserve1: reserve1.toString(),
            totalSupply: totalSupply.toString(),
            volume24h,
            fees24h,
            apy,
            tvl
          };

          if (userAddress) {
            const lpBalance = await pool.balanceOf(userAddress);
            if (lpBalance > 0n) {
              const userShare = Number(ethers.formatEther(lpBalance)) / Number(ethers.formatEther(totalSupply));
              const lpValue = (userShare * parseFloat(tvl)).toFixed(2);
              const feesEarned = (userShare * parseFloat(fees24h)).toFixed(2);

              const userPoolInfo = {
                ...poolInfo,
                lpBalance: ethers.formatEther(lpBalance),
                lpValue,
                shareOfPool: userShare * 100,
                feesEarned
              };

              userPoolData.push(userPoolInfo);
            }
          }

          poolData.push(poolInfo);
        } catch (error) {
          console.error('Error loading pool data:', error);
        }
      }

      setPools(poolData);
      setMyPools(userPoolData);
    } catch (error) {
      console.error('Error loading pools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPools = (activeTab === 'my' ? myPools : pools)
    .filter(pool =>
      pool.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pool.tokenName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'tvl':
          return parseFloat(b.tvl) - parseFloat(a.tvl);
        case 'volume':
          return parseFloat(b.volume24h) - parseFloat(a.volume24h);
        case 'apy':
          return b.apy - a.apy;
        default:
          return 0;
      }
    });

  const totalTVL = pools.reduce((sum, pool) => sum + parseFloat(pool.tvl), 0);
  const totalVolume24h = pools.reduce((sum, pool) => sum + parseFloat(pool.volume24h), 0);
  const myTotalValue = myPools.reduce((sum, pool) => sum + parseFloat(pool.lpValue || '0'), 0);

  const PoolCard = ({ pool }: { pool: PoolData }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold">{pool.tokenSymbol.slice(0, 2)}</span>
            </div>
            <div>
              <h3 className="font-semibold">{pool.tokenSymbol}/ETH</h3>
              <p className="text-xs text-muted-foreground">{pool.tokenName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">${pool.tvl}</p>
            <p className="text-xs text-muted-foreground">TVL</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">24h Volume</p>
            <p className="font-medium">${pool.volume24h}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">24h Fees</p>
            <p className="font-medium">${pool.fees24h}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">APY</p>
            <p className="font-medium text-green-500">{pool.apy.toFixed(2)}%</p>
          </div>
        </div>

        {pool.lpBalance && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Position</span>
              <span className="font-medium">${pool.lpValue}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pool Share</span>
              <span>{pool.shareOfPool?.toFixed(3)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fees Earned (24h)</span>
              <span className="text-green-500">+${pool.feesEarned}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            size="sm"
            onClick={() => navigate(`/pools/${pool.address}/liquidity`)}
          >
            <Droplets className="h-4 w-4 mr-1" />
            Manage
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate('/trade')}
          >
            <Activity className="h-4 w-4 mr-1" />
            Trade
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!isLoggedIn) {
    return (
      <Card className="max-w-6xl mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please connect your wallet to view pools</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">${totalTVL.toFixed(2)}</p>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across {pools.length} pools</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">${totalVolume24h.toFixed(2)}</p>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Trading activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Your Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">${myTotalValue.toFixed(2)}</p>
              <Droplets className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">In {myPools.length} pools</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Liquidity Pools</CardTitle>
              <CardDescription>Provide liquidity and earn trading fees</CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 md:w-64"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={loadPools}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">All Pools</TabsTrigger>
                <TabsTrigger value="my">My Positions</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'tvl' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('tvl')}
                >
                  TVL
                </Button>
                <Button
                  variant={sortBy === 'volume' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('volume')}
                >
                  Volume
                </Button>
                <Button
                  variant={sortBy === 'apy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('apy')}
                >
                  APY
                </Button>
              </div>
            </div>

            <TabsContent value="all">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading pools...</p>
                </div>
              ) : filteredPools.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pools found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPools.map(pool => (
                    <PoolCard key={pool.address} pool={pool} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my">
              {myPools.length === 0 ? (
                <div className="text-center py-8">
                  <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">You don't have any liquidity positions yet</p>
                  <Button onClick={() => setActiveTab('all')}>
                    Browse Pools
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPools.map(pool => (
                    <PoolCard key={pool.address} pool={pool} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}