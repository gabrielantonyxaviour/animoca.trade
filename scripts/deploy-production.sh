#!/bin/bash

# AIR Credential Token Ecosystem - Production Deployment Script
# This script automates the complete deployment process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_ROOT/deployment_${TIMESTAMP}.log"

# Network configuration
NETWORK=${1:-sepolia}  # Default to sepolia, can pass 'mainnet' as argument
DRY_RUN=${DRY_RUN:-false}

# Function to log messages
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to log errors
error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Function to log success
success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log warnings
warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled by user"
        exit 1
    fi
}

# Header
log "=========================================="
log "AIR Credential Token Ecosystem Deployment"
log "=========================================="
log "Network: $NETWORK"
log "Timestamp: $TIMESTAMP"
log "Dry Run: $DRY_RUN"
log "Log File: $LOG_FILE"
log "=========================================="

# Pre-deployment checks
log "\n🔍 Running pre-deployment checks..."

# Check Node.js version
NODE_VERSION=$(node -v)
log "Node.js version: $NODE_VERSION"
if [[ ! "$NODE_VERSION" =~ ^v1[89]\. ]] && [[ ! "$NODE_VERSION" =~ ^v2[0-9]\. ]]; then
    error "Node.js version 18 or higher required"
fi

# Check Foundry installation
if ! command -v forge &> /dev/null; then
    error "Foundry not installed. Please install from https://getfoundry.sh"
fi
FORGE_VERSION=$(forge --version)
log "Foundry version: $FORGE_VERSION"

# Check environment files
if [ ! -f "$CONTRACTS_DIR/.env" ]; then
    error "contracts/.env file not found"
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
    error "frontend/.env file not found"
fi

success "Pre-deployment checks passed"

# Load environment variables
log "\n🔐 Loading environment variables..."
source "$CONTRACTS_DIR/.env"

# Validate required environment variables
REQUIRED_VARS=(
    "PRIVATE_KEY"
    "ETHERSCAN_API_KEY"
)

if [ "$NETWORK" == "sepolia" ]; then
    REQUIRED_VARS+=("SEPOLIA_RPC_URL")
    RPC_URL=$SEPOLIA_RPC_URL
elif [ "$NETWORK" == "mainnet" ]; then
    REQUIRED_VARS+=("MAINNET_RPC_URL")
    RPC_URL=$MAINNET_RPC_URL

    warning "⚠️  MAINNET DEPLOYMENT DETECTED!"
    warning "This will deploy contracts to Ethereum Mainnet"
    warning "This action cannot be undone and will cost real ETH"
    confirm "Are you absolutely sure you want to continue?"
    confirm "Type 'yes' to confirm mainnet deployment: "
else
    error "Invalid network: $NETWORK. Use 'sepolia' or 'mainnet'"
fi

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        error "Required environment variable $VAR is not set"
    fi
done

success "Environment variables loaded"

# Check wallet balance
log "\n💰 Checking wallet balance..."
DEPLOYER_ADDRESS=$(cast wallet address $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
BALANCE_ETH=$(echo "scale=4; $BALANCE / 10^18" | bc)

log "Deployer address: $DEPLOYER_ADDRESS"
log "Balance: $BALANCE_ETH ETH"

MIN_BALANCE=0.5
if [ "$NETWORK" == "mainnet" ]; then
    MIN_BALANCE=2.0
fi

if (( $(echo "$BALANCE_ETH < $MIN_BALANCE" | bc -l) )); then
    error "Insufficient balance. Need at least $MIN_BALANCE ETH, have $BALANCE_ETH ETH"
fi

success "Wallet balance sufficient"

# Run tests
log "\n🧪 Running contract tests..."
cd "$CONTRACTS_DIR"

if [ "$DRY_RUN" != "true" ]; then
    forge test || error "Contract tests failed"
    success "All tests passed"
else
    warning "Skipping tests in dry run mode"
fi

# Run linting
log "\n🔍 Running linters..."
cd "$FRONTEND_DIR"

if [ "$DRY_RUN" != "true" ]; then
    npm run lint || warning "Frontend linting warnings detected"
    success "Linting complete"
else
    warning "Skipping linting in dry run mode"
fi

# Build contracts
log "\n🔨 Building contracts..."
cd "$CONTRACTS_DIR"

forge build || error "Contract compilation failed"
success "Contracts compiled successfully"

# Deploy contracts
log "\n🚀 Deploying contracts to $NETWORK..."

if [ "$DRY_RUN" == "true" ]; then
    warning "DRY RUN: Simulating deployment"
    forge script script/DeploySystem.s.sol:DeployTo${NETWORK^} \
        --rpc-url $RPC_URL \
        --sender $DEPLOYER_ADDRESS \
        -vvvv \
        || error "Deployment simulation failed"
else
    log "Starting deployment transaction..."

    # Deploy with verification
    DEPLOY_OUTPUT=$(forge script script/DeploySystem.s.sol:DeployTo${NETWORK^} \
        --rpc-url $RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $ETHERSCAN_API_KEY \
        --slow \
        -vvvv 2>&1 | tee -a "$LOG_FILE")

    # Extract contract addresses from output
    TOKEN_FACTORY=$(echo "$DEPLOY_OUTPUT" | grep "CredentialTokenFactory deployed at:" | awk '{print $NF}')
    POOL_FACTORY=$(echo "$DEPLOY_OUTPUT" | grep "PoolFactory deployed at:" | awk '{print $NF}')
    GENERATOR=$(echo "$DEPLOY_OUTPUT" | grep "PassiveTokenGenerator deployed at:" | awk '{print $NF}')
    ORACLE=$(echo "$DEPLOY_OUTPUT" | grep "ReputationOracle deployed at:" | awk '{print $NF}')

    if [ -z "$TOKEN_FACTORY" ] || [ -z "$POOL_FACTORY" ] || [ -z "$GENERATOR" ] || [ -z "$ORACLE" ]; then
        error "Failed to extract contract addresses from deployment output"
    fi

    success "Contracts deployed successfully"

    log "\n📝 Contract Addresses:"
    log "  CredentialTokenFactory: $TOKEN_FACTORY"
    log "  PoolFactory: $POOL_FACTORY"
    log "  PassiveTokenGenerator: $GENERATOR"
    log "  ReputationOracle: $ORACLE"
fi

# Update frontend configuration
log "\n📝 Updating frontend configuration..."

if [ "$DRY_RUN" != "true" ] && [ -n "$TOKEN_FACTORY" ]; then
    CONFIG_FILE="$FRONTEND_DIR/src/config/contracts.ts"

    # Backup existing configuration
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.${TIMESTAMP}"

    # Update configuration file
    if [ "$NETWORK" == "sepolia" ]; then
        sed -i.bak "s/CREDENTIAL_TOKEN_FACTORY: ''.*\/\/ sepolia/CREDENTIAL_TOKEN_FACTORY: '$TOKEN_FACTORY',/" "$CONFIG_FILE"
        sed -i.bak "s/POOL_FACTORY: ''.*\/\/ sepolia/POOL_FACTORY: '$POOL_FACTORY',/" "$CONFIG_FILE"
        sed -i.bak "s/PASSIVE_TOKEN_GENERATOR: ''.*\/\/ sepolia/PASSIVE_TOKEN_GENERATOR: '$GENERATOR',/" "$CONFIG_FILE"
        sed -i.bak "s/REPUTATION_ORACLE: ''.*\/\/ sepolia/REPUTATION_ORACLE: '$ORACLE',/" "$CONFIG_FILE"
    elif [ "$NETWORK" == "mainnet" ]; then
        sed -i.bak "s/CREDENTIAL_TOKEN_FACTORY: ''.*\/\/ mainnet/CREDENTIAL_TOKEN_FACTORY: '$TOKEN_FACTORY',/" "$CONFIG_FILE"
        sed -i.bak "s/POOL_FACTORY: ''.*\/\/ mainnet/POOL_FACTORY: '$POOL_FACTORY',/" "$CONFIG_FILE"
        sed -i.bak "s/PASSIVE_TOKEN_GENERATOR: ''.*\/\/ mainnet/PASSIVE_TOKEN_GENERATOR: '$GENERATOR',/" "$CONFIG_FILE"
        sed -i.bak "s/REPUTATION_ORACLE: ''.*\/\/ mainnet/REPUTATION_ORACLE: '$ORACLE',/" "$CONFIG_FILE"
    fi

    success "Frontend configuration updated"
else
    warning "Skipping frontend configuration update"
fi

# Build frontend
log "\n🔨 Building frontend..."
cd "$FRONTEND_DIR"

if [ "$DRY_RUN" != "true" ]; then
    npm run build || error "Frontend build failed"
    success "Frontend built successfully"

    # Check build size
    BUILD_SIZE=$(du -sh dist | awk '{print $1}')
    log "Build size: $BUILD_SIZE"

    # Run build analysis
    if command -v npx &> /dev/null; then
        npx vite-bundle-visualizer --open false
        log "Bundle analysis saved to stats.html"
    fi
else
    warning "Skipping frontend build in dry run mode"
fi

# Verify deployment
log "\n✅ Verifying deployment..."

if [ "$DRY_RUN" != "true" ] && [ -n "$TOKEN_FACTORY" ]; then
    # Test contract interactions
    log "Testing contract interactions..."

    # Check if factory is deployed and responding
    OWNER=$(cast call $TOKEN_FACTORY "owner()" --rpc-url $RPC_URL)
    if [ -z "$OWNER" ]; then
        error "Failed to verify TokenFactory deployment"
    fi

    log "TokenFactory owner: $OWNER"

    # Check connections
    GENERATOR_CHECK=$(cast call $TOKEN_FACTORY "getPassiveTokenGenerator()" --rpc-url $RPC_URL)
    if [ "$GENERATOR_CHECK" != "$GENERATOR" ]; then
        warning "Generator not properly connected to TokenFactory"
    fi

    success "Deployment verification complete"
else
    warning "Skipping deployment verification"
fi

# Create deployment report
log "\n📊 Creating deployment report..."

REPORT_FILE="$PROJECT_ROOT/deployment_report_${TIMESTAMP}.md"

cat > "$REPORT_FILE" << EOF
# Deployment Report

## Deployment Details
- **Date**: $(date)
- **Network**: $NETWORK
- **Deployer**: $DEPLOYER_ADDRESS
- **Transaction Hash**: Check deployment logs

## Contract Addresses
- **CredentialTokenFactory**: $TOKEN_FACTORY
- **PoolFactory**: $POOL_FACTORY
- **PassiveTokenGenerator**: $GENERATOR
- **ReputationOracle**: $ORACLE

## Verification Links
- [CredentialTokenFactory](https://$([ "$NETWORK" == "mainnet" ] && echo "etherscan.io" || echo "$NETWORK.etherscan.io")/address/$TOKEN_FACTORY)
- [PoolFactory](https://$([ "$NETWORK" == "mainnet" ] && echo "etherscan.io" || echo "$NETWORK.etherscan.io")/address/$POOL_FACTORY)
- [PassiveTokenGenerator](https://$([ "$NETWORK" == "mainnet" ] && echo "etherscan.io" || echo "$NETWORK.etherscan.io")/address/$GENERATOR)
- [ReputationOracle](https://$([ "$NETWORK" == "mainnet" ] && echo "etherscan.io" || echo "$NETWORK.etherscan.io")/address/$ORACLE)

## Build Information
- **Frontend Build Size**: $BUILD_SIZE
- **Gas Used**: Check deployment logs
- **Total Cost**: Check deployment logs

## Next Steps
1. Verify all contracts on Etherscan
2. Update DNS records if needed
3. Enable monitoring services
4. Announce deployment to users
5. Monitor for 24-48 hours

## Logs
Full deployment logs available at: $LOG_FILE
EOF

success "Deployment report created: $REPORT_FILE"

# Post-deployment tasks
log "\n📋 Post-deployment tasks..."

if [ "$DRY_RUN" != "true" ]; then
    # Create git tag
    if command -v git &> /dev/null; then
        TAG_NAME="deploy-$NETWORK-$TIMESTAMP"
        git tag -a "$TAG_NAME" -m "Deployment to $NETWORK at $TIMESTAMP"
        log "Created git tag: $TAG_NAME"
    fi

    # Backup deployment artifacts
    BACKUP_DIR="$PROJECT_ROOT/deployments/backup_${TIMESTAMP}"
    mkdir -p "$BACKUP_DIR"

    # Copy important files
    cp "$LOG_FILE" "$BACKUP_DIR/"
    cp "$REPORT_FILE" "$BACKUP_DIR/"
    cp -r "$CONTRACTS_DIR/out" "$BACKUP_DIR/contracts_out"
    cp -r "$CONTRACTS_DIR/broadcast" "$BACKUP_DIR/broadcast"

    success "Deployment artifacts backed up to: $BACKUP_DIR"
else
    warning "Skipping post-deployment tasks in dry run mode"
fi

# Final summary
log "\n=========================================="
log "🎉 DEPLOYMENT COMPLETE!"
log "=========================================="
log "Network: $NETWORK"
log "Status: SUCCESS"
log "Report: $REPORT_FILE"
log "Logs: $LOG_FILE"

if [ "$DRY_RUN" != "true" ] && [ -n "$TOKEN_FACTORY" ]; then
    log "\nContract Addresses:"
    log "  CredentialTokenFactory: $TOKEN_FACTORY"
    log "  PoolFactory: $POOL_FACTORY"
    log "  PassiveTokenGenerator: $GENERATOR"
    log "  ReputationOracle: $ORACLE"
fi

log "\n⚠️  IMPORTANT NEXT STEPS:"
log "1. Verify all contracts on Etherscan"
log "2. Test basic functionality through UI"
log "3. Enable monitoring and alerts"
log "4. Update documentation with new addresses"
log "5. Announce deployment to community"
log "=========================================="

# Send notification (optional)
if command -v osascript &> /dev/null; then
    # macOS notification
    osascript -e "display notification \"Deployment to $NETWORK complete\" with title \"AIR Credential Deployment\""
elif command -v notify-send &> /dev/null; then
    # Linux notification
    notify-send "AIR Credential Deployment" "Deployment to $NETWORK complete"
fi

exit 0