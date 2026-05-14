import 'dotenv/config';
import 'express-async-errors';
import app from './app';
import { registerLeagueResetJob } from './jobs/leagueReset.job';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

const server = app.listen(PORT, () => {
  console.log(`\n🚀 VocabJP API running on http://localhost:${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV ?? 'development'}\n`);

  // Start background jobs
  registerLeagueResetJob();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
