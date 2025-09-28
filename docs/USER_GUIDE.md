# User Guide - AIR Credential Token Ecosystem

Welcome to the AIR Credential Token Ecosystem! This guide will help you understand and use all features of the platform.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Creating Your Credential Token](#creating-your-credential-token)
3. [Managing Your Token](#managing-your-token)
4. [Trading Tokens](#trading-tokens)
5. [Providing Liquidity](#providing-liquidity)
6. [Passive Token Generation](#passive-token-generation)
7. [Viewing Analytics](#viewing-analytics)
8. [FAQ](#faq)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### What You Need
- A Web3 wallet (MetaMask, WalletConnect, or Coinbase Wallet)
- Some ETH for gas fees (0.05 ETH recommended)
- An AIR credential (verified through the AIR Protocol)

### Connecting Your Wallet

1. **Visit the Platform**
   - Go to [https://app.air-credentials.com](https://app.air-credentials.com)
   - Click "Connect Wallet" in the top right corner

2. **Choose Your Wallet**
   - Select your preferred wallet provider
   - Approve the connection request in your wallet

3. **Select Network**
   - Ensure you're on the correct network (Sepolia for testing, Mainnet for production)
   - The app will prompt you to switch if needed

## Creating Your Credential Token

### Step 1: Verify Your Credential

Before creating a token, you need to verify your AIR credential:

1. Navigate to the "Create Token" page
2. Click "Verify Credential"
3. Complete the AIR verification process
4. Your verified credentials will appear in a list

### Step 2: Configure Your Token

Once your credential is verified:

1. **Select Credential**
   - Choose which credential you want to tokenize
   - Each credential can only have one token

2. **Set Token Parameters**

   | Parameter | Description | Example |
   |-----------|-------------|---------|
   | **Token Name** | Full name of your token | "Developer Excellence Token" |
   | **Token Symbol** | 3-5 character symbol | "DEVEX" |
   | **Emission Rate** | Tokens generated per day | 100 tokens/day |
   | **Max Supply** | Maximum tokens that can exist | 1,000,000 tokens |

3. **Review Gas Costs**
   - Token creation costs approximately 0.02 ETH in gas
   - Gas costs vary based on network congestion

4. **Create Token**
   - Click "Create Token"
   - Confirm the transaction in your wallet
   - Wait for confirmation (usually 15-30 seconds)

### Step 3: Token Created!

After creation, you'll see:
- Your token's contract address
- A link to view on Etherscan
- Options to manage your token

## Managing Your Token

### Dashboard Overview

Your token dashboard shows:
- **Total Supply**: Current tokens in circulation
- **Max Supply**: Maximum possible tokens
- **Emission Rate**: Daily token generation rate
- **Holders**: Number of unique token holders
- **Market Cap**: Total value if pool exists

### Adjusting Emission Rate

As the token creator, you can adjust the emission rate:

1. Go to "My Tokens" page
2. Select your token
3. Click "Settings" → "Adjust Emission"
4. Enter new rate (must be > 0)
5. Confirm transaction

> **Note**: Changes take effect immediately for new generation cycles

### Burning Tokens

To reduce supply, you can burn your own tokens:

1. Navigate to your token page
2. Click "Burn Tokens"
3. Enter amount to burn
4. Confirm transaction

Burned tokens are permanently removed from circulation.

## Trading Tokens

### Creating a Liquidity Pool

Before tokens can be traded, a liquidity pool must exist:

1. **Navigate to Pools**
   - Go to "Liquidity" → "Create Pool"
   - Select your token

2. **Set Initial Liquidity**
   - Enter token amount (e.g., 10,000 tokens)
   - Enter ETH amount (e.g., 1 ETH)
   - This sets the initial price

3. **Add Liquidity**
   - Approve token spending
   - Click "Create Pool & Add Liquidity"
   - Confirm both transactions

### Swapping Tokens

Once a pool exists, anyone can trade:

#### Buying Tokens (ETH → Token)

1. Go to "Swap" page
2. Select "ETH" as input
3. Select your token as output
4. Enter ETH amount
5. Review exchange rate and slippage
6. Click "Swap" and confirm

#### Selling Tokens (Token → ETH)

1. Go to "Swap" page
2. Select your token as input
3. Select "ETH" as output
4. Enter token amount
5. Review exchange rate and slippage
6. Click "Swap" and confirm

### Understanding Slippage

- **Slippage**: Price change during transaction
- **Default**: 0.5% slippage tolerance
- **Adjustable**: Click settings icon to change
- **High Volume**: May require higher slippage

## Providing Liquidity

### Why Provide Liquidity?

Liquidity providers earn:
- 0.3% fee on all trades
- Proportional to your pool share
- Paid in both tokens

### Adding Liquidity

1. **Navigate to Pool**
   - Go to "Liquidity" → "My Positions"
   - Select pool or create new position

2. **Calculate Amounts**
   - Enter one token amount
   - Other amount auto-calculates
   - Maintains pool ratio

3. **Add Liquidity**
   - Approve both tokens
   - Click "Add Liquidity"
   - Receive LP tokens

### Removing Liquidity

1. Go to "My Positions"
2. Select position to remove
3. Choose percentage (25%, 50%, 75%, 100%)
4. Click "Remove Liquidity"
5. Receive both tokens back

### Impermanent Loss

> **Warning**: Providing liquidity carries risk of impermanent loss when token prices change relative to each other.

## Passive Token Generation

### How It Works

Credential holders earn tokens passively based on:
- Base emission rate
- Reputation multiplier
- Time since last claim

### Registering for Generation

1. **Navigate to Rewards**
   - Go to "Rewards" → "Passive Generation"

2. **Select Credential**
   - Choose your verified credential
   - View emission rate and multipliers

3. **Register**
   - Click "Register for Generation"
   - Confirm transaction
   - Generation starts immediately

### Claiming Rewards

1. **Check Accumulated Tokens**
   - Visit "Rewards" page
   - See pending tokens for each credential

2. **Claim Tokens**
   - Click "Claim All" or claim individually
   - Confirm transaction
   - Tokens sent to your wallet

3. **Claiming Rules**
   - Minimum 24 hours between claims
   - Maximum 30 days accumulation
   - Unclaimed tokens after 30 days are forfeited

### Reputation Multipliers

Your reputation affects generation rate:

| Reputation Score | Multiplier | Example (100 tokens/day base) |
|-----------------|------------|--------------------------------|
| 0-25% | 0.5x | 50 tokens/day |
| 26-50% | 1.0x | 100 tokens/day |
| 51-75% | 1.5x | 150 tokens/day |
| 76-100% | 2.0x | 200 tokens/day |

## Viewing Analytics

### Token Analytics

View comprehensive token metrics:

1. **Price Chart**
   - Historical price data
   - Volume indicators
   - Moving averages

2. **Supply Metrics**
   - Circulating supply
   - Total supply
   - Burn history

3. **Holder Analytics**
   - Number of holders
   - Distribution chart
   - Top holders list

### Pool Analytics

Monitor pool performance:

1. **Liquidity Depth**
   - Total value locked (TVL)
   - Reserve ratios
   - Liquidity changes

2. **Volume Metrics**
   - 24h volume
   - 7d volume
   - Fee generation

3. **Transaction History**
   - Recent swaps
   - Liquidity events
   - Large transactions

### Personal Analytics

Track your portfolio:

1. **Token Balances**
   - All held tokens
   - USD values
   - 24h changes

2. **Liquidity Positions**
   - Pool shares
   - Earned fees
   - Impermanent loss

3. **Generation Stats**
   - Total earned
   - Daily rate
   - Claim history

## FAQ

### General Questions

**Q: How many tokens can I create?**
A: One token per credential. Each credential can only be tokenized once.

**Q: Can I delete my token?**
A: No, tokens are permanent once created. You can burn supply but not delete the contract.

**Q: What happens if I lose my credential?**
A: Your tokens remain in your wallet, but you cannot claim new generation rewards.

### Trading Questions

**Q: Why can't I trade my token?**
A: A liquidity pool must exist first. Someone needs to create a pool and add liquidity.

**Q: What determines token price?**
A: Price is determined by the ratio of tokens to ETH in the liquidity pool.

**Q: Can I set a fixed price?**
A: No, prices are determined by automated market maker (AMM) mechanics.

### Generation Questions

**Q: When do rewards start accumulating?**
A: Immediately after registration, calculated per second.

**Q: Can I change my emission rate?**
A: Yes, if you're the token creator, you can adjust the rate anytime.

**Q: What if I don't claim for months?**
A: Rewards cap at 30 days. Claim regularly to maximize earnings.

## Troubleshooting

### Common Issues

#### "Transaction Failed"
- Check you have enough ETH for gas
- Increase gas limit in wallet settings
- Try again during lower network congestion

#### "Insufficient Balance"
- Ensure you have enough tokens
- Check for pending transactions
- Refresh the page

#### "Cannot Connect Wallet"
- Check wallet is unlocked
- Ensure correct network selected
- Try different browser or wallet

#### "Token Not Showing"
- Add token to wallet manually using contract address
- Check transaction confirmed on Etherscan
- Wait for indexing (up to 5 minutes)

### Getting Help

If you encounter issues:

1. **Check Documentation**
   - Review this guide
   - Check technical documentation
   - Read announcement channel

2. **Community Support**
   - Discord: [discord.gg/aircredentials](https://discord.gg/aircredentials)
   - Telegram: [t.me/aircredentials](https://t.me/aircredentials)
   - Twitter: [@aircredentials](https://twitter.com/aircredentials)

3. **Technical Support**
   - Email: support@air-credentials.com
   - GitHub Issues: For bug reports
   - Include transaction hash for faster resolution

## Security Best Practices

### Wallet Security
- Never share your private key or seed phrase
- Use hardware wallets for large amounts
- Verify transaction details before confirming

### Trading Safety
- Start with small amounts
- Check slippage settings
- Verify pool liquidity before large trades

### Smart Contract Interaction
- Only interact with verified contracts
- Check Etherscan verification
- Be cautious of phishing sites

## Advanced Features

### API Access

Developers can access token data via API:

```javascript
// Fetch token data
const response = await fetch('https://api.air-credentials.com/tokens/{address}');
const tokenData = await response.json();

// Subscribe to events
const ws = new WebSocket('wss://api.air-credentials.com/events');
ws.on('message', (event) => {
  console.log('New event:', event);
});
```

### Contract Integration

Integrate tokens in your smart contracts:

```solidity
import "./interfaces/ICredentialToken.sol";

contract YourContract {
    ICredentialToken public credToken;

    function useToken(address tokenAddress) external {
        credToken = ICredentialToken(tokenAddress);
        uint256 balance = credToken.balanceOf(msg.sender);
        // Your logic here
    }
}
```

## Glossary

| Term | Definition |
|------|------------|
| **AMM** | Automated Market Maker - Algorithm for token pricing |
| **LP Token** | Liquidity Provider token - Represents pool share |
| **Slippage** | Price change during transaction execution |
| **TVL** | Total Value Locked - Total assets in protocol |
| **Emission Rate** | Rate of new token generation |
| **Impermanent Loss** | Temporary loss from providing liquidity |
| **Gas** | Transaction fee on Ethereum network |
| **Credential** | Verified achievement or qualification via AIR |

## Updates and Roadmap

### Recent Updates
- v1.0.0: Initial launch with core features
- v1.1.0: Added reputation multipliers
- v1.2.0: Improved analytics dashboard

### Coming Soon
- Mobile app (Q2 2024)
- Cross-chain support (Q3 2024)
- Governance features (Q4 2024)
- Staking rewards (Q1 2025)

Stay updated:
- Blog: [blog.air-credentials.com](https://blog.air-credentials.com)
- Newsletter: Subscribe on homepage
- Announcements: Discord and Telegram

---

Thank you for using the AIR Credential Token Ecosystem! We're constantly improving based on your feedback.