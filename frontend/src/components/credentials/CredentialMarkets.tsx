import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AirService } from "@mocanetwork/airkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { usePassiveTokens } from "@/hooks/contracts/useTokenContracts";
import { useRealTimePrices } from "@/hooks/useRealTimePrices";

interface CredentialMarketsProps {
  airService: AirService | null;
  isLoggedIn: boolean;
  userAddress: string | null;
}

interface Credential {
  id: string;
  name: string;
  issuer: string;
  type: string;
  verificationStatus: "verified" | "pending" | "expired";
  hasToken: boolean;
  tokenAddress?: string;
  currentPrice?: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  description?: string;
}

const CredentialMarkets: React.FC<CredentialMarketsProps> = ({
  airService,
  isLoggedIn,
  userAddress,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "verified" | "tokenized">("all");
  const [userCredentials, setUserCredentials] = useState<Credential[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalClaimable, setTotalClaimable] = useState(0);

  const { claimableTokens, fetchClaimableTokens } = usePassiveTokens(userAddress);
  const { prices, isLoading: isPricesLoading, refreshPrices } = useRealTimePrices();

  // Get real-time price data and merge with credentials
  const getCredentialsWithPrices = (): Credential[] => {
    const baseCredentials = [
      {
        id: "edu-001",
        name: "Computer Science Degree",
        issuer: "MIT",
        type: "Education",
        verificationStatus: "verified" as const,
        hasToken: true,
        tokenAddress: "0x123...",
        description: "Bachelor's degree in Computer Science from MIT"
      },
      {
        id: "prof-002",
        name: "Senior Developer Certification",
        issuer: "TechCorp",
        type: "Professional",
        verificationStatus: "verified" as const,
        hasToken: true,
        tokenAddress: "0x456...",
        description: "Senior-level software development certification"
      },
      {
        id: "id-003",
        name: "Identity Verification",
        issuer: "GovID",
        type: "Identity",
        verificationStatus: "verified" as const,
        hasToken: false,
        description: "Government-issued identity verification"
      },
      {
        id: "skill-004",
        name: "Blockchain Expert Badge",
        issuer: "CryptoAcademy",
        type: "Skill",
        verificationStatus: "verified" as const,
        hasToken: true,
        tokenAddress: "0xabc...",
        description: "Advanced blockchain development skills certification"
      },
      {
        id: "health-005",
        name: "Vaccination Record",
        issuer: "HealthAuth",
        type: "Health",
        verificationStatus: "verified" as const,
        hasToken: false,
        description: "Complete vaccination record verification"
      }
    ];

    return baseCredentials.map(credential => {
      if (credential.hasToken && credential.tokenAddress) {
        const priceData = prices.get(credential.tokenAddress);
        if (priceData) {
          return {
            ...credential,
            currentPrice: priceData.price,
            priceChange24h: priceData.priceChange24h,
            marketCap: priceData.marketCap,
            volume24h: priceData.volume24h,
          };
        }
      }
      return credential;
    });
  };

  // Update credentials whenever prices change
  useEffect(() => {
    const credentialsWithPrices = getCredentialsWithPrices();
    setUserCredentials(credentialsWithPrices);
  }, [prices]);

  // Fetch claimable tokens when component mounts
  useEffect(() => {
    const loadClaimableTokens = async () => {
      if (!airService || !isLoggedIn) return;

      try {
        const credentialIds = getCredentialsWithPrices().map((cred) => cred.id);
        await fetchClaimableTokens(credentialIds);
      } catch (err) {
        console.error("Error fetching claimable tokens:", err);
      }
    };

    loadClaimableTokens();
  }, [airService, isLoggedIn]);

  // Calculate total portfolio value
  useEffect(() => {
    let total = 0;
    userCredentials.forEach((cred) => {
      if (cred.hasToken && cred.currentPrice) {
        // Assume user holds some amount - this would come from contract balance
        total += cred.currentPrice * 100; // Mock holding of 100 tokens
      }
    });
    setTotalValue(total);
  }, [userCredentials]);

  // Calculate total claimable value
  useEffect(() => {
    let total = 0;
    claimableTokens.forEach((amount) => {
      total += Number(amount) / 1e18;
    });
    setTotalClaimable(total);
  }, [claimableTokens]);

  const filteredCredentials = userCredentials.filter((cred) => {
    const matchesSearch =
      cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.type.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === "verified") {
      return matchesSearch && cred.verificationStatus === "verified";
    }
    if (filterType === "tokenized") {
      return matchesSearch && cred.hasToken;
    }

    return matchesSearch;
  });

  const handleCreateToken = (credential: Credential) => {
    navigate(`/creds/create?credentialId=${credential.id}`);
  };

  const handleViewMarket = (credential: Credential) => {
    navigate(`/creds/${credential.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "expired": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? "text-green-600" : "text-red-600";
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to view your credentials and their markets
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Credential Markets</h1>
            <p className="text-muted-foreground mt-1">
              View your credentials and create tokens for verified credentials
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPrices}
              disabled={isPricesLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isPricesLoading ? 'animate-spin' : ''}`} />
              Refresh Prices
            </Button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalValue.toFixed(2)} USDC</p>
              <p className="text-xs text-green-600 mt-1">+8.3% (24h)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Verified Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {userCredentials.filter(c => c.verificationStatus === "verified").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {userCredentials.filter(c => c.hasToken).length} with tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Claimable Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalClaimable.toFixed(0)}</p>
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-brand-600 mt-1"
                onClick={() => navigate("/creds/claim")}
              >
                Claim Now →
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Market Cap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {(userCredentials.reduce((sum, c) => sum + (c.marketCap || 0), 0) / 1000).toFixed(1)}K USDC
              </p>
              <p className="text-xs text-muted-foreground mt-1">Across all tokens</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <Input
                    type="text"
                    placeholder="Search credentials by name, issuer, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  onClick={() => setFilterType("all")}
                  className="min-w-[80px]"
                >
                  All
                </Button>
                <Button
                  variant={filterType === "verified" ? "default" : "outline"}
                  onClick={() => setFilterType("verified")}
                  className="min-w-[80px]"
                >
                  Verified
                </Button>
                <Button
                  variant={filterType === "tokenized" ? "default" : "outline"}
                  onClick={() => setFilterType("tokenized")}
                  className="min-w-[80px]"
                >
                  Tokenized
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credentials Grid */}
        {filteredCredentials.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No credentials found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Connect your wallet and verify credentials to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCredentials.map((credential) => (
              <Card key={credential.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">{credential.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Issued by {credential.issuer}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(credential.verificationStatus)}>
                        {credential.verificationStatus}
                      </Badge>
                      <Badge variant="outline">{credential.type}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {credential.description}
                  </p>

                  {credential.hasToken ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Token Market</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          LIVE
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Price</p>
                          <p className="font-semibold">{credential.currentPrice?.toFixed(4)} USDC</p>
                          <p className={`text-xs ${getPriceChangeColor(credential.priceChange24h || 0)}`}>
                            {credential.priceChange24h && credential.priceChange24h >= 0 ? '+' : ''}
                            {credential.priceChange24h?.toFixed(1)}% (24h)
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Market Cap</p>
                          <p className="font-semibold">
                            {credential.marketCap ? (credential.marketCap / 1000).toFixed(1) : '0'}K USDC
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vol: {credential.volume24h ? (credential.volume24h / 1000).toFixed(1) : '0'}K USDC
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 mb-3">
                        This credential can be tokenized to create a tradeable asset and generate passive income.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {credential.hasToken ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMarket(credential)}
                          className="flex-1"
                        >
                          View Market
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate("/trade")}
                          className="flex-1"
                        >
                          Trade
                        </Button>
                      </>
                    ) : (
                      credential.verificationStatus === "verified" && (
                        <Button
                          size="sm"
                          onClick={() => handleCreateToken(credential)}
                          className="w-full bg-brand-600 hover:bg-brand-700"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create Token
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CredentialMarkets;