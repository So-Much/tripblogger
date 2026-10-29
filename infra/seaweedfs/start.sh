#!/bin/sh
# Single-node SeaweedFS (master + volume + filer + S3 gateway).
# Credentials come from the container env so they stay in .env.compose, not in git.
# "anonymous" may only read bucket "uploads" — that is what Traefik exposes at /uploads.
set -e
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY is required}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY is required}"

cat > /tmp/s3.json <<EOF
{
  "identities": [
    {
      "name": "tripblogger",
      "credentials": [{ "accessKey": "${S3_ACCESS_KEY}", "secretKey": "${S3_SECRET_KEY}" }],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    },
    { "name": "anonymous", "actions": ["Read:uploads"] }
  ]
}
EOF

# File metadata in SQLite (journaled + fsync) instead of the default LevelDB, which can
# lose the last minutes of entries when Docker/WSL is killed without a clean shutdown.
mkdir -p /etc/seaweedfs
cat > /etc/seaweedfs/filer.toml <<EOF
[leveldb2]
enabled = false

[sqlite]
enabled = true
dbFile = "/data/filer.db"
EOF

exec weed server \
  -dir=/data \
  -ip="${SEAWEED_IP:-seaweedfs}" -ip.bind=0.0.0.0 \
  -master.volumeSizeLimitMB=1024 \
  -volume.max=0 \
  -s3 -s3.port=8333 -s3.config=/tmp/s3.json
