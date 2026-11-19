/**
 * One invoice line inside a CustomerGroup: number, date, source, status, amounts and action
 * buttons.
 *
 * Used by: components/invoice/CustomerGroup.jsx
 */

import { Download, Pencil, ReceiptText } from "lucide-react";
import { SOURCE_LABEL, SOURCE_TEXT_CLASS, getInvoiceSource } from "../../utils/InvoiceSource";
import { ActionButton, mayHaveCreditNote, statusLabel, statusClass } from "./InvoiceTableRow";
import { fmtINR, figuresOf } from "../../utils/InvoiceListHelpers.js";

/* ════════════════════════════════════════════════════════════════════
   INVOICE TABLE ROW
════════════════════════════════════════════════════════════════════ */
const cell = "px-[18px] py-[14px]";

export function InvoiceRow({
  inv: invoice,
  onOpen,
  onDownload,
  onEdit,
  downloading,
  onDownloadCreditNotes,
  cnBusy,
}) {
  const fig = figuresOf(invoice);
  const src = getInvoiceSource(invoice);
  const cnCount = Array.isArray(invoice.creditNoteIds) ? invoice.creditNoteIds.length : null;
  const showCn = cnCount != null ? cnCount > 0 : mayHaveCreditNote(invoice);

  return (
    <tr
      onClick={() => onOpen(invoice)}
      className="cursor-pointer border-t border-orange-100/70 transition-colors hover:bg-orange-500/[.04] dark:border-white/5"
    >
      <td className={`${cell} whitespace-nowrap`}>
        <div className="text-[15px] font-extrabold text-orange-600">
          {invoice.invoiceNumber ? `#${String(invoice.invoiceNumber).replace(/^#+/, "")}` : "—"}
        </div>
        <div className="mt-[3px] text-[10px] font-bold text-slate-400">
          <span className={SOURCE_TEXT_CLASS[src]}>{SOURCE_LABEL[src]}</span>
          {invoice.createdByName && (
            <>
              {" "}
              · by <span className="text-slate-500">{invoice.createdByName}</span>
            </>
          )}
        </div>
      </td>
      <td className={`${cell} whitespace-nowrap text-[13px] text-slate-500 dark:text-mist-300`}>
        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "—"}
      </td>
      <td className={`${cell} whitespace-nowrap`}>
        <div className="text-[15px] font-extrabold text-slate-900 dark:text-white">
          {fmtINR(invoice.summary?.totalPayAmount)}
        </div>
        {fig.returnedValue > 0.01 && (
          <div
            className="mt-[3px] text-[10px] font-bold text-yellow-600"
            title="Value of goods returned"
          >
            ↩ {fmtINR(fig.returnedValue)} returned
          </div>
        )}
      </td>
      <td className={cell}>
        <div className="flex flex-col items-start gap-1">
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusClass(invoice.status)}`}
          >
            {statusLabel(invoice.status)}
          </span>
          {fig.settledBack > 0.01 && (
            <span className="whitespace-nowrap text-[10px] font-bold text-indigo-500">
              {fmtINR(fig.settledBack)} refunded / credited
            </span>
          )}
          {fig.owed > 0.01 && (
            <span className="whitespace-nowrap text-[10px] font-bold text-yellow-600">
              {fmtINR(fig.owed)} owed
            </span>
          )}
          {fig.creditUsed > 0.01 && (
            <span className="whitespace-nowrap text-[10px] font-bold text-emerald-600">
              {fmtINR(fig.creditUsed)} via credit
            </span>
          )}
        </div>
      </td>
      <td className={cell}>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={Download}
            label="Download Invoice"
            tone="orange"
            busy={downloading}
            onClick={() => onDownload(invoice.invoiceId || invoice._id)}
          />
          <ActionButton
            icon={Pencil}
            label="Edit Invoice"
            tone="amber"
            onClick={() => onEdit(invoice)}
          />
          {showCn && (
            <ActionButton
              icon={ReceiptText}
              tone="rose"
              busy={cnBusy}
              label={`Download Credit Note${cnCount > 1 ? ` ×${cnCount}` : ""}`}
              onClick={() => onDownloadCreditNotes(invoice)}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Phone version of one invoice line: a card instead of a table row, so the amount, status and
 * action buttons are all visible without scrolling sideways. Same props as InvoiceRow.
 *
 * Used by: components/invoice/CustomerGroup.jsx
 */
export function InvoiceCard({
  inv: invoice,
  onOpen,
  onDownload,
  onEdit,
  downloading,
  onDownloadCreditNotes,
  cnBusy,
}) {
  const fig = figuresOf(invoice);
  const src = getInvoiceSource(invoice);
  const cnCount = Array.isArray(invoice.creditNoteIds) ? invoice.creditNoteIds.length : null;
  const showCn = cnCount != null ? cnCount > 0 : mayHaveCreditNote(invoice);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(invoice)}
      onKeyDown={(event) => event.key === "Enter" && onOpen(invoice)}
      className="cursor-pointer p-3.5 transition-colors hover:bg-orange-500/[.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-orange-600">
            {invoice.invoiceNumber ? `#${String(invoice.invoiceNumber).replace(/^#+/, "")}` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
            <span className={SOURCE_TEXT_CLASS[src]}>{SOURCE_LABEL[src]}</span>
            {" · "}
            {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "—"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-extrabold text-slate-900 dark:text-white">
            {fmtINR(invoice.summary?.totalPayAmount)}
          </p>
          <span
            className={`mt-1 inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusClass(invoice.status)}`}
          >
            {statusLabel(invoice.status)}
          </span>
        </div>
      </div>

      {(fig.returnedValue > 0.01 ||
        fig.settledBack > 0.01 ||
        fig.owed > 0.01 ||
        fig.creditUsed > 0.01) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold">
          {fig.returnedValue > 0.01 && (
            <span className="text-yellow-600">↩ {fmtINR(fig.returnedValue)} returned</span>
          )}
          {fig.settledBack > 0.01 && (
            <span className="text-indigo-500">{fmtINR(fig.settledBack)} refunded / credited</span>
          )}
          {fig.owed > 0.01 && <span className="text-yellow-600">{fmtINR(fig.owed)} owed</span>}
          {fig.creditUsed > 0.01 && (
            <span className="text-emerald-600">{fmtINR(fig.creditUsed)} via credit</span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionButton
          icon={Download}
          label="Download"
          tone="orange"
          busy={downloading}
          onClick={() => onDownload(invoice.invoiceId || invoice._id)}
          className="py-2"
        />
        <ActionButton
          icon={Pencil}
          label="Edit"
          tone="amber"
          onClick={() => onEdit(invoice)}
          className="py-2"
        />
        {showCn && (
          <ActionButton
            icon={ReceiptText}
            tone="rose"
            busy={cnBusy}
            label={`Credit note${cnCount > 1 ? ` ×${cnCount}` : ""}`}
            onClick={() => onDownloadCreditNotes(invoice)}
            className="col-span-2 py-2"
          />
        )}
      </div>
    </div>
  );
}
