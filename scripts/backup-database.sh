#!/bin/bash

# Database backup script
set -e

# Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-credential_platform}"
DB_USER="${DB_USER:-backup_user}"
DB_PASSWORD="${DB_PASSWORD:-backup_password}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/credential_platform_${TIMESTAMP}.sql"
COMPRESSED_BACKUP="$BACKUP_FILE.gz"

echo "Starting database backup..."
echo "Backup file: $COMPRESSED_BACKUP"

# Set password for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Create backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --compress=9 \
  --file="$BACKUP_FILE" \
  --verbose

# Compress backup
gzip "$BACKUP_FILE"

# Verify backup
if [ -f "$COMPRESSED_BACKUP" ]; then
  BACKUP_SIZE=$(stat -f%z "$COMPRESSED_BACKUP" 2>/dev/null || stat -c%s "$COMPRESSED_BACKUP")
  echo "Backup completed successfully. Size: $BACKUP_SIZE bytes"
else
  echo "Backup failed!"
  exit 1
fi

# Upload to cloud storage (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
  echo "Uploading backup to S3..."
  aws s3 cp "$COMPRESSED_BACKUP" "s3://$AWS_S3_BUCKET/database-backups/"
  echo "Backup uploaded to S3"
fi

# Clean up old backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "credential_platform_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"✅ Database backup completed successfully\n📁 File: $(basename $COMPRESSED_BACKUP)\n📊 Size: $BACKUP_SIZE bytes\"}" \
    "$SLACK_WEBHOOK_URL"
fi

echo "Database backup process completed"