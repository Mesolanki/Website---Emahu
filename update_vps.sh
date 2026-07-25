#!/bin/bash
# =========================================================================
# EMAHU VPS AUTO-UPDATE & RESTART SCRIPT
# Run on VPS terminal: bash update_vps.sh
# =========================================================================

echo "🚀 [1/5] Pulling latest code changes from GitHub..."
git pull origin main

echo "📦 [2/5] Building Frontend Web (emahu.com)..."
cd frontend-web && npm run build && cd ..

echo "📦 [3/5] Building Admin Panel (manage.emahu.com)..."
cd admin-emahu && npm run build && cd ..

echo "🌐 [4/5] Updating Nginx configuration & static headers..."
if [ -f /etc/nginx/sites-available/emahu.conf ]; then
  sudo cp nginx_vps.conf /etc/nginx/sites-available/emahu.conf
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "🔄 [5/5] Restarting backend & frontend PM2 services..."
pm2 restart ecosystem.config.js || pm2 restart all

echo "✅ === EMAHU VPS Deployment Updated Successfully! ==="
