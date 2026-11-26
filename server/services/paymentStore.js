/** Persistent payment orders and plan entitlements for a single server instance. */
const path = require('path');
const fs = require('fs-extra');
const dir = path.join(__dirname, '../data');
const file = path.join(dir, 'payments.json');
fs.ensureDirSync(dir);
let state = { orders: {}, entitlements: {} };
try { state = { ...state, ...(fs.readJsonSync(file) || {}) }; }
catch (e) { if (e.code !== 'ENOENT') throw e; }
if (!state.entitlements) state.entitlements = {};
function persist() {
  const tmp = file + '.tmp';
  fs.writeJsonSync(tmp, state, { spaces: 2 });
  fs.renameSync(tmp, file);
}
function entitlementFor(userId) {
  const saved = state.entitlements[userId] || {};
  const lifetime = saved.lifetime === true;
  const expiry = saved.expiresAt ? new Date(saved.expiresAt).getTime() : 0;
  const active = lifetime || expiry > Date.now();
  return {
    active,
    plan: lifetime ? 'lifetime' : (active ? 'monthly' : null),
    lifetime,
    expiresAt: lifetime ? null : (saved.expiresAt || null)
  };
}
module.exports = {
  create(order) {
    if (state.orders[order.txRef]) throw new Error('Duplicate payment reference');
    state.orders[order.txRef] = order;
    persist();
    return order;
  },
  get(txRef) { return state.orders[txRef] || null; },
  markPaid(txRef, transactionId, verifiedAmount) {
    const order = state.orders[txRef];
    if (!order) return null;
    if (order.status === 'paid') return order;
    order.status = 'paid';
    order.transactionId = String(transactionId);
    order.verifiedAmount = Number(verifiedAmount);
    order.paidAt = new Date().toISOString();
    const current = state.entitlements[order.userId] || {};
    if (order.plan === 'lifetime') {
      state.entitlements[order.userId] = { lifetime: true, expiresAt: null, updatedAt: order.paidAt };
    } else if (order.plan === 'monthly') {
      const now = Date.now();
      const existingExpiry = current.expiresAt ? new Date(current.expiresAt).getTime() : 0;
      const base = existingExpiry > now ? existingExpiry : now;
      state.entitlements[order.userId] = {
        lifetime: current.lifetime === true,
        expiresAt: current.lifetime === true ? null : new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: order.paidAt
      };
    } else {
      throw new Error('Unsupported payment plan');
    }
    persist();
    return order;
  },
  markFailed(txRef) {
    const order = state.orders[txRef];
    if (!order || order.status === 'paid') return order || null;
    order.status = 'failed';
    persist();
    return order;
  },
  getEntitlement(userId) { return entitlementFor(userId); },
  hasAccess(userId) { return entitlementFor(userId).active; }
};
