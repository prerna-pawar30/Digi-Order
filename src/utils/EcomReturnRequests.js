/**
 * Website-order return requests: turns the raw "orders with returnRequests" API response into one
 * row per request (with product name, image and price filled in from the order), and works out the
 * refund and the approve / reject payloads.
 *
 * Used by: pages/ReturnRequestsPage.jsx, components/ecomorder/ReturnProcessModal.jsx
 */

import { RETURN_STATUS, RETURN_REJECT_STOCK_ACTION } from "../constants/EcomOrderConfig";

/**
 * Fills one returned item with the details of the matching order line (same variantId).
 *
 * @param {object} returnItem Item from returnRequest.items.
 * @param {object[]} orderItems order.items.
 * @returns {object}
 */
function enrichReturnItem(returnItem, orderItems) {
  const orderLine = orderItems.find((line) => line.variantId === returnItem.variantId);
  return {
    ...returnItem,
    productId: returnItem.productId || orderLine?.productId,
    productName: orderLine?.productName || "Unknown product",
    variantName: orderLine?.variantName || "Standard",
    sku: orderLine?.sku || "N/A",
    image: orderLine?.image || "",
    // The return item does not carry a price, so take it from the order line.
    price: Number(returnItem.price ?? orderLine?.price) || 0,
  };
}

/**
 * Flattens orders into one row per return request.
 *
 * Example: 2 orders with 1 and 2 return requests -> 3 rows, each with orderId, grandTotal,
 * requestId, status, reason and enriched items.
 *
 * @param {object[]} orders data.orders from GET /order/return-req/get.
 * @returns {object[]}
 */
export function flattenReturnRequests(orders = []) {
  return orders.flatMap((order) =>
    (order.returnRequests || []).map((request) => {
      const items = (request.items || []).map((item) => enrichReturnItem(item, order.items || []));
      return {
        ...request,
        requestId: request.requestId || request._id,
        status: request.status || RETURN_STATUS.PENDING,
        orderId: order.orderId,
        customerName: order.billingAddress?.fullName || "",
        grandTotal: Number(order.grandTotal) || 0,
        items,
        reason: request.reason || items[0]?.reason || "",
      };
    })
  );
}

/**
 * Refund for a return request: sum of price x quantity of the returned items.
 *
 * Example: [{ price: 2000, quantity: 1 }, { price: 500, quantity: 2 }] -> 3000.
 *
 * @param {object[]} items Enriched return items.
 * @returns {number}
 */
export function calculateReturnRefund(items = []) {
  return items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}

/**
 * Body for approving a return request.
 *
 * @param {object} request Flattened return request.
 * @param {string} stockOption One of RETURN_STOCK_OPTIONS values.
 * @returns {object}
 */
export function buildApprovePayload(request, stockOption) {
  return {
    status: RETURN_STATUS.APPROVED,
    stockAction: stockOption,
    refundAmount: calculateReturnRefund(request.items),
    items: request.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      approvedQuantity: item.quantity,
    })),
  };
}

/**
 * Body for rejecting a return request (nothing goes back to stock).
 *
 * @param {object} request Flattened return request.
 * @returns {object}
 */
export function buildRejectPayload(request) {
  return {
    status: RETURN_STATUS.REJECTED,
    stockAction: RETURN_REJECT_STOCK_ACTION,
    items: request.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      approvedQuantity: 0,
    })),
  };
}

/**
 * Short order id for tables: "ORD-1f1c924e-378b-..." -> "ORD-1f1c924e".
 *
 * @param {string} orderId
 * @returns {string}
 */
export function shortEcomOrderId(orderId) {
  if (!orderId) return "—";
  const parts = orderId.split("-");
  return parts.length > 2 ? `${parts[0]}-${parts[1]}` : orderId;
}
