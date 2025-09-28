# Token Economics & Mechanics

## Core Economic Model

### Token Generation Mechanics

#### Emission Rate Formula
```
Daily Emission = Base Rate × Credential Multiplier × Time Decay × Anti-Inflation Factor

Where:
- Base Rate: 10 tokens/day (standard rate)
- Credential Multiplier: 1x - 5x (based on credential type/rarity)
- Time Decay: Reduces by 1% monthly to prevent infinite inflation
- Anti-Inflation Factor: Market-based adjustment (0.8x - 1.2x)
```

#### Credential Type Multipliers
```
Education Credentials:
- High School Diploma: 1.0x
- Bachelor's Degree: 1.5x
- Master's Degree: 2.0x
- PhD/Doctorate: 3.0x

Professional Certifications:
- Basic Certification: 1.2x
- Advanced Certification: 1.8x
- Expert Certification: 2.5x
- Industry Leadership: 4.0x

Skills & Achievements:
- Basic Skill Badge: 0.8x
- Intermediate Skill: 1.2x
- Advanced Skill: 1.8x
- Master Level: 2.5x

Rare/Unique Credentials:
- Competition Winners: 3.5x
- Industry Awards: 4.5x
- Patent Holders: 5.0x
```

#### Supply Control Mechanisms
```
Maximum Supply Caps:
- Per Token: 1,000,000 - 10,000,000 tokens (set at creation)
- Global Cap: No global limit (market-determined)

Decay Schedule:
- Month 1-12: Full emission rate
- Month 13-24: 99% of previous rate
- Month 25-36: 98% of previous rate
- Continues decreasing by 1% monthly

Burning Mechanisms:
- Transaction fees: 0.01% of trading volume burned
- Inactive credentials: Tokens stop generating after 90 days inactivity
- Voluntary burning: Token holders can burn tokens to increase scarcity
```

### AMM Pool Economics

#### Trading Fee Structure
```
Total Trading Fee: 0.30% per trade

Distribution:
- Liquidity Providers: 0.25% (83.3%)
- Protocol Treasury: 0.05% (16.7%)

Fee Calculation Example:
$1000 trade → $3.00 total fees
- LPs receive: $2.50
- Protocol receives: $0.50
```

#### Liquidity Provision Requirements

##### Initial Liquidity (Token Creation)
```
Minimum Requirements:
- Token Amount: 1,000 tokens minimum
- ETH Value: Equivalent to 1,000 tokens at $0.10 minimum ($100)
- Lock Period: 30 days (cannot withdraw)
- Gradual Release: 25% per week after lock-up expires

Example Launch:
Token Price Target: $0.50
- Provide: 2,000 tokens + 1 ETH ($2000)
- Creates pool with $1,000 tokens value + $1,000 ETH
- Initial price: $0.50 per token
```

##### Ongoing Liquidity Provision
```
Requirements:
- Minimum: $50 worth of each token
- Impermanent Loss Warning: Clearly disclosed
- Fee APR: Displayed dynamically based on volume

LP Token Mechanics:
- ERC-20 LP tokens representing pool share
- Proportional ownership of pool reserves
- Automatic fee compounding
- Transferable/tradeable LP positions
```

#### Price Discovery Mechanism
```
Constant Product Formula: x × y = k

Where:
- x = Token reserves in pool
- y = ETH reserves in pool
- k = Constant product

Price Calculation:
Price = ETH_reserves / Token_reserves

Example:
Pool has 1,000 tokens and 0.5 ETH
Price = 0.5 ETH / 1,000 tokens = 0.0005 ETH per token
```

### Reputation Scoring System

#### TWAP-Based Reputation Formula
```
Reputation Score = log₂(TWAP_30d) × Volume_Weight × Liquidity_Multiplier × Stability_Bonus

Components:
1. TWAP_30d: 30-day time-weighted average price
2. Volume_Weight: Based on trading activity (0.5x - 2.0x)
3. Liquidity_Multiplier: Pool depth bonus (1.0x - 1.5x)
4. Stability_Bonus: Low volatility reward (1.0x - 1.3x)
```

#### Volume Weight Calculation
```
24h Trading Volume Tiers:
- $0 - $100: 0.5x multiplier
- $100 - $500: 0.7x multiplier
- $500 - $1,000: 0.9x multiplier
- $1,000 - $5,000: 1.1x multiplier
- $5,000 - $10,000: 1.3x multiplier
- $10,000+: 1.5x multiplier

High Volume Bonus:
- Sustained high volume (7+ days): +0.2x
- Very high volume ($25,000+ daily): +0.5x
```

#### Liquidity Depth Multiplier
```
Total Pool Liquidity:
- $100 - $500: 1.0x (base)
- $500 - $1,000: 1.05x
- $1,000 - $5,000: 1.1x
- $5,000 - $10,000: 1.2x
- $10,000 - $25,000: 1.3x
- $25,000+: 1.5x

Deep Liquidity Bonus:
- $50,000+ pools: Additional +0.1x
- $100,000+ pools: Additional +0.2x
```

#### Stability Bonus System
```
Volatility Measurement (30-day):
- Standard deviation of daily price changes

Stability Tiers:
- Very High Volatility (>50% daily): 0.8x penalty
- High Volatility (25-50% daily): 0.9x penalty
- Medium Volatility (10-25% daily): 1.0x (neutral)
- Low Volatility (5-10% daily): 1.1x bonus
- Very Low Volatility (<5% daily): 1.2x bonus

Sustained Stability Bonus:
- 30+ days of low volatility: +0.1x
- 90+ days of low volatility: +0.2x
```

### Economic Incentive Alignment

#### Stakeholder Value Flows

##### Credential Holders
```
Revenue Streams:
1. Passive Token Generation: 10-50 tokens/day (based on multipliers)
2. Token Appreciation: Benefit from reputation growth
3. Liquidity Provision: Optional LP fees if providing liquidity

Expected Returns:
- Conservative: $5-20/month per credential
- Moderate: $20-100/month per credential
- High-value credentials: $100-500/month per credential

Risks:
- Credential revocation/expiration stops generation
- Token price decline reduces value
- Market manipulation attempts
```

##### Token Creators
```
Investment Requirements:
- Initial liquidity: $100-$2,000 minimum
- Gas costs: $50-200 for deployment
- Time investment: Setup and promotion

Revenue Opportunities:
1. Token appreciation if reputation grows
2. Creator fee potential (optional 0.1% on trades)
3. First-mover advantage in credential category

Risks:
- Impermanent loss from LP position
- Low adoption/trading volume
- Reputation damage if credential questioned
```

##### Liquidity Providers
```
Revenue Model:
- Trading fees: 0.25% of all volume
- Potential token appreciation
- LP incentive programs (planned)

Expected Returns:
- Low volume pools: 5-15% APR
- Medium volume pools: 15-30% APR
- High volume pools: 30-60% APR

Risks:
- Impermanent loss from price divergence
- Smart contract risks
- Pool abandonment risk
```

##### Traders/Speculators
```
Opportunities:
1. Credential reputation speculation
2. Arbitrage between pools
3. Market inefficiency exploitation
4. Portfolio diversification across credential types

Strategies:
- Long-term: Hold tokens of growing reputation credentials
- Short-term: Trade on news/events affecting credential value
- Arbitrage: Price differences across markets
- Portfolio: Diversified credential exposure

Risks:
- High volatility and potential losses
- Limited liquidity in some pools
- Regulatory uncertainty
```

##### Protocol
```
Revenue Sources:
1. Trading fees: 0.05% of all volume
2. Token creation fees: $10-50 per token
3. Premium features: Analytics, alerts, etc.

Sustainability Model:
Target: $100K+ monthly volume for sustainability
- $100K volume × 0.05% = $50/month protocol fees
- Need: $2M+ monthly volume for meaningful revenue
- Growth target: $10M+ monthly volume within 12 months

Use of Funds:
- Development: 40%
- Security audits: 20%
- Marketing/partnerships: 25%
- Operations: 15%
```

### Market Dynamics & Game Theory

#### Equilibrium Mechanisms

##### Supply-Demand Balance
```
Supply Factors (Increase Tokens):
+ Passive generation continues
+ New credential holders join
+ Credential types expand

Demand Factors (Absorb Tokens):
+ Trading volume increases
+ Speculation on reputation growth
+ Utility features development
+ Cross-platform integrations

Balancing Mechanisms:
- Emission decay over time
- Fee burning reduces supply
- Natural market price discovery
```

##### Anti-Gaming Measures
```
Sybil Attack Prevention:
- AIR credential validation required
- Minimum holding periods for generation
- Rate limiting on claims

Market Manipulation Prevention:
- TWAP reduces flash loan impact
- Minimum liquidity requirements
- Volume-weighted reputation scoring

Quality Control:
- Credential verification standards
- Community reporting mechanisms
- Reputation score validation
```

#### Long-term Economic Sustainability

##### Network Effects
```
Growth Flywheel:
1. More credentials → More tokens → More trading
2. More trading → Higher fees → Better liquidity
3. Better liquidity → More traders → Higher prices
4. Higher prices → More credential value → More participants

Critical Mass Targets:
- 100+ active tokens for initial market
- 1,000+ tokens for sustainable ecosystem
- 10,000+ tokens for mature market
```

##### Revenue Projections
```
Conservative Scenario (Year 1):
- 500 tokens created × $25 avg creation fee = $12,500
- $500K monthly volume × 0.05% × 12 months = $3,000
- Total: $15,500 annual revenue

Moderate Scenario (Year 2):
- 2,000 tokens × $25 = $50,000
- $2M monthly volume × 0.05% × 12 = $12,000
- Total: $62,000 annual revenue

Optimistic Scenario (Year 3):
- 5,000 tokens × $25 = $125,000
- $10M monthly volume × 0.05% × 12 = $60,000
- Total: $185,000 annual revenue
```

This economic model creates sustainable incentives for all participants while maintaining healthy market dynamics and preventing manipulation or exploitation of the system.