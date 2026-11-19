/**
 * Analytics dashboard with a Manual orders / Website orders switch: revenue, orders, statuses,
 * funnel, products and locations for a date range. Manual = manual orders + direct invoices;
 * Website = ecommerce orders (+ the sales dashboard API). The two are never added together.
 *
 * Route: /analytics
 * Used by: routes/AppRoutes.jsx
 * API: InvoiceService.getAllInvoices, ManualOrderService.getAnalytics,
 * EcomOrderService.getOrdersPage, EcomOrderService.getSalesDashboard
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Inbox, RefreshCw, ClipboardList, Globe } from "lucide-react";
import { ThemeProvider } from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

import { ManualOrderService, InvoiceService } from "../backend/ApiService";
import { fetchAllInvoices } from "../utils/InvoiceCustomers";
import { directInvoicesInRange, mergeInvoiceAnalytics } from "../utils/InvoiceAnalytics";
import { formatCurrency } from "../utils/Format";
import { getMuiTheme } from "../constants/MuiTheme";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import AnalyticsCharts from "../components/dashboard/AnalyticsCharts";
import SalesDashboardCard from "../components/dashboard/SalesDashboardCard";
import useEcomAnalytics from "../hooks/UseEcomAnalytics";

// Manual orders (staff-created + direct invoices) and website orders are
// different businesses, so they are never added together on this page.
const SOURCE_MANUAL = "manual";
const SOURCE_WEBSITE = "website";
const SOURCE_TABS = [
  { value: SOURCE_MANUAL, label: "Manual orders", icon: ClipboardList },
  { value: SOURCE_WEBSITE, label: "Website orders", icon: Globe },
];

function SourceSwitch({ source, onChange }) {
  return (
    <ToggleButtonGroup
      value={source}
      exclusive
      fullWidth
      onChange={(_, selected) => selected && onChange(selected)}
      sx={{ maxWidth: 420 }}
    >
      {SOURCE_TABS.map((tab) => (
        <ToggleButton key={tab.value} value={tab.value} sx={{ textTransform: "none", gap: 1 }}>
          <tab.icon size={15} /> {tab.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function StateBox({ isLoading }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl2 border border-mist-200 bg-white py-20 text-center text-sm shadow-panel dark:border-white/10 dark:bg-ink-900">
      {isLoading ? (
        <span className="flex items-center gap-2 text-mist-500 dark:text-mist-300">
          <Loader2 size={16} className="animate-spin" /> Loading analytics…
        </span>
      ) : (
        <>
          <Inbox size={28} className="text-mist-300 dark:text-mist-500" />
          <p className="font-medium text-ink-950 dark:text-white">No analytics available</p>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const muiTheme = useMemo(() => getMuiTheme(theme), [theme]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthAgo = useMemo(
    () => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    []
  );

  const [filters, setFilters] = useState({
    startDate: monthAgo,
    endDate: today,
    groupBy: "day",
    includeCancelled: false,
    includeInvoices: true,
  });
  const [source, setSource] = useState(SOURCE_MANUAL);
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  // Every invoice, fetched once and filtered here per date range; the
  // Refresh button refetches them.
  const [allInvoices, setAllInvoices] = useState(null);

  const load = async (refreshInvoices = false) => {
    setLoading(true);
    try {
      const needInvoices = filters.includeInvoices && (refreshInvoices || !allInvoices);
      const [res, invoices] = await Promise.all([
        ManualOrderService.getAnalytics(filters),
        needInvoices ? fetchAllInvoices(InvoiceService.getAllInvoices) : null,
      ]);
      setOrderData(res?.data || null);
      if (invoices) setAllInvoices(invoices);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  };

  // includeInvoices only needs the invoices (fetched once), not the backend.
  useEffect(() => {
    if (source === SOURCE_MANUAL) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, filters.startDate, filters.endDate, filters.groupBy, filters.includeCancelled]);

  useEffect(() => {
    if (filters.includeInvoices && !allInvoices && orderData) {
      fetchAllInvoices(InvoiceService.getAllInvoices)
        .then(setAllInvoices)
        .catch(() => toast.error("Could not load invoices"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.includeInvoices]);

  // Orders from the backend + invoices made directly on the Invoices page.
  const directInvoices = useMemo(
    () =>
      filters.includeInvoices && allInvoices ? directInvoicesInRange(allInvoices, filters) : [],
    [allInvoices, filters]
  );
  const data = useMemo(
    () => mergeInvoiceAnalytics(orderData, directInvoices, filters.groupBy),
    [orderData, directInvoices, filters.groupBy]
  );
  const website = useEcomAnalytics(filters, source === SOURCE_WEBSITE);
  const isWebsite = source === SOURCE_WEBSITE;
  const shownData = isWebsite ? website.data : data;
  const isBusy = isWebsite ? website.isLoading : loading;
  const websiteRefunded = website.data?.summary?.totalRefunded;

  const handleRefresh = () => (isWebsite ? website.reload() : load(true));

  const firstName = user?.firstName || (user?.email ? user.email.split("@")[0] : null) || "there";

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="space-y-4">
        {/* ---------- WELCOME BANNER ---------- */}
        <WelcomeBanner name={firstName} subtitle="Welcome back — let's do the best today!" />

        <SourceSwitch source={source} onChange={setSource} />

        {/* ---------- FILTERS ---------- */}
        <div className="flex flex-col gap-3 rounded-xl2 border border-mist-200 bg-white p-3.5 shadow-panel dark:border-white/10 dark:bg-ink-900 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Dates: side by side with labels on top on phones, inline from sm up */}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
              <label className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-medium text-mist-500 dark:text-mist-300">From</span>
                <input
                  type="date"
                  value={filters.startDate}
                  max={filters.endDate}
                  onChange={(event) =>
                    setFilters((prevFilters) => ({ ...prevFilters, startDate: event.target.value }))
                  }
                  className="w-full min-w-0 rounded-lg border border-mist-200 bg-white px-2.5 py-2 text-xs text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white sm:w-auto sm:py-1.5"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-medium text-mist-500 dark:text-mist-300">To</span>
                <input
                  type="date"
                  value={filters.endDate}
                  min={filters.startDate}
                  max={today}
                  onChange={(event) =>
                    setFilters((prevFilters) => ({ ...prevFilters, endDate: event.target.value }))
                  }
                  className="w-full min-w-0 rounded-lg border border-mist-200 bg-white px-2.5 py-2 text-xs text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white sm:w-auto sm:py-1.5"
                />
              </label>
            </div>
            <ToggleButtonGroup
              size="small"
              value={filters.groupBy}
              exclusive
              onChange={(_, groupBy) =>
                groupBy && setFilters((prevFilters) => ({ ...prevFilters, groupBy: groupBy }))
              }
            >
              <ToggleButton value="day" sx={{ textTransform: "none", px: 1.5 }}>
                Daily
              </ToggleButton>
              <ToggleButton value="month" sx={{ textTransform: "none", px: 1.5 }}>
                Monthly
              </ToggleButton>
            </ToggleButtonGroup>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.includeCancelled}
                  onChange={(event) =>
                    setFilters((prevFilters) => ({
                      ...prevFilters,
                      includeCancelled: event.target.checked,
                    }))
                  }
                />
              }
              label={
                <span className="text-xs text-mist-700 dark:text-mist-300">Include cancelled</span>
              }
            />
            {source === SOURCE_MANUAL && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={filters.includeInvoices}
                    onChange={(event) =>
                      setFilters((prevFilters) => ({
                        ...prevFilters,
                        includeInvoices: event.target.checked,
                      }))
                    }
                  />
                }
                label={
                  <span className="text-xs text-mist-700 dark:text-mist-300">Include invoices</span>
                }
              />
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isBusy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-mist-200 px-3 py-2 text-xs font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-50 sm:self-auto sm:py-1.5 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
          >
            <RefreshCw size={13} className={isBusy ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {shownData ? (
          <AnalyticsCharts
            key={source}
            data={shownData}
            groupBy={filters.groupBy}
            gradientId={`revenueGradient-${source}`}
            revenueSubLabel={
              isWebsite && websiteRefunded
                ? `after ${formatCurrency(websiteRefunded)} refunded`
                : undefined
            }
          >
            {isWebsite && (
              <SalesDashboardCard dashboard={website.dashboard} isLoading={website.isLoading} />
            )}
          </AnalyticsCharts>
        ) : (
          <StateBox isLoading={isBusy} />
        )}
      </div>
    </ThemeProvider>
  );
}
