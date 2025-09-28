import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AirService } from "@mocanetwork/airkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TokenCard from "./TokenCard";
import { useTokenFactory, usePassiveTokens } from "@/hooks/contracts/useTokenContracts";
import type { Token } from "@/types/contracts";

interface TokenDashboardProps {
  airService: AirService | null;
  isLoggedIn: boolean;
  userAddress: string | null;
}

const TokenDashboard: React.FC<TokenDashboardProps> = ({
  airService,
  isLoggedIn,
  userAddress,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "created" | "held">("all");
  const [userCredentials, setUserCredentials] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalClaimable, setTotalClaimable] = useState(0);

  const { tokens: createdTokens, isLoading: isLoadingCreated } = useTokenFactory(userAddress);
  const { claimableTokens, fetchClaimableTokens } = usePassiveTokens(userAddress);

  // Fetch user credentials from AIR SDK
  useEffect(() => {
    const fetchUserCredentials = async () => {
      if (!airService || !isLoggedIn) return;

      try {
        // This would be the actual AIR SDK method to get user's credentials
        // For now, we'll use placeholder logic
        // const credentials = await airService.getCredentials?.() || [];
        const credentials: any[] = []; // Placeholder until AirService API is implemented
        setUserCredentials(credentials);

        // Fetch claimable tokens for these credentials
        const credentialIds = credentials.map((cred: any) => cred.id);
        await fetchClaimableTokens(credentialIds);
      } catch (err) {
        console.error("Error fetching credentials:", err);
      }
    };

    fetchUserCredentials();
  }, [airService, isLoggedIn, fetchClaimableTokens]);

  // Calculate total portfolio value
  useEffect(() => {
    let total = 0;
    // TODO: Implement price fetching and balance calculation
    // createdTokens.forEach((token) => {
    //   if (token.currentPrice && token.balance) {
    //     total += token.currentPrice * Number(token.balance) / 1e18;
    //   }
    // });
    setTotalValue(total);
  }, [createdTokens]);

  // Calculate total claimable value
  useEffect(() => {
    let total = 0;
    claimableTokens.forEach((amount) => {
      // Convert to number and add to total
      // You'd need to get the token price to calculate actual value
      total += Number(amount) / 1e18;
    });
    setTotalClaimable(total);
  }, [claimableTokens]);

  const filteredTokens = createdTokens.filter((token) => {
    const matchesSearch =
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === "created") {
      return matchesSearch && token.creator?.toLowerCase() === userAddress?.toLowerCase();
    }

    return matchesSearch;
  });

  const handleCreateToken = () => {
    navigate("/tokens/create");
  };

  const handleTokenClick = (token: Token) => {
    navigate(`/tokens/${token.address}`);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to view and manage your credential tokens
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
            <h1 className="text-3xl font-bold text-foreground">Token Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your credential tokens and track portfolio performance
            </p>
          </div>
          <Button
            onClick={handleCreateToken}
            className="bg-brand-600 hover:bg-brand-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Token
          </Button>
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
              <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-1">+12.5% (24h)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tokens Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{createdTokens.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Across {userCredentials.length} credentials</p>
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
                onClick={() => navigate("/tokens/claim")}
              >
                Claim Now →
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{userCredentials.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Generating passive income</p>
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
                    placeholder="Search tokens by name or symbol..."
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
                  variant={filterType === "created" ? "default" : "outline"}
                  onClick={() => setFilterType("created")}
                  className="min-w-[80px]"
                >
                  Created
                </Button>
                <Button
                  variant={filterType === "held" ? "default" : "outline"}
                  onClick={() => setFilterType("held")}
                  className="min-w-[80px]"
                >
                  Held
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Grid */}
        {isLoadingCreated ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No tokens found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Create your first token from a credential to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateToken} className="bg-brand-600 hover:bg-brand-700">
                  Create Your First Token
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token) => (
              <TokenCard
                key={token.address}
                token={token}
                onClick={() => handleTokenClick(token)}
                showBalance
                showPrice
                showActions
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-brand-600 to-brand-700 text-white">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-2">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                onClick={() => navigate("/tokens/claim")}
              >
                Claim Passive Tokens
              </Button>
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                onClick={() => navigate("/tokens/portfolio")}
              >
                View Full Portfolio
              </Button>
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                onClick={() => navigate("/trading")}
              >
                Trade Tokens
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TokenDashboard;