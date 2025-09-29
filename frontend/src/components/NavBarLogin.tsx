import { useState, useEffect } from "react";
import { ChevronDown, Loader2, Lock, DollarSign } from "lucide-react";
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

interface NavBarLoginProps {
  isLoading: boolean;
  isInitialized: boolean;
  isLoggedIn: boolean;
  userAddress: string | null;
  onLogin: () => void;
  onLogout: () => void;
  currentEnv: string;
  setCurrentEnv: (env: string) => void;
  envOptions: { label: string; value: string }[];
}

const NavBarLogin = ({
  isLoading,
  isInitialized,
  isLoggedIn,
  userAddress,
  onLogin,
  onLogout,
  currentEnv,
  setCurrentEnv,
  envOptions,
}: NavBarLoginProps) => {
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [showMintDialog, setShowMintDialog] = useState(false);

  // Load USDC balance from localStorage when user logs in
  useEffect(() => {
    if (isLoggedIn && userAddress) {
      const storedBalance = localStorage.getItem(`usdc_balance_${userAddress}`);
      const balance = storedBalance ? parseInt(storedBalance) : 0;
      setUsdcBalance(balance);
    } else {
      setUsdcBalance(0);
    }
  }, [isLoggedIn, userAddress]);

  const handleOpenMintDialog = () => {
    setShowMintDialog(true);
  };

  const handleBalanceUpdate = (newBalance: number) => {
    setUsdcBalance(newBalance);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">initializing...</span>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div>
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
              {userAddress && (
                <span className="text-xs font-mono text-muted-foreground">
                  {formatAddress(userAddress)}
                </span>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div>
                <div className="font-medium">air wallet</div>
                <div className="text-xs text-muted-foreground">connected</div>
                {userAddress && (
                  <div className="mt-1">
                    <div className="text-xs text-muted-foreground">address:</div>
                    <div className="text-xs font-mono break-all">{userAddress}</div>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="text-xs text-muted-foreground mb-1">airkit env:</div>
              <Select value={currentEnv} onValueChange={setCurrentEnv}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {envOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="text-xs text-muted-foreground mb-2">mock USDC balance:</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{usdcBalance.toLocaleString()} USDC</span>
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <Button
                onClick={handleOpenMintDialog}
                disabled={!isLoggedIn}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-xs"
              >
                <DollarSign className="mr-1 h-3 w-3" />
                Get USDC
              </Button>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={onLogin}
          disabled={isLoading}
          className="bg-pink-600 hover:bg-pink-700 border border-pink-500/50"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              connecting...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              connect wallet
            </>
          )}
        </Button>
      )}

      {/* USDC Minting Dialog */}
      <UsdcMintDialog
        isOpen={showMintDialog}
        onClose={() => setShowMintDialog(false)}
        userAddress={userAddress}
        isLoggedIn={isLoggedIn}
        onBalanceUpdate={handleBalanceUpdate}
      />
    </div>
  );
};

export default NavBarLogin;
