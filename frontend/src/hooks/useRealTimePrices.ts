import { useState, useEffect, useCallback } from 'react';

interface TokenPrice {
  address: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: number;
}

interface UseRealTimePricesReturn {
  prices: Map<string, TokenPrice>;
  isLoading: boolean;
  error: string | null;
  updatePrice: (tokenAddress: string, newPrice: number) => void;
  refreshPrices: () => Promise<void>;
}

// Mock price generator that simulates real market movements
const generatePriceUpdate = (currentPrice: number): number => {
  // Generate realistic price movements (±5% maximum change per update)
  const maxChange = 0.05;
  const change = (Math.random() - 0.5) * 2 * maxChange;
  const newPrice = currentPrice * (1 + change);
  return Math.max(0.01, newPrice); // Ensure price doesn't go below $0.01
};

const calculatePriceChange = (currentPrice: number, initialPrice: number): number => {
  return ((currentPrice - initialPrice) / initialPrice) * 100;
};

const generateVolume = (): number => {
  return Math.floor(Math.random() * 500000) + 50000; // $50K to $550K volume
};

const generateMarketCap = (price: number, supply: number = 1000000): number => {
  return price * supply;
};

export const useRealTimePrices = (): UseRealTimePricesReturn => {
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock token prices
  const initializePrices = useCallback(() => {
    const initialPrices = new Map<string, TokenPrice>();

    // Mock tokens with initial prices (in USDC - more realistic pricing for credential tokens)
    const mockTokens = [
      { address: '0x123...', symbol: 'CSED', name: 'Computer Science Degree', initialPrice: 0.1567 },
      { address: '0x456...', symbol: 'SDC', name: 'Senior Developer Cert', initialPrice: 0.0845 },
      { address: '0x789...', symbol: 'IDV', name: 'Identity Verification', initialPrice: 0.0280 },
      { address: '0xabc...', symbol: 'BEB', name: 'Blockchain Expert Badge', initialPrice: 0.2132 },
      { address: '0xdef...', symbol: 'VR', name: 'Vaccination Record', initialPrice: 0.0189 },
    ];

    mockTokens.forEach((token) => {
      const now = Date.now();
      initialPrices.set(token.address, {
        address: token.address,
        symbol: token.symbol,
        price: token.initialPrice,
        priceChange24h: (Math.random() - 0.5) * 20, // Random ±10% change
        volume24h: generateVolume(),
        marketCap: generateMarketCap(token.initialPrice),
        lastUpdated: now,
      });
    });

    setPrices(initialPrices);
  }, []);

  // Update prices in real-time
  const updatePrices = useCallback(() => {
    setPrices((currentPrices) => {
      const newPrices = new Map(currentPrices);
      const now = Date.now();

      newPrices.forEach((tokenPrice, address) => {
        const timeSinceUpdate = now - tokenPrice.lastUpdated;

        // Update every 3-5 seconds with some randomness
        if (timeSinceUpdate > 3000 + Math.random() * 2000) {
          const newPrice = generatePriceUpdate(tokenPrice.price);
          const initialPrice = tokenPrice.price / (1 + tokenPrice.priceChange24h / 100);

          newPrices.set(address, {
            ...tokenPrice,
            price: newPrice,
            priceChange24h: calculatePriceChange(newPrice, initialPrice),
            volume24h: generateVolume(),
            marketCap: generateMarketCap(newPrice),
            lastUpdated: now,
          });
        }
      });

      return newPrices;
    });
  }, []);

  // Manual price update function
  const updatePrice = useCallback((tokenAddress: string, newPrice: number) => {
    setPrices((currentPrices) => {
      const newPrices = new Map(currentPrices);
      const tokenPrice = newPrices.get(tokenAddress);

      if (tokenPrice) {
        const initialPrice = tokenPrice.price / (1 + tokenPrice.priceChange24h / 100);

        newPrices.set(tokenAddress, {
          ...tokenPrice,
          price: newPrice,
          priceChange24h: calculatePriceChange(newPrice, initialPrice),
          marketCap: generateMarketCap(newPrice),
          lastUpdated: Date.now(),
        });
      }

      return newPrices;
    });
  }, []);

  // Refresh all prices
  const refreshPrices = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setPrices((currentPrices) => {
        const newPrices = new Map(currentPrices);
        const now = Date.now();

        newPrices.forEach((tokenPrice, address) => {
          const newPrice = generatePriceUpdate(tokenPrice.price);
          const initialPrice = tokenPrice.price / (1 + tokenPrice.priceChange24h / 100);

          newPrices.set(address, {
            ...tokenPrice,
            price: newPrice,
            priceChange24h: calculatePriceChange(newPrice, initialPrice),
            volume24h: generateVolume(),
            marketCap: generateMarketCap(newPrice),
            lastUpdated: now,
          });
        });

        return newPrices;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh prices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize prices on mount
  useEffect(() => {
    initializePrices();
  }, [initializePrices]);

  // Set up real-time price updates
  useEffect(() => {
    const interval = setInterval(updatePrices, 1000); // Update every second
    return () => clearInterval(interval);
  }, [updatePrices]);

  return {
    prices,
    isLoading,
    error,
    updatePrice,
    refreshPrices,
  };
};