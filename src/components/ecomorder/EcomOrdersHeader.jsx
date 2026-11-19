/**
 * Top bar of the Website orders page: title, search box and the status filter dropdown.
 *
 * Used by: pages/EcomOrdersPage.jsx
 */

import { useState } from "react";
import { Filter, ChevronDown, Search, RefreshCw } from "lucide-react";
import { ECOM_FILTER_STATUS_OPTIONS } from "../../constants/EcomOrderConfig";
import { statusLabel } from "../order/StatusBadge";

function StatusFilter({ statusFilter, onStatusFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (status) => {
    onStatusFilterChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-mist-200 bg-white px-3.5 text-sm font-medium capitalize text-ink-950 hover:border-orange-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white sm:w-48"
      >
        <span className="flex items-center gap-2">
          <Filter size={14} className="text-mist-400 dark:text-mist-500" />
          {statusLabel(statusFilter)}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl2 border border-mist-200 bg-white p-1.5 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <p className="mb-1 border-b border-mist-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-mist-400 dark:border-white/10 dark:text-mist-500">
              Filter by status
            </p>
            {ECOM_FILTER_STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleSelect(status)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm capitalize ${
                  statusFilter === status
                    ? "bg-orange-50 font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                    : "text-mist-700 hover:bg-mist-50 dark:text-mist-300 dark:hover:bg-white/5"
                }`}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function EcomOrdersHeader({
  searchText,
  onSearchTextChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:w-80">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400 dark:text-mist-500"
        />
        <input
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder="Search order ID or customer…"
          className="w-full rounded-lg border border-mist-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-mist-500"
        />
      </div>
      <div className="flex gap-2">
        <StatusFilter statusFilter={statusFilter} onStatusFilterChange={onStatusFilterChange} />
        <button
          type="button"
          onClick={onRefresh}
          title="Reload orders"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-mist-200 bg-white text-mist-500 hover:bg-mist-50 dark:border-ink-700 dark:bg-ink-900 dark:text-mist-300 dark:hover:bg-white/5"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </div>
  );
}
