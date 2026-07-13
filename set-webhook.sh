#!/usr/bin/env bash
# Использование: BOT_TOKEN=xxx VERCEL_URL=https://your-app.vercel.app ./set-webhook.sh
set -e
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d "url=${VERCEL_URL}/api/webhook" \
  -d "allowed_updates=[\"message\",\"callback_query\",\"pre_checkout_query\"]"
echo
