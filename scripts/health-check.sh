#!/bin/bash

# Comprehensive health check script
set -e

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:8080}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"
BLOCKCHAIN_MONITOR_URL="${BLOCKCHAIN_MONITOR_URL:-http://localhost:9091}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall health
OVERALL_HEALTH=0

# Function to check service health
check_service() {
  local service_name="$1"
  local url="$2"
  local timeout="${3:-10}"

  echo -n "Checking $service_name... "

  if curl -f -s --max-time "$timeout" "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Healthy${NC}"
    return 0
  else
    echo -e "${RED}✗ Unhealthy${NC}"
    OVERALL_HEALTH=1
    return 1
  fi
}

# Function to check detailed service metrics
check_detailed_health() {
  local service_name="$1"
  local health_url="$2"
  local timeout="${3:-10}"

  echo -n "Checking $service_name detailed health... "

  local response=$(curl -f -s --max-time "$timeout" "$health_url" 2>/dev/null)
  if [ $? -eq 0 ]; then
    local status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    if [ "$status" = "healthy" ] || [ "$status" = "ok" ]; then
      echo -e "${GREEN}✓ $status${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠ $status${NC}"
      echo "  Response: $response"
      return 1
    fi
  else
    echo -e "${RED}✗ No response${NC}"
    OVERALL_HEALTH=1
    return 1
  fi
}

# Function to check Prometheus metrics
check_prometheus_metrics() {
  echo "Checking Prometheus metrics..."

  # Check if Prometheus can query itself
  local query_url="$PROMETHEUS_URL/api/v1/query?query=up"
  local response=$(curl -f -s --max-time 10 "$query_url" 2>/dev/null)

  if [ $? -eq 0 ]; then
    local status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null)
    if [ "$status" = "success" ]; then
      echo -e "  ${GREEN}✓ Prometheus queries working${NC}"

      # Check number of targets
      local targets=$(echo "$response" | jq -r '.data.result | length' 2>/dev/null || echo "0")
      echo "  📊 Monitoring $targets targets"

      return 0
    fi
  fi

  echo -e "  ${RED}✗ Prometheus queries failing${NC}"
  OVERALL_HEALTH=1
  return 1
}

# Function to check Elasticsearch cluster
check_elasticsearch_cluster() {
  echo "Checking Elasticsearch cluster..."

  local cluster_url="$ELASTICSEARCH_URL/_cluster/health"
  local response=$(curl -f -s --max-time 10 "$cluster_url" 2>/dev/null)

  if [ $? -eq 0 ]; then
    local status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null)
    local active_shards=$(echo "$response" | jq -r '.active_shards // 0' 2>/dev/null)

    case "$status" in
      "green")
        echo -e "  ${GREEN}✓ Cluster status: $status${NC}"
        ;;
      "yellow")
        echo -e "  ${YELLOW}⚠ Cluster status: $status${NC}"
        ;;
      "red")
        echo -e "  ${RED}✗ Cluster status: $status${NC}"
        OVERALL_HEALTH=1
        ;;
      *)
        echo -e "  ${RED}✗ Unknown cluster status: $status${NC}"
        OVERALL_HEALTH=1
        ;;
    esac

    echo "  📊 Active shards: $active_shards"
    return 0
  fi

  echo -e "  ${RED}✗ Elasticsearch cluster check failed${NC}"
  OVERALL_HEALTH=1
  return 1
}

# Function to check blockchain connectivity
check_blockchain_health() {
  echo "Checking blockchain connectivity..."

  local status_url="$BLOCKCHAIN_MONITOR_URL/status"
  local response=$(curl -f -s --max-time 10 "$status_url" 2>/dev/null)

  if [ $? -eq 0 ]; then
    local last_block=$(echo "$response" | jq -r '.metrics.last_processed_block // 0' 2>/dev/null)
    local tokens_created=$(echo "$response" | jq -r '.metrics.tokens_created // 0' 2>/dev/null)

    echo -e "  ${GREEN}✓ Blockchain monitor active${NC}"
    echo "  📊 Last processed block: $last_block"
    echo "  🪙 Tokens created: $tokens_created"

    # Check if we're getting recent blocks
    if [ "$last_block" -gt 0 ]; then
      echo -e "  ${GREEN}✓ Processing blockchain data${NC}"
    else
      echo -e "  ${YELLOW}⚠ No recent blockchain data${NC}"
    fi

    return 0
  fi

  echo -e "  ${RED}✗ Blockchain monitor check failed${NC}"
  OVERALL_HEALTH=1
  return 1
}

# Main health check sequence
main() {
  echo "🏥 Starting comprehensive health check..."
  echo "================================="

  # Core services
  check_service "Frontend" "$FRONTEND_URL/health"
  check_detailed_health "Frontend" "$FRONTEND_URL/health"

  # API service (if enabled)
  if [ "$API_ENABLED" = "true" ]; then
    check_service "API" "$API_URL/health"
    check_detailed_health "API" "$API_URL/health"
  fi

  # Monitoring services
  check_service "Prometheus" "$PROMETHEUS_URL/-/healthy"
  check_prometheus_metrics

  check_service "Grafana" "$GRAFANA_URL/api/health"

  check_service "Elasticsearch" "$ELASTICSEARCH_URL"
  check_elasticsearch_cluster

  check_service "Blockchain Monitor" "$BLOCKCHAIN_MONITOR_URL/health"
  check_blockchain_health

  echo "================================="

  if [ $OVERALL_HEALTH -eq 0 ]; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"

    # Send success notification if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
      curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"✅ Health check passed - All services are healthy!"}' \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi

    exit 0
  else
    echo -e "${RED}❌ Some services are unhealthy!${NC}"

    # Send failure notification if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
      curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"⚠️ Health check failed - Some services are unhealthy!"}' \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi

    exit 1
  fi
}

# Run main function
main "$@"