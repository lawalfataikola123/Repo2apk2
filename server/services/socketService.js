/**
 * Socket Service - Real-time build log streaming via Socket.io
 */

const logger = require('../utils/logger');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Client subscribes to a specific build's events
    socket.on('subscribe:build', (buildId) => {
      if (typeof buildId !== 'string' || buildId.length > 36) {
        socket.emit('error', { message: 'Invalid build ID' });
        return;
      }

      const room = `build:${buildId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} subscribed to build ${buildId}`);

      // Confirm subscription
      socket.emit('subscribed', { buildId, room });
    });

    // Client unsubscribes from a build
    socket.on('unsubscribe:build', (buildId) => {
      socket.leave(`build:${buildId}`);
      logger.info(`Socket ${socket.id} unsubscribed from build ${buildId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });
}

module.exports = { setupSocketHandlers };
