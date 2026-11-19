/**
 * useEcomOrderActions(setOrders): status changes for website orders, including the two steps that
 * need a modal first: "shipped" (courier details) and "cancelled" (confirmation).
 *
 * Used by: pages/EcomOrdersPage.jsx
 * API: EcomOrderService.updateCourier, EcomOrderService.updateStatus
 */

import { useState } from "react";
import toast from "react-hot-toast";
import { EcomOrderService } from "../backend/ApiService";
import { CANCELLED_STATUS, SHIPPED_STATUS } from "../constants/EcomOrderConfig";
import { statusLabel } from "../components/order/StatusBadge";

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

/**
 * @param {Function} setOrders State setter of the page's order list (updated in place on success).
 */
export default function useEcomOrderActions(setOrders) {
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [courierOrder, setCourierOrder] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);

  const applyStatus = async (order, newStatus, extraFields = {}) => {
    setUpdatingOrderId(order.orderId);
    try {
      await EcomOrderService.updateStatus(order.orderId, newStatus);
      setOrders((previous) =>
        previous.map((item) =>
          item.orderId === order.orderId ? { ...item, ...extraFields, orderStatus: newStatus } : item
        )
      );
      toast.success(`Order marked ${statusLabel(newStatus)}`);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Could not change the order status"));
      return false;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Shipping and cancelling open a modal first; every other move happens at once.
  const handleStatusChange = (order, newStatus) => {
    if (newStatus === SHIPPED_STATUS) return setCourierOrder(order);
    if (newStatus === CANCELLED_STATUS) return setCancelOrder(order);
    return applyStatus(order, newStatus);
  };

  // Courier details are saved first; the order is only marked shipped if that worked.
  const handleCourierSubmit = async (courier) => {
    const order = courierOrder;
    setUpdatingOrderId(order.orderId);
    try {
      await EcomOrderService.updateCourier(order.orderId, courier);
    } catch (error) {
      setUpdatingOrderId(null);
      toast.error(errorMessage(error, "Could not save the courier details"));
      return;
    }
    const isDone = await applyStatus(order, SHIPPED_STATUS, {
      corourseServiceName: courier.serviceName,
      DOCNumber: courier.docNumber,
    });
    if (isDone) setCourierOrder(null);
  };

  const handleCancelConfirm = async () => {
    const isDone = await applyStatus(cancelOrder, CANCELLED_STATUS);
    if (isDone) setCancelOrder(null);
  };

  return {
    updatingOrderId,
    courierOrder,
    cancelOrder,
    handleStatusChange,
    handleCourierSubmit,
    handleCancelConfirm,
    closeCourier: () => setCourierOrder(null),
    closeCancel: () => setCancelOrder(null),
  };
}
