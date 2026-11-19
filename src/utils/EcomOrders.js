/**
 * Website (ecommerce) order helpers: fetch every page of orders, filter by status and search text,
 * and the one-line address text.
 *
 * Used by: pages/EcomOrdersPage.jsx, components/ecomorder/EcomOrderDetailModal.jsx
 */

import {
  ALL_ORDERS_FILTER,
  ECOM_ORDERS_FETCH_LIMIT,
  ECOM_ORDERS_MAX_FETCH_PAGES,
} from "../constants/EcomOrderConfig";

const TRAILING_PUNCTUATION = /[\s,.]+$/;

/**
 * Loads every order page by page. The backend sends 10 per page by default and no total, so it
 * keeps asking until a page comes back short (or repeats orders already seen).
 *
 * @param {(args: {page: number, limit: number}) => Promise<{orders: object[]}>} getPage
 * @returns {Promise<object[]>}
 */
export async function fetchAllEcomOrders(getPage) {
  const ordersById = new Map();
  for (let page = 1; page <= ECOM_ORDERS_MAX_FETCH_PAGES; page++) {
    const { orders } = await getPage({ page, limit: ECOM_ORDERS_FETCH_LIMIT });
    const sizeBefore = ordersById.size;
    orders.forEach((order) => ordersById.set(order.orderId || order._id, order));
    const isLastPage = orders.length < ECOM_ORDERS_FETCH_LIMIT || ordersById.size === sizeBefore;
    if (isLastPage) break;
  }
  return [...ordersById.values()];
}

/**
 * Orders matching the status filter and the search text (customer name or order id).
 *
 * Example: filterEcomOrders(orders, "placed", "prerna") -> placed orders of customers named
 * like "prerna".
 *
 * @param {object[]} orders
 * @param {string} statusFilter A status or ALL_ORDERS_FILTER.
 * @param {string} searchText
 * @returns {object[]}
 */
export function filterEcomOrders(orders, statusFilter, searchText) {
  const needle = searchText.trim().toLowerCase();
  return orders.filter((order) => {
    const isStatusMatch = statusFilter === ALL_ORDERS_FILTER || order.orderStatus === statusFilter;
    const isSearchMatch =
      !needle ||
      order.billingAddress?.fullName?.toLowerCase().includes(needle) ||
      order.orderId?.toLowerCase().includes(needle);
    return isStatusMatch && isSearchMatch;
  });
}

/**
 * Address on one line, skipping empty parts.
 *
 * Example: { street: "Room 812", area: "Satpur", city: "Nashik", state: "MH", pincode: "422012" }
 * -> "Room 812, Satpur, Nashik, MH - 422012".
 *
 * @param {object} address billingAddress / shippingAddress.
 * @returns {string}
 */
export function formatEcomAddress(address = {}) {
  // Customers often type a trailing comma or full stop; drop it so parts join cleanly.
  const place = [address.street, address.area, address.city, address.state]
    .map((part) => String(part || "").trim().replace(TRAILING_PUNCTUATION, ""))
    .filter(Boolean)
    .join(", ");
  return address.pincode ? `${place} - ${address.pincode}` : place;
}
