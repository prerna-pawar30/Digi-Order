/**
 * Return requests raised by customers on website orders. Staff open a pending request, see the
 * refund, and approve it (stock back or quarantined, then Razorpay refund) or deny it.
 *
 * Route: /return-requests
 * Used by: routes/AppRoutes.jsx
 * API: EcomReturnService.getReturnRequestOrders, EcomReturnService.updateReturnStatus,
 * EcomReturnService.executeRefund
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Package, RefreshCw, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { EcomReturnService } from "../backend/ApiService";
import {
  flattenReturnRequests,
  buildApprovePayload,
  buildRejectPayload,
} from "../utils/EcomReturnRequests";
import { RETURN_REQUESTS_PER_PAGE, REFUND_WARNING_TOAST_MS } from "../constants/EcomOrderConfig";
import ReturnRequestRow, { ReturnRequestCard } from "../components/ecomorder/ReturnRequestRow";
import ReturnProcessModal from "../components/ecomorder/ReturnProcessModal";
import PagerFooter from "../components/ui/PagerFooter";

const TABLE_HEADINGS = ["Order / items", "Reason", "Status", "Action"];

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

function EmptyState({ isLoading, loadError }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500 dark:text-mist-300">
        <Loader2 size={16} className="animate-spin" /> Loading return requests…
      </div>
    );
  }
  const Icon = loadError ? AlertTriangle : Package;
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <Icon size={28} className="mb-1 text-mist-300 dark:text-mist-500" />
      <p className="text-sm font-medium text-ink-950 dark:text-white">
        {loadError || "No return requests"}
      </p>
      {!loadError && (
        <p className="text-xs text-mist-500 dark:text-mist-300">You're all caught up.</p>
      )}
    </div>
  );
}

function useReturnRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setRequests(flattenReturnRequests(await EcomReturnService.getReturnRequestOrders()));
    } catch (error) {
      setLoadError(errorMessage(error, "Could not load return requests"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return { requests, isLoading, loadError, loadRequests };
}

/**
 * Approve: update the request, then send the refund. The return is already approved when the
 * refund runs, so a refund failure is a warning (retry from the order), not a hard error.
 */
async function approveReturn(request, stockOption) {
  const payload = buildApprovePayload(request, stockOption);
  const statusResponse = await EcomReturnService.updateReturnStatus(
    request.orderId,
    request.requestId,
    payload
  );
  if (!statusResponse?.success) throw new Error(statusResponse?.message);
  try {
    await EcomReturnService.executeRefund(request.orderId, payload.refundAmount);
    toast.success("Return approved and refund started");
  } catch (error) {
    toast(
      `Return approved, but the refund failed: ${errorMessage(error, "gateway error")}. Retry the refund from the order.`,
      {
        icon: <AlertTriangle size={16} className="text-amber-500" />,
        duration: REFUND_WARNING_TOAST_MS,
      }
    );
  }
}

async function rejectReturn(request) {
  const response = await EcomReturnService.updateReturnStatus(
    request.orderId,
    request.requestId,
    buildRejectPayload(request)
  );
  if (!response?.success) throw new Error(response?.message);
  toast.success("Return request denied");
}

export default function ReturnRequestsPage() {
  const { requests, isLoading, loadError, loadRequests } = useReturnRequests();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRequest, setActiveRequest] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.ceil(requests.length / RETURN_REQUESTS_PER_PAGE);
  const pageRequests = useMemo(() => {
    const start = (currentPage - 1) * RETURN_REQUESTS_PER_PAGE;
    return requests.slice(start, start + RETURN_REQUESTS_PER_PAGE);
  }, [requests, currentPage]);

  const runDecision = async (decide) => {
    setIsSaving(true);
    try {
      await decide();
      setActiveRequest(null);
      loadRequests();
    } catch (error) {
      toast.error(errorMessage(error, error?.message || "Could not update the return request"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3 sm:items-center">
        <p className="min-w-0 text-sm text-mist-500 dark:text-mist-300">
          Review return claims on website orders, approve or deny them and refund the customer.
        </p>
        <button
          type="button"
          onClick={loadRequests}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-mist-200 bg-white px-3.5 py-2 text-sm font-medium text-mist-700 hover:bg-mist-50 dark:border-ink-700 dark:bg-ink-900 dark:text-mist-300 dark:hover:bg-white/5"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {isLoading || loadError || requests.length === 0 ? (
          <EmptyState isLoading={isLoading} loadError={loadError} />
        ) : (
          <>
            {/* Phones: cards, nothing cut off */}
            <div className="divide-y divide-mist-100 dark:divide-white/10 md:hidden">
              {pageRequests.map((request) => (
                <ReturnRequestCard
                  key={request.requestId || request.orderId}
                  request={request}
                  onProcess={setActiveRequest}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-mist-100 bg-mist-50 text-[11px] font-semibold uppercase tracking-wider text-mist-500 dark:border-white/10 dark:bg-white/5 dark:text-mist-300">
                  <tr>
                    {TABLE_HEADINGS.map((heading, index) => (
                      <th key={heading} className={`px-4 py-3 ${index > 1 ? "text-center" : ""}`}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-100 dark:divide-white/10">
                  {pageRequests.map((request) => (
                    <ReturnRequestRow
                      key={request.requestId || request.orderId}
                      request={request}
                      onProcess={setActiveRequest}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!isLoading && requests.length > 0 && (
          <PagerFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={requests.length}
            countLabel="requests"
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {activeRequest && (
        <ReturnProcessModal
          request={activeRequest}
          isSaving={isSaving}
          onClose={() => setActiveRequest(null)}
          onApprove={(stockOption) => runDecision(() => approveReturn(activeRequest, stockOption))}
          onReject={() => runDecision(() => rejectReturn(activeRequest))}
        />
      )}
    </div>
  );
}
