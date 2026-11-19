/**
 * One return request in the Return requests table: order id, returned items, the customer's
 * reason, status and the Process button (only while pending).
 *
 * Used by: pages/ReturnRequestsPage.jsx
 */

import { CheckCircle, AlertCircle, ShoppingBag } from "lucide-react";
import { statusLabel } from "../order/StatusBadge";
import { shortEcomOrderId } from "../../utils/EcomReturnRequests";
import { RETURN_STATUS, RETURN_STATUS_STYLES } from "../../constants/EcomOrderConfig";

function ReturnItemLine({ item }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-mist-200 bg-white dark:border-white/10">
        {item.image ? (
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-mist-300">
            <ShoppingBag size={14} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink-950 dark:text-white">
          {item.productName}
        </p>
        <p className="text-[11px] text-mist-500 dark:text-mist-300">
          {item.variantName} · Qty {item.quantity}
        </p>
      </div>
    </div>
  );
}

/**
 * @param {{ request: object, onProcess: (request: object) => void }} props
 */
export default function ReturnRequestRow({ request, onProcess }) {
  const isPending = request.status === RETURN_STATUS.PENDING;
  const statusClass =
    RETURN_STATUS_STYLES[request.status] ||
    "bg-mist-100 text-mist-700 dark:bg-white/10 dark:text-mist-300";

  return (
    <tr className="align-top hover:bg-mist-50 dark:hover:bg-white/5">
      <td className="px-4 py-3">
        <span className="mb-2.5 inline-block rounded-md bg-orange-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
          {shortEcomOrderId(request.orderId)}
        </span>
        {request.customerName && (
          <p className="mb-2 text-xs text-mist-500 dark:text-mist-300">{request.customerName}</p>
        )}
        <div className="max-w-xs space-y-2">
          {request.items.map((item) => (
            <ReturnItemLine key={item.variantId || item.productId} item={item} />
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="flex max-w-xs items-start gap-2 text-xs italic text-mist-700 dark:text-mist-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-mist-300" />
          {request.reason ? `"${request.reason}"` : "No reason given."}
        </p>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass}`}
        >
          {statusLabel(request.status)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {isPending ? (
          <button
            type="button"
            onClick={() => onProcess(request)}
            className="rounded-lg bg-ink-950 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 dark:bg-white dark:text-ink-950 dark:hover:bg-orange-400"
          >
            Process
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-mist-500 dark:text-mist-300">
            <CheckCircle size={13} className="text-mint-500" /> Done
          </span>
        )}
      </td>
    </tr>
  );
}

/**
 * Phone version of one return request: a card instead of a table row. Same props as
 * ReturnRequestRow.
 *
 * Used by: pages/ReturnRequestsPage.jsx
 */
export function ReturnRequestCard({ request, onProcess }) {
  const isPending = request.status === RETURN_STATUS.PENDING;
  const statusClass =
    RETURN_STATUS_STYLES[request.status] ||
    "bg-mist-100 text-mist-700 dark:bg-white/10 dark:text-mist-300";

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-orange-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
            {shortEcomOrderId(request.orderId)}
          </span>
          {request.customerName && (
            <p className="mt-1 truncate text-sm font-medium text-ink-950 dark:text-white">
              {request.customerName}
            </p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass}`}
        >
          {statusLabel(request.status)}
        </span>
      </div>

      <div className="mt-3 space-y-2 rounded-lg bg-mist-50 p-3 dark:bg-white/5">
        {request.items.map((item) => (
          <ReturnItemLine key={item.variantId || item.productId} item={item} />
        ))}
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs italic text-mist-700 dark:text-mist-300">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-mist-300" />
        {request.reason ? `"${request.reason}"` : "No reason given."}
      </p>

      {isPending ? (
        <button
          type="button"
          onClick={() => onProcess(request)}
          className="mt-3 h-10 w-full rounded-lg bg-ink-950 text-sm font-semibold text-white hover:bg-orange-600 dark:bg-white dark:text-ink-950 dark:hover:bg-orange-400"
        >
          Process request
        </button>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-mist-500 dark:text-mist-300">
          <CheckCircle size={13} className="text-mint-500" /> Done
        </p>
      )}
    </div>
  );
}
