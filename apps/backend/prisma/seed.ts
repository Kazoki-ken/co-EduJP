import { PrismaClient, BadgeType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Admin User ────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@vocabjp.com';
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        profile: {
          create: {
            streak: 0,
            coins: 9999,
            xp: 0,
          },
        },
      },
    });
    console.log(`✅ Admin user created: ${admin.email}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // ─── Default Badges ────────────────────────────────────────────────────────
  const badges = [
    // Streak badges
    {
      name: 'First Flame',
      description: 'Maintain a 3-day study streak',
      icon: '🔥',
      color: '#f97316',
      badgeType: BadgeType.STREAK,
      threshold: 3,
    },
    {
      name: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      icon: '🔥',
      color: '#ef4444',
      badgeType: BadgeType.STREAK,
      threshold: 7,
    },
    {
      name: 'Unstoppable',
      description: 'Maintain a 30-day study streak',
      icon: '🔥',
      color: '#dc2626',
      badgeType: BadgeType.STREAK,
      threshold: 30,
    },
    {
      name: 'Legend',
      description: 'Maintain a 100-day study streak',
      icon: '👑',
      color: '#fbbf24',
      badgeType: BadgeType.STREAK,
      threshold: 100,
    },

    // Words saved badges
    {
      name: 'Word Collector',
      description: 'Save 10 words to your dictionary',
      icon: '📖',
      color: '#8b5cf6',
      badgeType: BadgeType.WORDS_SAVED,
      threshold: 10,
    },
    {
      name: 'Vocabulary Builder',
      description: 'Save 50 words to your dictionary',
      icon: '📚',
      color: '#7c3aed',
      badgeType: BadgeType.WORDS_SAVED,
      threshold: 50,
    },
    {
      name: 'Word Master',
      description: 'Save 200 words to your dictionary',
      icon: '🏛️',
      color: '#6d28d9',
      badgeType: BadgeType.WORDS_SAVED,
      threshold: 200,
    },

    // Games played badges
    {
      name: 'First Game',
      description: 'Complete your first vocabulary game',
      icon: '🎮',
      color: '#10b981',
      badgeType: BadgeType.GAMES_PLAYED,
      threshold: 1,
    },
    {
      name: 'Gamer',
      description: 'Complete 25 vocabulary games',
      icon: '🕹️',
      color: '#059669',
      badgeType: BadgeType.GAMES_PLAYED,
      threshold: 25,
    },
    {
      name: 'Dedicated Scholar',
      description: 'Complete 100 vocabulary games',
      icon: '🎓',
      color: '#047857',
      badgeType: BadgeType.GAMES_PLAYED,
      threshold: 100,
    },

    // Perfect game badges
    {
      name: 'Perfect Run',
      description: 'Achieve 100% accuracy in a vocabulary game',
      icon: '⭐',
      color: '#fbbf24',
      badgeType: BadgeType.PERFECT_GAME,
      threshold: 1,
    },
    {
      name: 'Perfectionist',
      description: 'Achieve 100% accuracy 10 times',
      icon: '💎',
      color: '#06b6d4',
      badgeType: BadgeType.PERFECT_GAME,
      threshold: 10,
    },

    // Master words badges
    {
      name: 'Word Mastered',
      description: 'Master your first word (SRS Level 5)',
      icon: '🥋',
      color: '#f59e0b',
      badgeType: BadgeType.MASTER_WORDS,
      threshold: 1,
    },
    {
      name: 'SRS Champion',
      description: 'Master 25 words at SRS Level 5',
      icon: '🏆',
      color: '#d97706',
      badgeType: BadgeType.MASTER_WORDS,
      threshold: 25,
    },
    {
      name: 'Vocabulary Sage',
      description: 'Master 100 words at SRS Level 5',
      icon: '🧘',
      color: '#b45309',
      badgeType: BadgeType.MASTER_WORDS,
      threshold: 100,
    },

    // Coins earned badges
    {
      name: 'First Coins',
      description: 'Earn your first 100 coins',
      icon: '🪙',
      color: '#fbbf24',
      badgeType: BadgeType.COINS_EARNED,
      threshold: 100,
    },
    {
      name: 'Rich Scholar',
      description: 'Accumulate 1,000 coins',
      icon: '💰',
      color: '#f59e0b',
      badgeType: BadgeType.COINS_EARNED,
      threshold: 1000,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
  }
  console.log(`✅ ${badges.length} badges seeded`);

  // ─── Default Site Configuration ────────────────────────────────────────────
  const configs = [
    { key: 'gemini_api_key', value: '' },
    { key: 'site_name', value: 'VocabJP' },
    { key: 'max_daily_games', value: '50' },
  ];

  for (const config of configs) {
    await prisma.siteConfiguration.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log(`✅ Site configuration seeded`);

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
