/**
 * Decision screen for one return request: the returned items with prices, the refund that will be
 * sent, what to do with the stock, and Defer / Deny claim / Approve and refund buttons.
 * It only decides; the page calls the backend.
 *
 * Used by: pages/ReturnRequestsPage.jsx
 */

import { useState } from "react";
import { X as CloseIcon, Loader2, RotateCcw, ShoppingBag } from "lucide-react";
import { Field, Select } from "../ui/FormField";
import { formatCurrency } from "../../utils/Format";
import { calculateReturnRefund } from "../../utils/EcomReturnRequests";
import { RETURN_STOCK_OPTIONS } from "../../constants/EcomOrderConfig";

function ReturnItemCard({ item }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-mist-200 bg-white dark:border-white/10">
        {item.image ? (
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-mist-300">
            <ShoppingBag size={16} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink-950 dark:text-white">
            {item.productName}
          </p>
          <span className="shrink-0 font-mono text-[11px] text-mist-500 dark:text-mist-300">
            {item.sku}
          </span>
        </div>
        <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
          {item.variantName}
        </p>
        <p className="text-xs text-mist-700 dark:text-mist-300">
          {formatCurrency(item.price)} × {item.quantity}
        </p>
      </div>
    </div>
  );
}

function RefundSummary({ orderTotal, refundAmount }) {
  return (
    <div className="rounded-xl bg-ink-950 p-4 text-white">
      <div className="flex justify-between text-xs text-mist-300">
        <span>Order total</span>
        <span>{formatCurrency(orderTotal)}</span>
      </div>
      <div className="mt-1 flex justify-between border-b border-white/10 pb-3 text-xs text-coral-400">
        <span>Returned items</span>
        <span>− {formatCurrency(refundAmount)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-mint-400">
          Refund to customer
        </span>
        <span className="font-mono text-2xl font-bold text-mint-400">
          {formatCurrency(refundAmount)}
        </span>
      </div>
    </div>
  );
}

/**
 * @param {{ request: object, isSaving: boolean, onClose: Function,
 *           onApprove: (stockOption: string) => void, onReject: Function }} props
 */
export default function ReturnProcessModal({ request, isSaving, onClose, onApprove, onReject }) {
  const [stockOption, setStockOption] = useState(RETURN_STOCK_OPTIONS[0].value);
  const refundAmount = calculateReturnRefund(request.items);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 sm:items-center sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-panel dark:bg-ink-900 sm:max-h-[90vh] sm:rounded-xl2">
        <div className="flex items-start justify-between border-b border-mist-100 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <RotateCcw size={17} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-950 dark:text-white">
                Process return
              </h3>
              <p className="font-mono text-[11px] text-mist-500 dark:text-mist-300">
                {request.orderId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <div className="max-h-56 divide-y divide-mist-100 overflow-y-auto rounded-xl border border-mist-200 dark:divide-white/10 dark:border-white/10">
            {request.items.map((item) => (
              <ReturnItemCard key={item.variantId || item.productId} item={item} />
            ))}
          </div>
          <RefundSummary orderTotal={request.grandTotal} refundAmount={refundAmount} />
          <Field label="Returned stock">
            <Select value={stockOption} onChange={(event) => setStockOption(event.target.value)}>
              {RETURN_STOCK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-mist-100 px-6 py-4 dark:border-white/10 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-mist-200 px-4 py-2 text-sm font-medium text-mist-700 hover:bg-mist-50 disabled:opacity-60 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
          >
            Decide later
          </button>
          <button
            onClick={onReject}
            disabled={isSaving}
            className="rounded-lg border border-coral-400 px-4 py-2 text-sm font-semibold text-coral-500 hover:bg-coral-100 disabled:opacity-60 dark:text-coral-400 dark:hover:bg-coral-500/10"
          >
            Deny claim
          </button>
          <button
            onClick={() => onApprove(stockOption)}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-400 disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            Approve and refund
          </button>
        </div>
      </div>
    </div>
  );
}
