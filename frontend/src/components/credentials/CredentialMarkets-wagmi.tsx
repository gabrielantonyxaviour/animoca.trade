import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, DollarSign, Users, Activity, CheckCircle } from "lucide-react";
import { useRealTimePrices } from "@/hooks/useRealTimePrices";

const CredentialMarkets: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useAccount();
  const { prices } = useRealTimePrices();

  const [createdTokens, setCreatedTokens] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Mock market data
  const mockMarkets = [
    {
      id: 'edu-001',
      name: 'Computer Science Degree',
      issuer: 'MIT',
      symbol: 'CSED',
      price: 0.0825,
      change24h: 12.5,
      volume24h: 1250,
      marketCap: 41250,
      holders: 28,
      description: 'Bachelor\'s degree in Computer Science from MIT',
      type: 'Education',
      tokenAddress: '0x123...',
      verified: true,
      isNew: false,
    },
    {
      id: 'prof-002',
      name: 'Senior Developer Certification',
      issuer: 'TechCorp',
      symbol: 'SDC',
      price: 0.0432,
      change24h: -5.2,
      volume24h: 890,
      marketCap: 21600,
      holders: 15,
      description: 'Senior-level software development certification',
      type: 'Professional',
      tokenAddress: '0x456...',
      verified: true,
      isNew: false,
    },
    {
      id: 'skill-004',
      name: 'Blockchain Expert Badge',
      issuer: 'CryptoAcademy',
      symbol: 'BEB',
      price: 0.1156,
      change24h: 8.7,
      volume24h: 2100,
      marketCap: 57800,
      holders: 42,
      description: 'Advanced blockchain development skills certification',
      type: 'Skill',
      tokenAddress: '0xabc...',
      verified: true,
      isNew: false,
    },
  ];

  // Load created tokens from localStorage
  useEffect(() => {
    const loadCreatedTokens = () => {
      const stored = localStorage.getItem('created_tokens');
      if (stored) {
        try {
          const tokens = JSON.parse(stored);
          setCreatedTokens(tokens);
        } catch (err) {
          console.error('Failed to parse created tokens:', err);
        }
      }
    };

    loadCreatedTokens();

    // Listen for token creation events
    const handleTokenCreated = () => {
      loadCreatedTokens();
    };

    window.addEventListener('tokenCreated', handleTokenCreated);
    return () => window.removeEventListener('tokenCreated', handleTokenCreated);
  }, []);

  // Handle success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setShowSuccessMessage(true);
      // Clear the message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      // Clear the navigation state to prevent message from showing again on refresh
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const allMarkets = [...mockMarkets, ...createdTokens.map(token => {
    // Check if token was created recently (within 5 minutes)
    const createdAt = new Date(token.createdAt);
    const isRecentlyCreated = Date.now() - createdAt.getTime() < 5 * 60 * 1000;

    return {
      id: token.credentialId,
      name: token.tokenName,
      issuer: token.credentialPlatform,
      symbol: token.tokenSymbol,
      price: Math.random() * 0.2 + 0.01, // Random price for demo
      change24h: (Math.random() - 0.5) * 30, // Random change for demo
      volume24h: Math.floor(Math.random() * 5000) + 100,
      marketCap: Math.floor(Math.random() * 100000) + 10000,
      holders: Math.floor(Math.random() * 100) + 5,
      description: token.description || `${token.tokenName} trading token`,
      type: 'Custom',
      tokenAddress: token.tokenAddress,
      verified: true,
      isNew: isRecentlyCreated,
    };
  })];

  const filteredMarkets = (activeTab === "all"
    ? allMarkets
    : allMarkets.filter(market => market.type.toLowerCase() === activeTab)
  ).sort((a, b) => {
    // Sort by isNew first (new tokens appear at top), then by name
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    return a.name.localeCompare(b.name);
  });

  const totalMarketCap = allMarkets.reduce((sum, market) => sum + market.marketCap, 0);
  const totalVolume24h = allMarkets.reduce((sum, market) => sum + market.volume24h, 0);
  const totalHolders = allMarkets.reduce((sum, market) => sum + market.holders, 0);

  if (!isConnected) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Please connect your wallet to view and access credential markets.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Credential Markets</h1>
            <p className="text-muted-foreground">
              Trade verified credential tokens with real-time liquidity
            </p>
          </div>
          <Button
            onClick={() => navigate('/creds/create')}
            className="bg-brand-600 hover:bg-brand-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Token
          </Button>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">{location.state?.message || 'Token created successfully!'}</p>
                  <p className="text-green-700 text-sm">Your new token should appear in the markets below.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuccessMessage(false)}
                  className="text-green-600 hover:text-green-800"
                >
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Market Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Market Cap</div>
                  <div className="text-2xl font-bold">${totalMarketCap.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">24h Volume</div>
                  <div className="text-2xl font-bold">${totalVolume24h.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Holders</div>
                  <div className="text-2xl font-bold">{totalHolders.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Active Markets</div>
                  <div className="text-2xl font-bold">{allMarkets.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Tabs and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Available Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Markets</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="skill">Skills</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {filteredMarkets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No markets found in this category</p>
                    <Button
                      onClick={() => navigate('/creds/create')}
                      className="bg-brand-600 hover:bg-brand-700"
                    >
                      Create the First Token
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {/* Market Headers */}
                    <div className="hidden md:grid md:grid-cols-8 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                      <div className="col-span-2">Credential</div>
                      <div>Price</div>
                      <div>24h Change</div>
                      <div>Volume</div>
                      <div>Market Cap</div>
                      <div>Holders</div>
                      <div>Actions</div>
                    </div>

                    {/* Market Rows */}
                    {filteredMarkets.map((market) => {
                      const priceData = prices.get(market.tokenAddress);
                      const currentPrice = priceData?.price || market.price;
                      const change24h = priceData?.priceChange24h || market.change24h;

                      return (
                        <div
                          key={market.id}
                          className={`grid grid-cols-1 md:grid-cols-8 gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                            market.isNew ? 'border-blue-200 bg-blue-50/50' : ''
                          }`}
                          onClick={() => navigate(`/creds/${market.id}`)}
                        >
                          {/* Credential Info */}
                          <div className="md:col-span-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold">{market.name}</div>
                              {market.verified && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  ✓ Verified
                                </Badge>
                              )}
                              {market.isNew && (
                                <Badge className="text-xs bg-blue-600 text-white animate-pulse">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {market.issuer} • {market.symbol}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              {market.description}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="space-y-1">
                            <div className="font-semibold">${currentPrice.toFixed(4)}</div>
                            <div className="text-xs text-muted-foreground">USDC</div>
                          </div>

                          {/* 24h Change */}
                          <div className="space-y-1">
                            <div className={`font-semibold flex items-center gap-1 ${
                              change24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {change24h >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingUp className="w-3 h-3 rotate-180" />
                              )}
                              {Math.abs(change24h).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">24h</div>
                          </div>

                          {/* Volume */}
                          <div className="space-y-1">
                            <div className="font-semibold">${market.volume24h.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">24h vol</div>
                          </div>

                          {/* Market Cap */}
                          <div className="space-y-1">
                            <div className="font-semibold">${market.marketCap.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Market cap</div>
                          </div>

                          {/* Holders */}
                          <div className="space-y-1">
                            <div className="font-semibold">{market.holders}</div>
                            <div className="text-xs text-muted-foreground">holders</div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/creds/${market.id}`);
                              }}
                              className="bg-brand-600 hover:bg-brand-700"
                            >
                              Trade
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <Card className="bg-gradient-to-r from-brand-600 to-brand-700 text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Turn Your Credentials into Liquid Assets</h3>
            <p className="text-brand-100 mb-6 max-w-2xl mx-auto">
              Create tradeable tokens from your verified credentials and enable a new economy
              where skills, education, and professional achievements have real market value.
            </p>
            <Button
              onClick={() => navigate('/creds/create')}
              className="bg-white text-brand-700 hover:bg-brand-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Token
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CredentialMarkets;