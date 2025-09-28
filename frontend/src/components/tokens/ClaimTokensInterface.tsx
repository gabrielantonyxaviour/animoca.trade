import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AirService } from "@mocanetwork/airkit";
import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePassiveTokens } from "@/hooks/contracts/useTokenContracts";

interface ClaimTokensInterfaceProps {
  airService: AirService | null;
  isLoggedIn: boolean;
  userAddress: string | null;
  environmentConfig: any;
}

interface ClaimableCredential {
  id: string;
  name: string;
  issuer: string;
  tokenSymbol: string;
  claimableAmount: bigint;
  nextClaimTime: Date;
  emissionRate: number;
  selected: boolean;
}

const ClaimTokensInterface: React.FC<ClaimTokensInterfaceProps> = ({
  airService,
  isLoggedIn,
  userAddress,
  environmentConfig,
}) => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<ClaimableCredential[]>([]);
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [claimHistory, setClaimHistory] = useState<any[]>([]);
  const [totalClaimableValue, setTotalClaimableValue] = useState(0);
  const [isClaimingAll, setIsClaimingAll] = useState(false);

  const {
    claimableTokens,
    fetchClaimableTokens,
    claimTokens,
    batchClaimTokens,
    isLoading,
    error,
  } = usePassiveTokens(userAddress);

  // Fetch user credentials and claimable amounts
  useEffect(() => {
    const fetchCredentialData = async () => {
      if (!airService || !isLoggedIn) return;

      try {
        // Mock data - in real app, fetch from AIR SDK and contracts
        const mockCredentials: ClaimableCredential[] = [
          {
            id: "cred_001",
            name: "Professional Developer",
            issuer: "Tech Academy",
            tokenSymbol: "PDT",
            claimableAmount: BigInt(250 * 1e18),
            nextClaimTime: new Date(Date.now() + 3600000),
            emissionRate: 100,
            selected: false,
          },
          {
            id: "cred_002",
            name: "Blockchain Expert",
            issuer: "Crypto Institute",
            tokenSymbol: "BET",
            claimableAmount: BigInt(500 * 1e18),
            nextClaimTime: new Date(Date.now() + 7200000),
            emissionRate: 150,
            selected: false,
          },
          {
            id: "cred_003",
            name: "Data Scientist",
            issuer: "AI University",
            tokenSymbol: "DST",
            claimableAmount: BigInt(175 * 1e18),
            nextClaimTime: new Date(Date.now() + 1800000),
            emissionRate: 75,
            selected: false,
          },
        ];

        setCredentials(mockCredentials);

        // Fetch actual claimable amounts
        const credentialIds = mockCredentials.map((c) => c.id);
        await fetchClaimableTokens(credentialIds);
      } catch (err) {
        console.error("Error fetching credential data:", err);
      }
    };

    fetchCredentialData();
  }, [airService, isLoggedIn, fetchClaimableTokens]);

  // Update claimable amounts from contract data
  useEffect(() => {
    setCredentials((prevCredentials) =>
      prevCredentials.map((cred) => ({
        ...cred,
        claimableAmount: claimableTokens.get(cred.id) || BigInt(0),
      }))
    );

    // Calculate total value
    let total = 0;
    claimableTokens.forEach((amount) => {
      // Mock price calculation - in real app, fetch actual token prices
      const mockPrice = 0.1; // $0.10 per token
      total += Number(formatEther(amount)) * mockPrice;
    });
    setTotalClaimableValue(total);
  }, [claimableTokens]);

  const handleSelectCredential = (credentialId: string) => {
    setCredentials((prev) =>
      prev.map((cred) =>
        cred.id === credentialId ? { ...cred, selected: !cred.selected } : cred
      )
    );

    setSelectedCredentials((prev) =>
      prev.includes(credentialId)
        ? prev.filter((id) => id !== credentialId)
        : [...prev, credentialId]
    );
  };

  const handleSelectAll = () => {
    const allSelected = credentials.every((c) => c.selected);
    setCredentials((prev) =>
      prev.map((cred) => ({ ...cred, selected: !allSelected }))
    );
    setSelectedCredentials(allSelected ? [] : credentials.map((c) => c.id));
  };

  const handleClaimSingle = async (credentialId: string) => {
    const receipt = await claimTokens(credentialId);
    if (receipt) {
      // Add to claim history
      setClaimHistory((prev) => [
        {
          credentialId,
          amount: claimableTokens.get(credentialId),
          timestamp: new Date(),
          txHash: receipt.transactionHash,
        },
        ...prev,
      ]);
    }
  };

  const handleBatchClaim = async () => {
    if (selectedCredentials.length === 0) return;

    setIsClaimingAll(true);
    try {
      const receipt = await batchClaimTokens(selectedCredentials);
      if (receipt) {
        // Add to claim history
        setClaimHistory((prev) => [
          {
            credentialIds: selectedCredentials,
            totalAmount: selectedCredentials.reduce(
              (acc, id) => acc + Number(claimableTokens.get(id) || 0),
              0
            ),
            timestamp: new Date(),
            txHash: receipt.transactionHash,
          },
          ...prev,
        ]);
        // Clear selection
        setSelectedCredentials([]);
        setCredentials((prev) =>
          prev.map((cred) => ({ ...cred, selected: false }))
        );
      }
    } finally {
      setIsClaimingAll(false);
    }
  };

  const formatTimeUntilClaim = (nextClaimTime: Date) => {
    const now = new Date();
    const diff = nextClaimTime.getTime() - now.getTime();

    if (diff <= 0) return "Ready to claim";

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to claim your passive tokens
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Claim Passive Tokens</h1>
            <p className="text-muted-foreground mt-1">
              Collect tokens generated from your credentials
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/tokens")}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Claimable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${totalClaimableValue.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Across {credentials.length} credentials
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Daily Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {credentials.reduce((acc, c) => acc + c.emissionRate, 0)} tokens
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Combined emission rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Claims Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{claimHistory.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Successful claims
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Claimable Credentials */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Claimable Tokens</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {credentials.every((c) => c.selected) ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleBatchClaim}
                  disabled={selectedCredentials.length === 0 || isClaimingAll}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  {isClaimingAll ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Claiming...
                    </>
                  ) : (
                    `Claim Selected (${selectedCredentials.length})`
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {credentials.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No claimable tokens available at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {credentials.map((credential) => (
                  <div
                    key={credential.id}
                    className={`p-4 border rounded-lg transition-all ${
                      credential.selected
                        ? "border-brand-600 bg-brand-50"
                        : "border-border hover:border-brand-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={credential.selected}
                          onChange={() => handleSelectCredential(credential.id)}
                          className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <div>
                          <h4 className="font-semibold">{credential.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {credential.issuer} • {credential.tokenSymbol}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatEther(credential.claimableAmount).slice(0, 8)} {credential.tokenSymbol}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeUntilClaim(credential.nextClaimTime)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClaimSingle(credential.id)}
                          disabled={isLoading || credential.claimableAmount === BigInt(0)}
                        >
                          Claim
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Emission Rate:</span>
                        <span>{credential.emissionRate} tokens/day</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claim History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Claims</CardTitle>
          </CardHeader>
          <CardContent>
            {claimHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent claims
              </p>
            ) : (
              <div className="space-y-3">
                {claimHistory.slice(0, 5).map((claim, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {claim.credentialIds
                          ? `Batch claim (${claim.credentialIds.length} credentials)`
                          : credentials.find((c) => c.id === claim.credentialId)?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {claim.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        +{formatEther(claim.amount || claim.totalAmount).slice(0, 8)} tokens
                      </p>
                      <a
                        href={`${environmentConfig.explorerUrl}/tx/${claim.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View TX
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClaimTokensInterface;