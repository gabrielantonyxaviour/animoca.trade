#!/bin/bash

# Smoke tests for credential platform
set -e

# Configuration
BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

# Function to run a test
run_test() {
  local test_name="$1"
  local test_command="$2"

  TESTS_RUN=$((TESTS_RUN + 1))
  echo -n "Testing $test_name... "

  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    return 1
  fi
}

# Basic connectivity tests
echo "🧪 Running smoke tests against $BASE_URL"
echo "========================================="

# Test 1: Frontend health endpoint
run_test "Frontend health endpoint" \
  "curl -f -s --max-time $TIMEOUT '$BASE_URL/health'"

# Test 2: Frontend loads successfully
run_test "Frontend homepage loads" \
  "curl -f -s --max-time $TIMEOUT '$BASE_URL' | grep -q 'html'"

# Test 3: Static assets load
run_test "Static assets accessible" \
  "curl -f -s --max-time $TIMEOUT '$BASE_URL/assets/' || curl -f -s --max-time $TIMEOUT '$BASE_URL/static/'"

# Test 4: API health (if enabled)
if [ "$API_ENABLED" = "true" ]; then
  API_URL="${BASE_URL//:3000/:8080}"
  run_test "API health endpoint" \
    "curl -f -s --max-time $TIMEOUT '$API_URL/health'"
fi

# Test 5: Basic functionality tests
run_test "Frontend serves React app" \
  "curl -s --max-time $TIMEOUT '$BASE_URL' | grep -q 'react\\|React'"

# Test 6: No critical errors in logs
run_test "No critical errors" \
  "! curl -s --max-time $TIMEOUT '$BASE_URL' | grep -q -i 'error\\|Error'"

# Blockchain-specific tests
echo ""
echo "⛓️ Blockchain-specific tests"
echo "============================="

# Test 7: Blockchain monitor health
MONITOR_URL="${BASE_URL//:3000/:9091}"
run_test "Blockchain monitor health" \
  "curl -f -s --max-time $TIMEOUT '$MONITOR_URL/health'"

# Test 8: Blockchain monitor status
run_test "Blockchain monitor status" \
  "curl -f -s --max-time $TIMEOUT '$MONITOR_URL/status' | grep -q 'last_processed_block'"

# Test 9: Contract addresses configured
run_test "Contract addresses configured" \
  "curl -s --max-time $TIMEOUT '$MONITOR_URL/status' | grep -q '0x[a-fA-F0-9]\\{40\\}'"

# Security tests
echo ""
echo "🔒 Security tests"
echo "================="

# Test 10: No sensitive information exposed
run_test "No sensitive info exposed" \
  "! curl -s --max-time $TIMEOUT '$BASE_URL' | grep -q -i 'password\\|secret\\|key\\|token'"

# Test 11: Security headers present
run_test "Security headers present" \
  "curl -I -s --max-time $TIMEOUT '$BASE_URL' | grep -q -i 'x-frame-options'"

# Performance tests
echo ""
echo "⚡ Performance tests"
echo "==================="

# Test 12: Response time under 2 seconds
run_test "Response time < 2s" \
  "time_output=\$(curl -o /dev/null -s -w '%{time_total}' --max-time $TIMEOUT '$BASE_URL'); awk 'BEGIN{exit (\$1 < 2.0 ? 0 : 1)}' <<< \"\$time_output\""

# Test 13: Gzip compression enabled
run_test "Gzip compression enabled" \
  "curl -H 'Accept-Encoding: gzip' -I -s --max-time $TIMEOUT '$BASE_URL' | grep -q 'Content-Encoding: gzip'"

# Results summary
echo ""
echo "📊 Test Results"
echo "==============="
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $((TESTS_RUN - TESTS_PASSED))"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
  echo -e "${GREEN}🎉 All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some smoke tests failed!${NC}"
  exit 1
fi