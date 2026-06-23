#!/bin/bash
# Un Click - Deploy Script
# IMPORTANT: wrangler.toml must be OUTSIDE the deploy directory!
# If wrangler.toml is inside pages_build_output_dir (which is "."), 
# wrangler v4 ignores it and D1/R2 bindings are lost.

set -e

PROJECT_DIR="/home/z/my-project"
DEPLOY_DIR="/tmp/aunclick-deploy"
# CLOUDFLARE_API_TOKEN must be set as environment variable
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN environment variable is not set."
  echo "Export it before running: export CLOUDFLARE_API_TOKEN=your_token_here"
  exit 1
fi

export PATH="$PATH:/home/z/.npm-global/bin"

echo "=== Preparing deploy directory ==="
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy everything EXCEPT wrangler.toml (it must stay outside!)
rsync -a --exclude='wrangler.toml' --exclude='tool-results' --exclude='skills' --exclude='scripts' --exclude='llm-*' --exclude='globalpro*' --exclude='html_part*' --exclude='repo_*' --exclude='_worker.js' "$PROJECT_DIR/" "$DEPLOY_DIR/"

echo "=== Deploying to Cloudflare Pages ==="
cd "$DEPLOY_DIR"
wrangler pages deploy . --project-name=aunclick --branch=main --commit-dirty=true

echo "=== Deployment complete ==="
echo "NOTE: wrangler.toml is at $PROJECT_DIR/wrangler.toml (NOT in deploy dir)"