/**
 * Small "are you sure?" modal with a title, a message and Cancel / Confirm buttons.
 *
 * Used by: pages/EcomOrdersPage.jsx
 */

import { Loader2, AlertTriangle } from "lucide-react";

/**
 * @param {{ title: string, message: string, confirmLabel: string, isBusy: boolean,
 *           onConfirm: Function, onClose: Function }} props
 */
export default function ConfirmModal({ title, message, confirmLabel, isBusy, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 sm:items-center sm:px-4">
      <div className="max-h-[92dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-xl2 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 shadow-panel dark:bg-ink-900">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-coral-100 text-coral-500 dark:bg-coral-500/15 dark:text-coral-400">
            <AlertTriangle size={17} />
          </span>
          <h3 className="font-display text-base font-bold text-ink-950 dark:text-white">{title}</h3>
        </div>
        <p className="mt-3 text-sm text-mist-700 dark:text-mist-300">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg border border-mist-200 px-4 py-2 text-sm font-medium text-mist-700 hover:bg-mist-50 disabled:opacity-60 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
          >
            Go back
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className="flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-400 disabled:opacity-60"
          >
            {isBusy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
