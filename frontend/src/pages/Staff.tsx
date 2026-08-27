import { FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { useDeleteStaff, useSaveStaff, useSaveStaffSchedule, useStaff, useStaffSchedule } from "../hooks/useResources";
import { Modal } from "../components/Modal";
import { Avatar } from "../components/Avatar";
import { apiErrorMessage } from "../api/client";
import { Staff as StaffType, StaffScheduleEntry } from "../types";
import { useAuth } from "../context/AuthContext";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ROLES = ["ADMIN", "MANAGER", "STAFF", "RECEPTIONIST"];

const emptyForm = { name: "", email: "", password: "", role: "STAFF", phone: "", commissionPct: 0, avatarColor: "#7c5cff" };

function defaultSchedule(): StaffScheduleEntry[] {
  return DAYS.map((_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "18:00", isOff: i === 0 }));
}

export function Staff() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";
  const { data: staff, isLoading } = useStaff();
  const saveStaff = useSaveStaff();
  const deleteStaff = useDeleteStaff();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [scheduleFor, setScheduleFor] = useState<StaffType | null>(null);
  const { data: fetchedSchedule } = useStaffSchedule(scheduleFor?.id);
  const saveSchedule = useSaveStaffSchedule(scheduleFor?.id);
  const [schedule, setSchedule] = useState<StaffScheduleEntry[]>(defaultSchedule());

  useEffect(() => {
    if (fetchedSchedule && fetchedSchedule.length > 0) {
      const byDay = new Map(fetchedSchedule.map((e) => [e.dayOfWeek, e]));
      setSchedule(DAYS.map((_, i) => byDay.get(i) || { dayOfWeek: i, startTime: "09:00", endTime: "18:00", isOff: true }));
    } else if (scheduleFor) {
      setSchedule(defaultSchedule());
    }
  }, [fetchedSchedule, scheduleFor]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(s: StaffType) {
    setEditing(s);
    setForm({ name: s.name, email: s.email, password: "", role: s.role, phone: s.phone || "", commissionPct: s.commissionPct, avatarColor: s.avatarColor });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const payload: any = { id: editing?.id, ...form };
      if (!payload.password) delete payload.password;
      await saveStaff.mutateAsync(payload);
      toast.success(editing ? "Staff updated" : "Staff added");
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this staff member?")) return;
    try {
      await deleteStaff.mutateAsync(id);
      toast.success("Staff deactivated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleSaveSchedule() {
    try {
      await saveSchedule.mutateAsync(schedule);
      toast.success("Schedule saved");
      setScheduleFor(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Staff</h1>
          <p className="text-sm text-slate-500">Manage your team and working hours.</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add staff
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-400">Loading staff...</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {staff?.map((s) => (
          <div key={s.id} className="card">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} color={s.avatarColor} size={40} />
                <div>
                  <div className="font-semibold text-slate-800">{s.name}</div>
                  <span className="badge bg-slate-100 text-slate-500">{s.role}</span>
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}>
                    <Pencil size={14} />
                  </button>
                  {s.id !== user?.id && (
                    <button className="btn-ghost p-1.5 text-red-400 hover:bg-red-50" onClick={() => handleDelete(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Mail size={12} /> {s.email}
              </div>
              {s.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={12} /> {s.phone}
                </div>
              )}
              {s.commissionPct > 0 && <div>Commission: {s.commissionPct}%</div>}
            </div>
            <button className="btn-secondary mt-3 w-full" onClick={() => setScheduleFor(s)}>
              Manage schedule
            </button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit staff" : "Add staff"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">{editing ? "New password (leave blank to keep current)" : "Password"}</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
              minLength={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Commission % (on services performed)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              value={form.commissionPct}
              onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saveStaff.isPending}>
              {saveStaff.isPending ? "Saving..." : "Save staff"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!scheduleFor} onClose={() => setScheduleFor(null)} title={`${scheduleFor?.name}'s weekly schedule`}>
        <div className="space-y-2">
          {schedule.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2">
              <span className="w-24 text-sm font-medium text-slate-600">{DAYS[entry.dayOfWeek]}</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={!entry.isOff}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[i] = { ...entry, isOff: !e.target.checked };
                    setSchedule(next);
                  }}
                />
                Working
              </label>
              <input
                type="time"
                className="input py-1"
                disabled={entry.isOff}
                value={entry.startTime}
                onChange={(e) => {
                  const next = [...schedule];
                  next[i] = { ...entry, startTime: e.target.value };
                  setSchedule(next);
                }}
              />
              <span className="text-slate-300">–</span>
              <input
                type="time"
                className="input py-1"
                disabled={entry.isOff}
                value={entry.endTime}
                onChange={(e) => {
                  const next = [...schedule];
                  next[i] = { ...entry, endTime: e.target.value };
                  setSchedule(next);
                }}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setScheduleFor(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveSchedule} disabled={saveSchedule.isPending}>
              {saveSchedule.isPending ? "Saving..." : "Save schedule"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
