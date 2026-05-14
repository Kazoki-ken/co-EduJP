const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.siteConfiguration.findMany().then(res => {
  console.log(res);
  prisma.$disconnect();
});
