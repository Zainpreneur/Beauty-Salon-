import { FormEvent, useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useDeleteService, useSaveService, useServices } from "../hooks/useResources";
import { Modal } from "../components/Modal";
import { apiErrorMessage } from "../api/client";
import { Service } from "../types";

const emptyForm = { name: "", description: "", category: "General", durationMinutes: 30, price: 0 };

export function Services() {
  const { data: services, isLoading } = useServices(true);
  const saveService = useSaveService();
  const deleteService = useDeleteService();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);

  const grouped = (services || []).reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", category: s.category, durationMinutes: s.durationMinutes, price: s.price });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await saveService.mutateAsync({ id: editing?.id, ...form });
      toast.success(editing ? "Service updated" : "Service added");
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this service?")) return;
    try {
      await deleteService.mutateAsync(id);
      toast.success("Service deactivated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Services & Menu</h1>
          <p className="text-sm text-slate-500">Manage the services your salon offers.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add service
        </button>
      </div>

      {isLoading && <p className="text-slate-400">Loading services...</p>}

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{category}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <div key={s.id} className={`card ${!s.active ? "opacity-50" : ""}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold text-slate-800">{s.name}</h3>
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-ghost p-1.5 text-red-400 hover:bg-red-50" onClick={() => handleDelete(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {s.description && <p className="mb-3 text-xs text-slate-500">{s.description}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={13} /> {s.durationMinutes} min
                    </span>
                    <span className="font-semibold text-brand-600">${s.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit service" : "Add service"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duration (minutes)</label>
              <input
                type="number"
                min={5}
                className="input"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saveService.isPending}>
              {saveService.isPending ? "Saving..." : "Save service"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
