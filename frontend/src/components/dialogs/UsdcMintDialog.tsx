"use client"

import { useState, useEffect, useMemo } from "react";
import { Loader2, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount, type Connector } from "wagmi";
import { ethers } from "ethers";
import { initializeMarketplace } from "@/services/credential-marketplace";
import type { AirConnector, AirConnectorProperties } from "@mocanetwork/airkit-connector";

interface UsdcMintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdate?: (newBalance: number) => void;
}

interface TransactionState {
  status: 'idle' | 'preparing' | 'pending' | 'success' | 'error';
  txHash?: string;
  error?: string;
}

const UsdcMintDialog = ({
  isOpen,
  onClose,
  onBalanceUpdate
}: UsdcMintDialogProps) => {
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

  const [mintAmount, setMintAmount] = useState("1000");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>({ status: 'idle' });
  const [marketplace, setMarketplace] = useState<any>(null);

  // Initialize marketplace service when wallet is connected
  useEffect(() => {
    const initMarketplace = async () => {
      if (!airService || !isConnected || !userAddress) {
        console.log("Marketplace init skipped:", { airService: !!airService, isConnected, userAddress });
        return;
      }

      try {
        console.log("Initializing marketplace...");
        console.log("AirService provider:", airService.provider);

        // Get provider from AirService
        const provider = new ethers.BrowserProvider(airService.provider);
        console.log("Provider created:", provider);

        const signer = await provider.getSigner();
        console.log("Signer address:", await signer.getAddress());

        // Initialize marketplace with Moca Devnet (chainId: 5151)
        const marketplaceInstance = initializeMarketplace(provider, signer, 5151);
        console.log("Marketplace initialized:", {
          usdcAddress: marketplaceInstance.contracts.USDC,
          hasSigner: !!marketplaceInstance.signer,
          chainId: marketplaceInstance.chainId
        });

        setMarketplace(marketplaceInstance);
      } catch (err) {
        console.error("Failed to initialize marketplace:", err);
        setTransaction({
          status: 'error',
          error: `Failed to connect to marketplace: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    };

    initMarketplace();
  }, [airService, isConnected, userAddress]);

  // Load current USDC balance
  useEffect(() => {
    if (isOpen && isConnected && userAddress && marketplace) {
      loadBalance();
    }
  }, [isOpen, isConnected, userAddress, marketplace]);

  const loadBalance = async () => {
    if (!marketplace || !userAddress) {
      console.log("loadBalance: Missing marketplace or userAddress", { marketplace: !!marketplace, userAddress });
      return;
    }

    setIsLoadingBalance(true);
    try {
      console.log("Loading USDC balance for:", userAddress);
      console.log("USDC Contract address: 0x12D2162F47AAAe1B0591e898648605daA186D644");
      console.log("Provider network:", await marketplace.provider.getNetwork());

      // Direct contract call to balanceOf with timeout
      const usdcContract = new ethers.Contract(
        '0x12D2162F47AAAe1B0591e898648605daA186D644',
        ['function balanceOf(address) view returns (uint256)'],
        marketplace.provider
      );

      console.log("About to call balanceOf...");

      // Retry up to 3 times with timeout
      let lastError;
      let balance = 0;

      for (let i = 0; i < 3; i++) {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Balance request timeout after 30 seconds')), 30000)
          );

          const balanceWei = await Promise.race([
            usdcContract.balanceOf(userAddress),
            timeoutPromise
          ]);

          console.log("Balance wei:", balanceWei.toString());

          balance = parseFloat(ethers.formatUnits(balanceWei, 6)); // USDC has 6 decimals
          console.log("Formatted balance:", balance);

          setCurrentBalance(balance);
          return; // Success
        } catch (err) {
          lastError = err;
          console.warn(`Balance fetch attempt ${i + 1} failed:`, err);
          if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }

      // All retries failed
      throw lastError;
    } catch (error) {
      console.error("Failed to load USDC balance:", error);
      setTransaction({
        status: 'error',
        error: `Failed to load balance: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleMint = async () => {
    if (!isConnected || !userAddress || !marketplace) {
      setTransaction({
        status: 'error',
        error: 'Please connect your wallet first'
      });
      return;
    }

    const amount = parseFloat(mintAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransaction({
        status: 'error',
        error: 'Please enter a valid amount'
      });
      return;
    }

    try {
      console.log("Starting mint process for amount:", amount);
      console.log("User address:", userAddress);
      console.log("Marketplace signer:", !!marketplace.signer);

      setTransaction({ status: 'preparing' });

      // Real blockchain transaction - mint test USDC
      console.log("Calling marketplace.mintTestUSDC...");

      let receipt;
      try {
        // Add timeout to prevent hanging (increased to 120 seconds for devnet)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout after 120 seconds')), 120000)
        );

        receipt = await Promise.race([
          marketplace.mintTestUSDC(amount),
          timeoutPromise
        ]);
        console.log("Mint receipt:", receipt);
      } catch (mintError: any) {
        console.warn("Marketplace mint failed, trying direct contract call:", mintError);

        // Fallback: Direct contract mint
        const usdcContract = new ethers.Contract(
          '0x12D2162F47AAAe1B0591e898648605daA186D644',
          ['function freeMint(address to, uint256 amount) external'],
          marketplace.signer
        );

        const amountWei = ethers.parseUnits(amount.toString(), 6); // USDC has 6 decimals
        console.log("Direct minting", amountWei.toString(), "wei to", userAddress);

        try {
          const tx = await usdcContract.freeMint(userAddress, amountWei);
          console.log("Direct mint tx:", tx.hash);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Direct mint timeout after 120 seconds')), 120000)
          );

          receipt = await Promise.race([
            tx.wait(),
            timeoutPromise
          ]);
          console.log("Direct mint receipt:", receipt);
        } catch (directError: any) {
          console.error("Direct minting also failed:", directError);
          throw directError;
        }
      }

      setTransaction({
        status: 'success',
        txHash: receipt.transactionHash
      });

      // Reload balance from blockchain
      await loadBalance();

      // Notify parent component
      onBalanceUpdate?.(currentBalance + amount);

      // Reset form
      setMintAmount("1000");

    } catch (error: any) {
      console.error("Minting failed:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack
      });

      const errorMessage = marketplace?.handleError(error) || error.message || "Transaction failed";
      setTransaction({
        status: 'error',
        error: errorMessage
      });
    }
  };

  const handleClose = () => {
    setTransaction({ status: 'idle' });
    onClose();
  };

  const isProcessing = transaction.status === 'preparing' || transaction.status === 'pending';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <img
              src="/usdc.png"
              alt="USDC"
              className="w-12 h-12 mx-auto rounded-full"
              onError={(e) => {
                // Fallback to DollarSign icon if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <DollarSign className="w-12 h-12 text-green-600 hidden mx-auto" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Get USDC
          </DialogTitle>
          <DialogDescription className="text-center">
            Mint real test USDC tokens on the blockchain for testing and development purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-red-900/20 rounded-lg p-4">
              <div className="flex items-center text-red-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">Please connect your wallet to continue</span>
              </div>
            </div>
          )}

          {/* Current Balance */}
          <div className="bg-stone-900 rounded-lg p-4">
            <Label className="text-sm font-medium text-muted-foreground">
              Current Balance
            </Label>
            <div className="flex items-center justify-between mt-2">
              {isLoadingBalance ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <span className="text-2xl font-bold">
                  {currentBalance.toLocaleString()} USDC
                </span>
              )}
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            {userAddress && (
              <p className="text-xs text-muted-foreground mt-1">
                Address: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="mintAmount" className="text-sm font-medium">
              Amount to Mint
            </Label>
            <div className="relative">
              <Input
                id="mintAmount"
                type="number"
                placeholder="Enter amount"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                disabled={isProcessing || !isConnected}
                className="pr-16"
                min="1"
                step="1"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                USDC
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {[100, 1000, 5000, 10000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setMintAmount(amount.toString())}
                  disabled={isProcessing || !isConnected}
                  className="flex-1 text-xs"
                >
                  {amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Transaction Status */}
          {transaction.status !== 'idle' && (
            <div className="bg-stone-900 rounded-lg p-4">
              {transaction.status === 'preparing' && (
                <div className="flex items-center text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Preparing transaction...</span>
                </div>
              )}

              {transaction.status === 'pending' && (
                <div className="flex items-center text-yellow-600">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Transaction pending...</span>
                </div>
              )}

              {transaction.status === 'success' && (
                <div className="space-y-2">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Transaction successful!</span>
                  </div>
                  {transaction.txHash && (
                    <p className="text-xs text-muted-foreground break-all">
                      Transaction: {transaction.txHash}
                    </p>
                  )}
                </div>
              )}

              {transaction.status === 'error' && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">{transaction.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1"
          >
            {transaction.status === 'success' ? 'Close' : 'Cancel'}
          </Button>

          {transaction.status !== 'success' && (
            <Button
              onClick={handleMint}
              disabled={isProcessing || !isConnected}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {transaction.status === 'preparing' ? 'Preparing...' : 'Minting...'}
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Mint USDC
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsdcMintDialog;