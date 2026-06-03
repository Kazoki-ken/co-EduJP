#!/bin/bash
# EasyNihongo Server Update Script
set -e

echo "============================================"
echo "  EasyNihongo Server Update"
echo "============================================"

# 1. Loyiha papkasini topish
PROJECT_DIR=""
for dir in /root/co /root/co-EduJP /var/www/co /home/co /opt/co; do
  if [ -d "$dir" ]; then
    PROJECT_DIR=$dir
    echo "Found project at: $PROJECT_DIR"
    break
  fi
done

if [ -z "$PROJECT_DIR" ]; then
  echo "Project not found. Cloning from GitHub..."
  cd /root
  git clone https://github.com/Kazoki-ken/co-EduJP.git co
  PROJECT_DIR=/root/co
fi

cd $PROJECT_DIR

# 2. Eng yangi kodni olish
echo ""
echo "--- Pulling latest code ---"
git fetch origin
git reset --hard origin/main
git pull origin main

# 3. node/pnpm tekshirish
echo ""
echo "--- Checking Node.js ---"
node --version
npm --version

# pnpm o'rnatish
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi
pnpm --version

# 4. Backend paketlarini o'rnatish
echo ""
echo "--- Installing backend dependencies ---"
cd $PROJECT_DIR/apps/backend
pnpm install

# 5. .env tekshirish
echo ""
echo "--- Checking .env ---"
if [ ! -f ".env" ]; then
  echo "WARNING: .env file not found! Creating from .env.example..."
  cp .env.example .env
  echo "Please update .env with correct values!"
fi

# Google OAuth env qo'shish
if ! grep -q "GOOGLE_WEB_CLIENT_ID" .env; then
  echo "" >> .env
  echo "# Google OAuth" >> .env
  echo "GOOGLE_WEB_CLIENT_ID=156336295197-pjb6ocbui8t994dhdg4nv827a22f8e84.apps.googleusercontent.com" >> .env
  echo "Added GOOGLE_WEB_CLIENT_ID to .env"
fi

cat .env | grep -v PASSWORD | grep -v SECRET | grep -v KEY

# 6. Prisma generate
echo ""
echo "--- Running Prisma generate ---"
pnpm exec prisma generate

# 7. Migration
echo ""
echo "--- Running Prisma migrations ---"
pnpm exec prisma migrate deploy || echo "Migration failed - check DATABASE_URL in .env"

# 8. TypeScript build
echo ""
echo "--- Building TypeScript ---"
pnpm exec tsc --noEmit 2>&1 | head -20 || echo "TypeScript errors found (non-fatal)"

# 9. PM2 bilan restart
echo ""
echo "--- Restarting backend with PM2 ---"
if command -v pm2 &> /dev/null; then
  pm2 list
  # Agar process bor bo'lsa restart, bo'lmasa start
  if pm2 list | grep -q "backend\|easynihongo\|app\|index"; then
    pm2 restart all
    echo "PM2 restarted"
  else
    echo "No PM2 process found. Starting..."
    cd $PROJECT_DIR/apps/backend
    pm2 start "pnpm exec ts-node src/app.ts" --name backend
  fi
  pm2 status
else
  echo "PM2 not found. Installing..."
  npm install -g pm2
  cd $PROJECT_DIR/apps/backend
  pm2 start "pnpm exec ts-node src/app.ts" --name backend
  pm2 save
fi

echo ""
echo "============================================"
echo "  Update Complete!"
echo "============================================"

# Test API
echo ""
echo "--- Testing API ---"
sleep 3
curl -s http://localhost:4000/api/auth/me -o /dev/null -w "API Status: %{http_code}\n" || echo "API test failed"

echo "Done!"
