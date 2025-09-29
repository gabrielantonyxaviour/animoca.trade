"use client"

import { useState, useEffect } from "react";
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

interface UsdcMintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string | null;
  isLoggedIn: boolean;
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
  userAddress,
  isLoggedIn,
  onBalanceUpdate
}: UsdcMintDialogProps) => {
  const [mintAmount, setMintAmount] = useState("1000");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>({ status: 'idle' });

  // Mock USDC contract address (this would be the real USDC contract in production)
  const MOCK_USDC_ADDRESS = "0x1234567890123456789012345678901234567890";

  // Load current USDC balance
  useEffect(() => {
    if (isOpen && userAddress) {
      loadBalance();
    }
  }, [isOpen, userAddress]);

  const loadBalance = async () => {
    setIsLoadingBalance(true);
    try {
      // Simulate API call to get USDC balance
      // In a real implementation, this would call the contract's balanceOf function
      await new Promise(resolve => setTimeout(resolve, 500));

      // For now, use localStorage to persist mock balance
      const storedBalance = localStorage.getItem(`usdc_balance_${userAddress}`);
      const balance = storedBalance ? parseInt(storedBalance) : 0;
      setCurrentBalance(balance);
    } catch (error) {
      console.error("Failed to load USDC balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleMint = async () => {
    if (!userAddress || !isLoggedIn) return;

    const amount = parseInt(mintAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransaction({
        status: 'error',
        error: 'Please enter a valid amount'
      });
      return;
    }

    try {
      setTransaction({ status: 'preparing' });

      // Simulate transaction preparation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setTransaction({ status: 'pending' });

      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;

      // Update balance
      const newBalance = currentBalance + amount;
      setCurrentBalance(newBalance);
      localStorage.setItem(`usdc_balance_${userAddress}`, newBalance.toString());

      // Notify parent component
      onBalanceUpdate?.(newBalance);

      setTransaction({
        status: 'success',
        txHash: mockTxHash
      });

      // Reset form
      setMintAmount("1000");

    } catch (error) {
      setTransaction({
        status: 'error',
        error: error instanceof Error ? error.message : 'Transaction failed'
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
              className="w-12 h-12 mx-auto"
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
            Mint unlimited amounts of mock USDC tokens for testing and development purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Balance */}
          <div className="bg-gray-800 rounded-lg p-4">
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
                disabled={isProcessing}
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
                  disabled={isProcessing}
                  className="flex-1 text-xs"
                >
                  {amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Transaction Status */}
          {transaction.status !== 'idle' && (
            <div className="bg-gray-800 rounded-lg p-4">
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

          {/* Contract Info */}
          <div className="text-xs text-muted-foreground bg-blue-900/20 rounded p-2">
            <p className="font-medium mb-1">ℹ️ Development Notice</p>
            <p>This is a mock USDC token for development and testing purposes only.</p>
            <p className="mt-1 break-all">Mock Contract: {MOCK_USDC_ADDRESS}</p>
          </div>
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
              disabled={isProcessing || !userAddress || !isLoggedIn}
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