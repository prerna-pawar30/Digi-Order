/**
 * Fixed values for website (ecommerce) orders and their return requests: status filter list,
 * allowed status moves, page sizes and the return-approval stock options.
 *
 * Used by: pages/EcomOrdersPage.jsx, pages/ReturnRequestsPage.jsx, components/ecomorder/*
 */

export const ALL_ORDERS_FILTER = "All orders";

export const ECOM_FILTER_STATUS_OPTIONS = [
  ALL_ORDERS_FILTER,
  "pending",
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

// Mirrors the website order backend: only these moves are offered.
// "cancelled" is shown as the separate "Cancel order" action in the menu.
// Moving to "shipped" first asks for courier details (EcomCourierModal).
export const ECOM_STATUS_PROGRESSION = {
  pending: ["confirmed", "cancelled"],
  placed: ["confirmed", "cancelled"],
  confirmed: ["shipped"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const CANCELLED_STATUS = "cancelled";
export const SHIPPED_STATUS = "shipped";

export const ECOM_ORDERS_PER_PAGE = 10;
// Orders are fetched page by page from the backend in chunks of this size.
export const ECOM_ORDERS_FETCH_LIMIT = 50;
// Safety stop so a backend that ignores `page` can never loop forever.
export const ECOM_ORDERS_MAX_FETCH_PAGES = 40;

export const RETURN_REQUESTS_PER_PAGE = 6;

// The "approved but refund failed" warning stays longer so staff can read it.
export const REFUND_WARNING_TOAST_MS = 8000;

export const RETURN_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const RETURN_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
  approved: "bg-mint-100 text-mint-500 dark:bg-mint-500/15 dark:text-mint-400",
  rejected: "bg-coral-100 text-coral-500 dark:bg-coral-500/15 dark:text-coral-400",
};

// What happens to the returned stock when a return is approved. Sent as
// `stockAction` in the approve payload. ("stock_update" used to be sent as
// `permission`, but no such permission exists, so the permission check failed.)
export const RETURN_STOCK_OPTIONS = [
  { value: "stock_update", label: "Approve and put items back into active stock" },
  { value: "no_stock_update", label: "Approve and quarantine stock (damaged / faulty)" },
];

// Sent as `stockAction` when a return request is rejected.
export const RETURN_REJECT_STOCK_ACTION = "no_stock_update";
