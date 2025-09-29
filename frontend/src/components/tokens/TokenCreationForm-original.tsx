import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AirService } from "@mocanetwork/airkit";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeMarketplace } from "@/services/credential-marketplace";
import { TRADING_CREDENTIALS, type TradingPlatform, type CredentialStatus } from "@/config/tradingCredentials";

interface TokenCreationFormProps {
  airService: AirService | null;
  isLoggedIn: boolean;
  userAddress: string | null;
}

interface CreateTokenParams {
  credentialId: string;
  name: string;
  symbol: string;
  emissionRate: number;
  maxSupply: number;
  initialLiquidity: {
    tokenAmount: number;
    usdcAmount: number; // Changed from usdcAmount to usdcAmount
  };
}

const TokenCreationForm: React.FC<TokenCreationFormProps> = ({
  airService,
  isLoggedIn,
  userAddress,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Marketplace service states
  const [marketplace, setMarketplace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [userCredentials, setUserCredentials] = useState<any[]>([]);
  const [credentialStatuses, setCredentialStatuses] = useState<CredentialStatus[]>([]);
  const [issuingCredentials, setIssuingCredentials] = useState<Set<TradingPlatform>>(new Set());
  const [verifyingCredentials, setVerifyingCredentials] = useState<Set<TradingPlatform>>(new Set());
  const [formData, setFormData] = useState<CreateTokenParams>({
    credentialId: "",
    name: "",
    symbol: "",
    emissionRate: 100,
    maxSupply: 1000000,
    initialLiquidity: {
      tokenAmount: 1000,
      usdcAmount: 100, // Changed to USDC amount (100 USDC for initial liquidity)
    },
  });

  // Validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize marketplace service when wallet is connected
  useEffect(() => {
    const initMarketplace = async () => {
      if (!airService || !isLoggedIn || !userAddress) return;

      try {
        // Get provider from AirService
        const provider = new ethers.BrowserProvider(airService.provider);
        const signer = await provider.getSigner();

        // Initialize marketplace with Moca Devnet (chainId: 5151)
        const marketplaceInstance = initializeMarketplace(provider, signer, 5151);
        setMarketplace(marketplaceInstance);
      } catch (err) {
        console.error("Failed to initialize marketplace:", err);
        setError("Failed to connect to marketplace");
      }
    };

    initMarketplace();
  }, [airService, isLoggedIn, userAddress]);

  // Fetch user credentials from AIR SDK
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!airService || !isLoggedIn) return;

      try {
        // Convert trading credentials to match the expected interface
        const credentials = TRADING_CREDENTIALS.map((tradingCred, _index) => ({
          id: `trading-${tradingCred.platform.toLowerCase()}`,
          name: tradingCred.name,
          issuer: tradingCred.platform,
          type: "Trading",
          issuedDate: new Date("2024-09-29"),
          validated: true,
          verificationStatus: "verified" as const,
          hasToken: false, // Initially no tokens
          description: tradingCred.description,
          emoji: tradingCred.emoji,
          nftImage: tradingCred.nftImage,
          logoImage: tradingCred.logoImage,
          requirements: tradingCred.requirements,
        }));

        // Add some traditional credentials as well for variety
        const traditionalCredentials = [
          {
            id: "edu-001",
            name: "Computer Science Degree",
            issuer: "MIT",
            type: "Education",
            issuedDate: new Date("2024-01-15"),
            validated: true,
            verificationStatus: "verified" as const,
            hasToken: false,
            description: "Bachelor's degree in Computer Science from MIT"
          },
          {
            id: "skill-004",
            name: "Blockchain Expert Badge",
            issuer: "CryptoAcademy",
            type: "Skill",
            issuedDate: new Date("2024-04-05"),
            validated: true,
            verificationStatus: "verified" as const,
            hasToken: false,
            description: "Advanced blockchain development skills certification"
          }
        ];

        setUserCredentials([...credentials, ...traditionalCredentials]);
      } catch (err) {
        console.error("Error fetching credentials:", err);
      }
    };

    fetchCredentials();
  }, [airService, isLoggedIn]);

  // Handle pre-selection from URL parameters
  useEffect(() => {
    const credentialId = searchParams.get('credentialId');
    if (credentialId && userCredentials.length > 0) {
      const credential = userCredentials.find(c => c.id === credentialId);
      if (credential && !credential.hasToken && credential.verificationStatus === "verified") {
        handleCredentialSelect(credential);
      }
    }
  }, [searchParams, userCredentials]);

  const handleCredentialSelect = (credential: any) => {
    setSelectedCredential(credential);
    setFormData((prev) => ({
      ...prev,
      credentialId: credential.id,
      name: `${credential.name} Token`,
      symbol: credential.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 4),
    }));
  };

  // Load stored credential statuses from localStorage
  const loadCredentialStatuses = () => {
    if (!userAddress) return;

    const stored = localStorage.getItem(`trading_credentials_${userAddress.toLowerCase()}`);
    if (stored) {
      try {
        setCredentialStatuses(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse stored credentials:", err);
      }
    }
  };

  // Save credential statuses to localStorage
  const saveCredentialStatuses = (statuses: CredentialStatus[]) => {
    if (!userAddress) return;

    localStorage.setItem(
      `trading_credentials_${userAddress.toLowerCase()}`,
      JSON.stringify(statuses)
    );
    setCredentialStatuses(statuses);
  };

  // Get credential status for a platform
  const getCredentialStatus = (platform: TradingPlatform): CredentialStatus => {
    const status = credentialStatuses.find(s => s.platform === platform);
    return status || {
      platform,
      isMinted: false,
      isVerified: false,
    };
  };

  // Handle credential issuing
  const handleIssueCredential = async (platform: TradingPlatform) => {
    if (!airService || !isLoggedIn || !userAddress) return;

    try {
      setIssuingCredentials(prev => new Set(prev).add(platform));

      // Simulate issuing process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a mock credential ID
      const credentialId = `cred_${platform.toLowerCase()}_${Date.now()}`;

      // Update credential status
      const newStatus: CredentialStatus = {
        platform,
        isMinted: true,
        isVerified: false,
        credentialId,
        mintedAt: new Date(),
      };

      const updatedStatuses = [
        ...credentialStatuses.filter(s => s.platform !== platform),
        newStatus,
      ];

      saveCredentialStatuses(updatedStatuses);

    } catch (err) {
      console.error("Failed to issue credential:", err);
    } finally {
      setIssuingCredentials(prev => {
        const newSet = new Set(prev);
        newSet.delete(platform);
        return newSet;
      });
    }
  };

  // Handle credential verification
  const handleVerifyCredential = async (platform: TradingPlatform) => {
    const credentialStatus = getCredentialStatus(platform);
    if (!credentialStatus.isMinted || !credentialStatus.credentialId) return;

    try {
      setVerifyingCredentials(prev => new Set(prev).add(platform));

      // Simulate on-chain verification
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate a mock transaction hash
      const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      // Update credential status
      const updatedStatus: CredentialStatus = {
        ...credentialStatus,
        isVerified: true,
        verificationTxHash: txHash,
        verifiedAt: new Date(),
      };

      const updatedStatuses = [
        ...credentialStatuses.filter(s => s.platform !== platform),
        updatedStatus,
      ];

      saveCredentialStatuses(updatedStatuses);

    } catch (err) {
      console.error("Failed to verify credential:", err);
    } finally {
      setVerifyingCredentials(prev => {
        const newSet = new Set(prev);
        newSet.delete(platform);
        return newSet;
      });
    }
  };

  // Load credential statuses when user address changes
  useEffect(() => {
    if (userAddress) {
      loadCredentialStatuses();
    }
  }, [userAddress]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.credentialId) {
      errors.credentialId = "Please select a credential";
    }
    if (!formData.name) {
      errors.name = "Token name is required";
    }
    if (!formData.symbol || formData.symbol.length > 6) {
      errors.symbol = "Symbol is required (max 6 characters)";
    }
    if (formData.emissionRate < 1 || formData.emissionRate > 10000) {
      errors.emissionRate = "Emission rate must be between 1 and 10000";
    }
    if (formData.maxSupply < 1000) {
      errors.maxSupply = "Max supply must be at least 1000";
    }
    if (formData.initialLiquidity.tokenAmount < 1000) {
      errors.tokenAmount = "Minimum initial token amount is 1000";
    }
    if (formData.initialLiquidity.usdcAmount < 10) {
      errors.usdcAmount = "Minimum USDC amount is 10";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !marketplace) {
      console.log("handleSubmit validation failed:", { formValid: validateForm(), marketplace: !!marketplace });
      return;
    }

    console.log("Starting token creation process...");
    console.log("Form data:", formData);
    console.log("Marketplace signer:", !!marketplace.signer);
    console.log("User address:", userAddress);

    setIsLoading(true);
    setError(null);

    try {
      // First, mint some test USDC for the user
      console.log("Step 1: Minting test USDC...");
      const usdcAmount = formData.initialLiquidity.usdcAmount + 10;
      console.log("Minting USDC amount:", usdcAmount);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('USDC minting timeout after 60 seconds')), 60000)
      );

      await Promise.race([
        marketplace.mintTestUSDC(usdcAmount), // Extra for fees
        timeoutPromise
      ]);
      console.log("USDC minting completed");

      // Create the credential token
      console.log("Step 2: Creating credential token...");
      console.log("Token params:", {
        credentialId: formData.credentialId,
        name: formData.name,
        symbol: formData.symbol,
        emissionRate: formData.emissionRate,
        maxSupply: formData.maxSupply
      });

      const tokenTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Token creation timeout after 60 seconds')), 60000)
      );

      const result = await Promise.race([
        marketplace.createCredentialToken(
          formData.credentialId,
          formData.name,
          formData.symbol,
          formData.emissionRate,
          formData.maxSupply
        ),
        tokenTimeoutPromise
      ]);
      console.log("Token creation result:", result);

      if (result && result.tokenAddress) {
        console.log("Step 3: Creating market with liquidity...");
        console.log("Market params:", {
          credentialId: result.credentialId,
          tokenAddress: result.tokenAddress,
          tokenAmount: formData.initialLiquidity.tokenAmount,
          usdcAmount: formData.initialLiquidity.usdcAmount
        });

        // Create market with initial liquidity
        const marketTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Market creation timeout after 60 seconds')), 60000)
        );

        await Promise.race([
          marketplace.createMarketWithLiquidity(
            result.credentialId,
            result.tokenAddress,
            marketplace.parseTokens(formData.initialLiquidity.tokenAmount),
            marketplace.parseUSDC(formData.initialLiquidity.usdcAmount)
          ),
          marketTimeoutPromise
        ]);
        console.log("Market creation completed");

        const tokenAddress = result.tokenAddress;
        // Store the created token in localStorage
        const createdToken = {
          credentialId: formData.credentialId,
          credentialName: selectedCredential?.name || formData.name,
          credentialPlatform: selectedCredential?.issuer || "Unknown",
          tokenName: formData.name,
          tokenSymbol: formData.symbol,
          tokenAddress: tokenAddress,
          emissionRate: formData.emissionRate,
          maxSupply: formData.maxSupply,
          initialLiquidity: formData.initialLiquidity,
          createdAt: new Date().toISOString(),
          description: selectedCredential?.description,
          emoji: selectedCredential?.emoji,
          nftImage: selectedCredential?.nftImage,
          logoImage: selectedCredential?.logoImage,
        };

        // Get existing tokens
        const existingTokens = localStorage.getItem('created_tokens');
        const tokens = existingTokens ? JSON.parse(existingTokens) : [];

        // Add new token
        tokens.push(createdToken);

        // Save back to localStorage
        localStorage.setItem('created_tokens', JSON.stringify(tokens));

        // Dispatch custom event for real-time updates
        window.dispatchEvent(new CustomEvent('tokenCreated'));

        console.log("Token creation completed successfully!");

        // Show success message and navigate
        navigate("/creds", {
          state: { message: "Token created successfully!" },
        });
      } else {
        console.error("No token address in result:", result);
        setError("Token creation failed - no token address returned");
      }
    } catch (err: any) {
      console.error("Error creating token:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        data: err.data,
        stack: err.stack
      });

      const errorMessage = marketplace?.handleError(err) || err.message || "Failed to create token";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateInitialPrice = () => {
    if (formData.initialLiquidity.tokenAmount && formData.initialLiquidity.usdcAmount) {
      const priceInUSDC = formData.initialLiquidity.usdcAmount / formData.initialLiquidity.tokenAmount;
      return priceInUSDC.toFixed(6); // Price in USDC
    }
    return "0";
  };

  const calculateMarketCap = () => {
    const price = parseFloat(calculateInitialPrice());
    return (price * formData.maxSupply).toFixed(2);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 p-4 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to create credential tokens
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= s
                      ? "bg-brand-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-20 h-1 ml-4 ${
                      step > s ? "bg-brand-600" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 space-x-8 text-sm">
            <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>
              Select Credential
            </span>
            <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>
              Configure Token
            </span>
            <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>
              Provide Liquidity
            </span>
          </div>
        </div>

        {/* Step 1: Select and Verify Credential */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Trading Credentials</CardTitle>
              <p className="text-muted-foreground">
                Issue and verify your trading credentials to create tokens
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {TRADING_CREDENTIALS.map((credential) => {
                  const credentialStatus = getCredentialStatus(credential.platform);
                  const isIssuing = issuingCredentials.has(credential.platform);
                  const isVerifying = verifyingCredentials.has(credential.platform);
                  const canCreateToken = credentialStatus.isMinted && credentialStatus.isVerified;
                  const isSelected = selectedCredential?.id === `trading-${credential.platform.toLowerCase()}`;

                  return (
                    <div
                      key={credential.platform}
                      className={`relative border rounded-lg overflow-hidden transition-all ${
                        isSelected
                          ? "border-brand-600 bg-brand-50"
                          : "border-border hover:border-brand-400"
                      }`}
                    >
                      {/* NFT Image Header */}
                      <div className="relative h-32 bg-black/5 flex items-center justify-center overflow-hidden">
                        <img
                          src={credential.nftImage}
                          alt={credential.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            canCreateToken
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : credentialStatus.isMinted
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {canCreateToken
                              ? 'READY'
                              : credentialStatus.isMinted
                              ? 'ISSUED'
                              : 'NOT ISSUED'
                            }
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="font-bold text-foreground mb-1 flex items-center gap-2">
                            {credential.emoji} {credential.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {credential.description}
                          </p>
                        </div>

                        {/* Status Steps */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${
                              credentialStatus.isMinted ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className="text-sm">Credential Issued</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${
                              credentialStatus.isVerified ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className="text-sm">On-chain Verified</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          {!credentialStatus.isMinted ? (
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={isIssuing || isVerifying}
                              onClick={() => handleIssueCredential(credential.platform)}
                            >
                              {isIssuing ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                  </svg>
                                  Issuing...
                                </>
                              ) : (
                                'Issue Credential'
                              )}
                            </Button>
                          ) : !credentialStatus.isVerified ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              disabled={isIssuing || isVerifying}
                              onClick={() => handleVerifyCredential(credential.platform)}
                            >
                              {isVerifying ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                  </svg>
                                  Verifying...
                                </>
                              ) : (
                                'Verify On-Chain'
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className={`w-full ${
                                isSelected
                                  ? 'bg-brand-600 hover:bg-brand-700'
                                  : 'bg-brand-600 hover:bg-brand-700'
                              }`}
                              onClick={() => {
                                const credentialData = userCredentials.find(
                                  c => c.id === `trading-${credential.platform.toLowerCase()}`
                                );
                                if (credentialData) {
                                  handleCredentialSelect(credentialData);
                                }
                              }}
                            >
                              {isSelected ? 'Selected ✓' : 'Select for Token'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {validationErrors.credentialId && (
                <p className="text-sm text-red-600">{validationErrors.credentialId}</p>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedCredential}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Continue to Token Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure Token */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Token</CardTitle>
              <p className="text-muted-foreground">
                Set the parameters for your credential token
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Token Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="My Credential Token"
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        symbol: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="MCT"
                    maxLength={6}
                  />
                  {validationErrors.symbol && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.symbol}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emissionRate">
                    Emission Rate (tokens/day)
                  </Label>
                  <Input
                    id="emissionRate"
                    type="number"
                    value={formData.emissionRate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        emissionRate: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="100"
                  />
                  {validationErrors.emissionRate && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.emissionRate}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Rate at which credential holders earn tokens
                  </p>
                </div>
                <div>
                  <Label htmlFor="maxSupply">Max Supply</Label>
                  <Input
                    id="maxSupply"
                    type="number"
                    value={formData.maxSupply}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxSupply: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="1000000"
                  />
                  {validationErrors.maxSupply && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.maxSupply}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum tokens that can ever exist
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Token Economics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily emission:</span>
                    <span>{formData.emissionRate} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max supply:</span>
                    <span>{formData.maxSupply.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Time to max supply:
                    </span>
                    <span>
                      {Math.round(formData.maxSupply / formData.emissionRate)} days
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Provide Liquidity */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Provide Initial Liquidity</CardTitle>
              <p className="text-muted-foreground">
                Set up the initial AMM pool for your token
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tokenAmount">Token Amount</Label>
                  <Input
                    id="tokenAmount"
                    type="number"
                    value={formData.initialLiquidity.tokenAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        initialLiquidity: {
                          ...prev.initialLiquidity,
                          tokenAmount: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    placeholder="1000"
                  />
                  {validationErrors.tokenAmount && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.tokenAmount}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: 1,000 tokens
                  </p>
                </div>
                <div>
                  <Label htmlFor="usdcAmount">USDC Amount</Label>
                  <Input
                    id="usdcAmount"
                    type="number"
                    step="1"
                    value={formData.initialLiquidity.usdcAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        initialLiquidity: {
                          ...prev.initialLiquidity,
                          usdcAmount: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    placeholder="0.1"
                  />
                  {validationErrors.usdcAmount && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.usdcAmount}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: 10 USDC
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Initial Market Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Initial price:</span>
                    <span>${calculateInitialPrice()} per token</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Initial market cap:
                    </span>
                    <span>${calculateMarketCap()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lock period:</span>
                    <span>30 days</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-5 h-5 text-yellow-600 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-medium">
                      Important: Liquidity Lock
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Your initial liquidity will be locked for 30 days. After that,
                      it will be gradually released over the following 30 days.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  {isLoading ? (
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
                      Creating Token...
                    </>
                  ) : (
                    "Create Token & Provide Liquidity"
                  )}
                </Button>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                By creating this token, you agree to the platform terms and
                understand the risks involved in providing liquidity.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TokenCreationForm;