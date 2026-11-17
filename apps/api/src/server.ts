import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 TribalScholar AI Core API listening on port ${env.PORT}`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    healthEndpoint: `http://localhost:${env.PORT}/api/v1/health`,
  });
});

async function handleShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Gracefully terminating Core API...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma database connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnect', { error: String(err) });
      process.exit(1);
    }
  });

  // Force close after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => void handleShutdown('SIGINT'));
process.on('SIGTERM', () => void handleShutdown('SIGTERM'));

export default server;
