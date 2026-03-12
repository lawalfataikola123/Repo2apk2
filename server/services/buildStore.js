/**
 * Build Store - In-memory state management for builds
 * Replace with Redis or database for multi-instance deployments
 */

const builds = new Map();

const buildStore = {
  /**
   * Create a new build record
   */
  create(buildId, data) {
    builds.set(buildId, {
      ...data,
      logs: [],
      createdAt: new Date().toISOString()
    });
    return builds.get(buildId);
  },

  /**
   * Get a build by ID
   */
  get(buildId) {
    return builds.get(buildId) || null;
  },

  /**
   * Get all builds
   */
  getAll() {
    return Object.fromEntries(builds);
  },

  /**
   * Update build fields
   */
  update(buildId, updates) {
    const build = builds.get(buildId);
    if (!build) return null;
    const updated = { ...build, ...updates };
    builds.set(buildId, updated);
    return updated;
  },

  /**
   * Append a log entry to a build
   */
  addLog(buildId, logEntry) {
    const build = builds.get(buildId);
    if (!build) return;
    build.logs.push(logEntry);
    // Keep only last 1000 log entries in memory
    if (build.logs.length > 1000) {
      build.logs = build.logs.slice(-1000);
    }
  },

  /**
   * Delete a build record
   */
  delete(buildId) {
    return builds.delete(buildId);
  },

  /**
   * Get builds older than a threshold (for cleanup)
   */
  getExpired(maxAgeMs = 60 * 60 * 1000) {
    const now = Date.now();
    const expired = [];

    for (const [id, build] of builds.entries()) {
      const age = now - new Date(build.createdAt).getTime();
      if (age > maxAgeMs) {
        expired.push(id);
      }
    }

    return expired;
  },

  /**
   * Get build count
   */
  count() {
    return builds.size;
  }
};

module.exports = buildStore;
