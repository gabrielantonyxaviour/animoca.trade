# Chart Implementation Guide

Complete guide to implement the TradingView-style candlestick chart with Entry, Take Profit, and Stop Loss markers, based on the tangent-x reference implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Reference Architecture](#reference-architecture)
3. [Dependencies](#dependencies)
4. [Component Structure](#component-structure)
5. [Implementation Steps](#implementation-steps)
6. [Price Level Markers](#price-level-markers)
7. [Real Data Integration](#real-data-integration)
8. [Styling & UX](#styling--ux)

---

## Overview

### What We're Building

A professional trading chart with:

✅ **Candlestick Chart**: OHLCV (Open, High, Low, Close, Volume) data visualization
✅ **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1D
✅ **Interactive Price Markers**: Click to set Entry, Take Profit, Stop Loss
✅ **Price Lines**: Horizontal dashed lines showing target prices
✅ **Real-time Updates**: Live price updates from blockchain
✅ **Stats Display**: 24h High/Low, Volume, current price

### Reference Project

The implementation is based on:
- **Location**: `/Users/gabrielantonyxaviour/Documents/projects/moca/tangent-x/frontend/src/components/trading/PerpTradingChart.tsx`
- **Library**: `lightweight-charts` v4.1.0+
- **Style**: Dark theme with green (bullish) / red (bearish) candles

---

## Reference Architecture

### Component Hierarchy

```
TradingPage (parent)
└── PerpTradingChart
    ├── Chart Container (lightweight-charts)
    ├── Stats Header (Price, 24h Change, High/Low, Volume)
    ├── Timeframe Selector (1m, 5m, 15m, 1h, 4h, 1D)
    ├── Price Level Controls
    │   ├── Entry Price Input
    │   ├── Take Profit Input
    │   └── Stop Loss Input
    └── Legend
```

### Data Flow

```
1. useCandleData hook generates/fetches OHLCV data
2. Chart initializes with lightweight-charts
3. Candlestick series renders data
4. User clicks "Set Entry" button → enters click mode
5. User clicks chart → price captured from Y-coordinate
6. Price line created on chart
7. Input field updated with price
8. Parent notified via onPriceLevelSet callback
```

---

## Dependencies

### Install Required Packages

```bash
npm install lightweight-charts
# or
yarn add lightweight-charts
```

### TypeScript Types

```bash
npm install --save-dev @types/lightweight-charts
```

### Package Versions

```json
{
  "dependencies": {
    "lightweight-charts": "^4.1.3",
    "react": "^18.2.0",
    "lucide-react": "^0.263.1"
  }
}
```

---

## Component Structure

### File Organization

```
src/
├── components/
│   └── trading/
│       └── CredentialTradingChart.tsx  # NEW component
├── hooks/
│   └── useCandleData.ts  # NEW hook for fetching candles
└── types/
    └── chart.types.ts  # NEW type definitions
```

---

## Implementation Steps

### Step 1: Create Types

```typescript
// src/types/chart.types.ts

export interface CandleData {
  time: number;  // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface ChartMarking {
  id: string;
  type: 'entry' | 'takeProfit' | 'stopLoss';
  price: number;
}

export interface CredentialTradingChartProps {
  credentialId: string;
  currentPrice: number;
  symbol: string;
  priceChange24h?: number;
  onPriceLevelSet?: (type: 'entry' | 'takeProfit' | 'stopLoss', price: number) => void;
}
```

---

### Step 2: Create Candle Data Hook

```typescript
// src/hooks/useCandleData.ts

import { useState, useEffect } from 'react';
import { CandleData, TimeFrame } from '@/types/chart.types';

// Mapping timeframes to seconds
function getTimeIncrementSeconds(timeFrame: TimeFrame): number {
  const increments: Record<TimeFrame, number> = {
    '1m': 60,
    '5m': 5 * 60,
    '15m': 15 * 60,
    '1h': 60 * 60,
    '4h': 4 * 60 * 60,
    '1d': 24 * 60 * 60
  };
  return increments[timeFrame];
}

interface UseCandleDataResult {
  candles: CandleData[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch candlestick data from backend
 * Replace generateRealisticCandleData with API call in production
 */
export function useCandleData(
  credentialId: string,
  currentPrice: number,
  timeFrame: TimeFrame
): UseCandleDataResult {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandles = async () => {
      setLoading(true);
      setError(null);

      try {
        // PRODUCTION: Replace with API call
        // const response = await fetch(`/api/credentials/${credentialId}/chart?timeFrame=${timeFrame}&limit=100`);
        // const data = await response.json();
        // setCandles(data.data);

        // DEVELOPMENT: Generate mock data
        const mockData = generateRealisticCandleData(currentPrice, timeFrame, 100);
        setCandles(mockData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching candle data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch candles');
        setLoading(false);
      }
    };

    fetchCandles();
  }, [credentialId, currentPrice, timeFrame]);

  return { candles, loading, error };
}

/**
 * Generate realistic candle data for development
 * Remove this function when API is ready
 */
function generateRealisticCandleData(
  currentPrice: number,
  timeFrame: TimeFrame,
  numCandles: number = 100
): CandleData[] {
  const data: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const timeIncrement = getTimeIncrementSeconds(timeFrame);

  // Start price slightly below current to show upward trend
  let price = currentPrice * 0.90;
  const volatility = 0.025; // 2.5% volatility
  const trendPerCandle = (currentPrice - price) / numCandles;

  for (let i = numCandles; i > 0; i--) {
    const timestamp = now - i * timeIncrement;

    // Calculate open and close with trend + randomness
    const trend = trendPerCandle;
    const randomMove = (Math.random() - 0.5) * volatility * price;

    const open = price;
    const close = price + trend + randomMove;

    // Generate high and low with realistic wicks
    const range = Math.abs(close - open);
    const wickSize = range * (0.3 + Math.random() * 0.7);
    const high = Math.max(open, close) + wickSize;
    const low = Math.min(open, close) - wickSize * 0.6;

    // Volume correlates with price movement
    const priceMove = Math.abs(close - open) / open;
    const volume = price * 1000 * (0.5 + Math.random() * 1.0 + priceMove * 5);

    data.push({
      time: timestamp,
      open,
      high,
      low,
      close,
      volume
    });

    price = close;
  }

  return data;
}
```

---

### Step 3: Create Chart Component

```typescript
// src/components/trading/CredentialTradingChart.tsx

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Loader2 } from 'lucide-react';
import { useCandleData } from '@/hooks/useCandleData';
import { ChartMarking, CredentialTradingChartProps, TimeFrame } from '@/types/chart.types';

export default function CredentialTradingChart({
  credentialId,
  currentPrice,
  symbol,
  priceChange24h = 0,
  onPriceLevelSet
}: CredentialTradingChartProps) {
  // Refs for chart instances
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const priceLineRefs = useRef<Map<string, any>>(new Map());

  // State
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('15m');
  const [chartError, setChartError] = useState<string | null>(null);
  const [markings, setMarkings] = useState<ChartMarking[]>([]);
  const [clickMode, setClickMode] = useState<'entry' | 'takeProfit' | 'stopLoss' | null>(null);

  // Price level inputs
  const [entryPrice, setEntryPrice] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  const timeFrames: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const isPositive = priceChange24h >= 0;

  // Fetch candle data
  const { candles, loading, error } = useCandleData(credentialId, currentPrice, timeFrame);

  // Initialize chart with lightweight-charts
  useEffect(() => {
    if (!chartContainerRef.current || typeof window === 'undefined') return;

    let chart: any = null;
    let isDisposed = false;

    const initChart = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const LightweightCharts = await import('lightweight-charts');

        if (!LightweightCharts.createChart) {
          throw new Error('createChart not found in lightweight-charts');
        }

        // Create chart
        chart = LightweightCharts.createChart(chartContainerRef.current!, {
          layout: {
            background: { color: 'transparent' },
            textColor: '#999999',
          },
          grid: {
            vertLines: { color: '#1a1a1a' },
            horzLines: { color: '#1a1a1a' },
          },
          width: chartContainerRef.current!.clientWidth,
          height: 400,
          timeScale: {
            borderColor: '#333333',
            timeVisible: true,
            secondsVisible: false,
          },
          rightPriceScale: {
            borderColor: '#333333',
            scaleMargins: {
              top: 0.1,
              bottom: 0.2,
            },
          },
        });

        if (isDisposed) {
          chart.remove();
          return;
        }

        // Add candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#00FF88',        // Green for bullish
          downColor: '#FF4444',      // Red for bearish
          borderUpColor: '#00FF88',
          borderDownColor: '#FF4444',
          wickUpColor: '#00FF88',
          wickDownColor: '#FF4444',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;
        setChartError(null);

        // Set initial data if available
        if (candles.length > 0) {
          candlestickSeries.setData(candles);
          chart.timeScale().fitContent();
        }
      } catch (err) {
        console.error('Error initializing chart:', err);
        setChartError(err instanceof Error ? err.message : 'Failed to initialize chart');
      }
    };

    initChart();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current && !isDisposed) {
        try {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        } catch (err) {
          console.error('Error resizing chart:', err);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        } catch (err) {
          console.error('Error removing chart:', err);
        }
      }
    };
  }, []); // Only init once

  // Update chart data when candles change
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0 || chartError) return;

    try {
      seriesRef.current.setData(candles);

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {
      console.error('Error updating chart data:', err);
    }
  }, [candles, chartError]);

  // Handle chart clicks for setting price levels
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !clickMode) return;

    const clickHandler = (param: any) => {
      if (param.point && seriesRef.current && clickMode) {
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        if (price !== null && price > 0) {
          handleChartClick(price, clickMode);
        }
      }
    };

    chartRef.current.subscribeClick(clickHandler);

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeClick(clickHandler);
      }
    };
  }, [clickMode]);

  // Update price lines for markings
  useEffect(() => {
    if (!seriesRef.current || chartError) return;

    try {
      // Remove old price lines that are no longer in markings
      const currentMarkingIds = new Set(markings.map(m => m.id));
      priceLineRefs.current.forEach((priceLine, id) => {
        if (!currentMarkingIds.has(id)) {
          seriesRef.current.removePriceLine(priceLine);
          priceLineRefs.current.delete(id);
        }
      });

      // Add or update price lines for current markings
      markings.forEach(marking => {
        const existingLine = priceLineRefs.current.get(marking.id);

        const lineOptions = {
          price: marking.price,
          color: marking.type === 'entry' ? '#0066FF' : marking.type === 'takeProfit' ? '#00FF88' : '#FF4444',
          lineWidth: 2,
          lineStyle: 2, // Dashed line
          title: marking.type === 'entry' ? 'Entry' : marking.type === 'takeProfit' ? 'TP' : 'SL',
          axisLabelVisible: true,
        };

        if (existingLine) {
          // Update existing line
          existingLine.applyOptions(lineOptions);
        } else {
          // Create new line
          const newLine = seriesRef.current.createPriceLine(lineOptions);
          priceLineRefs.current.set(marking.id, newLine);
        }
      });
    } catch (err) {
      console.error('Error updating price lines:', err);
    }
  }, [markings, chartError]);

  // Handle chart click
  const handleChartClick = (price: number, type: 'entry' | 'takeProfit' | 'stopLoss') => {
    if (!price || price <= 0) return;

    const newMarking: ChartMarking = {
      id: `${type}-${Date.now()}`,
      type,
      price
    };

    // Remove existing marking of same type
    const filtered = markings.filter(m => m.type !== type);
    setMarkings([...filtered, newMarking]);

    // Update corresponding input
    const formattedPrice = price.toFixed(4);
    switch (type) {
      case 'entry':
        setEntryPrice(formattedPrice);
        break;
      case 'takeProfit':
        setTakeProfit(formattedPrice);
        break;
      case 'stopLoss':
        setStopLoss(formattedPrice);
        break;
    }

    // Notify parent component
    if (onPriceLevelSet) {
      onPriceLevelSet(type, price);
    }

    // Clear click mode
    setClickMode(null);
  };

  // Use current price for entry
  const useCurrentPrice = () => {
    if (currentPrice > 0) {
      handleChartClick(currentPrice, 'entry');
    }
  };

  // Update marking from input
  const updateMarkingFromInput = (value: string, type: 'entry' | 'takeProfit' | 'stopLoss') => {
    const price = parseFloat(value);
    if (price > 0) {
      const newMarking: ChartMarking = {
        id: `${type}-${Date.now()}`,
        type,
        price
      };
      const filtered = markings.filter(m => m.type !== type);
      setMarkings([...filtered, newMarking]);

      if (onPriceLevelSet) {
        onPriceLevelSet(type, price);
      }
    } else {
      setMarkings(prev => prev.filter(m => m.type !== type));
    }
  };

  // Calculate stats
  const stats = {
    high: candles.length > 0 ? Math.max(...candles.map(d => d.high)) : currentPrice,
    low: candles.length > 0 ? Math.min(...candles.map(d => d.low)) : currentPrice,
    volume: candles.length > 0 ? candles.reduce((sum, d) => sum + d.volume, 0) : 0
  };

  return (
    <Card className="border-[#0066FF]/20 bg-black">
      <CardContent className="p-6">
        {/* Stats Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-baseline gap-6">
            <div>
              <p className="text-xs text-[#CCCCCC] mb-1">Price</p>
              <p className="text-3xl font-bold text-white">${currentPrice.toFixed(4)}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-[#00FF88]' : 'text-[#FF4444]'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="font-semibold text-lg">
                {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
              <span className="text-xs text-[#CCCCCC]">24h</span>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-[#111111] rounded-lg p-1">
            {timeFrames.map((tf) => (
              <Button
                key={tf}
                variant={timeFrame === tf ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeFrame(tf)}
                className={`px-3 py-1 h-8 text-xs font-medium transition-colors ${
                  timeFrame === tf
                    ? 'bg-[#0066FF] text-white hover:bg-[#0066FF]/90'
                    : 'text-[#CCCCCC] hover:text-white hover:bg-[#111111]'
                }`}
              >
                {tf.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* 24h Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-[#111111] rounded-lg border border-[#333333]">
            <p className="text-xs text-[#CCCCCC] mb-1">24h High</p>
            <p className="text-lg font-bold text-[#00FF88]">${stats.high.toFixed(4)}</p>
          </div>
          <div className="text-center p-3 bg-[#111111] rounded-lg border border-[#333333]">
            <p className="text-xs text-[#CCCCCC] mb-1">24h Low</p>
            <p className="text-lg font-bold text-[#FF4444]">${stats.low.toFixed(4)}</p>
          </div>
          <div className="text-center p-3 bg-[#111111] rounded-lg border border-[#333333]">
            <p className="text-xs text-[#CCCCCC] mb-1">24h Volume</p>
            <p className="text-lg font-bold text-white">${(stats.volume / 1000000).toFixed(2)}M</p>
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative w-full bg-[#0a0a0a] rounded-lg border border-[#333333] overflow-hidden mb-4">
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#0066FF]" />
            </div>
          )}

          {(error || chartError) && (
            <div className="absolute inset-0 bg-background flex items-center justify-center z-10">
              <div className="text-center text-[#CCCCCC]">
                <p className="text-sm">Failed to load chart</p>
                <p className="text-xs mt-1">{error || chartError}</p>
              </div>
            </div>
          )}

          <div
            ref={chartContainerRef}
            className={`w-full h-[400px] ${clickMode ? 'cursor-crosshair' : ''}`}
          />

          {/* Click Mode Overlay */}
          {clickMode && (
            <div className="absolute top-2 left-2 pointer-events-none z-20">
              <div className="bg-[#0066FF]/90 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-white font-medium animate-pulse">
                Click chart to set {clickMode === 'entry' ? 'Entry Price' : clickMode === 'takeProfit' ? 'Take Profit' : 'Stop Loss'}
              </div>
            </div>
          )}
        </div>

        {/* Price Level Controls */}
        <div className="space-y-3 p-4 bg-[#111111] rounded-lg border border-[#333333] mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-white">Price Levels</Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-[#CCCCCC] hover:text-white"
              onClick={() => {
                setEntryPrice('');
                setTakeProfit('');
                setStopLoss('');
                setMarkings([]);
                setClickMode(null);
              }}
            >
              Clear All
            </Button>
          </div>

          {/* Entry Price */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="entry-price" className="text-xs text-[#CCCCCC] flex items-center gap-1">
                <div className="w-2 h-2 bg-[#0066FF] rounded-full" />
                Entry Price
              </Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-[#0066FF] hover:text-[#0066FF]/80"
                onClick={useCurrentPrice}
              >
                Use Current
              </Button>
            </div>
            <div className="flex gap-1">
              <Input
                id="entry-price"
                type="number"
                placeholder="Click chart or enter price"
                value={entryPrice}
                onChange={(e) => {
                  setEntryPrice(e.target.value);
                  updateMarkingFromInput(e.target.value, 'entry');
                }}
                className="h-8 text-sm bg-[#0a0a0a] border-[#333333] text-white"
              />
              <Button
                size="sm"
                variant={clickMode === 'entry' ? 'default' : 'outline'}
                className="h-8 px-2"
                onClick={() => setClickMode(clickMode === 'entry' ? null : 'entry')}
                title={clickMode === 'entry' ? 'Cancel' : 'Click chart to set'}
              >
                <Target className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Take Profit */}
          <div className="space-y-1">
            <Label htmlFor="take-profit" className="text-xs text-[#CCCCCC] flex items-center gap-1">
              <div className="w-2 h-2 bg-[#00FF88] rounded-full" />
              Take Profit
            </Label>
            <div className="flex gap-1">
              <Input
                id="take-profit"
                type="number"
                placeholder="Click chart or enter price"
                value={takeProfit}
                onChange={(e) => {
                  setTakeProfit(e.target.value);
                  updateMarkingFromInput(e.target.value, 'takeProfit');
                }}
                className="h-8 text-sm bg-[#0a0a0a] border-[#333333] text-white"
              />
              <Button
                size="sm"
                variant={clickMode === 'takeProfit' ? 'default' : 'outline'}
                className="h-8 px-2"
                onClick={() => setClickMode(clickMode === 'takeProfit' ? null : 'takeProfit')}
                title={clickMode === 'takeProfit' ? 'Cancel' : 'Click chart to set'}
              >
                <TrendingUp className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Stop Loss */}
          <div className="space-y-1">
            <Label htmlFor="stop-loss" className="text-xs text-[#CCCCCC] flex items-center gap-1">
              <div className="w-2 h-2 bg-[#FF4444] rounded-full" />
              Stop Loss
            </Label>
            <div className="flex gap-1">
              <Input
                id="stop-loss"
                type="number"
                placeholder="Click chart or enter price"
                value={stopLoss}
                onChange={(e) => {
                  setStopLoss(e.target.value);
                  updateMarkingFromInput(e.target.value, 'stopLoss');
                }}
                className="h-8 text-sm bg-[#0a0a0a] border-[#333333] text-white"
              />
              <Button
                size="sm"
                variant={clickMode === 'stopLoss' ? 'default' : 'outline'}
                className="h-8 px-2"
                onClick={() => setClickMode(clickMode === 'stopLoss' ? null : 'stopLoss')}
                title={clickMode === 'stopLoss' ? 'Cancel' : 'Click chart to set'}
              >
                <AlertTriangle className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-[#CCCCCC]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#00FF88]" />
            <span>Bullish</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FF4444]" />
            <span>Bearish</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-[#999]" />
            <span>Wick</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Price Level Markers

### How Price Lines Work

1. **Create Price Line** when user sets a level:
```typescript
const newLine = seriesRef.current.createPriceLine({
  price: marking.price,
  color: '#0066FF',  // Blue for entry, green for TP, red for SL
  lineWidth: 2,
  lineStyle: 2,  // 2 = dashed line
  title: 'Entry',
  axisLabelVisible: true,
});
```

2. **Store Line Reference** to update/remove later:
```typescript
priceLineRefs.current.set(marking.id, newLine);
```

3. **Update Line** when price changes:
```typescript
existingLine.applyOptions({ price: newPrice });
```

4. **Remove Line** when cleared:
```typescript
seriesRef.current.removePriceLine(priceLine);
```

### Click-to-Set Implementation

```typescript
// Enable click mode
<Button onClick={() => setClickMode('entry')}>
  <Target /> Set Entry
</Button>

// Subscribe to chart clicks
chartRef.current.subscribeClick((param) => {
  if (param.point && clickMode) {
    const price = seriesRef.current.coordinateToPrice(param.point.y);
    handleChartClick(price, clickMode);
  }
});

// Handle click
function handleChartClick(price: number, type: 'entry' | 'takeProfit' | 'stopLoss') {
  // Create marking
  setMarkings([...markings, { id: uuid(), type, price }]);
  // Update input
  setEntryPrice(price.toFixed(4));
  // Notify parent
  onPriceLevelSet?.(type, price);
  // Exit click mode
  setClickMode(null);
}
```

---

## Real Data Integration

### Replace Mock Data with API Calls

```typescript
// In useCandleData.ts

export function useCandleData(
  credentialId: string,
  currentPrice: number,
  timeFrame: TimeFrame
): UseCandleDataResult {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandles = async () => {
      setLoading(true);
      setError(null);

      try {
        // PRODUCTION API CALL
        const response = await fetch(
          `/api/credentials/${credentialId}/chart?timeFrame=${timeFrame}&limit=100`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch candles');
        }

        // Transform backend response to CandleData format
        const transformedCandles: CandleData[] = data.data.map((candle: any) => ({
          time: Math.floor(new Date(candle.snapshot_time).getTime() / 1000),
          open: parseFloat(candle.open_price),
          high: parseFloat(candle.high_price),
          low: parseFloat(candle.low_price),
          close: parseFloat(candle.close_price),
          volume: parseFloat(candle.volume)
        }));

        setCandles(transformedCandles);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching candles:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch candles');
        setLoading(false);
      }
    };

    fetchCandles();

    // Optional: Set up polling for real-time updates
    const interval = setInterval(fetchCandles, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [credentialId, timeFrame]);

  return { candles, loading, error };
}
```

### Real-time Price Updates via WebSocket

```typescript
// Add to chart component

useEffect(() => {
  // Connect to WebSocket for live price updates
  const ws = new WebSocket('wss://api.animocatrade.com/prices');

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'price',
      credentialId: credentialId
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'price_update' && data.credentialId === credentialId) {
      // Update current price
      setCurrentPrice(data.price);

      // Optionally: Add new candle tick to chart
      if (seriesRef.current) {
        seriesRef.current.update({
          time: Math.floor(Date.now() / 1000),
          open: data.price,
          high: data.price,
          low: data.price,
          close: data.price,
        });
      }
    }
  };

  return () => ws.close();
}, [credentialId]);
```

---

## Styling & UX

### Dark Theme Colors

```css
/* Chart colors aligned with platform */
--chart-bg: #0a0a0a;
--chart-border: #333333;
--chart-grid: #1a1a1a;
--chart-text: #999999;

/* Candle colors */
--bullish: #00FF88;
--bearish: #FF4444;

/* Price line colors */
--entry: #0066FF;
--take-profit: #00FF88;
--stop-loss: #FF4444;
```

### Responsive Design

```typescript
// Handle window resize
const handleResize = () => {
  if (chartContainerRef.current && chartRef.current) {
    chartRef.current.applyOptions({
      width: chartContainerRef.current.clientWidth,
    });
  }
};

window.addEventListener('resize', handleResize);
```

### Mobile Optimization

```typescript
// Adjust chart height for mobile
const chartHeight = window.innerWidth < 768 ? 300 : 400;

chart = LightweightCharts.createChart(chartContainerRef.current!, {
  height: chartHeight,
  // ... other options
});
```

---

## Usage Example

```typescript
// In CredentialTradingPage.tsx

import CredentialTradingChart from '@/components/trading/CredentialTradingChart';

export default function CredentialTradingPage() {
  const { id } = useParams();
  const [entryPrice, setEntryPrice] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);

  const handlePriceLevelSet = (type: string, price: number) => {
    console.log(`${type} set to: $${price}`);

    switch (type) {
      case 'entry':
        setEntryPrice(price);
        break;
      case 'takeProfit':
        setTakeProfit(price);
        break;
      case 'stopLoss':
        setStopLoss(price);
        break;
    }
  };

  return (
    <div>
      <CredentialTradingChart
        credentialId={id}
        currentPrice={market.current_price}
        symbol={market.token_symbol}
        priceChange24h={market.price_change_24h}
        onPriceLevelSet={handlePriceLevelSet}
      />

      {/* Trading form can use the set prices */}
      <OrderForm
        entryPrice={entryPrice}
        takeProfit={takeProfit}
        stopLoss={stopLoss}
      />
    </div>
  );
}
```

---

## Summary

This implementation provides:

✅ **Professional Chart**: Using lightweight-charts library
✅ **Interactive Markers**: Click-to-set Entry/TP/SL
✅ **Multiple Timeframes**: 1m to 1d intervals
✅ **Real-time Updates**: WebSocket support ready
✅ **Dark Theme**: Matches trading platform aesthetic
✅ **Responsive**: Mobile-friendly design
✅ **Type-safe**: Full TypeScript support
✅ **Production-ready**: API integration points defined

Use this chart component across both Credential and Persona markets by passing the appropriate market data.
