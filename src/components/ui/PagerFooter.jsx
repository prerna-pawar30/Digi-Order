/**
 * Footer under a table: "Page X of Y · N records" with previous / next buttons.
 *
 * Used by: pages/EcomOrdersPage.jsx, pages/ReturnRequestsPage.jsx
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGER_BUTTON_CLASS =
  "grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-30 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5";

/**
 * @param {{ currentPage: number, totalPages: number, totalCount: number, countLabel: string,
 *           onPageChange: (page: number) => void }} props
 */
export default function PagerFooter({
  currentPage,
  totalPages,
  totalCount,
  countLabel,
  onPageChange,
}) {
  const lastPage = Math.max(totalPages, 1);
  return (
    <div className="flex flex-col gap-2 border-t border-mist-100 px-5 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-mist-500 dark:text-mist-300">
        Page {currentPage} of {lastPage} · {totalCount} {countLabel}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={PAGER_BUTTON_CLASS}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className={PAGER_BUTTON_CLASS}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
