/**
 * useBuild Hook - Complete build state management
 */

import { useState, useCallback, useRef } from 'react';
import { buildApi } from '../utils/api.js';

const INITIAL_STATE = {
  buildId: null,
  status: 'idle', // idle | queued | cloning | detecting | building | packaging | success | failed
  projectType: null,
  logs: [],
  error: null,
  downloadUrl: null,
  apkSizeMB: null,
  startedAt: null,
  completedAt: null,
  progress: 0
};

const STATUS_PROGRESS = {
  idle: 0,
  queued: 5,
  cloning: 15,
  detecting: 30,
  building: 60,
  packaging: 90,
  success: 100,
  failed: 0
};

export function useBuild() {
  const [state, setState] = useState(INITIAL_STATE);
  const logBufferRef = useRef([]);
  const logFlushRef = useRef(null);

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Batched log updates for performance
  const addLog = useCallback((logEntry) => {
    logBufferRef.current.push(logEntry);

    if (logFlushRef.current) return;

    logFlushRef.current = requestAnimationFrame(() => {
      setState(prev => ({
        ...prev,
        logs: [...prev.logs, ...logBufferRef.current].slice(-500)
      }));
      logBufferRef.current = [];
      logFlushRef.current = null;
    });
  }, []);

  const startBuild = useCallback(async (repoUrl, buildType) => {
    // Reset state
    setState({
      ...INITIAL_STATE,
      status: 'queued',
      startedAt: new Date().toISOString(),
      progress: 5
    });

    const response = await buildApi.startBuild(repoUrl, buildType);
    updateState({ buildId: response.buildId });
    return response.buildId;
  }, [updateState]);

  const handleSocketStatus = useCallback(({ status, projectType, error, apkSizeMB }) => {
    updateState({
      status,
      progress: STATUS_PROGRESS[status] ?? 0,
      ...(projectType && { projectType }),
      ...(error && { error }),
      ...(apkSizeMB && { apkSizeMB })
    });
  }, [updateState]);

  const handleSocketComplete = useCallback(({ buildId, downloadUrl, apkSizeMB }) => {
    updateState({
      status: 'success',
      progress: 100,
      downloadUrl,
      apkSizeMB,
      completedAt: new Date().toISOString()
    });
  }, [updateState]);

  const handleSocketError = useCallback(({ error }) => {
    updateState({
      status: 'failed',
      progress: 0,
      error,
      completedAt: new Date().toISOString()
    });
  }, [updateState]);

  const handleSocketDetected = useCallback(({ projectType }) => {
    updateState({ projectType });
  }, [updateState]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    logBufferRef.current = [];
  }, []);

  return {
    ...state,
    startBuild,
    addLog,
    handleSocketStatus,
    handleSocketComplete,
    handleSocketError,
    handleSocketDetected,
    reset
  };
}
