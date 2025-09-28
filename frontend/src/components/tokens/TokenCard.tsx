import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatEther } from "viem";

interface TokenCardProps {
  token: {
    address: string;
    credentialId: string;
    name: string;
    symbol: string;
    balance?: bigint;
    totalSupply?: bigint;
    emissionRate?: number;
    currentPrice?: number;
    marketCap?: number;
    volume24h?: number;
    reputationScore?: number;
  };
  onClick?: () => void;
  showBalance?: boolean;
  showPrice?: boolean;
  showActions?: boolean;
}

export const TokenCard: React.FC<TokenCardProps> = ({
  token,
  onClick,
  showBalance = true,
  showPrice = true,
  showActions = false,
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatBalance = (balance: bigint) => {
    const formatted = formatEther(balance);
    const num = parseFloat(formatted);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(4);
  };

  return (
    <Card
      className={`border-border bg-card transition-all duration-200 ${
        onClick ? "hover:shadow-lg cursor-pointer hover:border-brand-600" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{token.name}</h3>
            <p className="text-sm text-muted-foreground">{token.symbol}</p>
          </div>
          {token.reputationScore && (
            <div className="flex items-center space-x-1">
              <svg
                className="w-4 h-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium">{token.reputationScore.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showBalance && token.balance !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <span className="text-sm font-semibold text-foreground">
              {formatBalance(token.balance)} {token.symbol}
            </span>
          </div>
        )}

        {showPrice && (
          <>
            {token.currentPrice !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-sm font-medium text-foreground">
                  ${token.currentPrice.toFixed(4)}
                </span>
              </div>
            )}
            {token.marketCap !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Market Cap</span>
                <span className="text-sm font-medium text-foreground">
                  ${formatNumber(token.marketCap)}
                </span>
              </div>
            )}
            {token.volume24h !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">24h Volume</span>
                <span className="text-sm font-medium text-foreground">
                  ${formatNumber(token.volume24h)}
                </span>
              </div>
            )}
          </>
        )}

        {token.emissionRate !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Emission Rate</span>
            <span className="text-sm font-medium text-foreground">
              {token.emissionRate} tokens/day
            </span>
          </div>
        )}

        {token.totalSupply !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Supply</span>
            <span className="text-sm font-medium text-foreground">
              {formatBalance(token.totalSupply)} {token.symbol}
            </span>
          </div>
        )}

        {showActions && (
          <div className="pt-2 flex gap-2">
            <button className="flex-1 px-3 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors text-sm font-medium">
              Trade
            </button>
            <button className="flex-1 px-3 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors text-sm font-medium">
              Add Liquidity
            </button>
          </div>
        )}

        <div className="pt-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="truncate">Credential ID: {token.credentialId.slice(0, 16)}...</span>
            <button
              className="ml-1 p-1 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(token.credentialId);
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenCard;