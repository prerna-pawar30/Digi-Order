/**
 * One website order in the orders table: customer, date, amount + payment, status and the
 * status-change menu. Clicking the customer opens the detail modal.
 *
 * Used by: pages/EcomOrdersPage.jsx
 */

import { Loader2, MapPin, Eye } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "../order/StatusBadge";
import StatusActionMenu from "../order/StatusActionMenu";
import { formatCurrency, formatDateTime } from "../../utils/Format";
import { shortEcomOrderId } from "../../utils/EcomReturnRequests";
import { ECOM_STATUS_PROGRESSION, CANCELLED_STATUS } from "../../constants/EcomOrderConfig";

function CustomerCell({ order, onOpen }) {
  return (
    <td className="px-4 py-3">
      <button
        type="button"
        onClick={() => onOpen(order)}
        className="group flex max-w-full items-center gap-1.5 text-left font-medium text-ink-950 hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
      >
        <span className="truncate">{order.billingAddress?.fullName || "—"}</span>
        <Eye size={14} className="shrink-0 opacity-0 transition group-hover:opacity-100" />
      </button>
      <p className="truncate font-mono text-[11px] text-mist-500 dark:text-mist-300">
        {shortEcomOrderId(order.orderId)}
      </p>
      <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-mist-500 dark:text-mist-300">
        <MapPin size={12} className="shrink-0" /> {order.billingAddress?.city || "—"}
      </p>
    </td>
  );
}

/**
 * @param {{ order: object, isUpdating: boolean, onOpen: Function,
 *           onStatusChange: (order: object, status: string) => void }} props
 */
export default function EcomOrderRow({ order, isUpdating, onOpen, onStatusChange }) {
  const allowedMoves = ECOM_STATUS_PROGRESSION[order.orderStatus] || [];
  const nextStatuses = allowedMoves.filter((status) => status !== CANCELLED_STATUS);
  const canCancel = allowedMoves.includes(CANCELLED_STATUS);

  return (
    <tr className="hover:bg-mist-50 dark:hover:bg-white/5">
      <CustomerCell order={order} onOpen={onOpen} />
      <td className="hidden px-4 py-3 text-xs text-mist-500 dark:text-mist-300 sm:table-cell">
        {formatDateTime(order.createdAt)}
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-ink-950 dark:text-white">
          {formatCurrency(order.grandTotal)}
        </p>
        <div className="mt-1">
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </td>
      <td className="px-4 py-3">
        <OrderStatusBadge status={order.orderStatus} />
      </td>
      <td className="px-4 py-3">
        <div className="grid h-8 w-8 place-items-center">
          {isUpdating ? (
            <Loader2 size={14} className="animate-spin text-mist-400 dark:text-mist-500" />
          ) : (
            <StatusActionMenu
              nextStatuses={nextStatuses}
              canCancel={canCancel}
              onSelectStatus={(status) => onStatusChange(order, status)}
              onCancel={() => onStatusChange(order, CANCELLED_STATUS)}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Phone version of one website order: a card instead of a table row, so nothing is cut off
 * on small screens. Same props as EcomOrderRow.
 *
 * Used by: pages/EcomOrdersPage.jsx
 */
export function EcomOrderCard({ order, isUpdating, onOpen, onStatusChange }) {
  const allowedMoves = ECOM_STATUS_PROGRESSION[order.orderStatus] || [];
  const nextStatuses = allowedMoves.filter((status) => status !== CANCELLED_STATUS);
  const canCancel = allowedMoves.includes(CANCELLED_STATUS);

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onOpen(order)} className="min-w-0 text-left">
          <p className="truncate font-medium text-ink-950 dark:text-white">
            {order.billingAddress?.fullName || "—"}
          </p>
          <p className="truncate font-mono text-[11px] text-mist-500 dark:text-mist-300">
            {shortEcomOrderId(order.orderId)}
          </p>
        </button>
        <p className="shrink-0 font-semibold tabular-nums text-ink-950 dark:text-white">
          {formatCurrency(order.grandTotal)}
        </p>
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-mist-500 dark:text-mist-300">
        <MapPin size={12} className="shrink-0" />
        <span className="truncate">
          {order.billingAddress?.city || "—"} · {formatDateTime(order.createdAt)}
        </span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-mist-100 pt-3 dark:border-white/10">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
            Payment
          </p>
          <div className="flex min-h-[40px] items-center">
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
            Order status
          </p>
          {isUpdating ? (
            <div className="flex min-h-[40px] items-center px-2.5">
              <Loader2 size={16} className="animate-spin text-mist-400 dark:text-mist-500" />
            </div>
          ) : (
            <StatusActionMenu
              variant="pill"
              currentStatus={order.orderStatus}
              nextStatuses={nextStatuses}
              canCancel={canCancel}
              onSelectStatus={(status) => onStatusChange(order, status)}
              onCancel={() => onStatusChange(order, CANCELLED_STATUS)}
            />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(order)}
        className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-mist-200 text-xs font-medium text-mist-700 hover:bg-mist-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
      >
        <Eye size={14} /> View order
      </button>
    </div>
  );
}
