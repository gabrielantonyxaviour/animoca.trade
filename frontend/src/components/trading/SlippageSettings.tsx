import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertCircle } from 'lucide-react';

interface SlippageSettingsProps {
  slippageTolerance: number;
  onSlippageChange: (value: number) => void;
}

export default function SlippageSettings({
  slippageTolerance,
  onSlippageChange
}: SlippageSettingsProps) {
  const [customSlippage, setCustomSlippage] = useState(slippageTolerance.toString());
  const [isCustom, setIsCustom] = useState(false);

  const presetOptions = [0.1, 0.5, 1.0];

  const handlePresetClick = (value: number) => {
    setIsCustom(false);
    setCustomSlippage(value.toString());
    onSlippageChange(value);
  };

  const handleCustomChange = (value: string) => {
    setCustomSlippage(value);
    setIsCustom(true);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      onSlippageChange(numValue);
    }
  };

  const getWarningLevel = () => {
    const value = parseFloat(customSlippage);
    if (value < 0.1) return 'low';
    if (value > 5) return 'high';
    return 'normal';
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Transaction Settings</CardTitle>
        <CardDescription className="text-xs">
          Adjust slippage tolerance for your trades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Slippage Tolerance</Label>
          <div className="flex gap-2">
            {presetOptions.map((option) => (
              <Button
                key={option}
                variant={!isCustom && slippageTolerance === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick(option)}
                className="flex-1"
              >
                {option}%
              </Button>
            ))}
            <div className="flex-1 relative">
              <Input
                type="number"
                value={customSlippage}
                onChange={(e) => handleCustomChange(e.target.value)}
                onFocus={() => setIsCustom(true)}
                className="pr-8 h-9"
                placeholder="Custom"
                min="0"
                max="50"
                step="0.1"
              />
              <span className="absolute right-2 top-2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {getWarningLevel() === 'low' && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                Low slippage tolerance
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Your transaction may fail during high volatility
              </p>
            </div>
          </div>
        )}

        {getWarningLevel() === 'high' && (
          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                High slippage tolerance
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                You may receive significantly less tokens than expected
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Current setting:</span>
            <span className="font-medium">{slippageTolerance}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your transaction will revert if the price changes unfavorably by more than this percentage.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}