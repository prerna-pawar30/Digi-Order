import { describe, expect, it } from "vitest";
import {
  buildEcomAnalytics,
  ecomOrdersInRange,
  istDayKey,
  netOrderRevenue,
} from "./EcomAnalytics";

const order = (overrides) => ({
  orderId: "ORD-1",
  user: "u1",
  createdAt: "2026-10-16T05:46:10.573Z",
  grandTotal: 2000,
  refundAmount: 0,
  orderStatus: "placed",
  paymentStatus: "paid",
  shippingAddress: { city: "Nashik", state: "Maharashtra", country: "India" },
  items: [{ productName: "product55", price: 2000, quantity: 1 }],
  ...overrides,
});

describe("istDayKey", () => {
  it("uses India time", () => {
    expect(istDayKey("2026-10-15T20:00:00Z")).toBe("2026-10-16");
  });
});

describe("netOrderRevenue", () => {
  it("subtracts refunds and ignores cancelled orders", () => {
    expect(netOrderRevenue(order({ refundAmount: 500 }))).toBe(1500);
    expect(netOrderRevenue(order({ orderStatus: "cancelled" }))).toBe(0);
  });
});

describe("ecomOrdersInRange", () => {
  it("keeps the range and drops cancelled unless asked", () => {
    const orders = [
      order({ orderId: "a" }),
      order({ orderId: "b", createdAt: "2026-09-01T05:00:00Z" }),
      order({ orderId: "c", orderStatus: "cancelled" }),
    ];
    const range = { startDate: "2026-10-01", endDate: "2026-10-31" };
    expect(ecomOrdersInRange(orders, { ...range, includeCancelled: false })).toHaveLength(1);
    expect(ecomOrdersInRange(orders, { ...range, includeCancelled: true })).toHaveLength(2);
  });
});

describe("buildEcomAnalytics", () => {
  it("builds the same shape as the manual analytics", () => {
    const data = buildEcomAnalytics([
      order({ orderId: "a" }),
      order({ orderId: "b", user: "u2", createdAt: "2026-10-13T09:49:08Z" }),
      order({ orderId: "c", orderStatus: "cancelled" }),
    ]);
    expect(data.summary).toEqual({
      totalRevenue: 4000,
      totalOrders: 2,
      avgOrderValue: 2000,
      totalItemsSold: 2,
      totalUniqueCustomers: 2,
      totalRefunded: 0,
    });
    expect(data.salesTrend).toEqual([
      { date: "2026-10-13", totalOrders: 1, totalRevenue: 2000 },
      { date: "2026-10-16", totalOrders: 1, totalRevenue: 2000 },
    ]);
    expect(data.ordersByStatus).toEqual([
      { status: "placed", count: 2 },
      { status: "cancelled", count: 1 },
    ]);
    expect(data.salesByCountry).toEqual([{ country: "India", totalOrders: 2, totalRevenue: 4000 }]);
    expect(data.topProducts[0]).toEqual({
      productName: "product55",
      totalQuantitySold: 2,
      totalRevenue: 4000,
      totalOrders: 2,
    });
  });

  it("groups by month", () => {
    const data = buildEcomAnalytics([order({})], "month");
    expect(data.salesTrend[0].date).toBe("2026-10");
  });
});
