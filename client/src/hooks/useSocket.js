/**
 * useSocket Hook - Socket.io connection management
 */

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

function getSocket() {
  if (!socketInstance || socketInstance.disconnected) {
    socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  return socketInstance;
}

/**
 * Hook to subscribe to real-time build events
 */
export function useBuildSocket(buildId, handlers = {}) {
  const socketRef = useRef(null);

  const {
    onLog,
    onStatus,
    onComplete,
    onError,
    onDetected
  } = handlers;

  useEffect(() => {
    if (!buildId) return;

    const socket = getSocket();
    socketRef.current = socket;

    // Subscribe to this build's room
    socket.emit('subscribe:build', buildId);

    // Event handlers
    if (onLog) socket.on('build:log', onLog);
    if (onStatus) socket.on('build:status', onStatus);
    if (onComplete) socket.on('build:complete', onComplete);
    if (onError) socket.on('build:error', onError);
    if (onDetected) socket.on('build:detected', onDetected);

    socket.on('connect', () => {
      // Re-subscribe on reconnect
      socket.emit('subscribe:build', buildId);
    });

    return () => {
      socket.emit('unsubscribe:build', buildId);
      socket.off('build:log', onLog);
      socket.off('build:status', onStatus);
      socket.off('build:complete', onComplete);
      socket.off('build:error', onError);
      socket.off('build:detected', onDetected);
    };
  }, [buildId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:build', buildId);
    }
  }, [buildId]);

  return { disconnect };
}
