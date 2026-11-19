/**
 * Card for the website sales dashboard API (GET /order/dashboard?summary=true): revenue share,
 * orders and average order value per location at the level the backend reports (country, ...).
 *
 * Used by: pages/AnalyticsPage.jsx
 */

import { ChartCard } from "./ChartCard";
import { LocationLeaderboard } from "./LocationLeaderboard";
import { formatCurrency } from "../../utils/Format";
import { statusLabel } from "../order/StatusBadge";

/**
 * @param {{ dashboard: { level: string, analytics: object[] } | null, isLoading: boolean }} props
 */
export default function SalesDashboardCard({ dashboard, isLoading }) {
  const rows = dashboard?.analytics || [];
  const levelLabel = statusLabel(dashboard?.level || "location");

  return (
    <ChartCard
      title="Sales dashboard"
      subtitle={`From the website sales dashboard · by ${levelLabel.toLowerCase()}`}
      empty={!isLoading && rows.length === 0}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <LocationLeaderboard rows={rows} />
        <div className="overflow-hidden rounded-xl border border-mist-100 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist-50 text-[11px] font-semibold uppercase tracking-wider text-mist-500 dark:bg-white/5 dark:text-mist-300">
              <tr>
                <th className="px-4 py-2.5 capitalize">{levelLabel}</th>
                <th className="px-4 py-2.5 text-right">Orders</th>
                <th className="px-4 py-2.5 text-right">Revenue</th>
                <th className="px-4 py-2.5 text-right">Avg order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist-100 dark:divide-white/10">
              {rows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-2.5 font-medium text-ink-950 dark:text-white">
                    {row.name}
                  </td>
                  <td className="px-4 py-2.5 text-right text-mist-700 dark:text-mist-300">
                    {row.totalOrders}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink-950 dark:text-white">
                    {formatCurrency(row.totalRevenue)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-mist-700 dark:text-mist-300">
                    {formatCurrency(row.averageOrderValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ChartCard>
  );
}
