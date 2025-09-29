#!/bin/bash

# Zero-downtime deployment script using blue-green deployment strategy
set -e

# Configuration
DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.yml}"
DOCKER_COMPOSE_PROD_FILE="${DOCKER_COMPOSE_PROD_FILE:-docker-compose.prod.yml}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
HEALTH_CHECK_DELAY="${HEALTH_CHECK_DELAY:-30}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Track deployment state
DEPLOYMENT_ID=$(date +"%Y%m%d_%H%M%S")
CURRENT_ENV=""
TARGET_ENV=""

log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

# Function to determine current active environment
get_current_environment() {
  # Check which environment is currently receiving traffic
  if docker compose -f "$DOCKER_COMPOSE_PROD_FILE" ps frontend-blue 2>/dev/null | grep -q "Up"; then
    echo "blue"
  elif docker compose -f "$DOCKER_COMPOSE_PROD_FILE" ps frontend-green 2>/dev/null | grep -q "Up"; then
    echo "green"
  else
    echo "none"
  fi
}

# Function to get target environment
get_target_environment() {
  local current="$1"
  if [ "$current" = "blue" ]; then
    echo "green"
  elif [ "$current" = "green" ]; then
    echo "blue"
  else
    echo "blue"  # Default to blue if no environment is active
  fi
}

# Function to wait for service to be healthy
wait_for_healthy() {
  local service_name="$1"
  local health_url="$2"
  local retries="$HEALTH_CHECK_RETRIES"

  log "Waiting for $service_name to become healthy..."

  for i in $(seq 1 $retries); do
    if curl -f -s --max-time 10 "$health_url" > /dev/null 2>&1; then
      success "$service_name is healthy"
      return 0
    fi

    warning "Health check attempt $i/$retries failed, waiting $HEALTH_CHECK_DELAY seconds..."
    sleep "$HEALTH_CHECK_DELAY"
  done

  error "$service_name failed to become healthy after $retries attempts"
  return 1
}

# Function to run comprehensive health checks
run_health_checks() {
  local env="$1"
  local port_offset=""

  if [ "$env" = "blue" ]; then
    port_offset="0"
  else
    port_offset="100"
  fi

  local frontend_port=$((3000 + port_offset))
  local api_port=$((8080 + port_offset))
  local monitor_port=$((9091 + port_offset))

  log "Running comprehensive health checks for $env environment..."

  # Check frontend
  if ! wait_for_healthy "Frontend ($env)" "http://localhost:$frontend_port/health"; then
    return 1
  fi

  # Check API if enabled
  if [ "$API_ENABLED" = "true" ]; then
    if ! wait_for_healthy "API ($env)" "http://localhost:$api_port/health"; then
      return 1
    fi
  fi

  # Check blockchain monitor
  if ! wait_for_healthy "Blockchain Monitor ($env)" "http://localhost:$monitor_port/health"; then
    return 1
  fi

  # Run detailed smoke tests
  log "Running smoke tests on $env environment..."
  if ! ./scripts/smoke-tests.sh "http://localhost:$frontend_port"; then
    error "Smoke tests failed for $env environment"
    return 1
  fi

  success "All health checks passed for $env environment"
  return 0
}

# Function to create production docker-compose file
create_production_compose() {
  cat > "$DOCKER_COMPOSE_PROD_FILE" << EOF
version: '3.8'

services:
  # Blue Environment
  frontend-blue:
    image: \${FRONTEND_IMAGE}:\${IMAGE_TAG}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DEPLOYMENT_ID=$DEPLOYMENT_ID
      - ENVIRONMENT=blue
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    labels:
      - "deployment.environment=blue"
      - "deployment.id=$DEPLOYMENT_ID"

  api-blue:
    image: \${API_IMAGE}:\${IMAGE_TAG}
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DEPLOYMENT_ID=$DEPLOYMENT_ID
      - ENVIRONMENT=blue
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    profiles:
      - backend
    labels:
      - "deployment.environment=blue"
      - "deployment.id=$DEPLOYMENT_ID"

  blockchain-monitor-blue:
    image: \${BLOCKCHAIN_MONITOR_IMAGE}:\${IMAGE_TAG}
    ports:
      - "9091:9091"
    environment:
      - DEPLOYMENT_ID=$DEPLOYMENT_ID
      - ENVIRONMENT=blue
      - RPC_URL=https://devnet-rpc.mocachain.org
      - CHAIN_ID=5151
      - CREDENTIAL_TOKEN_FACTORY=0x12D2162F47AAAe1B0591e898648605daA186D644
      - POOL_FACTORY=0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb
      - PASSIVE_TOKEN_GENERATOR=0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93
      - REPUTATION_ORACLE=0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67
    restart: unless-stopped
    labels:
      - "deployment.environment=blue"
      - "deployment.id=$DEPLOYMENT_ID"

  # Green Environment
  frontend-green:
    image: \${FRONTEND_IMAGE}:\${IMAGE_TAG}
    ports:
      - "3100:3000"
    environment:
      - NODE_ENV=production
      - DEPLOYMENT_ID=$DEPLOYMENT_ID
      - ENVIRONMENT=green
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    labels:
      - "deployment.environment=green"
      - "deployment.id=$DEPLOYMENT_ID"

  api-green:
    image: \${API_IMAGE}:\${IMAGE_TAG}
    ports:
      - "8180:8080"
    environment:
      - NODE_ENV=production
      - DEPLOYMENT_ID=$DEPLOYMENT_ID
      - ENVIRONMENT=green
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    profiles:
      - backend
    labels:
      - "deployment.environment=green"
      - "deployment.id=$DEPLOYMENT_ID"

  blockchain-monitor-green:
    image: \${BLOCKCHAIN_MONITOR_IMAGE}:\${IMAGE_TAG}
    ports:
      - "9191:9091"
    environment:
      - DEPLOYMENT_ID=$DEPLOYMENT_ID
      - ENVIRONMENT=green
      - RPC_URL=https://devnet-rpc.mocachain.org
      - CHAIN_ID=5151
      - CREDENTIAL_TOKEN_FACTORY=0x12D2162F47AAAe1B0591e898648605daA186D644
      - POOL_FACTORY=0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb
      - PASSIVE_TOKEN_GENERATOR=0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93
      - REPUTATION_ORACLE=0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67
    restart: unless-stopped
    labels:
      - "deployment.environment=green"
      - "deployment.id=$DEPLOYMENT_ID"

  # Load Balancer (nginx)
  load-balancer:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend-blue
      - frontend-green
    restart: unless-stopped

  # Shared services (postgres, redis, monitoring)
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-credential_platform}
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_USER=\${GRAFANA_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD:-admin}
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
EOF
}

# Function to deploy to target environment
deploy_to_environment() {
  local env="$1"

  log "Deploying to $env environment..."

  # Pull latest images
  log "Pulling latest images..."
  docker compose -f "$DOCKER_COMPOSE_PROD_FILE" pull "frontend-$env" "blockchain-monitor-$env"

  # Start services in target environment
  log "Starting services in $env environment..."
  docker compose -f "$DOCKER_COMPOSE_PROD_FILE" up -d "frontend-$env" "blockchain-monitor-$env"

  # Start API if enabled
  if [ "$API_ENABLED" = "true" ]; then
    docker compose -f "$DOCKER_COMPOSE_PROD_FILE" up -d "api-$env"
  fi

  success "Services started in $env environment"
}

# Function to switch traffic
switch_traffic() {
  local target_env="$1"

  log "Switching traffic to $target_env environment..."

  # Update nginx configuration to point to target environment
  local nginx_config="./nginx/nginx.conf"
  local temp_config="/tmp/nginx.conf.tmp"

  # Create nginx config that routes to target environment
  if [ "$target_env" = "blue" ]; then
    sed 's/frontend-green:3000/frontend-blue:3000/g; s/api-green:8080/api-blue:8080/g' "$nginx_config" > "$temp_config"
  else
    sed 's/frontend-blue:3000/frontend-green:3000/g; s/api-blue:8080/api-green:8080/g' "$nginx_config" > "$temp_config"
  fi

  # Reload nginx configuration
  docker compose -f "$DOCKER_COMPOSE_PROD_FILE" exec load-balancer nginx -t -c /tmp/nginx.conf.tmp
  docker compose -f "$DOCKER_COMPOSE_PROD_FILE" exec load-balancer cp /tmp/nginx.conf.tmp /etc/nginx/nginx.conf
  docker compose -f "$DOCKER_COMPOSE_PROD_FILE" exec load-balancer nginx -s reload

  success "Traffic switched to $target_env environment"
}

# Function to cleanup old environment
cleanup_old_environment() {
  local old_env="$1"

  log "Cleaning up $old_env environment..."

  # Stop old environment services
  docker compose -f "$DOCKER_COMPOSE_PROD_FILE" stop "frontend-$old_env" "blockchain-monitor-$old_env"

  if [ "$API_ENABLED" = "true" ]; then
    docker compose -f "$DOCKER_COMPOSE_PROD_FILE" stop "api-$old_env"
  fi

  # Remove old containers
  docker compose -f "$DOCKER_COMPOSE_PROD_FILE" rm -f "frontend-$old_env" "blockchain-monitor-$old_env"

  if [ "$API_ENABLED" = "true" ]; then
    docker compose -f "$DOCKER_COMPOSE_PROD_FILE" rm -f "api-$old_env"
  fi

  success "Cleaned up $old_env environment"
}

# Function to rollback deployment
rollback_deployment() {
  local current_env="$1"
  local target_env="$2"

  error "Deployment failed, rolling back..."

  # Switch traffic back to current environment
  switch_traffic "$current_env"

  # Cleanup failed target environment
  cleanup_old_environment "$target_env"

  # Send rollback notification
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🔄 Deployment rolled back to $current_env environment due to health check failures\"}" \
      "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
  fi

  error "Deployment rolled back to $current_env environment"
  exit 1
}

# Main deployment function
main() {
  log "Starting zero-downtime deployment..."
  log "Deployment ID: $DEPLOYMENT_ID"

  # Determine current and target environments
  CURRENT_ENV=$(get_current_environment)
  TARGET_ENV=$(get_target_environment "$CURRENT_ENV")

  log "Current environment: $CURRENT_ENV"
  log "Target environment: $TARGET_ENV"

  # Create production docker-compose file
  create_production_compose

  # Deploy to target environment
  deploy_to_environment "$TARGET_ENV"

  # Run health checks on target environment
  if ! run_health_checks "$TARGET_ENV"; then
    if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
      rollback_deployment "$CURRENT_ENV" "$TARGET_ENV"
    else
      error "Health checks failed, manual intervention required"
      exit 1
    fi
  fi

  # Switch traffic to target environment
  switch_traffic "$TARGET_ENV"

  # Wait and verify traffic switch
  log "Waiting for traffic to stabilize..."
  sleep 30

  # Final health check after traffic switch
  if ! run_health_checks "$TARGET_ENV"; then
    if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
      rollback_deployment "$CURRENT_ENV" "$TARGET_ENV"
    else
      error "Post-switch health checks failed, manual intervention required"
      exit 1
    fi
  fi

  # Cleanup old environment
  if [ "$CURRENT_ENV" != "none" ]; then
    cleanup_old_environment "$CURRENT_ENV"
  fi

  success "Zero-downtime deployment completed successfully!"
  success "Active environment: $TARGET_ENV"
  success "Deployment ID: $DEPLOYMENT_ID"

  # Send success notification
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚀 Zero-downtime deployment completed successfully!\n📦 Deployment ID: $DEPLOYMENT_ID\n🌐 Active environment: $TARGET_ENV\"}" \
      "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
  fi
}

# Error handling
trap 'error "Deployment script interrupted"; exit 1' INT TERM

# Run main function
main "$@"