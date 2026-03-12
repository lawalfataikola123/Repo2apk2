/**
 * Input Validators and Sanitizers
 */

/**
 * Validate that URL is a valid GitHub repository URL
 */
function validateGitHubUrl(url) {
  if (!url) return false;

  // Must be github.com
  const githubPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;

  // Strip .git suffix for validation
  const cleanUrl = url.replace(/\.git$/, '');

  if (!githubPattern.test(cleanUrl)) {
    throw new Error('Must be a valid GitHub repository URL (https://github.com/user/repo)');
  }

  // Block obvious path traversal attempts
  if (url.includes('..') || url.includes('%2e%2e') || url.includes('%252e')) {
    throw new Error('Invalid URL format');
  }

  return true;
}

/**
 * Sanitize and normalize a GitHub URL
 */
function sanitizeUrl(url) {
  // Remove trailing slashes and spaces
  let clean = url.trim().replace(/\/+$/, '');

  // Normalize git suffix
  if (!clean.endsWith('.git')) {
    clean = clean + '.git';
  }

  // Force HTTPS
  clean = clean.replace(/^http:\/\//, 'https://');

  return clean;
}

/**
 * Validate UUID v4 format
 */
function isValidBuildId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

module.exports = { validateGitHubUrl, sanitizeUrl, isValidBuildId };
