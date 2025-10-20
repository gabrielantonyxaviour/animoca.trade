import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Loader2, Lock, DollarSign } from "lucide-react";
import { createPublicClient, http, formatEther, type Address } from "viem";
import { useConnect, useAccount, useDisconnect, type Connector } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UsdcMintDialog from "@/components/dialogs/UsdcMintDialog";
import type { AirConnector, AirConnectorProperties } from "@mocanetwork/airkit-connector";
import { mocaDevnet } from "@/config/wagmi";
import { ethers } from "ethers";
import { initializeMarketplace } from "@/services/credential-marketplace";

// Create public client for Moca devnet
const mocaPublicClient = createPublicClient({
  chain: mocaDevnet,
  transport: http(),
});

const NavBarLogin = () => {
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [mocaBalance, setMocaBalance] = useState(0);
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [currentEnv, setCurrentEnv] = useState("sandbox");
  const [marketplace, setMarketplace] = useState<ReturnType<typeof initializeMarketplace> | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address: userAddress, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();

  // Check if connected wallet is AirKit wallet
  const isAirWalletConnector = (connector as Connector & AirConnectorProperties)?.isMocaNetwork;

  const airConnector = useMemo<AirConnector | null>(() => {
    if (isAirWalletConnector && connector) {
      return connector as AirConnector;
    }
    return null;
  }, [connector, isAirWalletConnector]);

  const airService = airConnector?.airService;

  // Initialize marketplace service when wallet is connected
  useEffect(() => {
    const initMarketplace = async () => {
      console.log("=== initMarketplace called ===");
      console.log("airService:", !!airService);
      console.log("isConnected:", isConnected);
      console.log("userAddress:", userAddress);

      if (!airService || !isConnected || !userAddress) {
        console.warn("⚠️ Missing requirements for marketplace init");
        return;
      }

      try {
        console.log("🔧 Initializing marketplace...");

        // Get provider from AirService
        const provider = new ethers.BrowserProvider(airService.provider);
        console.log("✅ Provider created");

        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        console.log("✅ Signer address:", signerAddress);

        // Initialize marketplace with Moca Devnet (chainId: 5151)
        const marketplaceInstance = initializeMarketplace(provider, signer, 5151);
        console.log("✅ Marketplace initialized with contracts:", {
          USDC: marketplaceInstance.contracts.USDC,
          FACTORY: marketplaceInstance.contracts.FACTORY,
          FEE_COLLECTOR: marketplaceInstance.contracts.FEE_COLLECTOR,
          AMM: marketplaceInstance.contracts.AMM
        });

        setMarketplace(marketplaceInstance);
      } catch (err) {
        console.error("💥 Failed to initialize marketplace:", err);
      }
    };

    initMarketplace();
  }, [airService, isConnected, userAddress]);

  // Load balances when user is connected
  useEffect(() => {
    const loadBalances = async () => {
      console.log("=== loadBalances called ===");
      console.log("isConnected:", isConnected);
      console.log("userAddress:", userAddress);
      console.log("marketplace:", !!marketplace);

      if (isConnected && userAddress) {
        // Load USDC balance from blockchain
        if (marketplace) {
          setIsLoadingBalance(true);
          try {
            console.log("🔍 Loading USDC balance for:", userAddress);
            console.log("📍 USDC Contract:", '0x12D2162F47AAAe1B0591e898648605daA186D644');
            console.log("🌐 Provider network:", await marketplace.provider.getNetwork());

            // Try marketplace method first with retry
            try {
              console.log("⏳ Attempting marketplace.getUSDCBalance...");
              const balanceWei = await marketplace.getUSDCBalance(userAddress);
              console.log("✅ Balance Wei from marketplace:", balanceWei.toString());
              const balance = parseFloat(marketplace.formatUSDC(balanceWei));
              console.log("✅ USDC balance loaded:", balance);
              setUsdcBalance(balance);
            } catch (marketplaceError) {
              console.error("❌ Marketplace method failed:", marketplaceError);

              // Fallback: Direct contract call with retry
              const usdcContract = new ethers.Contract(
                '0x12D2162F47AAAe1B0591e898648605daA186D644',
                ['function balanceOf(address) view returns (uint256)'],
                marketplace.provider
              );

              console.log("🔄 Trying direct contract call with retries...");

              // Retry up to 3 times with delays
              let lastError;
              for (let i = 0; i < 3; i++) {
                try {
                  console.log(`⏳ Direct balance fetch attempt ${i + 1}/3...`);
                  const startTime = Date.now();
                  const balanceWei = await usdcContract.balanceOf(userAddress);
                  const endTime = Date.now();
                  console.log(`⏱️ Balance fetch took ${endTime - startTime}ms`);
                  console.log("✅ Balance Wei (direct):", balanceWei.toString());

                  const balance = parseFloat(ethers.formatUnits(balanceWei, 6)); // USDC has 6 decimals
                  console.log("✅ USDC balance loaded (direct):", balance);
                  setUsdcBalance(balance);
                  return; // Success, exit retry loop
                } catch (err) {
                  lastError = err;
                  console.error(`❌ Balance fetch attempt ${i + 1} failed:`, err);
                  if (i < 2) {
                    console.log(`⏳ Waiting 1s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                  }
                }
              }
              console.error("❌ All retries failed");
              throw lastError; // All retries failed
            }
          } catch (error) {
            console.error("💥 Failed to load USDC balance after all attempts:", error);
            console.error("Error details:", {
              message: error instanceof Error ? error.message : 'Unknown error',
              code: (error as any)?.code,
              data: (error as any)?.data
            });
            setUsdcBalance(0);
          } finally {
            setIsLoadingBalance(false);
          }
        } else {
          console.warn("⚠️ Marketplace not initialized yet");
          setUsdcBalance(0);
          setIsLoadingBalance(false);
        }

        // Fetch actual MOCA balance from Moca devnet
        try {
          console.log("🔍 Loading MOCA balance...");
          const balance = await mocaPublicClient.getBalance({
            address: userAddress as Address,
          });
          const balanceInEther = parseFloat(formatEther(balance));
          console.log("✅ MOCA balance loaded:", balanceInEther);
          setMocaBalance(balanceInEther);
        } catch (error) {
          console.error("❌ Failed to fetch MOCA balance:", error);
          setMocaBalance(0);
        }
      } else {
        setUsdcBalance(0);
        setMocaBalance(0);
      }
    };

    loadBalances();
  }, [isConnected, userAddress, marketplace]);

  const handleBalanceUpdate = async () => {
    // Reload USDC balance from blockchain after minting
    if (isConnected && userAddress && marketplace) {
      try {
        console.log("Reloading USDC balance after update...");

        // Try marketplace method first
        try {
          const balanceWei = await marketplace.getUSDCBalance(userAddress);
          const balance = parseFloat(marketplace.formatUSDC(balanceWei));
          console.log("Balance updated:", balance);
          setUsdcBalance(balance);
        } catch (_marketplaceError) {
          console.warn("Marketplace method failed, trying direct contract call");

          // Fallback: Direct contract call with retry
          const usdcContract = new ethers.Contract(
            '0x12D2162F47AAAe1B0591e898648605daA186D644',
            ['function balanceOf(address) view returns (uint256)'],
            marketplace.provider
          );

          // Retry up to 3 times
          let lastError;
          for (let i = 0; i < 3; i++) {
            try {
              const balanceWei = await usdcContract.balanceOf(userAddress);
              const balance = parseFloat(ethers.formatUnits(balanceWei, 6)); // USDC has 6 decimals
              console.log("Balance updated (direct):", balance);
              setUsdcBalance(balance);
              return; // Success
            } catch (err) {
              lastError = err;
              console.warn(`Balance update attempt ${i + 1} failed:`, err);
              if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          throw lastError;
        }
      } catch (error) {
        console.error("Failed to reload USDC balance after retries:", error);
      }
    }
  };

  const handleConnect = async () => {
    const airConnector = connectors.find(c => (c as Connector & AirConnectorProperties)?.isMocaNetwork);
    if (airConnector) {
      try {
        console.log("🔌 Attempting to connect with AirKit...");
        console.log("Partner ID:", import.meta.env.VITE_ISSUER_PARTNER_ID);
        console.log("Build Env:", "sandbox");
        await connect({ connector: airConnector });
      } catch (error) {
        console.error("💥 Connection failed:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Connection failed: ${errorMessage}\n\nThis usually means:\n1. Partner ID token has been revoked\n2. Partner ID is invalid\n3. AirKit service is not initialized\n\nCurrent Partner ID: ${import.meta.env.VITE_ISSUER_PARTNER_ID || 'Not set'}\n\nPlease check your .env file and verify your partner ID is valid.`);
      }
    } else {
      console.error("❌ AirKit connector not found");
      alert("AirKit connector not found. Please check your wallet configuration.");
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const envOptions = [
    { label: "sandbox", value: "sandbox" },
    { label: "staging", value: "staging" },
  ];

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-4">
        {/* Environment Selector */}
        <Select value={currentEnv} onValueChange={setCurrentEnv}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {envOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Connect Button */}
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="h-8 px-3 text-xs bg-pink-600 hover:bg-pink-700"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Connecting...
            </>
          ) : (
            "Connect Wallet"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Environment Selector */}
      <Select value={currentEnv} onValueChange={setCurrentEnv}>
        <SelectTrigger className="w-[100px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {envOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Balance Display & Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-8 px-3 text-xs">
            <div className="flex items-center space-x-2">
              {isLoadingBalance ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </>
              ) : (
                <>
                  <div className="text-right">
                    <div className="font-medium">
                      {usdcBalance.toFixed(2)} USDC
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mocaBalance.toFixed(4)} MOCA
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="text-xs">
            Wallet Details
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Wallet Address */}
          <DropdownMenuItem className="flex-col items-start p-3">
            <div className="text-xs text-muted-foreground mb-1">Address</div>
            <div className="font-mono text-xs">
              {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Not connected'}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Balances */}
          <DropdownMenuItem className="flex-col items-start p-3">
            <div className="text-xs text-muted-foreground mb-2">Balances</div>
            <div className="space-y-1 w-full">
              <div className="flex justify-between items-center">
                <span className="text-xs">USDC</span>
                <span className="text-xs font-medium">{usdcBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">MOCA</span>
                <span className="text-xs font-medium">{mocaBalance.toFixed(4)}</span>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem
            onClick={() => setShowMintDialog(true)}
            className="cursor-pointer p-3"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            <span className="text-xs">Get Test USDC</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={async () => {
              console.log("🔄 Manual balance refresh triggered");
              if (isConnected && userAddress && marketplace) {
                setIsLoadingBalance(true);
                try {
                  // Direct test call
                  const usdcContract = new ethers.Contract(
                    '0x12D2162F47AAAe1B0591e898648605daA186D644',
                    ['function balanceOf(address) view returns (uint256)'],
                    marketplace.provider
                  );
                  console.log("Calling balanceOf for:", userAddress);
                  const balanceWei = await usdcContract.balanceOf(userAddress);
                  console.log("Balance wei:", balanceWei.toString());
                  const balance = parseFloat(ethers.formatUnits(balanceWei, 6));
                  console.log("Formatted balance:", balance);
                  setUsdcBalance(balance);
                } catch (err) {
                  console.error("Manual refresh failed:", err);
                } finally {
                  setIsLoadingBalance(false);
                }
              }
            }}
            className="cursor-pointer p-3"
          >
            <Loader2 className="w-4 h-4 mr-2" />
            <span className="text-xs">Refresh Balance (Debug)</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleDisconnect}
            className="cursor-pointer p-3 text-red-600 hover:text-red-700"
          >
            <Lock className="w-4 h-4 mr-2" />
            <span className="text-xs">Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* USDC Minting Dialog */}
      <UsdcMintDialog
        isOpen={showMintDialog}
        onClose={() => setShowMintDialog(false)}
        onBalanceUpdate={handleBalanceUpdate}
      />
    </div>
  );
};

export default NavBarLogin;