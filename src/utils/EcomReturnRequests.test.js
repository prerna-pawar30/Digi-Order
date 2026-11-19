import { describe, expect, it } from "vitest";
import {
  buildApprovePayload,
  buildRejectPayload,
  calculateReturnRefund,
  flattenReturnRequests,
  shortEcomOrderId,
} from "./EcomReturnRequests";

const ORDER = {
  orderId: "ORD-1f1c924e-378b-63a0-84db-c03ae89b0980",
  grandTotal: 2500,
  billingAddress: { fullName: "Prerna Pawar" },
  items: [
    { productId: "p1", variantId: "v1", productName: "product55", sku: "S1", price: 2000 },
    { productId: "p2", variantId: "v2", productName: "product44", sku: "S2", price: 250 },
  ],
  returnRequests: [
    { _id: "r1", status: "pending", items: [{ variantId: "v1", quantity: 1, reason: "Broken" }] },
    { requestId: "r2", items: [{ variantId: "v2", quantity: 2 }] },
  ],
};

describe("flattenReturnRequests", () => {
  it("makes one row per request with order details and prices", () => {
    const rows = flattenReturnRequests([ORDER, { orderId: "x", returnRequests: [] }]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      requestId: "r1",
      orderId: ORDER.orderId,
      customerName: "Prerna Pawar",
      reason: "Broken",
    });
    expect(rows[0].items[0]).toMatchObject({ productName: "product55", price: 2000, productId: "p1" });
    expect(rows[1]).toMatchObject({ requestId: "r2", status: "pending" });
  });
});

describe("calculateReturnRefund", () => {
  it("sums price x quantity", () => {
    const [first, second] = flattenReturnRequests([ORDER]);
    expect(calculateReturnRefund(first.items)).toBe(2000);
    expect(calculateReturnRefund(second.items)).toBe(500);
    expect(calculateReturnRefund([])).toBe(0);
  });
});

describe("payloads", () => {
  it("approve sends quantities, refund and stock option", () => {
    const [request] = flattenReturnRequests([ORDER]);
    expect(buildApprovePayload(request, "stock_update")).toEqual({
      status: "approved",
      stockAction: "stock_update",
      refundAmount: 2000,
      items: [{ productId: "p1", variantId: "v1", approvedQuantity: 1 }],
    });
  });

  it("reject approves zero quantity", () => {
    const [request] = flattenReturnRequests([ORDER]);
    expect(buildRejectPayload(request).items[0].approvedQuantity).toBe(0);
  });
});

describe("shortEcomOrderId", () => {
  it("keeps prefix and first block", () => {
    expect(shortEcomOrderId(ORDER.orderId)).toBe("ORD-1f1c924e");
    expect(shortEcomOrderId("")).toBe("—");
  });
});
