import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AirService } from "@mocanetwork/airkit";
import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTokenFactory } from "@/hooks/contracts/useTokenContracts";
import type { Token } from "@/types/contracts";

interface TokenPortfolioProps {
  airService: AirService | null;
  isLoggedIn: boolean;
  userAddress: string | null;
}

interface PortfolioToken extends Token {
  balance?: bigint;
  value?: number;
  percentChange24h?: number;
  profitLoss?: number;
}

const TokenPortfolio: React.FC<TokenPortfolioProps> = ({
  // airService, // TODO: Will be used for fetching portfolio data
  isLoggedIn,
  userAddress,
}) => {
  const navigate = useNavigate();
  const { tokens: createdTokens } = useTokenFactory(userAddress);
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);
  const [sortBy, setSortBy] = useState<"value" | "balance" | "change" | "name">("value");
  const [filterSearch, setFilterSearch] = useState("");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("24h");

  // Portfolio metrics
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [totalChange24h, setTotalChange24h] = useState(0);
  const [bestPerformer, setBestPerformer] = useState<PortfolioToken | null>(null);
  const [worstPerformer, setWorstPerformer] = useState<PortfolioToken | null>(null);

  // Fetch balances for all tokens
  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!userAddress) return;

      const updatedTokens: PortfolioToken[] = [];
      let totalValue = 0;
      let totalChange = 0;
      let best: PortfolioToken | null = null;
      let worst: PortfolioToken | null = null;

      for (const token of createdTokens) {
        // In a real app, you'd fetch actual balances and prices
        const mockBalance = BigInt(Math.floor(Math.random() * 10000) * 1e18);
        const mockPrice = Math.random() * 10;
        const mockChange = (Math.random() - 0.5) * 20;
        const value = Number(formatEther(mockBalance)) * mockPrice;

        const portfolioToken: PortfolioToken = {
          ...token,
          balance: mockBalance,
          currentPrice: mockPrice,
          value,
          percentChange24h: mockChange,
          profitLoss: value * (mockChange / 100),
        };

        updatedTokens.push(portfolioToken);
        totalValue += value;
        totalChange += portfolioToken.profitLoss || 0;

        if (!best || mockChange > (best.percentChange24h || 0)) {
          best = portfolioToken;
        }
        if (!worst || mockChange < (worst.percentChange24h || 0)) {
          worst = portfolioToken;
        }
      }

      setPortfolioTokens(updatedTokens);
      setTotalPortfolioValue(totalValue);
      setTotalChange24h(totalChange);
      setBestPerformer(best);
      setWorstPerformer(worst);
    };

    fetchPortfolioData();
  }, [createdTokens, userAddress]);

  // Sort and filter tokens
  const displayTokens = useMemo(() => {
    let filtered = portfolioTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
        token.symbol.toLowerCase().includes(filterSearch.toLowerCase())
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "value":
          return (b.value || 0) - (a.value || 0);
        case "balance":
          return Number(b.balance || 0) - Number(a.balance || 0);
        case "change":
          return (b.percentChange24h || 0) - (a.percentChange24h || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [portfolioTokens, sortBy, filterSearch]);

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatBalance = (balance: bigint) => {
    const formatted = formatEther(balance);
    const num = parseFloat(formatted);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(4);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to view your token portfolio
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Token Portfolio</h1>
          <p className="text-muted-foreground mt-1">
            Detailed view of your credential token holdings
          </p>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">
                  {formatValue(totalPortfolioValue)}
                </span>
                <span
                  className={`text-sm font-medium ${
                    totalChange24h >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {totalChange24h >= 0 ? "+" : ""}
                  {formatValue(totalChange24h)} (
                  {totalPortfolioValue > 0
                    ? ((totalChange24h / totalPortfolioValue) * 100).toFixed(2)
                    : "0.00"}
                  %)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Best Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestPerformer ? (
                <div>
                  <p className="font-semibold">{bestPerformer.symbol}</p>
                  <p
                    className={`text-sm ${
                      (bestPerformer.percentChange24h || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {(bestPerformer.percentChange24h || 0) >= 0 ? "+" : ""}
                    {bestPerformer.percentChange24h?.toFixed(2)}%
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Worst Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {worstPerformer ? (
                <div>
                  <p className="font-semibold">{worstPerformer.symbol}</p>
                  <p
                    className={`text-sm ${
                      (worstPerformer.percentChange24h || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {(worstPerformer.percentChange24h || 0) >= 0 ? "+" : ""}
                    {worstPerformer.percentChange24h?.toFixed(2)}%
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search tokens..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-border rounded-md bg-background"
                >
                  <option value="value">Sort by Value</option>
                  <option value="balance">Sort by Balance</option>
                  <option value="change">Sort by Change</option>
                  <option value="name">Sort by Name</option>
                </select>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="px-4 py-2 border border-border rounded-md bg-background"
                >
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Table */}
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {displayTokens.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No tokens in your portfolio yet
                </p>
                <Button
                  onClick={() => navigate("/creds/create")}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Create Your First Token
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Token</th>
                      <th className="text-right py-3 px-4">Balance</th>
                      <th className="text-right py-3 px-4">Price</th>
                      <th className="text-right py-3 px-4">Value</th>
                      <th className="text-right py-3 px-4">24h Change</th>
                      <th className="text-right py-3 px-4">P&L</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTokens.map((token) => (
                      <tr key={token.address} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{token.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {token.symbol}
                            </p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          {token.balance && formatBalance(token.balance)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {token.currentPrice && formatValue(token.currentPrice)}
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          {token.value && formatValue(token.value)}
                        </td>
                        <td
                          className={`text-right py-3 px-4 ${
                            (token.percentChange24h || 0) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {(token.percentChange24h || 0) >= 0 ? "+" : ""}
                          {token.percentChange24h?.toFixed(2)}%
                        </td>
                        <td
                          className={`text-right py-3 px-4 font-medium ${
                            (token.profitLoss || 0) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {(token.profitLoss || 0) >= 0 ? "+" : ""}
                          {token.profitLoss && formatValue(token.profitLoss)}
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/trading?token=${token.address}`)}
                            >
                              Trade
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/creds/${token.address}`)}
                            >
                              Details
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Distribution Chart (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Chart visualization would go here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TokenPortfolio;