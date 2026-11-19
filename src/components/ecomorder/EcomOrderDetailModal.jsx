/**
 * Full view of one website order: shipping address, payment and courier details, and the items.
 *
 * Used by: pages/EcomOrdersPage.jsx
 */

import { X as CloseIcon, MapPin, Phone, Truck, PackageCheck } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "../order/StatusBadge";
import { formatCurrency, formatDateTime } from "../../utils/Format";
import { formatEcomAddress } from "../../utils/EcomOrders";

function DetailLine({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-mist-500 dark:text-mist-300">{label}</span>
      <span className="text-right font-medium text-ink-950 dark:text-white">{children}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mist-400 dark:text-mist-500">
      {children}
    </h4>
  );
}

function RecipientCard({ address }) {
  return (
    <div>
      <SectionTitle>
        <MapPin size={12} /> Ship to
      </SectionTitle>
      <div className="rounded-xl border border-mist-100 bg-mist-50 p-4 dark:border-white/10 dark:bg-white/5">
        <p className="font-semibold text-ink-950 dark:text-white">{address?.fullName || "—"}</p>
        <p className="mt-1 text-sm text-mist-700 dark:text-mist-300">
          {formatEcomAddress(address)}
        </p>
        {address?.phone && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
            <Phone size={13} /> {address.phone}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ order }) {
  return (
    <div>
      <SectionTitle>
        <Truck size={12} /> Order summary
      </SectionTitle>
      <div className="rounded-xl border border-mist-100 px-4 py-2 dark:border-white/10">
        <DetailLine label="Placed on">{formatDateTime(order.createdAt)}</DetailLine>
        <DetailLine label="Status">
          <OrderStatusBadge status={order.orderStatus} />
        </DetailLine>
        <DetailLine label="Payment">
          <PaymentStatusBadge status={order.paymentStatus} />
        </DetailLine>
        <DetailLine label="Payment mode">{order.paymentMode || "—"}</DetailLine>
        {order.corourseServiceName && (
          <DetailLine label="Courier">
            {order.corourseServiceName}
            {order.DOCNumber ? ` · ${order.DOCNumber}` : ""}
          </DetailLine>
        )}
        <div className="mt-1 border-t border-mist-100 pt-1 dark:border-white/10">
          <DetailLine label="GST included">{formatCurrency(order.gstAmount)}</DetailLine>
          <DetailLine label="Grand total">{formatCurrency(order.grandTotal)}</DetailLine>
        </div>
      </div>
    </div>
  );
}

function ItemsTable({ items = [] }) {
  return (
    <div>
      <SectionTitle>Items</SectionTitle>
      <div className="overflow-hidden rounded-xl border border-mist-100 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist-50 text-[11px] font-bold uppercase text-mist-500 dark:bg-white/5 dark:text-mist-300">
            <tr>
              <th className="px-4 py-2.5">Product</th>
              <th className="w-14 px-4 py-2.5 text-center">Qty</th>
              <th className="w-28 px-4 py-2.5 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100 dark:divide-white/10">
            {items.map((item) => (
              <tr key={item.variantId || item.productId}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-950 dark:text-white">{item.productName}</p>
                  <p className="text-[11px] text-mist-500 dark:text-mist-300">
                    {item.variantName} · SKU {item.sku}
                  </p>
                </td>
                <td className="px-4 py-3 text-center text-mist-700 dark:text-mist-300">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-ink-950 dark:text-white">
                  {formatCurrency(item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * @param {{ order: object|null, onClose: Function }} props
 */
export default function EcomOrderDetailModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-panel dark:bg-ink-900 sm:max-h-[90vh] sm:rounded-xl2">
        <div className="flex items-start justify-between border-b border-mist-100 px-6 py-4 dark:border-white/10">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink-950 dark:text-white">
              <PackageCheck size={20} className="text-orange-500" /> Website order
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-mist-500 dark:text-mist-300">
              {order.orderId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RecipientCard address={order.shippingAddress || order.billingAddress} />
            <SummaryCard order={order} />
          </div>
          <ItemsTable items={order.items} />
        </div>
      </div>
    </div>
  );
}
