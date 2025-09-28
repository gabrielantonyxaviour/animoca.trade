import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ReputationLeaderboard from './ReputationLeaderboard';
import MarketOverview from './MarketOverview';
import PriceCharts from './PriceCharts';
import VolumeAnalytics from './VolumeAnalytics';
import { BarChart3, Activity, PieChart, ChartLine, Trophy } from 'lucide-react';

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

  // Mock oracle address - in production would come from environmentConfig
  const oracleAddress = environmentConfig?.contracts?.reputationOracle || '0x0000000000000000000000000000000000000000';

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
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">
          Real-time market data, reputation scores, and trading analytics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total TVL</span>
              <Activity className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">$12.45M</div>
            <div className="text-sm text-green-600">+12.5%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">24h Volume</span>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">$3.25M</div>
            <div className="text-sm text-green-600">+8.3%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Tokens</span>
              <PieChart className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">87</div>
            <div className="text-sm text-green-600">+5.2%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Reputation</span>
              <Trophy className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">745</div>
            <div className="text-sm text-gray-500">Score</div>
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
                  {/* Mock tokens for selection */}
                  {[
                    { symbol: 'MIT-CS', address: '0x1234...5678' },
                    { symbol: 'AWS-ARCH', address: '0x2345...6789' },
                    { symbol: 'STANFORD-AI', address: '0x3456...789a' },
                    { symbol: 'GOOGLE-ML', address: '0x4567...89ab' },
                    { symbol: 'ETH-DEV', address: '0x5678...9abc' },
                    { symbol: 'HARVARD-MBA', address: '0x6789...abcd' },
                  ].map((token) => (
                    <Button
                      key={token.address}
                      variant="outline"
                      className="justify-start"
                      onClick={() => setSelectedToken(token)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{token.symbol}</Badge>
                        <span className="text-sm text-gray-600">{token.address}</span>
                      </div>
                    </Button>
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
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-sm mb-2">Analytics Data Sources</h3>
        <p className="text-xs text-gray-600">
          Data is collected from on-chain pool contracts and updated hourly via the reputation oracle.
          Price feeds are aggregated from swap events, and reputation scores are calculated using the
          formula: log₂(TWAP) × Volume_Weight × Liquidity_Multiplier × Stability_Bonus
        </p>
      </div>
    </div>
  );
}