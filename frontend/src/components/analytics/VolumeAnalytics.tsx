import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  PieChart,
  DollarSign,
  Users,
  Clock,
} from 'lucide-react';

interface VolumeAnalyticsProps {
  oracleAddress?: string;
}

interface VolumeMetric {
  timestamp: string;
  volume: number;
  trades: number;
  avgTradeSize: number;
}

interface TokenVolume {
  symbol: string;
  volume24h: number;
  volume7d: number;
  trades24h: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
}

interface HourlyDistribution {
  hour: number;
  volume: number;
  trades: number;
}

export default function VolumeAnalytics({
  oracleAddress,
}: VolumeAnalyticsProps) {
  const volumeChartRef = useRef<HTMLDivElement>(null);
  const distributionChartRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const distChartRef = useRef<IChartApi | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const tradesSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [topTokens, setTopTokens] = useState<TokenVolume[]>([]);
  const [totalVolume24h, setTotalVolume24h] = useState(0);
  const [totalTrades24h, setTotalTrades24h] = useState(0);
  const [avgTradeSize, setAvgTradeSize] = useState(0);
  const [volumeTrend, setVolumeTrend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (volumeChartRef.current && !chartRef.current) {
      initializeVolumeChart();
    }
    if (distributionChartRef.current && !distChartRef.current) {
      initializeDistributionChart();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      if (distChartRef.current) {
        distChartRef.current.remove();
        distChartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (oracleAddress) {
      loadVolumeData();
      const interval = setInterval(loadVolumeData, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [oracleAddress, selectedPeriod]);

  const initializeVolumeChart = () => {
    if (!volumeChartRef.current) return;

    chartRef.current = createChart(volumeChartRef.current, {
      width: volumeChartRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e0e0e0', style: 1 },
        horzLines: { color: '#e0e0e0', style: 1 },
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const handleResize = () => {
      if (chartRef.current && volumeChartRef.current) {
        chartRef.current.applyOptions({
          width: volumeChartRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
  };

  const initializeDistributionChart = () => {
    if (!distributionChartRef.current) return;

    distChartRef.current = createChart(distributionChartRef.current, {
      width: distributionChartRef.current.clientWidth,
      height: 250,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e0e0e0', style: 1 },
        horzLines: { color: '#e0e0e0', style: 1 },
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
      },
    });
  };

  const loadVolumeData = async () => {
    try {
      setIsLoading(true);

      // Generate mock volume data
      const now = new Date();
      const metrics: VolumeMetric[] = [];
      let totalVol = 0;
      let totalTrades = 0;

      const dataPoints = selectedPeriod === '24h' ? 24 : selectedPeriod === '7d' ? 7 : 30;
      const interval = selectedPeriod === '24h' ? 3600000 : 86400000; // Hour or day

      for (let i = 0; i < dataPoints; i++) {
        const time = new Date(now.getTime() - (dataPoints - i) * interval);
        const volume = Math.random() * 100000 + 50000;
        const trades = Math.floor(Math.random() * 500 + 100);

        totalVol += volume;
        totalTrades += trades;

        metrics.push({
          timestamp: time.toISOString(),
          volume,
          trades,
          avgTradeSize: volume / trades,
        });
      }

      // setVolumeData(metrics); // Removed - metrics used directly below
      setTotalVolume24h(totalVol);
      setTotalTrades24h(totalTrades);
      setAvgTradeSize(totalVol / totalTrades);
      setVolumeTrend(15.5); // Mock trend

      // Mock top tokens by volume
      const mockTokens: TokenVolume[] = [
        {
          symbol: 'MIT-CS',
          volume24h: 250000,
          volume7d: 1750000,
          trades24h: 1250,
          percentOfTotal: 25,
          trend: 'up',
        },
        {
          symbol: 'AWS-ARCH',
          volume24h: 180000,
          volume7d: 1260000,
          trades24h: 900,
          percentOfTotal: 18,
          trend: 'up',
        },
        {
          symbol: 'STANFORD-AI',
          volume24h: 150000,
          volume7d: 1050000,
          trades24h: 750,
          percentOfTotal: 15,
          trend: 'stable',
        },
        {
          symbol: 'GOOGLE-ML',
          volume24h: 120000,
          volume7d: 840000,
          trades24h: 600,
          percentOfTotal: 12,
          trend: 'down',
        },
        {
          symbol: 'ETH-DEV',
          volume24h: 100000,
          volume7d: 700000,
          trades24h: 500,
          percentOfTotal: 10,
          trend: 'up',
        },
      ];

      setTopTokens(mockTokens);

      // Mock hourly distribution
      const distribution: HourlyDistribution[] = [];
      for (let hour = 0; hour < 24; hour++) {
        distribution.push({
          hour,
          volume: Math.random() * 50000 + 10000,
          trades: Math.floor(Math.random() * 100 + 20),
        });
      }
      // setHourlyDistribution(distribution); // Removed - distribution used directly below

      // Update charts
      updateCharts(metrics, distribution);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading volume data:', error);
      setIsLoading(false);
    }
  };

  const updateCharts = (metrics: VolumeMetric[], distribution: HourlyDistribution[]) => {
    if (chartRef.current) {
      // Clear existing series
      if (volumeSeriesRef.current) {
        chartRef.current.removeSeries(volumeSeriesRef.current);
      }
      if (tradesSeriesRef.current) {
        chartRef.current.removeSeries(tradesSeriesRef.current);
      }

      // Add volume histogram
      volumeSeriesRef.current = (chartRef.current as any).addHistogramSeries({
        color: '#3b82f6',
        priceFormat: { type: 'volume' },
        priceScaleId: 'right',
      });

      const volumeData = metrics.map(m => ({
        time: m.timestamp.split('T')[0],
        value: m.volume,
      }));
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData as any);
      }

      // Add trades line
      tradesSeriesRef.current = (chartRef.current as any).addLineSeries({
        color: '#10b981',
        lineWidth: 2,
        priceScaleId: 'left',
      });

      const tradesData = metrics.map(m => ({
        time: m.timestamp.split('T')[0],
        value: m.trades,
      }));
      if (tradesSeriesRef.current) {
        tradesSeriesRef.current.setData(tradesData as any);
      }

      chartRef.current.timeScale().fitContent();
    }

    if (distChartRef.current && distribution.length > 0) {
      // Clear and add distribution chart
      const histSeries = (distChartRef.current as any).addHistogramSeries({
        color: '#8b5cf6',
        priceFormat: { type: 'volume' },
      });

      const distData = distribution.map(d => ({
        time: `2024-01-01 ${d.hour.toString().padStart(2, '0')}:00:00`,
        value: d.volume,
      }));
      histSeries.setData(distData as any);

      distChartRef.current.timeScale().fitContent();
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (trend === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Volume Analytics</CardTitle>
                <CardDescription>Trading volume analysis and distribution</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={loadVolumeData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">24h Volume</span>
                      <DollarSign className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{formatVolume(totalVolume24h)}</div>
                    <div className="flex items-center gap-1 mt-1 text-green-600">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-sm">+{volumeTrend.toFixed(2)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">24h Trades</span>
                      <Activity className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{totalTrades24h.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      ~{Math.floor(totalTrades24h / 24)}/hour
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Avg Trade Size</span>
                      <PieChart className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{formatVolume(avgTradeSize)}</div>
                    <div className="text-sm text-gray-500 mt-1">per trade</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Active Pairs</span>
                      <Users className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">42</div>
                    <div className="text-sm text-gray-500 mt-1">with volume</div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="volume" className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <TabsList>
                    <TabsTrigger value="volume">Volume Chart</TabsTrigger>
                    <TabsTrigger value="distribution">Hourly Distribution</TabsTrigger>
                  </TabsList>
                  <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Last 24H</SelectItem>
                      <SelectItem value="7d">Last 7D</SelectItem>
                      <SelectItem value="30d">Last 30D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <TabsContent value="volume">
                  <div ref={volumeChartRef} className="w-full h-80 mb-4" />
                </TabsContent>

                <TabsContent value="distribution">
                  <div className="mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      24-Hour Volume Distribution
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Trading activity by hour (UTC)
                    </p>
                  </div>
                  <div ref={distributionChartRef} className="w-full h-64" />
                </TabsContent>
              </Tabs>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Tokens by Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topTokens.map((token, index) => (
                      <div key={token.symbol} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{token.symbol}</span>
                              {getTrendIcon(token.trend)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {token.trades24h.toLocaleString()} trades
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatVolume(token.volume24h)}</div>
                          <div className="text-sm text-gray-500">{token.percentOfTotal}% of total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Peak Trading Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">14:00 - 16:00 UTC</span>
                        <Badge>Peak</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">09:00 - 11:00 UTC</span>
                        <Badge variant="secondary">High</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">02:00 - 04:00 UTC</span>
                        <Badge variant="outline">Low</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Volume Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Buy Orders</span>
                          <span className="font-semibold">52%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded">
                          <div className="w-[52%] h-2 bg-green-600 rounded"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Sell Orders</span>
                          <span className="font-semibold">48%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded">
                          <div className="w-[48%] h-2 bg-red-600 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}