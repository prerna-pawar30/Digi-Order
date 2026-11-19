/**
 * Builds the Analytics page data for website (ecommerce) orders, in exactly the shape the manual
 * order analytics API returns, so the same charts can draw both.
 *
 * Shape: { summary, salesTrend, ordersByStatus, paymentStatusBreakdown, topProducts,
 *          salesByCity, salesByState, salesByCountry }
 *
 * Used by: pages/AnalyticsPage.jsx
 */

const CANCELLED = "cancelled";
const IST_TIME_ZONE = "Asia/Kolkata";

const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

/**
 * Day of an ISO timestamp in India time, "YYYY-MM-DD" (en-CA prints that format).
 *
 * Example: "2026-10-15T20:00:00Z" -> "2026-10-16" (01:30 the next morning in India).
 */
export function istDayKey(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: IST_TIME_ZONE });
}

/**
 * Money that stays with us for one order: grand total minus anything refunded.
 *
 * Example: { grandTotal: 2000, refundAmount: 500 } -> 1500. A cancelled order counts 0.
 */
export function netOrderRevenue(order) {
  if (order.orderStatus === CANCELLED) return 0;
  const refunded = Number(order.refundAmount) || 0;
  return round2(Math.max((Number(order.grandTotal) || 0) - refunded, 0));
}

/**
 * Website orders placed in [startDate, endDate] (inclusive, "YYYY-MM-DD", India time); cancelled
 * orders dropped unless includeCancelled.
 */
export function ecomOrdersInRange(orders = [], { startDate, endDate, includeCancelled }) {
  return orders.filter((order) => {
    if (!includeCancelled && order.orderStatus === CANCELLED) return false;
    const day = istDayKey(order.createdAt);
    return day && (!startDate || day >= startDate) && (!endDate || day <= endDate);
  });
}

function addTo(map, key, makeRow, update) {
  if (!key) return;
  const row = map.get(key) || makeRow(key);
  update(row);
  map.set(key, row);
}

const countRow = (field) => (key) => ({ [field]: key, count: 0 });
const salesRow = (field) => (key) => ({ [field]: key, totalOrders: 0, totalRevenue: 0 });
const bumpCount = (row) => {
  row.count += 1;
};

function addSale(row, revenue) {
  row.totalOrders += 1;
  row.totalRevenue = round2(row.totalRevenue + revenue);
}

function addOrderProducts(products, order) {
  if (order.orderStatus === CANCELLED) return;
  for (const item of order.items || []) {
    const name = item.productName || "Unnamed item";
    addTo(
      products,
      name.toLowerCase(),
      () => ({ productName: name, totalQuantitySold: 0, totalRevenue: 0, totalOrders: 0 }),
      (row) => {
        const quantity = Number(item.quantity) || 0;
        row.totalQuantitySold += quantity;
        row.totalRevenue = round2(row.totalRevenue + (Number(item.price) || 0) * quantity);
        row.totalOrders += 1;
      }
    );
  }
}

function buildSummary(orders) {
  const liveOrders = orders.filter((order) => order.orderStatus !== CANCELLED);
  const totalRevenue = round2(liveOrders.reduce((sum, order) => sum + netOrderRevenue(order), 0));
  const totalItemsSold = liveOrders.reduce(
    (sum, order) =>
      sum + (order.items || []).reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    0
  );
  const customerKeys = liveOrders.map((order) => order.user || order.billingAddress?.phone);
  return {
    totalRevenue,
    totalOrders: liveOrders.length,
    avgOrderValue: liveOrders.length ? round2(totalRevenue / liveOrders.length) : 0,
    totalItemsSold,
    totalUniqueCustomers: new Set(customerKeys.filter(Boolean)).size,
    totalRefunded: round2(orders.reduce((sum, order) => sum + (Number(order.refundAmount) || 0), 0)),
  };
}

/**
 * Website orders -> analytics data (same shape as ManualOrderService.getAnalytics().data).
 *
 * Example: 3 placed orders of 2000 on two days, groupBy "day" -> summary.totalRevenue 6000,
 * salesTrend [{ date: "2026-10-13", totalOrders: 1, totalRevenue: 2000 },
 *             { date: "2026-10-16", totalOrders: 2, totalRevenue: 4000 }].
 *
 * @param {object[]} orders Website orders, already limited to the date range.
 * @param {"day"|"month"} groupBy
 * @returns {object}
 */
export function buildEcomAnalytics(orders = [], groupBy = "day") {
  const maps = {
    trend: new Map(),
    status: new Map(),
    payment: new Map(),
    products: new Map(),
    city: new Map(),
    state: new Map(),
    country: new Map(),
  };

  for (const order of orders) {
    const revenue = netOrderRevenue(order);
    const day = istDayKey(order.createdAt);
    const address = order.shippingAddress || order.billingAddress || {};
    addTo(maps.status, order.orderStatus, countRow("status"), bumpCount);
    addTo(maps.payment, order.paymentStatus, countRow("paymentStatus"), bumpCount);
    addOrderProducts(maps.products, order);
    if (order.orderStatus === CANCELLED) continue;
    const trendKey = groupBy === "month" ? day.slice(0, 7) : day;
    addTo(maps.trend, trendKey, salesRow("date"), (row) => addSale(row, revenue));
    addTo(maps.city, address.city, salesRow("city"), (row) => addSale(row, revenue));
    addTo(maps.state, address.state, salesRow("state"), (row) => addSale(row, revenue));
    addTo(maps.country, address.country, salesRow("country"), (row) => addSale(row, revenue));
  }

  return {
    summary: buildSummary(orders),
    salesTrend: [...maps.trend.values()].sort((first, second) =>
      first.date.localeCompare(second.date)
    ),
    ordersByStatus: [...maps.status.values()],
    paymentStatusBreakdown: [...maps.payment.values()],
    topProducts: [...maps.products.values()],
    salesByCity: [...maps.city.values()],
    salesByState: [...maps.state.values()],
    salesByCountry: [...maps.country.values()],
  };
}
