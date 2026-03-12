/**
 * Build Service - Core APK Build Logic
 * Handles cloning, detection, building, and packaging
 */

const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const simpleGit = require('simple-git');

const logger = require('../utils/logger');
const buildStore = require('./buildStore');

const BUILDS_DIR = path.resolve(__dirname, '../../builds');
const BUILD_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REPO_SIZE_MB = 500;

/**
 * Main build orchestrator
 */
async function startBuild(buildId, repoUrl, buildType, io) {
  const workDir = path.join(BUILDS_DIR, buildId);

  const emit = (event, data) => {
    io.to(`build:${buildId}`).emit(event, data);
  };

  const log = (message, level = 'info') => {
    const entry = { timestamp: new Date().toISOString(), message, level };
    buildStore.addLog(buildId, entry);
    emit('build:log', entry);
    logger[level](`[${buildId}] ${message}`);
  };

  const updateStatus = (status, extra = {}) => {
    buildStore.update(buildId, { status, ...extra });
    emit('build:status', { buildId, status, ...extra });
  };

  // Set build timeout
  const timeoutHandle = setTimeout(() => {
    log('⏱️ Build timed out after 15 minutes', 'error');
    updateStatus('failed', { error: 'Build timed out after 15 minutes' });
    fs.remove(workDir).catch(() => {});
  }, BUILD_TIMEOUT_MS);

  try {
    await fs.ensureDir(workDir);
    updateStatus('cloning');
    log(`📥 Cloning repository: ${repoUrl}`);

    // ── Step 1: Clone Repository ─────────────────────────────────────────────
    await cloneRepository(repoUrl, workDir, log);
    log('✅ Repository cloned successfully');

    // ── Step 2: Detect Project Type ──────────────────────────────────────────
    updateStatus('detecting');
    log('🔍 Detecting project type...');

    const detectedType = buildType === 'auto'
      ? await detectProjectType(workDir, log)
      : buildType;

    if (!detectedType) {
      throw new Error('Unable to detect project type. Ensure the repository contains a valid Android, Flutter, or React Native project.');
    }

    log(`✅ Project type detected: ${detectedType.toUpperCase()}`);
    buildStore.update(buildId, { projectType: detectedType });
    emit('build:detected', { projectType: detectedType });

    // ── Step 3: Install Dependencies & Build ─────────────────────────────────
    updateStatus('building');
    log(`🔨 Starting ${detectedType} build...`);

    let apkSourcePath;
    switch (detectedType) {
      case 'gradle':
        apkSourcePath = await buildGradle(workDir, log);
        break;
      case 'flutter':
        apkSourcePath = await buildFlutter(workDir, log);
        break;
      case 'react-native':
        apkSourcePath = await buildReactNative(workDir, log);
        break;
      default:
        throw new Error(`Unsupported project type: ${detectedType}`);
    }

    // ── Step 4: Copy APK to Output ────────────────────────────────────────────
    updateStatus('packaging');
    log('📦 Packaging APK...');

    const outputApk = path.join(BUILDS_DIR, `${buildId}.apk`);
    await fs.copy(apkSourcePath, outputApk);

    const stats = await fs.stat(outputApk);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    log(`✅ APK packaged successfully (${sizeMB} MB)`);

    // ── Step 5: Cleanup Work Directory ────────────────────────────────────────
    await fs.remove(workDir);
    log('🧹 Build workspace cleaned up');

    clearTimeout(timeoutHandle);

    updateStatus('success', {
      completedAt: new Date().toISOString(),
      apkSizeMB: sizeMB,
      downloadUrl: `/api/build/download/${buildId}`
    });

    log(`🎉 Build complete! APK ready for download.`);
    emit('build:complete', {
      buildId,
      downloadUrl: `/api/build/download/${buildId}`,
      apkSizeMB: sizeMB
    });

  } catch (error) {
    clearTimeout(timeoutHandle);
    const errorMessage = error.message || 'Unknown build error';

    log(`❌ Build failed: ${errorMessage}`, 'error');
    updateStatus('failed', {
      error: errorMessage,
      completedAt: new Date().toISOString()
    });

    emit('build:error', { buildId, error: errorMessage });

    // Cleanup on failure
    await fs.remove(workDir).catch(() => {});

    logger.error(`Build ${buildId} failed:`, error);
  }
}

/**
 * Clone a GitHub repository
 */
async function cloneRepository(repoUrl, destDir, log) {
  const git = simpleGit({
    timeout: { block: 120000 } // 2 min timeout
  });

  try {
    await git.clone(repoUrl, destDir, [
      '--depth', '1',        // Shallow clone for speed
      '--single-branch',
      '--no-tags'
    ]);

    // Check repo size
    const { size } = await getDirSize(destDir);
    const sizeMB = size / 1024 / 1024;

    if (sizeMB > MAX_REPO_SIZE_MB) {
      await fs.remove(destDir);
      throw new Error(`Repository too large: ${sizeMB.toFixed(0)}MB (max ${MAX_REPO_SIZE_MB}MB)`);
    }

    log(`📊 Repository size: ${sizeMB.toFixed(1)}MB`);
  } catch (error) {
    if (error.message.includes('Repository not found') ||
        error.message.includes('not found') ||
        error.message.includes('does not exist')) {
      throw new Error('Repository not found. Ensure it exists and is public.');
    }
    if (error.message.includes('Authentication failed') ||
        error.message.includes('could not read')) {
      throw new Error('Repository is private or inaccessible. Only public repositories are supported.');
    }
    throw error;
  }
}

/**
 * Detect Android project type from directory structure
 */
async function detectProjectType(workDir, log) {
  const checks = [
    // Native Android / Gradle
    {
      type: 'gradle',
      files: ['android/app/build.gradle', 'app/build.gradle', 'build.gradle'],
      indicators: ['gradlew', 'gradle/wrapper/gradle-wrapper.properties']
    },
    // Flutter
    {
      type: 'flutter',
      files: ['pubspec.yaml'],
      indicators: ['lib/main.dart']
    },
    // React Native
    {
      type: 'react-native',
      files: ['package.json'],
      indicators: ['android/app/build.gradle', 'index.js', 'App.js', 'App.tsx']
    }
  ];

  for (const check of checks) {
    const fileChecks = await Promise.all(
      check.files.map(f => fs.pathExists(path.join(workDir, f)))
    );

    if (fileChecks.some(Boolean)) {
      // Additional validation for React Native
      if (check.type === 'react-native') {
        const pkgPath = path.join(workDir, 'package.json');
        if (await fs.pathExists(pkgPath)) {
          const pkg = await fs.readJson(pkgPath);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (!deps['react-native']) continue; // Not actually RN
        }
      }

      // Check for additional indicators
      const indicatorChecks = await Promise.all(
        check.indicators.map(f => fs.pathExists(path.join(workDir, f)))
      );

      log(`  Checking ${check.type}: files=${fileChecks.some(Boolean)}, indicators=${indicatorChecks.some(Boolean)}`);

      if (fileChecks.some(Boolean)) {
        return check.type;
      }
    }
  }

  return null;
}

/**
 * Build Native Android / Gradle project
 */
async function buildGradle(workDir, log) {
  log('📱 Building Native Android project...');

  // Find root of Android project
  let androidRoot = workDir;
  if (await fs.pathExists(path.join(workDir, 'android/app/build.gradle'))) {
    androidRoot = path.join(workDir, 'android');
  }

  // Ensure gradlew is executable
  const gradlew = path.join(androidRoot, 'gradlew');
  if (!await fs.pathExists(gradlew)) {
    throw new Error('Missing Gradle wrapper (gradlew). The repository must include the Gradle wrapper.');
  }

  await fs.chmod(gradlew, '755');
  log('✅ Gradle wrapper found and made executable');

  // Run Gradle build
  await runCommand('./gradlew', ['assembleRelease', '--no-daemon', '--stacktrace'], androidRoot, log);

  // Find the APK
  const apkPath = await findApk(androidRoot, 'release');
  if (!apkPath) {
    throw new Error('Build succeeded but APK file not found in expected output directories.');
  }

  log(`✅ APK found: ${apkPath}`);
  return apkPath;
}

/**
 * Build Flutter project
 */
async function buildFlutter(workDir, log) {
  log('🐦 Building Flutter project...');

  const flutterBin = process.env.FLUTTER_HOME
    ? path.join(process.env.FLUTTER_HOME, 'bin/flutter')
    : 'flutter';

  // Get dependencies
  log('📦 Running flutter pub get...');
  await runCommand(flutterBin, ['pub', 'get'], workDir, log);

  // Build APK
  log('🔨 Running flutter build apk --release...');
  await runCommand(flutterBin, ['build', 'apk', '--release', '--no-tree-shake-icons'], workDir, log);

  // Find APK
  const apkPath = path.join(workDir, 'build/app/outputs/flutter-apk/app-release.apk');
  if (!await fs.pathExists(apkPath)) {
    const fallback = await findApk(workDir, 'release');
    if (!fallback) throw new Error('Flutter build succeeded but APK not found.');
    return fallback;
  }

  return apkPath;
}

/**
 * Build React Native project
 */
async function buildReactNative(workDir, log) {
  log('⚛️ Building React Native project...');

  const npmBin = 'npm';
  const androidDir = path.join(workDir, 'android');

  if (!await fs.pathExists(androidDir)) {
    throw new Error('React Native android/ directory not found.');
  }

  // Install npm dependencies
  log('📦 Installing npm dependencies...');
  await runCommand(npmBin, ['install', '--legacy-peer-deps'], workDir, log);

  // Make gradlew executable
  const gradlew = path.join(androidDir, 'gradlew');
  if (await fs.pathExists(gradlew)) {
    await fs.chmod(gradlew, '755');
  } else {
    throw new Error('Missing Gradle wrapper in android/ directory.');
  }

  // Build release APK
  log('🔨 Building Android release APK...');
  await runCommand('./gradlew', ['assembleRelease', '--no-daemon'], androidDir, log);

  // Find APK
  const apkPath = await findApk(androidDir, 'release');
  if (!apkPath) {
    throw new Error('React Native build succeeded but APK not found.');
  }

  return apkPath;
}

/**
 * Execute a shell command with streaming output
 */
function runCommand(command, args, cwd, log) {
  return new Promise((resolve, reject) => {
    log(`$ ${command} ${args.join(' ')}`);

    const proc = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ANDROID_HOME: process.env.ANDROID_HOME || '/opt/android-sdk',
        JAVA_HOME: process.env.JAVA_HOME || '/usr/lib/jvm/java-17-openjdk-amd64',
        PATH: `${process.env.ANDROID_HOME || '/opt/android-sdk'}/tools:${process.env.ANDROID_HOME || '/opt/android-sdk'}/tools/bin:${process.env.ANDROID_HOME || '/opt/android-sdk'}/platform-tools:${process.env.PATH}`
      },
      shell: false // Prevent shell injection
    });

    let stderr = '';

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => log(line));
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        stderr += line + '\n';
        log(line, 'warn');
      });
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const errorLines = stderr.split('\n')
          .filter(l => l.includes('error') || l.includes('Error') || l.includes('FAILED'))
          .slice(-5)
          .join('\n');
        reject(new Error(`Command failed with exit code ${code}.\n${errorLines}`));
      }
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(`Command not found: ${command}. Ensure build tools are installed in the Docker environment.`));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Find APK file recursively in a directory
 */
async function findApk(baseDir, type = 'release') {
  const searchDirs = [
    `app/build/outputs/apk/${type}`,
    `build/outputs/apk/${type}`,
    `app/outputs/apk/${type}`,
    `build/app/outputs/apk/${type}`
  ];

  for (const searchDir of searchDirs) {
    const dirPath = path.join(baseDir, searchDir);
    if (await fs.pathExists(dirPath)) {
      const files = await fs.readdir(dirPath);
      const apk = files.find(f => f.endsWith('.apk'));
      if (apk) return path.join(dirPath, apk);
    }
  }

  // Recursive search as fallback
  return findApkRecursive(baseDir, type);
}

async function findApkRecursive(dir, type, depth = 0) {
  if (depth > 8) return null;

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name.endsWith('.apk') && dir.includes(type)) {
      return fullPath;
    }

    if (entry.isDirectory()) {
      const found = await findApkRecursive(fullPath, type, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Calculate directory size
 */
async function getDirSize(dir) {
  let size = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile()) {
      const stats = await fs.stat(fullPath);
      size += stats.size;
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const sub = await getDirSize(fullPath);
      size += sub.size;
    }
  }

  return { size };
}

module.exports = { startBuild };
