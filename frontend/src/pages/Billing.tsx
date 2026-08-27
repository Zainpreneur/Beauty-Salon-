import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Receipt, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import {
  useAppointments,
  useClients,
  useCreateInvoice,
  useInvoices,
  useProducts,
  useRecordPayment,
  useServices,
  useStaff,
} from "../hooks/useResources";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { apiErrorMessage } from "../api/client";
import { Invoice } from "../types";

interface LineItem {
  key: string;
  type: "SERVICE" | "PRODUCT";
  refId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const PAYMENT_METHODS = ["CASH", "CARD", "ONLINE", "WALLET"];

export function Billing() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data: invoices, isLoading } = useInvoices({ status: statusFilter || undefined });
  const [posOpen, setPosOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500">Point of sale, invoices, and payments.</p>
        </div>
        <button className="btn-primary" onClick={() => setPosOpen(true)}>
          <Plus size={16} /> New sale
        </button>
      </div>

      <div className="flex gap-2">
        {["", "UNPAID", "PARTIAL", "PAID", "REFUNDED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              statusFilter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Loading invoices...
                </td>
              </tr>
            )}
            {invoices?.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-slate-600">
                  {inv.client?.firstName} {inv.client?.lastName}
                </td>
                <td className="px-4 py-3 text-slate-500">{format(parseISO(inv.createdAt), "MMM d, yyyy")}</td>
                <td className="px-4 py-3 font-medium text-slate-700">${inv.total.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-500">${inv.amountPaid.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} kind="invoice" />
                </td>
                <td className="px-4 py-3 text-right">
                  {inv.status !== "PAID" && inv.status !== "REFUNDED" && (
                    <button className="btn-ghost p-2" onClick={() => setPayingInvoice(inv)} title="Record payment">
                      <CreditCard size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && invoices?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PosModal open={posOpen} onClose={() => setPosOpen(false)} />
      <PaymentModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />
    </div>
  );
}

function PosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: clients } = useClients();
  const { data: staff } = useStaff();
  const { data: services } = useServices();
  const { data: products } = useProducts();
  const { data: appointments } = useAppointments({ status: "COMPLETED" });
  const createInvoice = useCreateInvoice();

  const [clientId, setClientId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const uninvoicedAppointments = (appointments || []).filter((a) => !a.invoice);

  function reset() {
    setClientId("");
    setStaffId("");
    setAppointmentId("");
    setItems([]);
    setDiscount(0);
    setTax(0);
    setAmountPaid(0);
    setPaymentMethod("CASH");
  }

  function addServiceItem(serviceId: string) {
    const service = services?.find((s) => s.id === serviceId);
    if (!service) return;
    setItems((prev) => [
      ...prev,
      { key: `${Date.now()}-${Math.random()}`, type: "SERVICE", refId: service.id, description: service.name, quantity: 1, unitPrice: service.price },
    ]);
  }

  function addProductItem(productId: string) {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => [
      ...prev,
      { key: `${Date.now()}-${Math.random()}`, type: "PRODUCT", refId: product.id, description: product.name, quantity: 1, unitPrice: product.retailPrice },
    ]);
  }

  function applyAppointment(id: string) {
    setAppointmentId(id);
    const appt = uninvoicedAppointments.find((a) => a.id === id);
    if (!appt) return;
    setClientId(appt.clientId);
    setStaffId(appt.staffId);
    setItems(
      appt.services.map((s) => ({
        key: s.id,
        type: "SERVICE" as const,
        refId: s.serviceId,
        description: s.service.name,
        quantity: 1,
        unitPrice: s.priceSnapshot,
      }))
    );
  }

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - discount + tax);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    try {
      await createInvoice.mutateAsync({
        clientId,
        staffId,
        appointmentId: appointmentId || undefined,
        items: items.map((i) => ({
          type: i.type,
          productId: i.type === "PRODUCT" ? i.refId : undefined,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discount,
        tax,
        amountPaid,
        paymentMethod,
      });
      toast.success("Invoice created");
      reset();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New sale" width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {uninvoicedAppointments.length > 0 && (
          <div>
            <label className="label">Link a completed appointment (optional)</label>
            <select className="input" value={appointmentId} onChange={(e) => applyAppointment(e.target.value)}>
              <option value="">— Start blank —</option>
              {uninvoicedAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.client.firstName} {a.client.lastName} · {format(parseISO(a.startTime), "MMM d, h:mm a")}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Client</label>
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select client</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Staff / Stylist</label>
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
              <option value="">Select staff</option>
              {staff?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Add a service</label>
            <select className="input" value="" onChange={(e) => e.target.value && addServiceItem(e.target.value)}>
              <option value="">Choose service...</option>
              {services?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Add a product</label>
            <select className="input" value="" onChange={(e) => e.target.value && addProductItem(e.target.value)}>
              <option value="">Choose product...</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id} disabled={p.quantityInStock <= 0}>
                  {p.name} — ${p.retailPrice.toFixed(2)} {p.quantityInStock <= 0 ? "(out of stock)" : `(${p.quantityInStock} in stock)`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-slate-400">No items added yet.</p>}
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm">
              <span className={`badge ${item.type === "SERVICE" ? "bg-brand-50 text-brand-700" : "bg-blush-50 text-blush-500"}`}>{item.type}</span>
              <span className="flex-1 truncate">{item.description}</span>
              <input
                type="number"
                min={1}
                className="input w-16 py-1 text-center"
                value={item.quantity}
                onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="input w-24 py-1 text-right"
                value={item.unitPrice}
                onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) })}
              />
              <span className="w-20 text-right font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</span>
              <button type="button" className="btn-ghost p-1.5 text-red-400" onClick={() => removeItem(item.key)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Discount ($)</label>
            <input type="number" min={0} step="0.01" className="input" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Tax ($)</label>
            <input type="number" min={0} step="0.01" className="input" value={tax} onChange={(e) => setTax(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Amount paid now ($)</label>
            <input type="number" min={0} step="0.01" className="input" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="label">Payment method</label>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  paymentMethod === m ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Discount</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax</span>
            <span>+${tax.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-800">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={createInvoice.isPending}>
            <Receipt size={16} /> {createInvoice.isPending ? "Processing..." : "Complete sale"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const recordPayment = useRecordPayment();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("CASH");

  const balance = invoice ? invoice.total - invoice.amountPaid : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    try {
      await recordPayment.mutateAsync({ id: invoice.id, amount, paymentMethod: method });
      toast.success("Payment recorded");
      setAmount(0);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <Modal open={!!invoice} onClose={onClose} title={`Record payment · ${invoice?.invoiceNumber}`}>
      {invoice && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-500">
            Balance due: <span className="font-semibold text-slate-800">${balance.toFixed(2)}</span>
          </p>
          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              min={0.01}
              max={balance}
              step="0.01"
              className="input"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="label">Method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    method === m ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Saving..." : "Record payment"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
