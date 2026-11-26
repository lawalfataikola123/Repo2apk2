/** Single-instance persistent payment records and paid build credits. */
const path = require('path');
const fs = require('fs-extra');
const dir = path.join(__dirname, '../data');
const file = path.join(dir, 'payments.json');
fs.ensureDirSync(dir);
let state = { orders: {}, credits: {} };
try { state = { ...state, ...(fs.readJsonSync(file) || {}) }; }
catch (e) { if (e.code !== 'ENOENT') throw e; }
function persist() {
  const tmp = file + '.tmp';
  fs.writeJsonSync(tmp, state, { spaces: 2 });
  fs.renameSync(tmp, file);
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
    state.credits[order.userId] = (state.credits[order.userId] || 0) + 1;
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
  getCredits(userId) { return state.credits[userId] || 0; },
  consumeCredit(userId) {
    const available = state.credits[userId] || 0;
    if (available < 1) return false;
    state.credits[userId] = available - 1;
    persist();
    return true;
  },
  refundCredit(userId) {
    state.credits[userId] = (state.credits[userId] || 0) + 1;
    persist();
  }
};
