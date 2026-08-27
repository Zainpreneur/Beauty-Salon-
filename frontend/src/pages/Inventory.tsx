import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Pencil, Trash2, PackagePlus, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  useAddStockMovement,
  useDeleteProduct,
  useProducts,
  useSaveProduct,
  useStockMovements,
} from "../hooks/useResources";
import { Modal } from "../components/Modal";
import { apiErrorMessage } from "../api/client";
import { Product } from "../types";

const emptyForm = { name: "", sku: "", category: "General", unit: "unit", costPrice: 0, retailPrice: 0, quantityInStock: 0, reorderLevel: 5 };

export function Inventory() {
  const [showLowStock, setShowLowStock] = useState(false);
  const { data: products, isLoading } = useProducts(showLowStock);
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [movementFor, setMovementFor] = useState<Product | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, unit: p.unit, costPrice: p.costPrice, retailPrice: p.retailPrice, quantityInStock: p.quantityInStock, reorderLevel: p.reorderLevel });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const payload: any = { id: editing?.id, ...form };
      if (editing) delete payload.quantityInStock; // stock is adjusted via movements, not direct edit
      await saveProduct.mutateAsync(payload);
      toast.success(editing ? "Product updated" : "Product added");
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this product?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Product deactivated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500">Track retail products and stock levels.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add product
        </button>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} />
        Show low stock only
      </label>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Cost / Retail</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading inventory...
                </td>
              </tr>
            )}
            {products?.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                <td className="px-4 py-3 text-slate-500">{p.category}</td>
                <td className="px-4 py-3 text-slate-500">
                  ${p.costPrice.toFixed(2)} / ${p.retailPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${p.quantityInStock <= p.reorderLevel ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                    {p.quantityInStock <= p.reorderLevel && <AlertTriangle size={11} className="mr-1" />}
                    {p.quantityInStock} {p.unit}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button className="btn-ghost p-2" onClick={() => setMovementFor(p)} title="Adjust stock">
                      <PackagePlus size={14} />
                    </button>
                    <button className="btn-ghost p-2" onClick={() => openEdit(p)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-ghost p-2 text-red-400 hover:bg-red-50" onClick={() => handleDelete(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && products?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit product" : "Add product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Cost price</label>
              <input type="number" min={0} step="0.01" className="input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Retail price</label>
              <input type="number" min={0} step="0.01" className="input" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Reorder level</label>
              <input type="number" min={0} className="input" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
            </div>
          </div>
          {!editing && (
            <div>
              <label className="label">Starting quantity</label>
              <input type="number" min={0} className="input" value={form.quantityInStock} onChange={(e) => setForm({ ...form, quantityInStock: Number(e.target.value) })} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saveProduct.isPending}>
              {saveProduct.isPending ? "Saving..." : "Save product"}
            </button>
          </div>
        </form>
      </Modal>

      <StockMovementModal product={movementFor} onClose={() => setMovementFor(null)} />
    </div>
  );
}

function StockMovementModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { data: movements } = useStockMovements(product?.id);
  const addMovement = useAddStockMovement();
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    try {
      await addMovement.mutateAsync({ productId: product.id, type, quantity, reason });
      toast.success("Stock updated");
      setQuantity(1);
      setReason("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <Modal open={!!product} onClose={onClose} title={`Stock · ${product?.name}`}>
      {product && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Current stock: <span className="font-semibold text-slate-800">{product.quantityInStock}</span> {product.unit}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              {(["IN", "OUT", "ADJUSTMENT"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    type === t ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div>
              <label className="label">{type === "ADJUSTMENT" ? "Set quantity to" : "Quantity"}</label>
              <input type="number" min={type === "ADJUSTMENT" ? 0 : 1} className="input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Restock from supplier" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={addMovement.isPending}>
              {addMovement.isPending ? "Saving..." : "Apply"}
            </button>
          </form>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent movements</h3>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {movements?.length ? (
                movements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs">
                    <div>
                      <span className={`badge mr-2 ${m.type === "IN" ? "bg-emerald-50 text-emerald-600" : m.type === "OUT" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                        {m.type}
                      </span>
                      {m.reason || "—"}
                    </div>
                    <div className="text-right text-slate-400">
                      <div>{m.quantity}</div>
                      <div>{format(parseISO(m.createdAt), "MMM d, h:mm a")}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No movements yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
