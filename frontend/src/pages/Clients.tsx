import { FormEvent, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Search, Phone, Mail, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useClient, useClients, useDeleteClient, useSaveClient } from "../hooks/useResources";
import { Modal } from "../components/Modal";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { apiErrorMessage } from "../api/client";
import { Client } from "../types";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "",
  notes: "",
  allergies: "",
};

export function Clients() {
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: clients, isLoading } = useClients(q);
  const { data: selected } = useClient(selectedId || undefined);
  const saveClient = useSaveClient();
  const deleteClient = useDeleteClient();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email || "",
      phone: client.phone,
      gender: client.gender || "",
      notes: client.notes || "",
      allergies: client.allergies || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await saveClient.mutateAsync({ id: editing?.id, ...form });
      toast.success(editing ? "Client updated" : "Client added");
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this client?")) return;
    try {
      await deleteClient.mutateAsync(id);
      toast.success("Client deactivated");
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Clients</h1>
          <p className="text-sm text-slate-500">Manage your client list and history.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add client
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Search by name, phone, email..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Loyalty</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Loading clients...
                  </td>
                </tr>
              )}
              {clients?.map((c) => (
                <tr
                  key={c.id}
                  className={`cursor-pointer border-b border-slate-50 hover:bg-slate-50 ${selectedId === c.id ? "bg-brand-50/50" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${c.firstName} ${c.lastName}`} size={32} />
                      <div>
                        <div className="font-medium text-slate-700">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-xs text-slate-400">{c.gender || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone size={12} /> {c.phone}
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Mail size={12} /> {c.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.loyaltyPoints} pts</td>
                  <td className="px-4 py-3 text-slate-500">{format(parseISO(c.createdAt), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn-ghost p-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(c);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-ghost p-2 text-red-400 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && clients?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          {!selected ? (
            <p className="text-sm text-slate-400">Select a client to view their history.</p>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Avatar name={`${selected.firstName} ${selected.lastName}`} size={44} />
                <div>
                  <div className="font-semibold text-slate-800">
                    {selected.firstName} {selected.lastName}
                  </div>
                  <div className="text-xs text-slate-400">{selected.phone}</div>
                </div>
              </div>
              {selected.allergies && (
                <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠ Allergies: {selected.allergies}</div>
              )}
              {selected.notes && <p className="mb-4 text-xs text-slate-500">{selected.notes}</p>}

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Appointment history</h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {selected.appointments?.length ? (
                  selected.appointments.map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-100 p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-600">{format(parseISO(a.startTime), "MMM d, yyyy")}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="mt-1 text-slate-400">{a.services.map((s) => s.service.name).join(", ")}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No appointments yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit client" : "Add client"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Allergies / sensitivities</label>
            <input className="input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saveClient.isPending}>
              {saveClient.isPending ? "Saving..." : "Save client"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
