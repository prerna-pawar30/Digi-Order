/**
 * useEcomAnalytics(filters, isEnabled): website-order analytics for the Analytics page. Loads every
 * website order once (and on reload) and builds the chart data for the chosen date range locally;
 * the sales dashboard API is fetched with the same dates.
 *
 * Used by: pages/AnalyticsPage.jsx
 * API: EcomOrderService.getOrdersPage, EcomOrderService.getSalesDashboard
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { EcomOrderService } from "../backend/ApiService";
import { fetchAllEcomOrders } from "../utils/EcomOrders";
import { buildEcomAnalytics, ecomOrdersInRange } from "../utils/EcomAnalytics";

/**
 * @param {{ startDate: string, endDate: string, groupBy: string, includeCancelled: boolean }} filters
 * @param {boolean} isEnabled Only loads while the Website tab is open.
 */
export default function useEcomAnalytics(filters, isEnabled) {
  const [orders, setOrders] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filters;

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      setOrders(await fetchAllEcomOrders(EcomOrderService.getOrdersPage));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load website orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await EcomOrderService.getSalesDashboard({ startDate, endDate }));
    } catch {
      // The charts still work from the orders; only this one card goes empty.
      setDashboard(null);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (isEnabled && orders === null) loadOrders();
  }, [isEnabled, orders, loadOrders]);

  useEffect(() => {
    if (isEnabled) loadDashboard();
  }, [isEnabled, loadDashboard]);

  const data = useMemo(
    () => (orders ? buildEcomAnalytics(ecomOrdersInRange(orders, filters), filters.groupBy) : null),
    [orders, filters]
  );

  const reload = () => Promise.all([loadOrders(), loadDashboard()]);

  return { data, dashboard, isLoading, reload };
}
