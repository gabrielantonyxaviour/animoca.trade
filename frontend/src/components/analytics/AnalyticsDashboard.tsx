import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ReputationLeaderboard from './ReputationLeaderboard';
import MarketOverview from './MarketOverview';
import PriceCharts from './PriceCharts';
import VolumeAnalytics from './VolumeAnalytics';
import { BarChart3, Activity, PieChart, ChartLine, Trophy, CheckCircle, Users, DollarSign, TrendingUp } from 'lucide-react';
import { useRealTimePrices } from '@/hooks/useRealTimePrices';

interface AnalyticsDashboardProps {
  environmentConfig: any;
}

export default function AnalyticsDashboard({
  environmentConfig,
}: AnalyticsDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedToken, setSelectedToken] = useState<{
    address: string;
    symbol: string;
  } | null>(null);
  const [platformStats, setPlatformStats] = useState({
    totalTVL: 0,
    volume24h: 0,
    activeTokens: 0,
    totalVerifications: 0,
    feesCollected24h: 0,
    uniqueHolders: 0,
  });

  const { prices } = useRealTimePrices();

  // Mock oracle address - in production would come from environmentConfig
  const oracleAddress = environmentConfig?.contracts?.reputationOracle || '0x0000000000000000000000000000000000000000';

  // Calculate platform stats from real-time data and localStorage
  useEffect(() => {
    let totalTVL = 0;
    let volume24h = 0;
    let activeTokens = 0;
    let totalVerifications = 0;
    let feesCollected24h = 0;
    const uniqueHolders = new Set();

    // Calculate from real-time prices
    prices.forEach((tokenPrice) => {
      activeTokens++;
      totalTVL += tokenPrice.marketCap;
      volume24h += tokenPrice.volume24h;
    });

    // Get verification stats from localStorage
    ['edu-001', 'prof-002', 'skill-004'].forEach((credId) => {
      const stats = localStorage.getItem(`credential_stats_${credId}`);
      if (stats) {
        const parsed = JSON.parse(stats);
        totalVerifications += parsed.totalVerifications || 0;
        feesCollected24h += parsed.feesCollected24h || 0;
        // Mock unique holders
        for (let i = 0; i < (parsed.activeHolders || 50); i++) {
          uniqueHolders.add(`${credId}_holder_${i}`);
        }
      }
    });

    setPlatformStats({
      totalTVL,
      volume24h,
      activeTokens,
      totalVerifications,
      feesCollected24h,
      uniqueHolders: uniqueHolders.size,
    });
  }, [prices]);

  const navigationTabs = [
    { value: 'overview', label: 'Market Overview', icon: PieChart },
    { value: 'leaderboard', label: 'Reputation', icon: Trophy },
    { value: 'charts', label: 'Price Charts', icon: ChartLine },
    { value: 'volume', label: 'Volume Analytics', icon: BarChart3 },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">animoca.trade Analytics</h1>
        <p className="text-gray-600">
          Track the performance of the world's first stock market for professional skills and credentials
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Market Cap</span>
              <Activity className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{(platformStats.totalTVL / 1000).toFixed(1)}K USDC</div>
            <div className="text-sm text-pink-600">+12.5%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">24h Volume</span>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{(platformStats.volume24h / 1000).toFixed(1)}K USDC</div>
            <div className="text-sm text-pink-600">+8.3%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Skills</span>
              <Trophy className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{platformStats.activeTokens}</div>
            <div className="text-sm text-gray-500">Tokenized</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Verifications</span>
              <CheckCircle className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{platformStats.totalVerifications.toLocaleString()}</div>
            <div className="text-sm text-pink-600">All time</div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Fees Collected (24h)</span>
              <DollarSign className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{platformStats.feesCollected24h.toFixed(2)} USDC</div>
            <div className="text-sm text-gray-600">Distributed to token holders</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Unique Holders</span>
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{platformStats.uniqueHolders.toLocaleString()}</div>
            <div className="text-sm text-pink-600">+15.2% this month</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Token Price</span>
              <TrendingUp className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">
              {platformStats.activeTokens > 0
                ? (Array.from(prices.values()).reduce((sum, p) => sum + p.price, 0) / platformStats.activeTokens).toFixed(4)
                : '0.0000'
              } USDC
            </div>
            <div className="text-sm text-gray-600">Across all skills</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <MarketOverview
            oracleAddress={oracleAddress}
          />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <ReputationLeaderboard
            oracleAddress={oracleAddress}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          {selectedToken ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedToken.symbol} Analysis</h2>
                  <p className="text-sm text-gray-600">{selectedToken.address}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedToken(null)}
                >
                  Back to Selection
                </Button>
              </div>
              <PriceCharts
                tokenAddress={selectedToken.address}
                tokenSymbol={selectedToken.symbol}
                oracleAddress={oracleAddress}
              />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select Token for Analysis</CardTitle>
                <CardDescription>Choose a token to view detailed price charts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Real credential tokens */}
                  {[
                    { symbol: 'CSED', address: '0x123...', name: 'Computer Science Degree', issuer: 'MIT' },
                    { symbol: 'SDC', address: '0x456...', name: 'Senior Developer Cert', issuer: 'TechCorp' },
                    { symbol: 'BEB', address: '0xabc...', name: 'Blockchain Expert Badge', issuer: 'CryptoAcademy' },
                  ].map((token) => (
                    <Card
                      key={token.address}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedToken({ symbol: token.symbol, address: token.address })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge>{token.symbol}</Badge>
                          <span className="text-xs text-gray-500">{token.address}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm">{token.name}</div>
                          <div className="text-xs text-gray-600">Issued by {token.issuer}</div>
                          <div className="text-xs text-pink-600 mt-1">
                            {prices.get(token.address)?.price.toFixed(4)} USDC
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="volume" className="space-y-6">
          <VolumeAnalytics
            oracleAddress={oracleAddress}
          />
        </TabsContent>
      </Tabs>

      {/* Additional Info */}
      <div className="mt-8 p-4 bg-pink-50 rounded-lg">
        <h3 className="font-bold text-sm mb-2">How animoca.trade Works</h3>
        <p className="text-xs text-gray-600">
          animoca.trade creates liquid markets for professional credentials and skills. Token holders earn USDC fees
          every time someone verifies that credential. Prices reflect the real market demand for each skill,
          creating the world's first stock market for professional reputation. All trading is conducted in USDC
          for price stability and global accessibility.
        </p>
      </div>
    </div>
  );
}