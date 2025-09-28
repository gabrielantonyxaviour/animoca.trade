import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Trophy, TrendingUp, TrendingDown, Medal, Crown, Award } from 'lucide-react';

interface ReputationLeaderboardProps {
  oracleAddress?: string;
}

interface LeaderboardEntry {
  rank: number;
  credentialId: string;
  tokenAddress: string;
  tokenSymbol: string;
  score: number;
  twap30d: string;
  volume24h: string;
  liquidity: string;
  change24h: number;
  holder: string;
  credentialType: string;
}

export default function ReputationLeaderboard({
  oracleAddress,
}: ReputationLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [totalCredentials, setTotalCredentials] = useState(0);

  useEffect(() => {
    if (oracleAddress) {
      loadLeaderboard();
      const interval = setInterval(loadLeaderboard, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [oracleAddress, selectedTimeframe]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);

      // Mock data for demonstration
      const mockData: LeaderboardEntry[] = [
        {
          rank: 1,
          credentialId: '0x1234...5678',
          tokenAddress: '0xabcd...ef01',
          tokenSymbol: 'MIT-CS',
          score: 950,
          twap30d: '25.50',
          volume24h: '125,432',
          liquidity: '450,000',
          change24h: 12.5,
          holder: 'MIT',
          credentialType: 'Education',
        },
        {
          rank: 2,
          credentialId: '0x2345...6789',
          tokenAddress: '0xbcde...f012',
          tokenSymbol: 'AWS-ARCH',
          score: 920,
          twap30d: '18.75',
          volume24h: '98,765',
          liquidity: '380,000',
          change24h: 8.3,
          holder: 'AWS',
          credentialType: 'Professional',
        },
        {
          rank: 3,
          credentialId: '0x3456...789a',
          tokenAddress: '0xcdef...0123',
          tokenSymbol: 'STANFORD-AI',
          score: 905,
          twap30d: '22.10',
          volume24h: '87,650',
          liquidity: '320,000',
          change24h: -2.1,
          holder: 'Stanford',
          credentialType: 'Education',
        },
        {
          rank: 4,
          credentialId: '0x4567...89ab',
          tokenAddress: '0xdef0...1234',
          tokenSymbol: 'GOOGLE-ML',
          score: 890,
          twap30d: '15.80',
          volume24h: '76,543',
          liquidity: '290,000',
          change24h: 5.6,
          holder: 'Google',
          credentialType: 'Professional',
        },
        {
          rank: 5,
          credentialId: '0x5678...9abc',
          tokenAddress: '0xef01...2345',
          tokenSymbol: 'ETH-DEV',
          score: 875,
          twap30d: '12.45',
          volume24h: '65,432',
          liquidity: '250,000',
          change24h: -1.8,
          holder: 'Ethereum Foundation',
          credentialType: 'Skills',
        },
      ];

      setLeaderboard(mockData);
      setTotalCredentials(150); // Mock total
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">+{change.toFixed(2)}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="w-4 h-4" />
          <span className="text-sm font-medium">{change.toFixed(2)}%</span>
        </div>
      );
    }
    return <span className="text-sm text-gray-500">0.00%</span>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 900) {
      return <Badge className="bg-purple-600">Elite</Badge>;
    } else if (score >= 800) {
      return <Badge className="bg-blue-600">Premium</Badge>;
    } else if (score >= 700) {
      return <Badge className="bg-green-600">Verified</Badge>;
    } else if (score >= 500) {
      return <Badge variant="secondary">Standard</Badge>;
    }
    return <Badge variant="outline">New</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <CardTitle className="text-2xl">Reputation Leaderboard</CardTitle>
              <CardDescription>
                Top performing credentials by reputation score
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedTimeframe === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('24h')}
            >
              24H
            </Button>
            <Button
              variant={selectedTimeframe === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('7d')}
            >
              7D
            </Button>
            <Button
              variant={selectedTimeframe === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('30d')}
            >
              30D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Total Credentials: <span className="font-bold">{totalCredentials}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadLeaderboard}>
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Rank</TableHead>
                  <TableHead>Credential</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">TWAP (30d)</TableHead>
                  <TableHead className="text-right">Volume (24h)</TableHead>
                  <TableHead className="text-right">Liquidity</TableHead>
                  <TableHead className="text-center">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow key={entry.credentialId} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{entry.tokenSymbol}</span>
                        <span className="text-xs text-gray-500">{entry.holder}</span>
                        <span className="text-xs text-gray-400">{entry.credentialId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.credentialType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-bold">{entry.score}</span>
                        {getScoreBadge(entry.score)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col">
                        <span className="font-semibold">${entry.twap30d}</span>
                        <span className="text-xs text-gray-500">USD</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col">
                        <span className="font-semibold">${entry.volume24h}</span>
                        <span className="text-xs text-gray-500">24h</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col">
                        <span className="font-semibold">${entry.liquidity}</span>
                        <span className="text-xs text-gray-500">Total</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getChangeIndicator(entry.change24h)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-bold text-sm mb-2">Reputation Score Formula</h4>
          <p className="text-xs text-gray-600">
            Score = log₂(TWAP) × Volume_Weight × Liquidity_Multiplier × Stability_Bonus
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <div className="text-xs">
              <span className="font-semibold">TWAP:</span> 30-day average
            </div>
            <div className="text-xs">
              <span className="font-semibold">Volume:</span> 0.5x - 2.0x
            </div>
            <div className="text-xs">
              <span className="font-semibold">Liquidity:</span> 1.0x - 1.5x
            </div>
            <div className="text-xs">
              <span className="font-semibold">Stability:</span> 0.8x - 1.3x
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}