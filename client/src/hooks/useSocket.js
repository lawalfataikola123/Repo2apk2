/**
 * Supabase-backed build status polling.
 * The deployed Edge Function does not expose Socket.IO events.
 */
import { useEffect } from 'react';
import { buildApi } from '../utils/api.js';

export function useBuildSocket(buildId, handlers = {}) {
  const { onLog, onStatus, onComplete, onError, onDetected } = handlers;

  useEffect(() => {
    if (!buildId) return undefined;
    let active = true;
    let timer;

    const poll = async () => {
      try {
        const result = await buildApi.getStatus(buildId);
        if (!active || !result?.build) return;
        const build = result.build;

        if (Array.isArray(build.logs) && onLog) {
          build.logs.forEach(entry => onLog(entry));
        }
        if (build.project_type && onDetected) onDetected({ projectType: build.project_type });

        if (onStatus) {
          onStatus({
            status: build.status,
            projectType: build.project_type || null,
            error: build.status === 'failed' ? (build.logs?.[0]?.message || 'Build failed.') : null
          });
        }
        if (build.status === 'success' && onComplete) {
          onComplete({ buildId, downloadUrl: buildApi.getDownloadUrl(buildId) });
          active = false;
          return;
        }
        if (build.status === 'failed') {
          if (onError) onError({ error: build.logs?.[0]?.message || 'Build failed.' });
          active = false;
          return;
        }
      } catch (error) {
        if (active && onError && /sign in|session|unauthorized/i.test(error.message)) {
          onError({ error: error.message });
          active = false;
          return;
        }
      }
      if (active) timer = window.setTimeout(poll, 5000);
    };

    poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [buildId, onLog, onStatus, onComplete, onError, onDetected]);

  return { disconnect: () => {} };
}
