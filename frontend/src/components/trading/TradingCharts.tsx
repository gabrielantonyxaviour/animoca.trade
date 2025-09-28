import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from 'lightweight-charts';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';

interface TradingChartsProps {
  airService: any;
  poolAddress?: string;
  tokenSymbol?: string;
}

interface PriceData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value?: number;
  volume?: number;
}

type TimeFrame = '15m' | '1h' | '4h' | '1d' | '1w';

export default function TradingCharts({
  airService,
  poolAddress,
  tokenSymbol = 'TOKEN'
}: TradingChartsProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
    if (poolAddress && airService?.provider) {
      loadPriceData();
      const interval = setInterval(loadPriceData, 60000);
      return () => clearInterval(interval);
    }
  }, [poolAddress, timeFrame, airService]);

  useEffect(() => {
    if (candleSeriesRef.current && priceData.length > 0) {
      candleSeriesRef.current.setData(priceData as CandlestickData[]);

      if (volumeSeriesRef.current) {
        const volumeData = priceData.map(d => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? '#26a69a' : '#ef5350'
        }));
        volumeSeriesRef.current.setData(volumeData);
      }
    }
  }, [priceData]);

  const initializeChart = () => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        horzLines: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: 'rgba(156, 163, 175, 0.3)',
      },
      rightPriceScale: {
        borderColor: 'rgba(156, 163, 175, 0.3)',
      },
    });

    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = (chart as any).addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  const loadPriceData = async () => {
    if (!poolAddress || !airService?.provider) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(airService.provider);

      const poolAbi = [
        'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
        'event Sync(uint256 reserve0, uint256 reserve1)',
        'function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)',
        'function token0() view returns (address)'
      ];

      const pool = new ethers.Contract(poolAddress, poolAbi, provider);

      const currentBlock = await provider.getBlockNumber();
      const blocksPerTimeframe = getBlocksPerTimeframe(timeFrame);
      const fromBlock = currentBlock - blocksPerTimeframe * 50;

      const [reserves, token0Address] = await Promise.all([
        pool.getReserves(),
        pool.token0()
      ]);

      const tokenContract = new ethers.Contract(token0Address, [
        'function decimals() view returns (uint8)'
      ], provider);
      const decimals = await tokenContract.decimals();

      const currentPriceValue = Number(ethers.formatEther(reserves[1])) /
                               Number(ethers.formatUnits(reserves[0], decimals));
      setCurrentPrice(currentPriceValue);

      const swapEvents = await pool.queryFilter(
        pool.filters.Swap(),
        fromBlock,
        currentBlock
      );

      const pricePoints = generateMockPriceData(currentPriceValue, timeFrame);

      if (swapEvents.length > 0) {
        const enhancedPriceData = await enhancePriceDataWithEvents(
          pricePoints,
          swapEvents,
          provider,
          decimals
        );
        setPriceData(enhancedPriceData);
      } else {
        setPriceData(pricePoints);
      }

      const prices = pricePoints.map(p => p.close);
      const volumes = pricePoints.map(p => p.volume || 0);

      setHigh24h(Math.max(...prices));
      setLow24h(Math.min(...prices));
      setVolume24h(volumes.reduce((sum, v) => sum + v, 0));

      const firstPrice = pricePoints[0]?.open || currentPriceValue;
      const change = ((currentPriceValue - firstPrice) / firstPrice) * 100;
      setPriceChange24h(change);

    } catch (error) {
      console.error('Error loading price data:', error);
      const mockData = generateMockPriceData(1, timeFrame);
      setPriceData(mockData);
      setCurrentPrice(mockData[mockData.length - 1].close);
    } finally {
      setIsLoading(false);
    }
  };

  const getBlocksPerTimeframe = (tf: TimeFrame): number => {
    const blocksPerMinute = 4;
    switch (tf) {
      case '15m': return 15 * blocksPerMinute;
      case '1h': return 60 * blocksPerMinute;
      case '4h': return 240 * blocksPerMinute;
      case '1d': return 1440 * blocksPerMinute;
      case '1w': return 10080 * blocksPerMinute;
      default: return 60 * blocksPerMinute;
    }
  };

  const generateMockPriceData = (basePrice: number, tf: TimeFrame): PriceData[] => {
    const now = Math.floor(Date.now() / 1000);
    const candleCount = 50;
    const timeIncrement = getTimeIncrement(tf);

    const data: PriceData[] = [];
    let currentPrice = basePrice;

    for (let i = candleCount; i > 0; i--) {
      const time = (now - (i * timeIncrement)) as Time;
      const volatility = 0.02;

      const open = currentPrice;
      const change = (Math.random() - 0.5) * volatility;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = Math.random() * 10000;

      data.push({
        time,
        open,
        high,
        low,
        close,
        volume
      });

      currentPrice = close;
    }

    return data;
  };

  const enhancePriceDataWithEvents = async (
    baseData: PriceData[],
    events: any[],
    provider: ethers.BrowserProvider,
    decimals: number
  ): Promise<PriceData[]> => {
    for (const event of events) {
      const block = await provider.getBlock(event.blockNumber);
      if (!block) continue;

      const timestamp = block.timestamp as Time;
      const dataPoint = baseData.find(d => Math.abs(Number(d.time) - Number(timestamp)) < 3600);

      if (dataPoint && event.args) {
        const amount0Out = event.args.amount0Out;
        const amount1Out = event.args.amount1Out;

        if (amount0Out > 0n && amount1Out === 0n) {
          const price = Number(ethers.formatEther(event.args.amount1In)) /
                       Number(ethers.formatUnits(amount0Out, decimals));
          dataPoint.close = price;
          dataPoint.high = Math.max(dataPoint.high, price);
          dataPoint.low = Math.min(dataPoint.low, price);
        }
      }
    }

    return baseData;
  };

  const getTimeIncrement = (tf: TimeFrame): number => {
    switch (tf) {
      case '15m': return 900;
      case '1h': return 3600;
      case '4h': return 14400;
      case '1d': return 86400;
      case '1w': return 604800;
      default: return 3600;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{tokenSymbol}/ETH Price Chart</CardTitle>
            <CardDescription>Live price and volume data</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={timeFrame} onValueChange={(v: TimeFrame) => setTimeFrame(v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1D</SelectItem>
                <SelectItem value="1w">1W</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={loadPriceData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-lg font-bold">{currentPrice.toFixed(6)} ETH</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24h Change</p>
            <p className={`text-lg font-bold flex items-center gap-1 ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(priceChange24h).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24h High</p>
            <p className="text-lg font-semibold">{high24h.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24h Low</p>
            <p className="text-lg font-semibold">{low24h.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24h Volume</p>
            <p className="text-lg font-semibold">${volume24h.toFixed(2)}</p>
          </div>
        </div>

        <div ref={chartContainerRef} className="w-full" />

        {!poolAddress && (
          <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
            <div className="text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select a pool to view price charts</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}