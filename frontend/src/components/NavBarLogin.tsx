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
      if (!airService || !isConnected || !userAddress) {
        return;
      }

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

  // Load balances when user is connected
  useEffect(() => {
    const loadBalances = async () => {
      if (isConnected && userAddress) {
        // Load USDC balance from blockchain
        if (marketplace) {
          try {
            // Try marketplace method first
            try {
              const balanceWei = await marketplace.getUSDCBalance(userAddress);
              const balance = parseFloat(marketplace.formatUSDC(balanceWei));
              setUsdcBalance(balance);
            } catch (marketplaceError) {
              console.warn("Marketplace method failed, trying direct contract call:", marketplaceError);

              // Fallback: Direct contract call
              const usdcContract = new ethers.Contract(
                '0x12D2162F47AAAe1B0591e898648605daA186D644',
                ['function balanceOf(address) view returns (uint256)'],
                marketplace.provider
              );

              const balanceWei = await usdcContract.balanceOf(userAddress);
              const balance = parseFloat(ethers.formatUnits(balanceWei, 6)); // USDC has 6 decimals
              setUsdcBalance(balance);
            }
          } catch (error) {
            console.error("Failed to load USDC balance:", error);
            setUsdcBalance(0);
          }
        } else {
          setUsdcBalance(0);
        }

        // Fetch actual MOCA balance from Moca devnet
        try {
          const balance = await mocaPublicClient.getBalance({
            address: userAddress as Address,
          });
          const balanceInEther = parseFloat(formatEther(balance));
          setMocaBalance(balanceInEther);
        } catch (error) {
          console.error("Failed to fetch MOCA balance:", error);
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
        // Try marketplace method first
        try {
          const balanceWei = await marketplace.getUSDCBalance(userAddress);
          const balance = parseFloat(marketplace.formatUSDC(balanceWei));
          setUsdcBalance(balance);
        } catch (_marketplaceError) {
          // Fallback: Direct contract call
          const usdcContract = new ethers.Contract(
            '0x12D2162F47AAAe1B0591e898648605daA186D644',
            ['function balanceOf(address) view returns (uint256)'],
            marketplace.provider
          );

          const balanceWei = await usdcContract.balanceOf(userAddress);
          const balance = parseFloat(ethers.formatUnits(balanceWei, 6)); // USDC has 6 decimals
          setUsdcBalance(balance);
        }
      } catch (error) {
        console.error("Failed to reload USDC balance:", error);
      }
    }
  };

  const handleConnect = () => {
    const airConnector = connectors.find(c => (c as Connector & AirConnectorProperties)?.isMocaNetwork);
    if (airConnector) {
      connect({ connector: airConnector });
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
              <div className="text-right">
                <div className="font-medium">
                  {usdcBalance.toFixed(0)} USDC
                </div>
                <div className="text-xs text-muted-foreground">
                  {mocaBalance.toFixed(2)} MOCA
                </div>
              </div>
              <ChevronDown className="w-3 h-3" />
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