import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { TrendingUp, TrendingDown, Activity, RefreshCw, LineChart, CandlestickChart } from 'lucide-react';

interface PriceChartsProps {
  tokenAddress?: string;
  tokenSymbol?: string;
  oracleAddress?: string;
}

interface PricePoint {
  time: string;
  value: number;
  volume?: number;
}

interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function PriceCharts({
  tokenAddress,
  tokenSymbol = 'TOKEN',
  oracleAddress,
}: PriceChartsProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W' | '1M'>('1D');
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [volumeData, setVolumeData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [twap, setTwap] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      initializeChart();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (tokenAddress && oracleAddress) {
      loadPriceData();
      const interval = setInterval(loadPriceData, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [tokenAddress, oracleAddress, timeframe]);

  useEffect(() => {
    if (chartRef.current) {
      updateChart();
    }
  }, [chartType, priceData, candleData]);

  const initializeChart = () => {
    if (!chartContainerRef.current) return;

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e0e0e0', style: 1 },
        horzLines: { color: '#e0e0e0', style: 1 },
      },
      crosshair: {
        mode: 1,
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

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  const updateChart = () => {
    if (!chartRef.current) return;

    // Clear existing series
    if (lineSeriesRef.current) {
      chartRef.current.removeSeries(lineSeriesRef.current);
      lineSeriesRef.current = null;
    }
    if (candleSeriesRef.current) {
      chartRef.current.removeSeries(candleSeriesRef.current);
      candleSeriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    if (chartType === 'line' && priceData.length > 0) {
      lineSeriesRef.current = (chartRef.current as any).addLineSeries({
        color: '#2563eb',
        lineWidth: 2,
        priceScaleId: 'right',
      });
      if (lineSeriesRef.current) {
        lineSeriesRef.current.setData(priceData as any);
      }
    } else if (chartType === 'candle' && candleData.length > 0) {
      candleSeriesRef.current = (chartRef.current as any).addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        priceScaleId: 'right',
      });
      if (candleSeriesRef.current) {
        candleSeriesRef.current.setData(candleData as any);
      }
    }

    // Add volume
    if (volumeData.length > 0) {
      volumeSeriesRef.current = (chartRef.current as any).addHistogramSeries({
        color: '#6b7280',
        priceFormat: { type: 'volume' },
        priceScaleId: 'left',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData as any);
      }
    }

    chartRef.current.timeScale().fitContent();
  };

  const loadPriceData = async () => {
    try {
      setIsLoading(true);

      // Generate mock data based on timeframe
      const now = new Date();
      const points: PricePoint[] = [];
      const candles: CandlestickData[] = [];
      const volumes: PricePoint[] = [];

      let dataPoints = 0;
      let interval = 0;

      switch (timeframe) {
        case '1H':
          dataPoints = 60;
          interval = 60000; // 1 minute
          break;
        case '4H':
          dataPoints = 48;
          interval = 300000; // 5 minutes
          break;
        case '1D':
          dataPoints = 24;
          interval = 3600000; // 1 hour
          break;
        case '1W':
          dataPoints = 168;
          interval = 3600000; // 1 hour
          break;
        case '1M':
          dataPoints = 30;
          interval = 86400000; // 1 day
          break;
      }

      let basePrice = 10 + Math.random() * 20;
      let cumulativeVolume = 0;

      for (let i = 0; i < dataPoints; i++) {
        const time = new Date(now.getTime() - (dataPoints - i) * interval);
        const timeString = time.toISOString().split('T')[0];

        // Generate price with some volatility
        const change = (Math.random() - 0.5) * 2;
        const price = Math.max(0.1, basePrice + change);
        basePrice = price;

        points.push({
          time: timeString,
          value: price,
        });

        // Generate candle data
        const open = price + (Math.random() - 0.5);
        const close = price + (Math.random() - 0.5);
        const high = Math.max(open, close) + Math.random() * 0.5;
        const low = Math.min(open, close) - Math.random() * 0.5;

        candles.push({
          time: timeString,
          open,
          high,
          low,
          close,
        });

        // Generate volume data
        const volume = Math.random() * 10000 + 1000;
        cumulativeVolume += volume;

        volumes.push({
          time: timeString,
          value: volume,
        });
      }

      setPriceData(points);
      setCandleData(candles);
      setVolumeData(volumes);

      // Set current price and change
      const lastPrice = points[points.length - 1]?.value || 0;
      const firstPrice = points[0]?.value || 1;
      setCurrentPrice(lastPrice);
      setPriceChange(((lastPrice - firstPrice) / firstPrice) * 100);
      setTwap(points.reduce((sum, p) => sum + p.value, 0) / points.length);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading price data:', error);
      setIsLoading(false);
    }
  };

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case '1H': return '1 Hour';
      case '4H': return '4 Hours';
      case '1D': return '1 Day';
      case '1W': return '1 Week';
      case '1M': return '1 Month';
      default: return tf;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-2xl">{tokenSymbol} Price Chart</CardTitle>
              <Badge variant={priceChange >= 0 ? 'default' : 'destructive'}>
                {tokenSymbol}
              </Badge>
            </div>
            <CardDescription>
              Historical price data and technical analysis
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">${currentPrice.toFixed(2)}</div>
            <div className={`flex items-center gap-1 justify-end ${priceChange >= 0 ? 'text-pink-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">{Math.abs(priceChange).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'line' | 'candle')}>
              <TabsList>
                <TabsTrigger value="line">
                  <LineChart className="w-4 h-4 mr-1" />
                  Line
                </TabsTrigger>
                <TabsTrigger value="candle">
                  <CandlestickChart className="w-4 h-4 mr-1" />
                  Candles
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1H">1H</SelectItem>
                <SelectItem value="4H">4H</SelectItem>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="1W">1W</SelectItem>
                <SelectItem value="1M">1M</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadPriceData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <>
            <div ref={chartContainerRef} className="w-full h-96 mb-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">TWAP ({getTimeframeLabel(timeframe)})</div>
                <div className="text-lg font-bold">${twap.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">24h Volume</div>
                <div className="text-lg font-bold">
                  ${(volumeData.reduce((sum, v) => sum + v.value, 0) / 1000).toFixed(1)}K
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">High ({timeframe})</div>
                <div className="text-lg font-bold">
                  ${Math.max(...priceData.map(p => p.value)).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Low ({timeframe})</div>
                <div className="text-lg font-bold">
                  ${Math.min(...priceData.map(p => p.value)).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-pink-50 rounded-lg">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Technical Indicators
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">RSI (14):</span>
                  <span className="font-semibold ml-1">52.3</span>
                  <Badge variant="outline" className="ml-2 text-xs">Neutral</Badge>
                </div>
                <div>
                  <span className="text-gray-600">MACD:</span>
                  <span className="font-semibold ml-1">0.125</span>
                  <Badge className="ml-2 text-xs bg-pink-600">Bullish</Badge>
                </div>
                <div>
                  <span className="text-gray-600">Volume Trend:</span>
                  <span className="font-semibold ml-1">↑ 15%</span>
                  <Badge className="ml-2 text-xs bg-pink-600">Increasing</Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}