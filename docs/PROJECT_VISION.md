# turn credentials into liquid markets - Master Vision

## What We're Building
**"The stock market for skills"** - A decentralized marketplace where digital credentials become tradeable tokens, with market forces determining the value of professional reputation and skills through automated market making (AMM) pools.

## Core Product Mechanics

### 1. Credential-Token Binding (1:1 Relationship)
- Each AIR credential can create exactly **one** associated token
- Token metadata permanently links to credential ID, issuer, and validation status
- Only credential holders can trigger token creation for their credentials

### 2. Token Creation & Initial Liquidity
- **Creator Requirement**: Token creators must provide initial liquidity to launch
- **Minimum Liquidity**: 1,000+ tokens + equivalent ETH value to create trading pool
- **Lock-up Period**: Initial liquidity locked for 30 days, then graduated release
- **AMM Pool Creation**: Automatic pool creation enables immediate trading

### 3. Verification Fee Revenue System
- **Fee Collection**: Token holders earn USDC from credential verification activities
- **Revenue Sources**: Credential minting fees, on-chain verification fees, high-value credential charges
- **Proportional Distribution**: Revenue distributed to token holders based on their percentage of total token supply
- **Real Utility**: Earnings tied to actual credential usage and verification demand

### 4. USDC-Based AMM Trading System
- **USDC Collateral**: All trading pairs use USDC as the base currency for stability
- **Pool Mechanics**: Standard x*y=k constant product formula
- **Fee Structure**: 0.3% trading fee (0.25% to LPs, 0.05% to protocol)
- **Mock USDC**: Free-mint USDC for testing and liquidity provision
- **Price Discovery**: Market forces determine credential token values in USDC terms

### 5. Reputation Scoring System
- **Price-Based Reputation**: Token price directly reflects credential reputation
- **TWAP Oracle**: Time-weighted average price calculations prevent manipulation
- **Historical Tracking**: Reputation evolution tracked over time
- **Leaderboards**: Public rankings of top-performing credentials

## Business Model & Stakeholder Value

### Credential Holders
- **Verification Revenue**: Earn USDC from credential verification activities
- **Market Participation**: Can trade tokens or provide USDC liquidity
- **Reputation Building**: Higher token prices increase credential reputation
- **Real Utility Income**: Earnings reflect actual credential demand and usage

### Token Creators
- **Initial Investment**: Must provide USDC liquidity to launch token
- **Returns**: Benefit from token appreciation and verification fee revenue
- **Reputation Exposure**: Token performance reflects credential market value

### Liquidity Providers (LPs)
- **USDC Trading Fees**: Earn 0.25% of all trading volume in USDC
- **Token Exposure**: Benefit from credential token price appreciation
- **Flexible Participation**: Add/remove USDC liquidity anytime after lock-up

### Traders/Speculators
- **Market Speculation**: Buy/sell based on credential reputation predictions
- **Arbitrage Opportunities**: Price differences across pools
- **Portfolio Diversification**: Exposure to different credential types

### Protocol
- **Sustainable Revenue**: 0.05% of all trading volume
- **Network Effects**: More credentials = more trading = more revenue
- **Ecosystem Growth**: Success drives adoption and value

## Key User Flows

### Token Creation Flow
1. **Credential Verification**: User holds valid AIR credential
2. **Token Configuration**: Set name, symbol, emission rate, max supply
3. **Liquidity Provision**: Provide 1,000+ tokens + ETH for initial pool
4. **Pool Deployment**: AMM pool created automatically
5. **Market Launch**: Token becomes tradeable, price discovery begins

### Daily User Flow (Credential Holder)
1. **Check Portfolio**: View USDC earnings from credential verification fees
2. **Collect Revenue**: Claim accumulated USDC from verification activities
3. **Market Decision**: Hold tokens, trade for USDC, or provide liquidity
4. **Monitor Reputation**: Track credential reputation scores and fee generation

### Trading Flow
1. **Browse Markets**: View credential tokens priced in USDC with reputation scores
2. **Market Analysis**: Check USDC price history, volume, liquidity depth
3. **Execute Trade**: Swap between tokens and USDC with slippage protection
4. **Portfolio Tracking**: Monitor USDC positions and P&L

### Liquidity Provider Flow
1. **Pool Selection**: Choose credential-USDC pools based on volume and fee potential
2. **Add Liquidity**: Provide credential tokens + USDC to earn LP tokens
3. **Earn USDC Fees**: Collect 0.25% of trading volume in USDC automatically
4. **Position Management**: Monitor IL risk and USDC fee earnings

## Integration with Existing AIR System

### Current AIR Infrastructure
- **Credential Issuance**: Existing flow continues unchanged
- **Credential Verification**: Used for token generation validation
- **User Authentication**: Leverages current wallet-based login
- **Partner Management**: Existing partner system for credential types

### New Token Layer
- **Extended UI**: Adds token management to existing credential flows
- **Market Interface**: New trading and analytics interfaces
- **Reputation Display**: Shows token-based reputation scores
- **Passive Generation**: Background service for token minting

### Technical Integration Points
- **AIR SDK**: Used for credential validation in smart contracts
- **Existing Routes**: New routes added to current React Router setup
- **Auth System**: Existing wallet auth extended for contract interactions
- **UI Framework**: Built on current Tailwind/React architecture

## Success Metrics

### Launch Phase (0-3 months)
- **Tokens Created**: 50+ credential tokens launched
- **Total Liquidity**: $100K+ total value locked (TVL)
- **Active Users**: 200+ monthly active users
- **Trading Volume**: $50K+ monthly volume

### Growth Phase (3-12 months)
- **Market Expansion**: 500+ tokens across diverse credential types
- **Ecosystem TVL**: $1M+ total value locked
- **User Base**: 2,000+ monthly active users
- **Trading Activity**: $500K+ monthly volume

### Maturity Phase (12+ months)
- **Market Leadership**: Premier credential reputation marketplace
- **Institutional Adoption**: Corporate credential programs using platform
- **Cross-Chain Expansion**: Multi-chain credential token support
- **Revenue Sustainability**: Protocol fees covering operational costs

## Risk Considerations & Mitigations

### Market Risks
- **Low Liquidity**: Minimum liquidity requirements and LP incentives
- **Price Manipulation**: TWAP oracles and time-based reputation scoring
- **Market Volatility**: Education on IL risk and portfolio diversification

### Technical Risks
- **Smart Contract Security**: Comprehensive audits and testing
- **Oracle Reliability**: Multiple price feed sources and validation
- **Scalability**: Layer 2 deployment for reduced costs

### Regulatory Risks
- **Token Classification**: Focus on utility rather than securities
- **Compliance**: KYC/AML integration where required
- **Jurisdiction**: Gradual rollout starting in crypto-friendly regions

## Long-term Vision

### Year 1: Foundation
- Core platform launch with basic token creation and trading
- Initial credential categories (education, skills, certifications)
- Community building and early adopter programs

### Year 2: Expansion
- Advanced features (limit orders, derivatives, governance)
- Corporate partnerships for enterprise credentials
- Cross-chain interoperability

### Year 3: Ecosystem
- Full marketplace with ratings, reviews, and social features
- AI-powered reputation analysis and predictions
- Integration with traditional credential systems (universities, employers)

This system creates a new primitive: **"The stock market for skills"** where credentials become tradeable assets, market forces determine reputation value, and real verification activity generates sustainable revenue for token holders.