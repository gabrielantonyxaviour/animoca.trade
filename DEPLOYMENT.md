# Production Deployment Guide

This guide covers the complete production deployment and monitoring setup for the AIR Credential Trading Platform.

## 🏗️ Infrastructure Overview

The platform uses a comprehensive monitoring and deployment infrastructure consisting of:

- **Docker containers** for all services
- **Prometheus + Grafana** for metrics and dashboards
- **ELK Stack** (Elasticsearch, Logstash, Kibana) for centralized logging
- **GitHub Actions** for CI/CD pipeline
- **Blue-Green deployment** for zero-downtime updates
- **Automated backup** and recovery systems
- **Real-time alerting** via Slack and email

## 📋 Prerequisites

1. **Docker & Docker Compose** (v2.0+)
2. **Node.js** 18+ (for local development)
3. **Git** for version control
4. **jq** for JSON processing (used in scripts)
5. **curl** for health checks

### Optional (for production)
- **AWS CLI** (for S3 backups)
- **Slack workspace** (for notifications)
- **SMTP server** (for email alerts)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd air-credential-example

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Development Setup

```bash
# Start all services
docker compose up -d

# Check service health
./scripts/health-check.sh

# Access services:
# - Frontend: http://localhost:3000
# - Grafana: http://localhost:3001 (admin/admin)
# - Prometheus: http://localhost:9090
# - Kibana: http://localhost:5601
# - Elasticsearch: http://localhost:9200
```

### 3. Production Deployment

```bash
# Set production environment variables
export ENVIRONMENT=production
export FRONTEND_IMAGE=ghcr.io/your-org/credential-platform/frontend:latest
export BLOCKCHAIN_MONITOR_IMAGE=ghcr.io/your-org/credential-platform/blockchain-monitor:latest

# Run zero-downtime deployment
./scripts/zero-downtime-deploy.sh
```

## 📊 Monitoring Dashboards

### Grafana Dashboards

1. **Application Performance**
   - HTTP request rates and response times
   - Error rates and status codes
   - Memory and CPU usage
   - Active connections

2. **Blockchain Monitoring**
   - Token creation metrics
   - Trading volume and activity
   - Gas prices and usage
   - Contract interaction success rates
   - Top traded tokens

3. **Infrastructure Monitoring**
   - System resource usage (CPU, memory, disk)
   - Container metrics
   - Network I/O
   - Database performance

### Prometheus Metrics

Key metrics being monitored:

```
# Application Metrics
nginx_http_requests_total
nginx_http_request_duration_seconds
container_memory_usage_bytes
container_cpu_usage_seconds_total

# Blockchain Metrics
blockchain_tokens_created_total
blockchain_trades_total
blockchain_trading_volume_eth_total
blockchain_average_gas_price
blockchain_contract_calls_total

# Infrastructure Metrics
node_cpu_seconds_total
node_memory_MemTotal_bytes
node_filesystem_size_bytes
```

## 🔍 Logging Strategy

### Centralized Logging with ELK Stack

All application logs are centralized using the ELK stack:

- **Logstash** processes logs from Docker containers
- **Elasticsearch** stores and indexes log data
- **Kibana** provides log visualization and search

### Log Types and Indices

- `access-logs-*`: Nginx access logs
- `error-logs-*`: Application error logs
- `blockchain-logs-*`: Blockchain monitoring logs
- `logs-*`: General application logs

### Log Structure

All logs follow a structured JSON format:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "service": "frontend",
  "message": "User action completed",
  "user_id": "user123",
  "action": "token_created",
  "response_time": 0.250,
  "deployment_id": "20250115_103000",
  "environment": "production"
}
```

## 🚨 Alerting Configuration

### Alert Channels

1. **Slack Integration**
   - Critical alerts: `#alerts-critical`
   - Warnings: `#alerts-warning`
   - Blockchain events: `#blockchain-alerts`
   - Deployments: `#deployments`

2. **Email Notifications**
   - Critical: `devops@credential-platform.com`
   - Warnings: `team@credential-platform.com`

### Alert Rules

#### Application Alerts
- **High Error Rate**: >10% error rate for 5 minutes
- **High Response Time**: 95th percentile >2 seconds for 5 minutes
- **Service Down**: Service unreachable for 1 minute

#### Infrastructure Alerts
- **High CPU Usage**: >80% for 5 minutes
- **High Memory Usage**: >85% for 5 minutes
- **Low Disk Space**: >90% usage for 5 minutes

#### Blockchain Alerts
- **High Gas Costs**: >100 Gwei for 10 minutes
- **Contract Failures**: >10% failure rate for 5 minutes
- **Token Creation Drop**: <0.01 tokens/second for 15 minutes

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Test Stage**
   - Unit tests for frontend
   - Smart contract tests with Foundry
   - Linting and code quality checks
   - Security scanning with Trivy and Slither

2. **Build Stage**
   - Docker image building
   - Multi-platform support
   - Container registry push
   - Image vulnerability scanning

3. **Deploy Stage**
   - Blue-green deployment
   - Health checks and smoke tests
   - Automatic rollback on failure
   - Post-deployment monitoring

### Deployment Environments

- **Development**: Auto-deploy on `develop` branch
- **Staging**: Manual approval required
- **Production**: Auto-deploy on `main` branch with manual gates

## 💾 Backup Strategy

### Automated Database Backups

Daily automated backups with:
- **Retention**: 30 days local, 1 year in S3
- **Compression**: Gzip compression for storage efficiency
- **Verification**: Backup integrity checks
- **Monitoring**: Backup success/failure alerts

```bash
# Manual backup
./scripts/backup-database.sh

# Restore from backup
./scripts/restore-database.sh /backups/credential_platform_20250115_103000.sql.gz
```

### Monitoring Data Backup

- **Prometheus data**: Local volumes with retention policies
- **Grafana dashboards**: Version controlled in Git
- **Elasticsearch indices**: Daily snapshots to S3

## 🔧 Maintenance

### Regular Tasks

1. **Daily**
   - Check service health via dashboards
   - Review error logs and alerts
   - Monitor blockchain metrics

2. **Weekly**
   - Update dependency security scans
   - Review backup integrity
   - Capacity planning review

3. **Monthly**
   - Rotate secrets and passwords
   - Archive old logs
   - Performance optimization review

### Health Checks

Run comprehensive health checks:

```bash
# All services
./scripts/health-check.sh

# Specific environment
FRONTEND_URL=http://staging.example.com ./scripts/health-check.sh
```

### Zero-Downtime Deployment

```bash
# Standard deployment
./scripts/zero-downtime-deploy.sh

# Deployment with custom settings
HEALTH_CHECK_RETRIES=5 ROLLBACK_ON_FAILURE=false ./scripts/zero-downtime-deploy.sh
```

## 🐛 Troubleshooting

### Common Issues

1. **Service Health Check Failures**
   ```bash
   # Check service logs
   docker compose logs frontend

   # Check detailed health
   curl http://localhost:3000/health
   ```

2. **Blockchain Monitor Issues**
   ```bash
   # Check blockchain connectivity
   curl http://localhost:9091/status

   # Check contract addresses
   curl http://localhost:9091/status | jq '.contracts'
   ```

3. **Monitoring Stack Issues**
   ```bash
   # Check Prometheus targets
   curl http://localhost:9090/api/v1/targets

   # Check Elasticsearch cluster health
   curl http://localhost:9200/_cluster/health
   ```

### Log Analysis

```bash
# Search application logs
curl -X GET "localhost:9200/logs-*/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"level": "error"}}
      ]
    }
  }
}'

# Search blockchain logs
curl -X GET "localhost:9200/blockchain-logs-*/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"event_type": "token_created"}
  }
}'
```

## 🔐 Security Considerations

### Container Security
- Base images updated regularly
- Non-root user execution
- Minimal attack surface
- Security scanning in CI/CD

### Network Security
- Internal service communication
- TLS encryption for external traffic
- Security headers configured
- CORS properly configured

### Data Security
- Database encryption at rest
- Secure secret management
- Regular security updates
- Audit logging enabled

## 📈 Performance Optimization

### Frontend Optimization
- Gzip compression enabled
- Static asset caching
- CDN integration (optional)
- Bundle size monitoring

### Backend Optimization
- Database connection pooling
- Redis caching layer
- API rate limiting
- Query optimization

### Blockchain Optimization
- RPC call batching
- Event log filtering
- Gas optimization monitoring
- Connection pooling

## 🆘 Emergency Procedures

### Immediate Response

1. **Service Outage**
   ```bash
   # Quick rollback
   ./scripts/zero-downtime-deploy.sh --rollback

   # Scale up resources
   docker compose up -d --scale frontend=3
   ```

2. **Database Issues**
   ```bash
   # Restore from backup
   ./scripts/restore-database.sh

   # Switch to read-only mode
   docker compose exec postgres psql -c "ALTER SYSTEM SET default_transaction_read_only = on;"
   ```

3. **Blockchain Issues**
   ```bash
   # Switch RPC endpoint
   docker compose exec blockchain-monitor sh -c 'export RPC_URL=https://backup-rpc.example.com && restart'
   ```

### Contact Information

- **DevOps Team**: devops@credential-platform.com
- **On-call Engineer**: +1-555-0123
- **Slack Channel**: #incident-response

## 📚 Additional Resources

- [Smart Contract Documentation](./contracts/README.md)
- [Frontend Development Guide](./frontend/README.md)
- [API Documentation](./api/README.md)
- [Monitoring Runbook](./monitoring/README.md)

---

For questions or issues, please contact the DevOps team or create an issue in the repository.