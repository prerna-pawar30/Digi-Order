/**
 * Website orders: every order customers placed on the online store, with status filter, search,
 * status changes (courier details when shipping, confirmation when cancelling) and a detail modal.
 *
 * Route: /website-orders
 * Used by: routes/AppRoutes.jsx
 * API: EcomOrderService.getOrdersPage, EcomOrderService.updateStatus, EcomOrderService.updateCourier
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import { EcomOrderService } from "../backend/ApiService";
import { fetchAllEcomOrders, filterEcomOrders } from "../utils/EcomOrders";
import { ALL_ORDERS_FILTER, ECOM_ORDERS_PER_PAGE } from "../constants/EcomOrderConfig";
import useEcomOrderActions from "../hooks/UseEcomOrderActions";
import EcomOrdersHeader from "../components/ecomorder/EcomOrdersHeader";
import EcomOrderRow, { EcomOrderCard } from "../components/ecomorder/EcomOrderRow";
import EcomOrderDetailModal from "../components/ecomorder/EcomOrderDetailModal";
import EcomCourierModal from "../components/ecomorder/EcomCourierModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import PagerFooter from "../components/ui/PagerFooter";

const TABLE_HEADINGS = [
  { label: "Order / customer", className: "" },
  { label: "Placed on", className: "hidden sm:table-cell" },
  { label: "Amount", className: "" },
  { label: "Status", className: "" },
  { label: "", className: "w-14" },
];

function TableState({ isLoading, loadError }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500 dark:text-mist-300">
        <Loader2 size={16} className="animate-spin" /> Loading website orders…
      </div>
    );
  }
  const Icon = loadError ? AlertTriangle : Inbox;
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Icon size={28} className="text-mist-300 dark:text-mist-500" />
      <p className="text-sm font-medium text-ink-950 dark:text-white">
        {loadError || "No orders match your filters"}
      </p>
    </div>
  );
}

function useEcomOrderList() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setOrders(await fetchAllEcomOrders(EcomOrderService.getOrdersPage));
    } catch (error) {
      setLoadError(error?.response?.data?.message || "Could not load website orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return { orders, setOrders, isLoading, loadError, loadOrders };
}

export default function EcomOrdersPage() {
  const { orders, setOrders, isLoading, loadError, loadOrders } = useEcomOrderList();
  const actions = useEcomOrderActions(setOrders);
  const [statusFilter, setStatusFilter] = useState(ALL_ORDERS_FILTER);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = useMemo(
    () => filterEcomOrders(orders, statusFilter, searchText),
    [orders, statusFilter, searchText]
  );
  const totalPages = Math.ceil(filteredOrders.length / ECOM_ORDERS_PER_PAGE);
  const pageStart = (currentPage - 1) * ECOM_ORDERS_PER_PAGE;
  const pageOrders = filteredOrders.slice(pageStart, pageStart + ECOM_ORDERS_PER_PAGE);

  useEffect(() => setCurrentPage(1), [statusFilter, searchText]);

  return (
    <div>
      <EcomOrdersHeader
        searchText={searchText}
        onSearchTextChange={setSearchText}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={loadOrders}
      />

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {isLoading || loadError || pageOrders.length === 0 ? (
          <TableState isLoading={isLoading} loadError={loadError} />
        ) : (
          <>
            {/* Phones: cards, nothing cut off */}
            <div className="divide-y divide-mist-100 dark:divide-white/10 md:hidden">
              {pageOrders.map((order) => (
                <EcomOrderCard
                  key={order._id || order.orderId}
                  order={order}
                  isUpdating={actions.updatingOrderId === order.orderId}
                  onOpen={setSelectedOrder}
                  onStatusChange={actions.handleStatusChange}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-mist-100 bg-mist-50 text-[11px] font-semibold uppercase tracking-wider text-mist-500 dark:border-white/10 dark:bg-white/5 dark:text-mist-300">
                  <tr>
                    {TABLE_HEADINGS.map((heading) => (
                      <th key={heading.label} className={`px-4 py-3 ${heading.className}`}>
                        {heading.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-100 dark:divide-white/10">
                  {pageOrders.map((order) => (
                    <EcomOrderRow
                      key={order._id || order.orderId}
                      order={order}
                      isUpdating={actions.updatingOrderId === order.orderId}
                      onOpen={setSelectedOrder}
                      onStatusChange={actions.handleStatusChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!isLoading && filteredOrders.length > 0 && (
          <PagerFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filteredOrders.length}
            countLabel="orders"
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <EcomOrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      {actions.courierOrder && (
        <EcomCourierModal
          order={actions.courierOrder}
          isSaving={actions.updatingOrderId === actions.courierOrder.orderId}
          onClose={actions.closeCourier}
          onSubmit={actions.handleCourierSubmit}
        />
      )}
      {actions.cancelOrder && (
        <ConfirmModal
          title="Cancel this order?"
          message={`Order ${actions.cancelOrder.orderId} will be cancelled. This cannot be undone.`}
          confirmLabel="Cancel order"
          isBusy={actions.updatingOrderId === actions.cancelOrder.orderId}
          onConfirm={actions.handleCancelConfirm}
          onClose={actions.closeCancel}
        />
      )}
    </div>
  );
}
