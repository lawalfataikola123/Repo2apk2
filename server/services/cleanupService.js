/**
 * Cleanup Service - Remove expired build artifacts
 */

const path = require('path');
const fs = require('fs-extra');
const buildStore = require('./buildStore');
const logger = require('../utils/logger');

/**
 * Remove builds older than 1 hour
 */
async function cleanupOldBuilds(buildsDir, maxAgeMs = 60 * 60 * 1000) {
  const expiredIds = buildStore.getExpired(maxAgeMs);

  logger.info(`Cleanup: found ${expiredIds.length} expired builds`);

  let cleaned = 0;
  let errors = 0;

  for (const buildId of expiredIds) {
    try {
      const apkPath = path.join(buildsDir, `${buildId}.apk`);
      const workDir = path.join(buildsDir, buildId);

      await Promise.all([
        fs.remove(apkPath).catch(() => {}),
        fs.remove(workDir).catch(() => {})
      ]);

      buildStore.delete(buildId);
      cleaned++;
    } catch (err) {
      logger.error(`Failed to clean build ${buildId}:`, err);
      errors++;
    }
  }

  // Also clean any orphaned directories/files not in the store
  try {
    const entries = await fs.readdir(buildsDir);
    for (const entry of entries) {
      if (!buildStore.get(entry.replace('.apk', ''))) {
        const entryPath = path.join(buildsDir, entry);
        const stat = await fs.stat(entryPath);
        const age = Date.now() - stat.mtimeMs;
        if (age > maxAgeMs) {
          await fs.remove(entryPath).catch(() => {});
          cleaned++;
        }
      }
    }
  } catch (err) {
    logger.error('Error during orphan cleanup:', err);
  }

  logger.info(`Cleanup complete: ${cleaned} removed, ${errors} errors`);
  return { cleaned, errors };
}

module.exports = { cleanupOldBuilds };
