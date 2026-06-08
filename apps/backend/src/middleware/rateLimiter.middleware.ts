import rateLimit from 'express-rate-limit';

// Auth yo'nalishlari uchun qat'iyroq limit (Login, Register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 10, // Bitta IP dan ko'pi bilan 10 ta urinish
  message: { error: "Juda ko'p urinishlar! Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring." },
  standardHeaders: true, // "RateLimit-*" sarlavhalarini qo'shadi
  legacyHeaders: false, // "X-RateLimit-*" ni o'chiradi
});

// Umumiy API uchun yengilroq limit
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 daqiqa
  max: 100, // Bitta IP dan daqiqasiga 100 ta so'rov
  message: { error: "So'rovlar limiti tugadi! Iltimos biroz kuting." },
  standardHeaders: true,
  legacyHeaders: false,
});
