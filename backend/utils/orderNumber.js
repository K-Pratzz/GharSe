const Order = require('../models/Order');

// Simple incrementing order number: GS1000, GS1001, ...
// MVP-safe: for real concurrency-safe sequencing at scale, swap this for a
// dedicated counters collection. Fine for MVP order volumes.
async function generateOrderNumber() {
  const count = await Order.countDocuments({});
  return `GS${1000 + count}`;
}

module.exports = { generateOrderNumber };
