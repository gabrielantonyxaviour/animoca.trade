import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount, type Connector } from "wagmi";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, CheckCircle, Zap } from "lucide-react";
import PriceCharts from "@/components/analytics/PriceCharts";
import { useRealTimePrices } from "@/hooks/useRealTimePrices";
import { initializeMarketplace } from "@/services/credential-marketplace";
import type { AirConnector, AirConnectorProperties } from "@mocanetwork/airkit-connector";

interface CredentialStats {
  totalIssuances: number;
  totalVerifications: number;
  feesCollected24h: number;
  feesCollectedAllTime: number;
  activeHolders: number;
  circulatingSupply: number;
  lastIssuanceDate: string;
  lastVerificationDate: string;
}

interface TradeFormData {
  action: 'buy' | 'sell';
  amount: string;
  slippage: number;
}

const CredentialTradingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prices, updatePrice: _updatePrice } = useRealTimePrices();
  const { address: userAddress, connector, isConnected } = useAccount();

  // Check if connected wallet is AirKit wallet
  const isAirWalletConnector = (connector as Connector & AirConnectorProperties)?.isMocaNetwork;

  const airConnector = useMemo<AirConnector | null>(() => {
    if (isAirWalletConnector && connector) {
      return connector as AirConnector;
    }
    return null;
  }, [connector, isAirWalletConnector]);

  const airService = airConnector?.airService;

  const [credential, setCredential] = useState<any>(null);
  const [stats, setStats] = useState<CredentialStats | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [tradeForm, setTradeForm] = useState<TradeFormData>({
    action: 'buy',
    amount: '',
    slippage: 1.0,
  });
  const [isTrading, setIsTrading] = useState(false);
  const [marketplace, setMarketplace] = useState<any>(null);

  // Mock credential data based on ID
  const mockCredentials: { [key: string]: any } = {
    'edu-001': {
      id: 'edu-001',
      name: 'Computer Science Degree',
      issuer: 'MIT',
      type: 'Education',
      symbol: 'CSED',
      tokenAddress: '0x123...',
      description: 'Bachelor\'s degree in Computer Science from MIT',
      verificationStatus: 'verified',
      hasToken: true,
    },
    'prof-002': {
      id: 'prof-002',
      name: 'Senior Developer Certification',
      issuer: 'TechCorp',
      type: 'Professional',
      symbol: 'SDC',
      tokenAddress: '0x456...',
      description: 'Senior-level software development certification',
      verificationStatus: 'verified',
      hasToken: true,
    },
    'skill-004': {
      id: 'skill-004',
      name: 'Blockchain Expert Badge',
      issuer: 'CryptoAcademy',
      type: 'Skill',
      symbol: 'BEB',
      tokenAddress: '0xabc...',
      description: 'Advanced blockchain development skills certification',
      verificationStatus: 'verified',
      hasToken: true,
    },
  };

  // Initialize marketplace service when wallet is connected
  useEffect(() => {
    const initMarketplace = async () => {
      if (!airService || !isConnected || !userAddress) return;

      try {
        // Get provider from AirService
        const provider = new ethers.BrowserProvider(airService.provider);
        const signer = await provider.getSigner();

        // Initialize marketplace with Moca Devnet (chainId: 5151)
        const marketplaceInstance = initializeMarketplace(provider, signer, 5151);
        setMarketplace(marketplaceInstance);
      } catch (err) {
        console.error("Failed to initialize marketplace:", err);
      }
    };

    initMarketplace();
  }, [airService, isConnected, userAddress]);

  // Load data when component mounts
  useEffect(() => {
    if (id && mockCredentials[id]) {
      setCredential(mockCredentials[id]);

      // Load stats from localStorage or generate mock data
      const statsKey = `credential_stats_${id}`;
      const storedStats = localStorage.getItem(statsKey);

      if (storedStats) {
        setStats(JSON.parse(storedStats));
      } else {
        // Generate initial stats and store them
        const initialStats: CredentialStats = {
          totalIssuances: Math.floor(Math.random() * 500) + 100,
          totalVerifications: Math.floor(Math.random() * 2000) + 500,
          feesCollected24h: Math.random() * 100 + 50,
          feesCollectedAllTime: Math.random() * 5000 + 1000,
          activeHolders: Math.floor(Math.random() * 200) + 50,
          circulatingSupply: Math.floor(Math.random() * 50000) + 10000,
          lastIssuanceDate: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          lastVerificationDate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        };
        setStats(initialStats);
        localStorage.setItem(statsKey, JSON.stringify(initialStats));
      }
    }
  }, [id]);

  // Load balances from blockchain
  useEffect(() => {
    const loadBalances = async () => {
      if (!marketplace || !userAddress || !credential) return;

      try {
        // Load USDC balance from blockchain
        const usdcBalanceWei = await marketplace.getUSDCBalance(userAddress);
        const usdcBal = parseFloat(marketplace.formatUSDC(usdcBalanceWei));
        setUsdcBalance(usdcBal);

        // Load credential token balance from blockchain
        const tokenContract = new ethers.Contract(
          credential.tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          marketplace.provider
        );
        const tokenBalanceWei = await tokenContract.balanceOf(userAddress);
        const tokenBalance = parseFloat(ethers.formatEther(tokenBalanceWei));
        setUserBalance(tokenBalance);
      } catch (error) {
        console.error("Failed to load balances:", error);
      }
    };

    loadBalances();
  }, [marketplace, userAddress, credential]);

  const currentPrice = credential?.tokenAddress ? prices.get(credential.tokenAddress)?.price || 0 : 0;
  const priceChange24h = credential?.tokenAddress ? prices.get(credential.tokenAddress)?.priceChange24h || 0 : 0;

  const calculateTradeAmount = () => {
    const amount = parseFloat(tradeForm.amount) || 0;
    if (tradeForm.action === 'buy') {
      return amount / currentPrice; // USDC -> Tokens
    } else {
      return amount * currentPrice; // Tokens -> USDC
    }
  };

  const calculateTradeFee = () => {
    const tradeAmount = calculateTradeAmount();
    return tradeAmount * 0.003; // 0.3% fee
  };

  const handleTrade = async () => {
    if (!isConnected || !credential || !tradeForm.amount || !marketplace) return;

    setIsTrading(true);
    try {
      const amount = parseFloat(tradeForm.amount);

      if (tradeForm.action === 'buy') {
        // Buy tokens with USDC - real blockchain transaction
        const usdcAmount = marketplace.parseUSDC(amount);
        await marketplace.buyTokens(
          credential.id,
          usdcAmount,
          tradeForm.slippage / 100 // Convert percentage to decimal
        );
      } else {
        // Sell tokens for USDC - real blockchain transaction
        const tokenAmount = marketplace.parseTokens(amount);
        await marketplace.sellTokens(
          credential.id,
          tokenAmount,
          tradeForm.slippage / 100 // Convert percentage to decimal
        );
      }

      // Reload balances from blockchain after successful trade
      const usdcBalanceWei = await marketplace.getUSDCBalance(userAddress);
      const usdcBal = parseFloat(marketplace.formatUSDC(usdcBalanceWei));
      setUsdcBalance(usdcBal);

      const tokenContract = new ethers.Contract(
        credential.tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        marketplace.provider
      );
      const tokenBalanceWei = await tokenContract.balanceOf(userAddress);
      const tokenBalance = parseFloat(ethers.formatEther(tokenBalanceWei));
      setUserBalance(tokenBalance);

      // Update stats with fee collected
      if (stats) {
        const fee = calculateTradeFee();
        const newStats = {
          ...stats,
          feesCollected24h: stats.feesCollected24h + fee,
          feesCollectedAllTime: stats.feesCollectedAllTime + fee,
        };
        setStats(newStats);
        localStorage.setItem(`credential_stats_${id}`, JSON.stringify(newStats));
      }

      setTradeForm({ ...tradeForm, amount: '' });
    } catch (error: any) {
      console.error('Trade failed:', error);
      const errorMessage = marketplace?.handleError(error) || 'Trade failed';
      alert(errorMessage);
    } finally {
      setIsTrading(false);
    }
  };

  if (!credential) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Credential Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The credential you're looking for doesn't exist or hasn't been tokenized yet.
              </p>
              <Button onClick={() => navigate('/creds')}>
                Back to Markets
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Please connect your wallet to view and trade this credential token.
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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/creds')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Markets
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{credential.name}</h1>
              <Badge variant="outline">{credential.type}</Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {credential.symbol}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Issued by {credential.issuer} • {credential.description}
            </p>
          </div>
        </div>

        {/* Price Info */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Current Price</div>
                <div className="text-2xl font-bold">{currentPrice.toFixed(4)} USDC</div>
                <div className={`flex items-center gap-1 text-sm ${priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceChange24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(priceChange24h).toFixed(2)}% (24h)
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Your Balance</div>
                <div className="text-2xl font-bold">{userBalance.toFixed(2)} {credential.symbol}</div>
                <div className="text-sm text-muted-foreground">
                  ≈ {(userBalance * currentPrice).toFixed(2)} USDC
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
                <div className="text-2xl font-bold">
                  {stats ? (stats.circulatingSupply * currentPrice / 1000).toFixed(1) : '0'}K USDC
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats?.circulatingSupply.toLocaleString()} tokens
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Holders</div>
                <div className="text-2xl font-bold">{stats?.activeHolders || 0}</div>
                <div className="text-sm text-muted-foreground">Token holders</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart and Trading */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <PriceCharts
              tokenAddress={credential.tokenAddress}
              tokenSymbol={credential.symbol}
              oracleAddress="0x789..."
            />

            {/* Trading Interface */}
            <Card>
              <CardHeader>
                <CardTitle>Trade {credential.symbol}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={tradeForm.action} onValueChange={(value) => setTradeForm({...tradeForm, action: value as 'buy' | 'sell'})}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy">Buy</TabsTrigger>
                    <TabsTrigger value="sell">Sell</TabsTrigger>
                  </TabsList>

                  <TabsContent value="buy" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="buy-amount">Amount (USDC)</Label>
                      <Input
                        id="buy-amount"
                        type="number"
                        placeholder="0.00"
                        value={tradeForm.amount}
                        onChange={(e) => setTradeForm({...tradeForm, amount: e.target.value})}
                      />
                      <div className="text-sm text-muted-foreground">
                        Balance: {usdcBalance.toFixed(2)} USDC
                      </div>
                    </div>
                    {tradeForm.amount && (
                      <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>You'll receive:</span>
                          <span>{calculateTradeAmount().toFixed(4)} {credential.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Trading fee (0.3%):</span>
                          <span>{calculateTradeFee().toFixed(4)} {credential.symbol}</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sell" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sell-amount">Amount ({credential.symbol})</Label>
                      <Input
                        id="sell-amount"
                        type="number"
                        placeholder="0.00"
                        value={tradeForm.amount}
                        onChange={(e) => setTradeForm({...tradeForm, amount: e.target.value})}
                      />
                      <div className="text-sm text-muted-foreground">
                        Balance: {userBalance.toFixed(2)} {credential.symbol}
                      </div>
                    </div>
                    {tradeForm.amount && (
                      <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>You'll receive:</span>
                          <span>{(calculateTradeAmount() * 0.997).toFixed(4)} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Trading fee (0.3%):</span>
                          <span>{(calculateTradeAmount() * 0.003).toFixed(4)} USDC</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <Button
                  onClick={handleTrade}
                  disabled={isTrading || !tradeForm.amount}
                  className="w-full mt-4"
                >
                  {isTrading ? 'Processing...' : `${tradeForm.action === 'buy' ? 'Buy' : 'Sell'} ${credential.symbol}`}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Verification Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Verification Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Issuances</span>
                    <span className="font-semibold">{stats?.totalIssuances.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last: {stats ? new Date(stats.lastIssuanceDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Verifications</span>
                    <span className="font-semibold">{stats?.totalVerifications.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last: {stats ? new Date(stats.lastVerificationDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Verification Rate</div>
                  <div className="font-semibold">
                    {stats ? ((stats.totalVerifications / stats.totalIssuances) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fee Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Fee Collection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Last 24 Hours</div>
                  <div className="text-2xl font-bold">{stats?.feesCollected24h.toFixed(2)} USDC</div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    +12.5% vs yesterday
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">All Time</div>
                  <div className="text-2xl font-bold">{stats?.feesCollectedAllTime.toFixed(2)} USDC</div>
                  <div className="text-xs text-muted-foreground">
                    Distributed to token holders
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Your Share (Est.)</div>
                  <div className="font-semibold">
                    {stats && userBalance > 0
                      ? ((userBalance / stats.circulatingSupply) * stats.feesCollected24h).toFixed(4)
                      : '0.0000'
                    } USDC/day
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/issue')}
                >
                  Issue New Credential
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/verify')}
                >
                  Verify Credential
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setTradeForm({...tradeForm, amount: (usdcBalance * 0.1).toString(), action: 'buy'})}
                >
                  Buy 10% of Balance
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialTradingPage;