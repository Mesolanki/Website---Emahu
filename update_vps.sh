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
TARGET_CONF="/etc/nginx/sites-available/emahu.conf"
if [ -f "$TARGET_CONF" ]; then
  # Preserve existing SSL certificate configurations if already managed by Certbot
  if ! grep -q "ssl_certificate" "$TARGET_CONF"; then
    echo "  -> Applying base Nginx site configuration..."
    sudo cp nginx_vps.conf "$TARGET_CONF"
  else
    echo "  -> Preserving existing SSL certificate directives in Nginx site config."
  fi
else
  echo "  -> Installing initial Nginx site configuration..."
  sudo cp nginx_vps.conf "$TARGET_CONF"
  sudo ln -sf "$TARGET_CONF" /etc/nginx/sites-enabled/emahu.conf
fi

# Ensure Nginx syntax is valid before reloading
if sudo nginx -t; then
  echo "  -> Reloading Nginx service..."
  sudo systemctl reload nginx
else
  echo "  ⚠️ Warning: Nginx syntax check failed! Check /etc/nginx/sites-available/emahu.conf"
fi

echo "🔄 [5/5] Restarting backend & frontend PM2 services..."
pm2 restart ecosystem.config.js || pm2 restart all

echo "✅ === EMAHU VPS Deployment Updated Successfully! ==="
