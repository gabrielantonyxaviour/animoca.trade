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

      // Static candle data centered around $10.77
      const staticCandleData = [
        { open: 10.50, high: 10.85, low: 10.45, close: 10.72, volume: 8500 },
        { open: 10.72, high: 10.92, low: 10.68, close: 10.88, volume: 12300 },
        { open: 10.88, high: 10.95, low: 10.75, close: 10.82, volume: 9800 },
        { open: 10.82, high: 10.89, low: 10.65, close: 10.71, volume: 11200 },
        { open: 10.71, high: 10.85, low: 10.62, close: 10.77, volume: 13400 },
        { open: 10.77, high: 10.95, low: 10.74, close: 10.91, volume: 15600 },
        { open: 10.91, high: 10.98, low: 10.83, close: 10.86, volume: 10900 },
        { open: 10.86, high: 10.92, low: 10.69, close: 10.75, volume: 8700 },
        { open: 10.75, high: 10.85, low: 10.58, close: 10.64, volume: 14200 },
        { open: 10.64, high: 10.78, low: 10.59, close: 10.73, volume: 9500 },
        { open: 10.73, high: 10.89, low: 10.71, close: 10.84, volume: 11800 },
        { open: 10.84, high: 10.94, low: 10.79, close: 10.87, volume: 13100 },
        { open: 10.87, high: 10.96, low: 10.72, close: 10.79, volume: 10600 },
        { open: 10.79, high: 10.85, low: 10.66, close: 10.72, volume: 12400 },
        { open: 10.72, high: 10.88, low: 10.68, close: 10.81, volume: 14700 },
        { open: 10.81, high: 10.93, low: 10.76, close: 10.89, volume: 11300 },
        { open: 10.89, high: 10.97, low: 10.84, close: 10.92, volume: 9900 },
        { open: 10.92, high: 11.05, low: 10.88, close: 10.96, volume: 16800 },
        { open: 10.96, high: 11.08, low: 10.91, close: 11.02, volume: 18200 },
        { open: 11.02, high: 11.12, low: 10.95, close: 10.98, volume: 15400 },
        { open: 10.98, high: 11.07, low: 10.89, close: 10.94, volume: 12700 },
        { open: 10.94, high: 10.99, low: 10.78, close: 10.82, volume: 13900 },
        { open: 10.82, high: 10.91, low: 10.74, close: 10.85, volume: 11600 },
        { open: 10.85, high: 10.93, low: 10.79, close: 10.88, volume: 10800 }
      ];

      let cumulativeVolume = 0;

      for (let i = 0; i < Math.min(dataPoints, staticCandleData.length); i++) {
        const time = new Date(now.getTime() - (dataPoints - i) * interval);
        const timeString = time.toISOString().split('T')[0];

        const candle = staticCandleData[i % staticCandleData.length];

        points.push({
          time: timeString,
          value: candle.close,
        });

        candles.push({
          time: timeString,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        });

        cumulativeVolume += candle.volume;
        volumes.push({
          time: timeString,
          value: candle.volume,
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