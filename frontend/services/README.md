# Backend Services - Credential Token Ecosystem

This directory contains all backend services that support the credential token ecosystem.

## Service Architecture

Each service is designed to be independently deployable and scalable, with clear API boundaries and data contracts.

## Services Overview

### Price Oracle Service (`price-oracle/`)
**Session 7 Responsibility**

Real-time price feed aggregation and TWAP calculations.

**Features**:
- Pool price data collection from smart contracts
- Time-weighted average price (TWAP) calculations
- Historical price data storage and retrieval
- WebSocket streaming for real-time price feeds

**API Endpoints**:
- `GET /api/prices/:tokenAddress` - Current token price
- `GET /api/twap/:tokenAddress/:window` - TWAP for time window
- `WS /ws/prices` - Real-time price stream

### Analytics Engine (`analytics-engine/`)
**Session 7 Responsibility**

Market data processing and analytics generation.

**Features**:
- Trading volume aggregation and analysis
- Liquidity metrics calculation
- Token and credential ranking systems
- Market trend analysis and insights

**API Endpoints**:
- `GET /api/analytics/overview` - Market overview data
- `GET /api/analytics/tokens/rankings` - Token rankings
- `GET /api/analytics/volume/:tokenAddress` - Volume analytics
- `GraphQL /graphql` - Complex analytical queries

### Token Generator Service (`token-generator/`)
**Session 6 Responsibility**

Passive token generation and credential validation.

**Features**:
- Continuous monitoring of credential statuses via AIR API
- Emission rate calculations based on credential metadata
- Automated token minting to credential holders
- Background job processing and scheduling

**API Endpoints**:
- `POST /api/generate/claim/:credentialId` - Manual token claiming
- `GET /api/generate/claimable/:address` - Get claimable tokens
- `GET /api/generate/stats` - Generation statistics

### Notification Service (`notification-service/`)
**Session 6/7 Responsibility**

User notifications and alerts system.

**Features**:
- Multi-channel notifications (email, push, SMS)
- Event-based triggers (token minted, price alerts, etc.)
- User preference management
- Notification template system

**API Endpoints**:
- `POST /api/notifications/subscribe` - Subscribe to notifications
- `POST /api/notifications/preferences` - Update preferences
- `GET /api/notifications/history/:userId` - Notification history

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker (for containerized deployment)

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/credential_tokens
REDIS_URL=redis://localhost:6379

# Blockchain
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-key
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your-key

# AIR Integration
AIR_API_URL=https://api.air.moca.network
AIR_API_KEY=your-air-api-key

# External Services
ETHERSCAN_API_KEY=your-etherscan-key
NOTIFICATION_API_KEYS=your-notification-service-keys
```

### Installation & Running
```bash
# Install dependencies for all services
npm run install:all

# Start all services in development mode
npm run dev:all

# Start specific service
cd services/price-oracle
npm install
npm run dev
```

## Data Flow Architecture

```
Smart Contracts
      ↓ (events)
Event Listeners
      ↓ (processed data)
Service APIs
      ↓ (aggregated data)
Frontend/Analytics
```

### Event Processing Pipeline
1. **Contract Events**: Smart contracts emit events for all significant actions
2. **Event Listeners**: Each service listens for relevant events
3. **Data Processing**: Raw event data is processed and stored
4. **API Exposure**: Processed data is exposed via REST/GraphQL APIs
5. **Real-time Updates**: WebSocket connections provide live updates

## Database Schema

### Shared Tables
- `tokens` - Token metadata and configuration
- `pools` - AMM pool information
- `transactions` - All trading and liquidity transactions
- `users` - User profiles and preferences

### Service-Specific Tables
- **Price Oracle**: `price_feeds`, `twap_calculations`
- **Analytics**: `volume_metrics`, `liquidity_metrics`, `rankings`
- **Token Generator**: `generation_jobs`, `emission_calculations`
- **Notifications**: `notification_preferences`, `notification_history`

## Inter-Service Communication

### Event Bus Pattern
Services communicate via Redis pub/sub for real-time events:

```typescript
// Event types
interface PriceUpdateEvent {
  type: 'PRICE_UPDATE';
  tokenAddress: string;
  price: number;
  volume: number;
  timestamp: number;
}

interface TokenMintedEvent {
  type: 'TOKEN_MINTED';
  credentialId: string;
  holder: string;
  amount: number;
  timestamp: number;
}
```

### API Integration
Services expose REST APIs for data queries and HTTP-based operations.

## Deployment Architecture

### Development
- All services run locally with shared PostgreSQL and Redis
- Docker Compose for easy local environment setup
- Hot reload and debugging support

### Production
- Each service deployed as separate containers
- Kubernetes orchestration for scaling and management
- Separate databases per service for isolation
- Load balancers and API gateways

## Monitoring & Observability

### Logging
- Structured JSON logging with correlation IDs
- Centralized log aggregation (ELK stack)
- Error tracking and alerting

### Metrics
- Prometheus metrics collection
- Grafana dashboards for visualization
- Custom business metrics (trading volume, token generation rates)

### Health Checks
- Service health endpoints
- Database connection monitoring
- External API dependency checks

## Session Implementation Order

1. **Session 6**: Implement Token Generator Service first
2. **Session 7**: Implement Price Oracle and Analytics Services
3. **Session 7**: Implement Notification Service
4. **Session 8**: Integration testing and production deployment

Each service includes comprehensive documentation, API specifications, and deployment guides.