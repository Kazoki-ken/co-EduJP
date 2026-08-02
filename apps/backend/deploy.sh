#!/bin/bash
# ─── VocabJP Remote Deployment Script ─────────────────────────────────────
set -e

APP_DIR="/var/www/vocabjp"
BACKEND_DIR="$APP_DIR/apps/backend"

echo "📦 [1/6] Project.zip arxivini ochish (unzip)..."
cd $APP_DIR
unzip -o project.zip || true
rm -f project.zip

echo "📦 [2/6] Loyiha bog'liqliklarini o'rnatish (pnpm install)..."
pnpm install

echo "📦 [3/6] Ma'lumotlar bazasini (PostgreSQL) Docker-da ishga tushirish..."
docker-compose up -d
echo "⏳ Baza to'liq ishga tushishini kutilmoqda (5 soniya)..."
sleep 5

echo "📦 [4/6] Ishlab chiqarish (Production) uchun .env faylini yaratish..."
# If .env already exists, preserve it. Otherwise, create a clean production one.
# Secrets are NEVER hardcoded here — they must be provided as environment
# variables when running this script, e.g.:
#   DB_PASSWORD=... ADMIN_PASSWORD=... FRONTEND_URL=https://edujp.uz ./deploy.sh
if [ ! -f "$BACKEND_DIR/.env" ]; then
  : "${DB_PASSWORD:?DB_PASSWORD environment variable is required}"
  : "${ADMIN_PASSWORD:?ADMIN_PASSWORD environment variable is required}"
  : "${FRONTEND_URL:?FRONTEND_URL environment variable is required}"

  cat <<EOT > $BACKEND_DIR/.env
# Production Environment Variables
PORT=4000
NODE_ENV=production
TRUST_PROXY=1

# Database Connection (local postgres container in docker)
DATABASE_URL="postgresql://vocabjp:${DB_PASSWORD}@127.0.0.1:5432/vocabjp?connection_limit=20&pool_timeout=10"

# Production Secure JWT Secrets
JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="$(openssl rand -hex 32)"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Allowed Origins (comma separated)
FRONTEND_URL="${FRONTEND_URL}"

# Admin Seed User
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@vocabjp.com}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
EOT
  chmod 600 $BACKEND_DIR/.env
  echo "✅ Yangi .env fayli yaratildi."
else
  echo "⚠️ .env fayli allaqachon mavjud, yangilanmadi."
fi

echo "📦 [5/6] Prisma ORM va Migratsiyalarni amalga oshirish..."
cd $BACKEND_DIR
# Generate prisma client
pnpm db:generate
# Apply migrations to production database
pnpm db:migrate:deploy
# Seed initial badges & admin credentials
pnpm db:seed

echo "📦 [6/6] TypeScript backend kodini kompilyatsiya qilish va PM2-da ishga tushirish..."
pnpm build

# Start or reload backend inside PM2
if pm2 list | grep -q "vocabjp-backend"; then
  echo "♻️ Backend PM2 jarayoni qayta yuklanmoqda..."
  pm2 reload vocabjp-backend
else
  echo "⚡ Backend PM2-da yangidan ishga tushirilmoqda..."
  pm2 start dist/index.js --name "vocabjp-backend"
fi

# Save PM2 state for system reboots
pm2 save

echo "🎉 TABRIKLAYMAN! LOYIHA INTERNETDA JONLI ISHGA TUSHDI!"
echo "Backend PORT=4000 da ishlamoqda (nginx orqali proksilanadi)."
