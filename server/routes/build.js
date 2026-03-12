/**
 * Build Routes - Core API for APK building
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const logger = require('../utils/logger');
const { validateGitHubUrl, sanitizeUrl } = require('../utils/validators');
const buildService = require('../services/buildService');
const buildStore = require('../services/buildStore');

// ─── Validation Middleware ────────────────────────────────────────────────────
const validateBuildRequest = [
  body('repoUrl')
    .trim()
    .notEmpty().withMessage('Repository URL is required')
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('Must be a valid HTTPS URL')
    .custom(validateGitHubUrl)
    .withMessage('Must be a valid GitHub repository URL'),
  body('buildType')
    .optional()
    .isIn(['auto', 'gradle', 'flutter', 'react-native'])
    .withMessage('buildType must be one of: auto, gradle, flutter, react-native')
];

// ─── POST /api/build ──────────────────────────────────────────────────────────
router.post('/', validateBuildRequest, async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { repoUrl, buildType = 'auto' } = req.body;
  const sanitizedUrl = sanitizeUrl(repoUrl);
  const buildId = uuidv4();

  // Initialize build record
  buildStore.create(buildId, {
    repoUrl: sanitizedUrl,
    buildType,
    status: 'queued',
    startedAt: new Date().toISOString(),
    logs: [],
    apkPath: null,
    error: null
  });

  logger.info(`Build initiated: ${buildId} for ${sanitizedUrl}`);

  // Return buildId immediately
  res.status(202).json({
    success: true,
    buildId,
    message: 'Build queued successfully',
    statusUrl: `/api/build/status/${buildId}`,
    wsEvent: `build:${buildId}`
  });

  // Start build asynchronously
  const io = req.app.get('io');
  buildService.startBuild(buildId, sanitizedUrl, buildType, io).catch(err => {
    logger.error(`Build ${buildId} failed with uncaught error:`, err);
  });
});

// ─── GET /api/build/status/:buildId ──────────────────────────────────────────
router.get('/status/:buildId', (req, res) => {
  const { buildId } = req.params;

  // Sanitize buildId (UUID format only)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildId)) {
    return res.status(400).json({ success: false, error: 'Invalid build ID format' });
  }

  const build = buildStore.get(buildId);
  if (!build) {
    return res.status(404).json({ success: false, error: 'Build not found' });
  }

  res.json({
    success: true,
    buildId,
    status: build.status,
    projectType: build.projectType || null,
    startedAt: build.startedAt,
    completedAt: build.completedAt || null,
    error: build.error || null,
    downloadUrl: build.status === 'success' ? `/api/build/download/${buildId}` : null,
    logs: build.logs.slice(-100) // Last 100 log lines
  });
});

// ─── GET /api/build/download/:buildId ────────────────────────────────────────
router.get('/download/:buildId', (req, res) => {
  const { buildId } = req.params;

  // Sanitize buildId
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildId)) {
    return res.status(400).json({ success: false, error: 'Invalid build ID format' });
  }

  const build = buildStore.get(buildId);
  if (!build) {
    return res.status(404).json({ success: false, error: 'Build not found' });
  }

  if (build.status !== 'success') {
    return res.status(400).json({ success: false, error: `Build is not complete. Status: ${build.status}` });
  }

  // Resolve APK path securely - prevent directory traversal
  const buildsDir = path.resolve(__dirname, '../../builds');
  const apkPath = path.resolve(buildsDir, `${buildId}.apk`);

  // Ensure the resolved path is within builds directory
  if (!apkPath.startsWith(buildsDir)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({ success: false, error: 'APK file not found. It may have expired.' });
  }

  const repoName = build.repoUrl.split('/').slice(-1)[0].replace('.git', '') || 'app';
  const filename = `${repoName}-release.apk`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  logger.info(`APK download: ${buildId} -> ${filename}`);
  res.sendFile(apkPath);
});

// ─── GET /api/build/history ───────────────────────────────────────────────────
router.get('/history', (req, res) => {
  const builds = buildStore.getAll();
  const history = Object.entries(builds).map(([id, build]) => ({
    buildId: id,
    repoUrl: build.repoUrl,
    buildType: build.buildType,
    projectType: build.projectType,
    status: build.status,
    startedAt: build.startedAt,
    completedAt: build.completedAt,
    downloadUrl: build.status === 'success' ? `/api/build/download/${id}` : null
  }));

  // Sort by newest first
  history.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  res.json({ success: true, builds: history.slice(0, 50) });
});

// ─── DELETE /api/build/:buildId ───────────────────────────────────────────────
router.delete('/:buildId', async (req, res) => {
  const { buildId } = req.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildId)) {
    return res.status(400).json({ success: false, error: 'Invalid build ID format' });
  }

  const build = buildStore.get(buildId);
  if (!build) {
    return res.status(404).json({ success: false, error: 'Build not found' });
  }

  // Clean up files
  const buildsDir = path.resolve(__dirname, '../../builds');
  const apkPath = path.resolve(buildsDir, `${buildId}.apk`);
  const workDir = path.resolve(buildsDir, buildId);

  await Promise.all([
    fs.remove(apkPath).catch(() => {}),
    fs.remove(workDir).catch(() => {})
  ]);

  buildStore.delete(buildId);

  res.json({ success: true, message: 'Build deleted successfully' });
});

module.exports = router;
