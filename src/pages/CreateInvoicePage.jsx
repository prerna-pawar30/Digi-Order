/**
 * Form to create a standalone tax invoice: pick or type a client, add items, apply available
 * credit, and submit.
 *
 * Route: /invoices/create
 * Used by: routes/AppRoutes.jsx
 * API: CreditNoteService.useCreditSource, InvoiceService.checkCredit, InvoiceService.createInvoice,
 * InvoiceService.searchClients
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Trash2,
  Plus,
  Send,
  FileText,
  Loader2,
  Package,
  CreditCard,
  Search,
  UserCheck,
  ArrowLeft,
  X as CloseIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { InvoiceService, CreditNoteService } from "../backend/ApiService";
import { PERMISSIONS } from "../backend/ApiRoutes";

const MySwal = withReactContent(Swal);

const CreateInvoicePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { label: "Issued", value: "issued" },
    { label: "Paid", value: "paid" },
    { label: "Partially Paid", value: "partially_paid" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const today = new Date().toISOString().split("T")[0];
  const defaultDueDate = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [formData, setFormData] = useState({
    paymentTerms: "Payable due amount in 10 days",
    termsOfDelivery: "",
    shippingCondition: "Normal",
    customerServiceRep: "",
    invoiceDate: today,
    dueDate: defaultDueDate,
    deliveryDate: "",
    permission: PERMISSIONS.INVOICE_CREATE,
    billTo: {
      companyName: "",
      address: "",
      gstin: "",
      contactPerson: "",
      contactNumber: "",
    },
    items: [
      {
        description: "",
        qty: "",
        price: "",
        discountPercent: 0,
        discountValue: 0,
        gstType: "IGST",
        gstPercent: 5,
      },
    ],
    summary: { freightCost: "", paidAmount: 0 },
    status: "issued",
  });

  /* ---------- CLIENT (required) ----------
     Backend rule: "Create Invoice" is only for a CRM client (leadId is required,
     otherwise the API answers CLIENT_REQUIRED). Staff search for and pick the client here; the client's
     details are filled into billTo. A new client is created in the CRM
     (Leads → Convert to Client). A manual order's invoice is created automatically,
     so this rule does not apply to it. */
  const [client, setClient] = useState(null); // { leadId, clientId, doctorName, clinicName, contact, ... }
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    if (client) return undefined;
    let cancelled = false;
    const timerId = setTimeout(async () => {
      setClientSearching(true);
      try {
        const list = await InvoiceService.searchClients(clientQuery.trim(), 15);
        if (!cancelled) setClientResults(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setClientResults([]);
      } finally {
        if (!cancelled) setClientSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [clientQuery, client]);

  const selectClient = (client) => {
    setClient(client);
    setClientOpen(false);
    setClientQuery("");
    setFormData((prev) => ({
      ...prev,
      billTo: {
        companyName: client.clinicName || client.doctorName || prev.billTo.companyName,
        contactPerson: client.doctorName || prev.billTo.contactPerson,
        contactNumber: client.contact || prev.billTo.contactNumber,
        address: client.address || prev.billTo.address,
        gstin: client.gstin || prev.billTo.gstin,
      },
    }));
  };

  // "Check credit" — a return on an earlier invoice (manual,
  // ecommerce, or standalone) stays pending/unsettled until the customer's
  // next order/invoice actually exists. At that point staff look up the
  // phone number here, apply whatever is owed as a discount spread across
  // this invoice's line items, and — only once this invoice is actually
  // created — settle the old invoice(s) as a credit note pointing at this
  // new one. Nothing is settled just from looking it up.
  const [creditLookup, setCreditLookup] = useState(null); // { checking, available, sources }
  const [creditToApply, setCreditToApply] = useState("");
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [creditPlan, setCreditPlan] = useState([]); // [{ invoiceId, amount }]

  const checkExistingCredit = async () => {
    const phone = formData.billTo.contactNumber?.trim();
    if (!phone) {
      MySwal.fire({
        title: <span className="text-red-600 font-black uppercase">Enter mobile number</span>,
        text: "Enter the customer's mobile number first, then check credit.",
        icon: "warning",
        confirmButtonColor: "#000000",
      });
      return;
    }
    setCreditLookup({ checking: true, available: 0, sources: [] });
    try {
      const res = await InvoiceService.checkCredit(phone);
      const data = res?.data || res || {};
      const available = Number(data.available) || 0;
      const sources = data.sources || [];
      setCreditLookup({ checking: false, available, sources });
    } catch (error) {
      setCreditLookup(null);
      MySwal.fire({
        title: <span className="text-red-600 font-black uppercase">Lookup Failed</span>,
        text: error.response?.data?.message || "Could not check existing credit.",
        icon: "error",
        confirmButtonColor: "#000000",
      });
    }
  };

  // Spreads the applied credit amount across every item's discount,
  // proportional to that item's gross (qty x price) amount — the invoice
  // has no single flat "discount" field the way a manual order does, so
  // the credit is folded into each item's existing discountPercent /
  // discountValue instead.
  const applyCredit = () => {
    const amount = Number(creditToApply);
    if (!amount || amount <= 0) {
      MySwal.fire({
        title: <span className="text-red-600 font-black uppercase">Invalid Amount</span>,
        text: "Enter a valid credit amount to apply.",
        icon: "warning",
        confirmButtonColor: "#000000",
      });
      return;
    }
    if (amount > (creditLookup?.available || 0)) {
      MySwal.fire({
        title: <span className="text-red-600 font-black uppercase">Too Much</span>,
        text: "Can't apply more than the available credit.",
        icon: "warning",
        confirmButtonColor: "#000000",
      });
      return;
    }

    const grossAmounts = formData.items.map(
      (item) => (Number(item.qty) || 0) * (Number(item.price) || 0)
    );
    const totalGross = grossAmounts.reduce((sum, grossAmount) => sum + grossAmount, 0);
    if (totalGross <= 0) {
      MySwal.fire({
        title: <span className="text-red-600 font-black uppercase">Add Items First</span>,
        text: "Enter quantity and price on the items before applying credit.",
        icon: "warning",
        confirmButtonColor: "#000000",
      });
      return;
    }

    // Work in paise-rounded values so splitting e.g. ₹3000 credit across
    // items of ₹3000 gross gives exactly ₹3000 (not 2999.9999…), and never
    // discount an item by more than its own gross amount.
    const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
    let creditLeft = round2(amount);
    const lastPayableIdx = grossAmounts.reduce(
      (last, grossAmount, index) => (grossAmount > 0 ? index : last),
      -1
    );
    const newItems = formData.items.map((item, idx) => {
      const gross = grossAmounts[idx];
      const existingDiscount = Number(item.discountValue) || 0;
      const room = Math.max(gross - existingDiscount, 0);
      const wanted = idx === lastPayableIdx ? creditLeft : round2((gross / totalGross) * amount);
      const share = Math.min(wanted, room, creditLeft);
      creditLeft = round2(creditLeft - share);
      const newDiscountValue = round2(existingDiscount + share);
      const newDiscountPercent =
        gross > 0 ? round2((newDiscountValue / gross) * 100) : Number(item.discountPercent) || 0;
      return { ...item, discountValue: newDiscountValue, discountPercent: newDiscountPercent };
    });

    // Oldest-owing invoice first, same order the backend already returns
    // them in — mirrors CreateOrderPage's settle-plan logic.
    let remaining = amount;
    const plan = [];
    for (const src of creditLookup.sources) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(src.owed) || 0);
      // keep the whole source — it may be a pending invoice refund OR an
      // open credit note; CreditNoteService.useCreditSource handles both.
      if (take > 0) plan.push({ ...src, amount: take });
      remaining -= take;
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
    setAppliedCredit((prev) => prev + amount);
    setCreditPlan((prev) => [...prev, ...plan]);
    setCreditToApply("");
  };

  const dynamicOptions = useMemo(() => {
    const rawData = location.state?.customerData;
    const invoices = Array.isArray(rawData) ? rawData : rawData?.invoices || [];

    const descriptions = new Set();
    const prices = new Set();
    const quantities = new Set();

    invoices.forEach((invoice) => {
      invoice.items?.forEach((item) => {
        if (item.description) descriptions.add(item.description);
        if (item.price) prices.add(String(item.price));
        if (item.qty) quantities.add(String(item.qty));
      });
    });

    if (quantities.size === 0) ["1", "2", "3", "5", "10"].forEach((label) => quantities.add(label));
    if (prices.size === 0)
      ["500", "1000", "1200", "1500", "2500"].forEach((label) => prices.add(label));

    return {
      descriptions: Array.from(descriptions),
      prices: Array.from(prices).sort((priceA, priceB) => Number(priceA) - Number(priceB)),
      quantities: Array.from(quantities).sort(
        (quantityA, quantityB) => Number(quantityA) - Number(quantityB)
      ),
    };
  }, [location.state?.customerData]);

  useEffect(() => {
    if (location.state?.customerData) {
      const rawData = location.state.customerData;
      const invoiceData = Array.isArray(rawData) ? rawData[0] : rawData;

      if (!invoiceData) return;

      const billToData = invoiceData.billTo || {};

      // Coming from a customer whose earlier invoice was raised for a client →
      // pre-select that client.
      const prevInvoices = Array.isArray(rawData) ? rawData : rawData?.invoices || [];
      const linked = prevInvoices.find((prevInvoice) => prevInvoice?.leadId);
      if (linked) {
        setClient({
          leadId: linked.leadId,
          clientId: linked.clientId || null,
          doctorName: linked.billTo?.contactPerson || "",
          clinicName: linked.billTo?.companyName || "",
          contact: linked.billTo?.contactNumber || "",
        });
      }

      setFormData((prev) => ({
        ...prev,
        billTo: {
          companyName: billToData.companyName || invoiceData.companyName || "",
          contactPerson: billToData.contactPerson || invoiceData.contactPerson || "",
          contactNumber: billToData.contactNumber || invoiceData.contactNumber || "",
          address: billToData.address || invoiceData.address || "",
          gstin: billToData.gstin || invoiceData.gstin || "",
        },
        paymentTerms: invoiceData.paymentTerms || prev.paymentTerms,
        termsOfDelivery: invoiceData.termsOfDelivery || prev.termsOfDelivery,
        shippingCondition: invoiceData.shippingCondition || prev.shippingCondition,
        customerServiceRep: invoiceData.customerServiceRep || prev.customerServiceRep,
        items:
          invoiceData.items?.length > 0
            ? invoiceData.items.map((item) => ({
                description: item.description || "",
                qty: item.qty ? String(item.qty) : "",
                price: item.price ? String(item.price) : "",
                discountPercent:
                  item.discountPercent !== undefined ? Number(item.discountPercent) : 0,
                discountValue: item.discountValue !== undefined ? Number(item.discountValue) : 0,
                gstType: item.gstType || "IGST",
                gstPercent: item.gstPercent || 5,
              }))
            : prev.items,
      }));
    }
  }, [location.state]);

  const handleDescriptionChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index]["description"] = value;

    const rawData = location.state?.customerData;
    const invoices = Array.isArray(rawData) ? rawData : rawData?.invoices || [];

    let autoMatchedPrice = null;
    let autoMatchedDiscountPercent = 0;
    let autoMatchedDiscountValue = 0;

    for (const invoice of invoices) {
      const match = invoice.items?.find(
        (item) => item.description?.toLowerCase() === value.trim().toLowerCase()
      );
      if (match) {
        if (match.price) autoMatchedPrice = match.price;
        if (match.discountPercent !== undefined) autoMatchedDiscountPercent = match.discountPercent;
        if (match.discountValue !== undefined) autoMatchedDiscountValue = match.discountValue;
        break;
      }
    }

    if (autoMatchedPrice) {
      newItems[index]["price"] = String(autoMatchedPrice);
      newItems[index]["discountPercent"] = autoMatchedDiscountPercent;
      newItems[index]["discountValue"] = autoMatchedDiscountValue;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleBillToChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      billTo: { ...prev.billTo, [name]: value },
    }));
  };

  // Utility to safely strip non-numeric parameters while maintaining typed logic
  const cleanNumericInput = (val) => {
    return val.replace(/[^0-9.]/g, "");
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];

    if (
      field === "discountPercent" ||
      field === "discountValue" ||
      field === "qty" ||
      field === "price"
    ) {
      const sanitizedValue = cleanNumericInput(value);
      newItems[index][field] = sanitizedValue;

      const qty = Number(field === "qty" ? sanitizedValue : newItems[index].qty) || 0;
      const price = Number(field === "price" ? sanitizedValue : newItems[index].price) || 0;
      const grossAmount = qty * price;

      if (field === "discountPercent") {
        const percent = Number(sanitizedValue) || 0;
        newItems[index]["discountValue"] = (grossAmount * percent) / 100;
      } else if (field === "discountValue") {
        const discVal = Number(sanitizedValue) || 0;
        newItems[index]["discountPercent"] = grossAmount > 0 ? (discVal / grossAmount) * 100 : 0;
      } else {
        const percent = Number(newItems[index].discountPercent) || 0;
        newItems[index]["discountValue"] = (grossAmount * percent) / 100;
      }
    } else {
      newItems[index][field] = value;
    }

    setFormData({ ...formData, items: newItems });
  };

  // Global blur trick handler to guarantee wheel event isolation
  const handleWheelBlur = (event) => {
    event.target.blur();
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: "",
          qty: "",
          price: "",
          discountPercent: 0,
          discountValue: 0,
          gstType: "IGST",
          gstPercent: 5,
        },
      ],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, currentIndex) => currentIndex !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!client?.leadId) {
      MySwal.fire({
        title: <span className="text-red-600 font-black uppercase">Select a client</span>,
        text: "An invoice can only be created for a client. Search and select the client first (new clients are added in the CRM: Leads → Convert to Client).",
        icon: "warning",
        confirmButtonColor: "#000000",
      });
      return;
    }
    const validatedItems = formData.items.map((item) => ({
      ...item,
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
      discountPercent: Number(item.discountPercent) || 0,
      discountValue: Number(item.discountValue) || 0,
    }));

    const finalSubmissionData = {
      ...formData,
      leadId: client.leadId,
      items: validatedItems,
      summary: {
        ...formData.summary,
        freightCost: Number(formData.summary.freightCost) || 0,
        paidAmount: Number(formData.summary.paidAmount) || 0,
      },
      invoiceDate: new Date(formData.invoiceDate).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null,
    };

    const result = await MySwal.fire({
      title: <span className="text-black font-black uppercase text-xl">Generate Invoice?</span>,
      text: "Double check dates and freight charges before confirming.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Create it!",
      cancelButtonText: "No, Keep Editing",
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#000000",
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await InvoiceService.createInvoice(finalSubmissionData);
        if (response.success) {
          const newInvoice = response.data;

          // Only now that this invoice actually exists do we settle the
          // old invoice(s) the applied credit came from — issue and apply
          // happen together, in this one step.
          for (const step of creditPlan) {
            try {
              await CreditNoteService.useCreditSource(step, {
                amount: step.amount,
                appliedToId: newInvoice?.invoiceId,
                notes: `Applied to invoice ${newInvoice?.invoiceNumber || newInvoice?.invoiceId}`,
              });
            } catch (creditErr) {
              console.error("Could not settle credit on", step.invoiceId, creditErr);
              MySwal.fire({
                title: (
                  <span className="text-red-600 font-black uppercase">Credit Not Settled</span>
                ),
                text: `Invoice created, but couldn't use credit from ${step.creditNoteNumber || step.invoiceNumber || step.invoiceId} — please adjust it manually.`,
                icon: "warning",
                confirmButtonColor: "#000000",
              });
            }
          }

          setCreditLookup(null);
          setAppliedCredit(0);
          setCreditPlan([]);

          await MySwal.fire({
            title: <span className="text-black font-black uppercase">Success!</span>,
            text: `Invoice ${response.data.invoiceNumber} created successfully.`,
            icon: "success",
            confirmButtonColor: "#f97316",
          });
          navigate("/invoices", { replace: true });
        }
      } catch (error) {
        MySwal.fire({
          title: <span className="text-red-600 font-black uppercase">Submission Failed</span>,
          text: error.response?.data?.message || "Error communicating with server.",
          icon: "error",
          confirmButtonColor: "#000000",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const itemsNetTotal = Math.max(
    Math.round(
      formData.items.reduce(
        (sum, item) =>
          sum +
          (Number(item.qty) || 0) * (Number(item.price) || 0) -
          (Number(item.discountValue) || 0),
        0
      ) * 100
    ) / 100,
    0
  );

  // Shared look for this form (same style as the New Order page).
  const inputCls =
    "w-full rounded-lg border border-mist-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none placeholder:text-mist-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-mist-500";
  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300";
  const cardCls =
    "rounded-xl2 border border-mist-200 bg-white p-4 shadow-panel dark:border-white/10 dark:bg-ink-900 sm:p-6";
  const SectionTitle = ({ step, title, subtitle, action }) => (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
  const money = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
  const filledItems = formData.items.filter((it) => it.description?.trim()).length;

  return (
    <div className="mx-auto max-w-6xl pb-28 lg:pb-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-mist-500 hover:text-ink-950 dark:text-mist-300 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white">
          <FileText size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-ink-950 dark:text-white">
            New tax invoice
          </h1>
          <p className="text-xs text-mist-500 dark:text-mist-300 sm:text-sm">
            Fill in the client and products. GST and the grand total are worked out automatically.
          </p>
        </div>
      </div>

      <form
        id="create-invoice-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        {/* ---------- Left: client + products ---------- */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {/* 1. Client */}
          <section className={cardCls}>
            <SectionTitle step="1" title="Client details" subtitle="Who is this invoice for?" />
            {/* Client picker: an invoice can only be made for a CRM client */}
            <div className="relative z-20 mb-4">
              <span className={labelCls}>
                Client <span className="text-coral-500">*</span>
              </span>
              {client ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-mint-400/40 bg-mint-100 p-3 dark:border-mint-500/30 dark:bg-mint-500/10">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <UserCheck size={18} className="shrink-0 text-mint-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-950 dark:text-white">
                        {client.clinicName || client.doctorName}
                        {client.clientId && (
                          <span className="ml-2 text-[11px] font-medium text-mist-500 dark:text-mist-300">
                            {client.clientId}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-mist-500 dark:text-mist-300">
                        {[client.doctorName, client.contact].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClient(null);
                      setClientOpen(true);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-mist-200 bg-white px-3 py-2 text-xs font-semibold text-mist-700 hover:border-orange-500 hover:text-orange-600 dark:border-white/10 dark:bg-ink-900 dark:text-mist-300"
                  >
                    <CloseIcon size={13} /> Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500"
                  />
                  <input
                    value={clientQuery}
                    onChange={(event) => {
                      setClientQuery(event.target.value);
                      setClientOpen(true);
                    }}
                    onFocus={() => setClientOpen(true)}
                    onBlur={() => setTimeout(() => setClientOpen(false), 150)}
                    placeholder="Search by name, clinic, mobile or client ID…"
                    className={`${inputCls} border-orange-300 pl-9`}
                  />
                  {clientOpen && (
                    <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
                      {clientSearching ? (
                        <p className="flex items-center gap-2 p-3 text-xs text-mist-500">
                          <Loader2 size={13} className="animate-spin" /> Searching…
                        </p>
                      ) : clientResults.length === 0 ? (
                        <p className="p-3 text-xs text-mist-500 dark:text-mist-300">
                          No client found. New clients are created in the CRM (Leads → Convert to
                          Client).
                        </p>
                      ) : (
                        clientResults.map((clientResult) => (
                          <button
                            type="button"
                            key={clientResult.leadId}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectClient(clientResult)}
                            className="block w-full border-b border-mist-100 px-3 py-3 text-left last:border-0 hover:bg-orange-50 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            <p className="text-sm font-semibold text-ink-950 dark:text-white">
                              {clientResult.clinicName || clientResult.doctorName}
                              {clientResult.clientId && (
                                <span className="ml-2 text-[11px] font-medium text-mist-500">
                                  {clientResult.clientId}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-mist-500 dark:text-mist-300">
                              {[clientResult.doctorName, clientResult.contact, clientResult.address]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-mist-500 dark:text-mist-300">
                Picking a client fills in the details below — you can still edit them.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block min-w-0 sm:col-span-2">
                <span className={labelCls}>
                  Company / clinic name <span className="text-coral-500">*</span>
                </span>
                <input
                  required
                  name="companyName"
                  value={formData.billTo.companyName}
                  title={formData.billTo.companyName}
                  placeholder="e.g. Rama Dental Hospital"
                  className={inputCls}
                  onChange={handleBillToChange}
                  autoComplete="organization"
                />
              </label>
              <label className="block min-w-0">
                <span className={labelCls}>
                  Contact person <span className="text-coral-500">*</span>
                </span>
                <input
                  required
                  name="contactPerson"
                  value={formData.billTo.contactPerson}
                  title={formData.billTo.contactPerson}
                  placeholder="Full name"
                  className={inputCls}
                  onChange={handleBillToChange}
                  autoComplete="name"
                />
              </label>
              <div className="min-w-0">
                <label htmlFor="inv-contact-number" className={labelCls}>
                  Mobile no.
                </label>
                <div className="flex gap-2">
                  <input
                    id="inv-contact-number"
                    type="tel"
                    inputMode="tel"
                    name="contactNumber"
                    value={formData.billTo.contactNumber}
                    placeholder="98765 43210"
                    autoComplete="tel"
                    className={`${inputCls} min-w-0 flex-1`}
                    onChange={handleBillToChange}
                  />
                  <button
                    type="button"
                    onClick={checkExistingCredit}
                    disabled={creditLookup?.checking}
                    className="shrink-0 whitespace-nowrap rounded-lg border border-mist-200 px-3 text-xs font-semibold text-mist-700 hover:border-orange-500 hover:text-orange-600 disabled:opacity-50 dark:border-white/10 dark:text-mist-300"
                  >
                    {creditLookup?.checking ? "Checking…" : "Check credit"}
                  </button>
                </div>
              </div>
              <label className="block min-w-0 sm:col-span-2">
                <span className={labelCls}>
                  GSTIN{" "}
                  <span className="font-normal normal-case tracking-normal text-mist-400">
                    (optional)
                  </span>
                </span>
                <input
                  name="gstin"
                  value={formData.billTo.gstin}
                  placeholder="22AAAAA0000A1Z5"
                  autoCapitalize="characters"
                  className={`${inputCls} uppercase tracking-wide`}
                  onChange={handleBillToChange}
                />
              </label>
              <label className="block min-w-0 sm:col-span-2">
                <span className={labelCls}>
                  Shipping address <span className="text-coral-500">*</span>
                </span>
                <textarea
                  required
                  name="address"
                  value={formData.billTo.address}
                  placeholder="Building, street, city, state, PIN"
                  rows={Math.min(
                    Math.max(
                      2,
                      Math.ceil((formData.billTo.address?.length || 0) / 90) +
                        (formData.billTo.address?.split("\n").length || 1) -
                        1
                    ),
                    6
                  )}
                  className={`${inputCls} resize-y leading-relaxed`}
                  onChange={handleBillToChange}
                  autoComplete="street-address"
                />
              </label>
            </div>

            {creditLookup && !creditLookup.checking && creditLookup.available > 0 && (
              <div className="mt-4 rounded-lg border border-mint-400/40 bg-mint-100 p-4 dark:border-mint-500/30 dark:bg-mint-500/10">
                <p className="text-sm font-semibold text-mint-500 dark:text-mint-400">
                  This customer has ₹{creditLookup.available.toLocaleString("en-IN")} credit
                  available
                </p>
                <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">
                  From {creditLookup.sources.length} earlier invoice
                  {creditLookup.sources.length === 1 ? "" : "s"} with a refund still owed. Apply
                  some or all of it as a discount across this invoice's items instead of paying it
                  back separately.
                </p>
                {appliedCredit > 0 && (
                  <p className="mt-2 text-sm font-semibold text-mint-500 dark:text-mint-400">
                    ✓ ₹{appliedCredit.toLocaleString("en-IN")} applied as a discount across the
                    items below
                  </p>
                )}
                {appliedCredit < creditLookup.available && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={creditToApply}
                      onChange={(event) => setCreditToApply(cleanNumericInput(event.target.value))}
                      placeholder={`Up to ₹${(creditLookup.available - appliedCredit).toLocaleString("en-IN")}`}
                      className={`${inputCls} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={applyCredit}
                      className="shrink-0 rounded-lg bg-mint-500 px-4 text-sm font-semibold text-white hover:bg-mint-400"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
            {creditLookup && !creditLookup.checking && creditLookup.available === 0 && (
              <p className="mt-3 text-xs text-mist-500 dark:text-mist-300">
                No pending credit found for this phone number.
              </p>
            )}
          </section>

          {/* 2. Products */}
          <section className={cardCls}>
            <SectionTitle
              step="2"
              title="Products"
              subtitle={`${formData.items.length} line${formData.items.length === 1 ? "" : "s"} · start typing to pick a product used before`}
            />
            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const grossAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
                const netAmount = Math.max(
                  Math.round((grossAmount - (Number(item.discountValue) || 0)) * 100) / 100,
                  0
                );
                const numCls = `${inputCls} tabular-nums`;

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-mist-200 bg-mist-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-mist-500 dark:text-mist-300">
                        <Package size={13} /> Product {index + 1}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="-mr-1 flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-coral-500 hover:bg-coral-100 dark:text-coral-400 dark:hover:bg-coral-500/10"
                          aria-label={`Remove product ${index + 1}`}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>

                    <label className="block">
                      <span className={labelCls}>
                        Description <span className="text-coral-500">*</span>
                      </span>
                      <input
                        required
                        type="text"
                        list={`dynamic-descriptions-${index}`}
                        value={item.description}
                        title={item.description}
                        placeholder="Type or select a product…"
                        className={inputCls}
                        onChange={(event) => handleDescriptionChange(index, event.target.value)}
                      />
                      <datalist id={`dynamic-descriptions-${index}`}>
                        {dynamicOptions.descriptions.map((desc, idx) => (
                          <option key={idx} value={desc} />
                        ))}
                      </datalist>
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <label className="block min-w-0">
                        <span className={labelCls}>
                          Qty <span className="text-coral-500">*</span>
                        </span>
                        <input
                          required
                          type="text"
                          inputMode="decimal"
                          list={`dynamic-qty-${index}`}
                          placeholder="0"
                          value={item.qty}
                          onWheel={handleWheelBlur}
                          className={numCls}
                          onChange={(event) => updateItem(index, "qty", event.target.value)}
                        />
                        <datalist id={`dynamic-qty-${index}`}>
                          {dynamicOptions.quantities.map((qtyVal) => (
                            <option key={qtyVal} value={qtyVal} />
                          ))}
                        </datalist>
                      </label>

                      <label className="block min-w-0">
                        <span className={labelCls}>
                          Unit price ₹ <span className="text-coral-500">*</span>
                        </span>
                        <input
                          required
                          type="text"
                          inputMode="decimal"
                          list={`dynamic-price-${index}`}
                          placeholder="0.00"
                          value={item.price}
                          onWheel={handleWheelBlur}
                          className={numCls}
                          onChange={(event) => updateItem(index, "price", event.target.value)}
                        />
                        <datalist id={`dynamic-price-${index}`}>
                          {dynamicOptions.prices.map((priceVal, idx) => (
                            <option key={idx} value={priceVal}>
                              ₹{Number(priceVal).toLocaleString("en-IN")}
                            </option>
                          ))}
                        </datalist>
                      </label>

                      <label className="block min-w-0">
                        <span className={labelCls}>Discount %</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={item.discountPercent || ""}
                          onWheel={handleWheelBlur}
                          className={numCls}
                          onChange={(event) =>
                            updateItem(index, "discountPercent", event.target.value)
                          }
                        />
                      </label>

                      <label className="block min-w-0">
                        <span className={labelCls}>Discount ₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={item.discountValue || ""}
                          onWheel={handleWheelBlur}
                          className={numCls}
                          onChange={(event) =>
                            updateItem(index, "discountValue", event.target.value)
                          }
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-mist-200 pt-3 text-sm dark:border-white/10">
                      <span className="text-mist-500 dark:text-mist-300">Line total</span>
                      <span className="font-bold tabular-nums text-ink-950 dark:text-white">
                        {money(netAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-mist-200 py-3 text-sm font-semibold text-mist-500 transition-colors hover:border-orange-500 hover:text-orange-600 dark:border-white/10 dark:text-mist-300"
            >
              <Plus size={16} /> Add another product
            </button>
          </section>
        </div>

        {/* ---------- Right: invoice details + totals ---------- */}
        <div className="min-w-0 space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* 3. Invoice details */}
          <section className={cardCls}>
            <SectionTitle step="3" title="Invoice details" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
              <label className="block min-w-0">
                <span className={labelCls}>Invoice date</span>
                <input
                  type="date"
                  className={inputCls}
                  value={formData.invoiceDate}
                  onChange={(event) =>
                    setFormData({ ...formData, invoiceDate: event.target.value })
                  }
                />
              </label>
              <label className="block min-w-0">
                <span className={labelCls}>Due date</span>
                <input
                  type="date"
                  className={inputCls}
                  value={formData.dueDate}
                  onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                />
              </label>
              <label className="col-span-2 block min-w-0 lg:col-span-1">
                <span className={labelCls}>Delivery method</span>
                <input
                  placeholder="e.g. Courier, hand delivery"
                  title={formData.termsOfDelivery}
                  className={inputCls}
                  value={formData.termsOfDelivery}
                  onChange={(event) =>
                    setFormData({ ...formData, termsOfDelivery: event.target.value })
                  }
                />
              </label>
              <label className="col-span-2 block min-w-0 sm:col-span-1">
                <span className={labelCls}>Payment terms</span>
                <select
                  className={inputCls}
                  value={formData.paymentTerms}
                  onChange={(event) =>
                    setFormData({ ...formData, paymentTerms: event.target.value })
                  }
                >
                  <option value="Payable due amount in 10 days">Payable in 10 days</option>
                  <option value="Immediate">Immediate</option>
                  <option value="Net 30">Net 30</option>
                </select>
              </label>
              <label className="col-span-2 block min-w-0 sm:col-span-1">
                <span className={labelCls}>Status</span>
                <select
                  className={inputCls}
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* 4. Totals + submit */}
          <section className={cardCls}>
            <SectionTitle step="4" title="Payment & total" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-mist-500 dark:text-mist-300">
                  Items ({filledItems || formData.items.length}) after discount
                </span>
                <span className="font-semibold tabular-nums text-ink-950 dark:text-white">
                  {money(itemsNetTotal)}
                </span>
              </div>
              {appliedCredit > 0 && (
                <div className="flex items-center justify-between text-mint-500 dark:text-mint-400">
                  <span>Credit applied</span>
                  <span className="font-semibold tabular-nums">−{money(appliedCredit)}</span>
                </div>
              )}
              <label className="flex items-center justify-between gap-3">
                <span className="whitespace-nowrap text-mist-500 dark:text-mist-300">
                  Freight / shipping ₹
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  onWheel={handleWheelBlur}
                  className={`${inputCls} w-28 min-w-0 text-right tabular-nums sm:w-36`}
                  value={formData.summary.freightCost}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      summary: {
                        ...formData.summary,
                        freightCost: cleanNumericInput(event.target.value),
                      },
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 whitespace-nowrap text-mist-500 dark:text-mist-300">
                  <CreditCard size={14} className="text-mint-500" /> Amount paid ₹
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  onWheel={handleWheelBlur}
                  className={`${inputCls} w-28 min-w-0 text-right tabular-nums sm:w-36`}
                  value={formData.summary.paidAmount}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      summary: {
                        ...formData.summary,
                        paidAmount: cleanNumericInput(event.target.value),
                      },
                    })
                  }
                />
              </label>
            </div>

            <p className="mt-4 rounded-lg bg-mist-50 px-3 py-2 text-xs text-mist-500 dark:bg-white/5 dark:text-mist-300">
              GST (IGST / CGST + SGST) and the grand total are calculated when the invoice is
              created.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 hidden w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 lg:flex"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={15} />}
              {loading ? "Creating…" : "Create invoice"}
            </button>
          </section>
        </div>
      </form>

      {/* Phones / tablets: total + submit always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mist-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/10 dark:bg-ink-950/95 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
              Items total
            </p>
            <p className="truncate font-display text-lg font-bold tabular-nums text-ink-950 dark:text-white">
              {money(itemsNetTotal)}
            </p>
          </div>
          <button
            type="submit"
            form="create-invoice-form"
            disabled={loading}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={15} />}
            {loading ? "Creating…" : "Create invoice"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoicePage;
