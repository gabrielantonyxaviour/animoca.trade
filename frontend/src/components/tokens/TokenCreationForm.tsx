import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AirService } from "@mocanetwork/airkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTokenFactory } from "@/hooks/contracts/useTokenContracts";
import type { CreateTokenParams } from "@/types/contracts";

interface TokenCreationFormProps {
  airService: AirService | null;
  isLoggedIn: boolean;
  userAddress: string | null;
}

const TokenCreationForm: React.FC<TokenCreationFormProps> = ({
  airService,
  isLoggedIn,
  userAddress,
}) => {
  const navigate = useNavigate();
  const { createToken, isLoading, error } = useTokenFactory(userAddress);

  const [step, setStep] = useState(1);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [userCredentials, setUserCredentials] = useState<any[]>([]);
  const [formData, setFormData] = useState<CreateTokenParams>({
    credentialId: "",
    name: "",
    symbol: "",
    emissionRate: 100,
    maxSupply: 1000000,
    initialLiquidity: {
      tokenAmount: 1000,
      ethAmount: 0.1,
    },
  });

  // Validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch user credentials from AIR SDK
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!airService || !isLoggedIn) return;

      try {
        // This would be the actual AIR SDK method to get user's credentials
        // For now, we'll use placeholder data
        const credentials = [
          {
            id: "cred_123",
            name: "Professional Developer",
            issuer: "Tech Academy",
            issuedDate: new Date("2024-01-15"),
            validated: true,
          },
          {
            id: "cred_456",
            name: "Blockchain Expert",
            issuer: "Crypto Institute",
            issuedDate: new Date("2024-03-20"),
            validated: true,
          },
        ];
        setUserCredentials(credentials);
      } catch (err) {
        console.error("Error fetching credentials:", err);
      }
    };

    fetchCredentials();
  }, [airService, isLoggedIn]);

  const handleCredentialSelect = (credential: any) => {
    setSelectedCredential(credential);
    setFormData((prev) => ({
      ...prev,
      credentialId: credential.id,
      name: `${credential.name} Token`,
      symbol: credential.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 4),
    }));
  };

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
    if (formData.initialLiquidity.ethAmount < 0.01) {
      errors.ethAmount = "Minimum ETH amount is 0.01";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const tokenAddress = await createToken(formData);
      if (tokenAddress) {
        // Show success message
        navigate("/tokens", {
          state: { message: "Token created successfully!" },
        });
      }
    } catch (err) {
      console.error("Error creating token:", err);
    }
  };

  const calculateInitialPrice = () => {
    if (formData.initialLiquidity.tokenAmount && formData.initialLiquidity.ethAmount) {
      const priceInEth = formData.initialLiquidity.ethAmount / formData.initialLiquidity.tokenAmount;
      return (priceInEth * 2500).toFixed(6); // Assuming ETH = $2500 for display
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

        {/* Step 1: Select Credential */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Credential</CardTitle>
              <p className="text-muted-foreground">
                Choose which credential you want to create a token for
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {userCredentials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You don't have any credentials yet
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/issue")}
                  >
                    Issue a Credential
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {userCredentials.map((credential) => (
                    <div
                      key={credential.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedCredential?.id === credential.id
                          ? "border-brand-600 bg-brand-50"
                          : "border-border hover:border-brand-400"
                      }`}
                      onClick={() => handleCredentialSelect(credential)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{credential.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Issued by {credential.issuer}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {credential.issuedDate.toLocaleDateString()}
                          </p>
                        </div>
                        {credential.validated && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {validationErrors.credentialId && (
                <p className="text-sm text-red-600">{validationErrors.credentialId}</p>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedCredential}
                  className="bg-brand-600 hover:bg-brand-700"
                >
                  Continue
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
                  <Label htmlFor="ethAmount">ETH Amount</Label>
                  <Input
                    id="ethAmount"
                    type="number"
                    step="0.01"
                    value={formData.initialLiquidity.ethAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        initialLiquidity: {
                          ...prev.initialLiquidity,
                          ethAmount: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    placeholder="0.1"
                  />
                  {validationErrors.ethAmount && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.ethAmount}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: 0.01 ETH
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