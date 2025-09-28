import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  Coins,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface MarketOverviewProps {
  oracleAddress?: string;
}

interface MarketStats {
  totalValueLocked: string;
  totalVolume24h: string;
  totalVolume7d: string;
  activeTokens: number;
  totalCredentials: number;
  averageReputation: number;
  topGainer: {
    symbol: string;
    change: number;
  };
  topLoser: {
    symbol: string;
    change: number;
  };
}

interface TokenMetric {
  symbol: string;
  price: string;
  change24h: number;
  volume24h: string;
  marketCap: string;
}

export default function MarketOverview({
  oracleAddress,
}: MarketOverviewProps) {
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalValueLocked: '0',
    totalVolume24h: '0',
    totalVolume7d: '0',
    activeTokens: 0,
    totalCredentials: 0,
    averageReputation: 0,
    topGainer: { symbol: '-', change: 0 },
    topLoser: { symbol: '-', change: 0 },
  });

  const [topMovers, setTopMovers] = useState<TokenMetric[]>([]);
  const [highestVolume, setHighestVolume] = useState<TokenMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (oracleAddress) {
      loadMarketData();
      const interval = setInterval(loadMarketData, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [oracleAddress]);

  const loadMarketData = async () => {
    try {
      setIsLoading(true);

      // Mock market data for demonstration
      setMarketStats({
        totalValueLocked: '12,450,000',
        totalVolume24h: '3,250,000',
        totalVolume7d: '18,750,000',
        activeTokens: 87,
        totalCredentials: 150,
        averageReputation: 745,
        topGainer: { symbol: 'MIT-CS', change: 28.5 },
        topLoser: { symbol: 'BASIC-CERT', change: -12.3 },
      });

      setTopMovers([
        { symbol: 'MIT-CS', price: '25.50', change24h: 28.5, volume24h: '125,432', marketCap: '2,550,000' },
        { symbol: 'AWS-ARCH', price: '18.75', change24h: 18.3, volume24h: '98,765', marketCap: '1,875,000' },
        { symbol: 'GOOGLE-ML', price: '15.80', change24h: 15.6, volume24h: '76,543', marketCap: '1,580,000' },
        { symbol: 'ETH-DEV', price: '12.45', change24h: -8.2, volume24h: '65,432', marketCap: '1,245,000' },
        { symbol: 'BASIC-CERT', price: '2.10', change24h: -12.3, volume24h: '45,321', marketCap: '210,000' },
      ]);

      setHighestVolume([
        { symbol: 'MIT-CS', price: '25.50', change24h: 28.5, volume24h: '125,432', marketCap: '2,550,000' },
        { symbol: 'STANFORD-AI', price: '22.10', change24h: 8.7, volume24h: '115,890', marketCap: '2,210,000' },
        { symbol: 'AWS-ARCH', price: '18.75', change24h: 18.3, volume24h: '98,765', marketCap: '1,875,000' },
        { symbol: 'HARVARD-MBA', price: '30.20', change24h: 5.2, volume24h: '87,650', marketCap: '3,020,000' },
        { symbol: 'GOOGLE-ML', price: '15.80', change24h: 15.6, volume24h: '76,543', marketCap: '1,580,000' },
      ]);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading market data:', error);
      setIsLoading(false);
    }
  };


  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    prefix = ''
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    prefix?: string;
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardDescription>{title}</CardDescription>
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{prefix}{value}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(change).toFixed(2)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Market Overview</h2>
          <p className="text-gray-600">Real-time market statistics and analytics</p>
        </div>
        <Button variant="outline" onClick={loadMarketData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Value Locked"
              value={marketStats.totalValueLocked}
              prefix="$"
              change={12.5}
              icon={DollarSign}
            />
            <StatCard
              title="24h Volume"
              value={marketStats.totalVolume24h}
              prefix="$"
              change={8.3}
              icon={BarChart3}
            />
            <StatCard
              title="Active Tokens"
              value={marketStats.activeTokens}
              change={5.2}
              icon={Coins}
            />
            <StatCard
              title="Total Credentials"
              value={marketStats.totalCredentials}
              icon={Users}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Market Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Top Gainer (24h)</span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="font-bold text-lg">{marketStats.topGainer.symbol}</div>
                  <div className="text-green-600 font-semibold">
                    +{marketStats.topGainer.change.toFixed(2)}%
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Top Loser (24h)</span>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="font-bold text-lg">{marketStats.topLoser.symbol}</div>
                  <div className="text-red-600 font-semibold">
                    {marketStats.topLoser.change.toFixed(2)}%
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Avg Reputation</span>
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="font-bold text-lg">{marketStats.averageReputation}</div>
                  <div className="text-blue-600 font-semibold">Score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="movers">Top Movers</TabsTrigger>
                  <TabsTrigger value="volume">Highest Volume</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTab}>
                <TabsContent value="movers">
                  <div className="space-y-2">
                    {topMovers.map((token) => (
                      <div key={token.symbol} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={token.change24h >= 0 ? 'default' : 'destructive'}>
                            {token.symbol}
                          </Badge>
                          <div>
                            <div className="font-semibold">${token.price}</div>
                            <div className="text-sm text-gray-500">Vol: ${token.volume24h}</div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 font-semibold ${
                          token.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {token.change24h >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>{Math.abs(token.change24h).toFixed(2)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="volume">
                  <div className="space-y-2">
                    {highestVolume.map((token) => (
                      <div key={token.symbol} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge>{token.symbol}</Badge>
                          <div>
                            <div className="font-semibold">${token.price}</div>
                            <div className="text-sm text-gray-500">MCap: ${token.marketCap}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${token.volume24h}</div>
                          <div className="text-sm text-gray-500">24h Volume</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Credential Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Education</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-20 h-2 bg-blue-600 rounded"></div>
                      </div>
                      <span className="text-sm font-semibold">42%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Professional</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-16 h-2 bg-green-600 rounded"></div>
                      </div>
                      <span className="text-sm font-semibold">33%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Skills</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-12 h-2 bg-purple-600 rounded"></div>
                      </div>
                      <span className="text-sm font-semibold">25%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Volume Breakdown (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">${marketStats.totalVolume7d}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Trading</span>
                    <span className="font-semibold">65%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Liquidity Provision</span>
                    <span className="font-semibold">25%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Token Generation</span>
                    <span className="font-semibold">10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}