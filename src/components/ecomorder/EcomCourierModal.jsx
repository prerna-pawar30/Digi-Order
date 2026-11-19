/**
 * Modal that asks for courier name and tracking number before a website order is marked shipped.
 * It only collects the values; the page saves them and then changes the status.
 *
 * Used by: pages/EcomOrdersPage.jsx
 */

import { useState } from "react";
import { X as CloseIcon, Loader2, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { Field, TextInput } from "../ui/FormField";

/**
 * @param {{ order: object, isSaving: boolean, onClose: Function,
 *           onSubmit: (courier: {serviceName: string, docNumber: string}) => void }} props
 */
export default function EcomCourierModal({ order, isSaving, onClose, onSubmit }) {
  const [serviceName, setServiceName] = useState("");
  const [docNumber, setDocNumber] = useState("");

  const handleSubmit = () => {
    if (!serviceName.trim() || !docNumber.trim()) {
      toast.error("Courier name and tracking number are both required");
      return;
    }
    onSubmit({ serviceName: serviceName.trim(), docNumber: docNumber.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 sm:items-center sm:px-4">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-xl2 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 shadow-panel dark:bg-ink-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <Truck size={17} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-950 dark:text-white">
                Ship order
              </h3>
              <p className="text-xs text-mist-500 dark:text-mist-300">{order.orderId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Courier service" required>
            <TextInput
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
              placeholder="e.g. BlueDart"
              autoFocus
            />
          </Field>
          <Field label="Waybill / tracking number" required>
            <TextInput
              value={docNumber}
              onChange={(event) => setDocNumber(event.target.value)}
              placeholder="e.g. BD987654321"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-mist-200 px-4 py-2 text-sm font-medium text-mist-700 hover:bg-mist-50 disabled:opacity-60 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            Save and mark shipped
          </button>
        </div>
      </div>
    </div>
  );
}
