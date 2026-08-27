import { FormEvent, useMemo, useState } from "react";
import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  useAppointments,
  useCancelAppointment,
  useClients,
  useSaveAppointment,
  useServices,
  useStaff,
} from "../hooks/useResources";
import { Modal } from "../components/Modal";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { apiErrorMessage } from "../api/client";
import { Appointment } from "../types";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const PX_PER_MIN = 1.4;

const STATUS_OPTIONS = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

function minutesFromDayStart(iso: string) {
  const d = parseISO(iso);
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

export function Appointments() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  const { data: appointments, isLoading } = useAppointments({
    from: dayStart.toISOString(),
    to: dayEnd.toISOString(),
  });
  const { data: staff } = useStaff();
  const cancelAppointment = useCancelAppointment();

  const workingStaff = (staff || []).filter((s) => s.role === "STAFF" || s.role === "MANAGER");

  const hours = useMemo(() => {
    const arr = [];
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await cancelAppointment.mutateAsync(id);
      toast.success("Appointment cancelled");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Appointments</h1>
          <p className="text-sm text-slate-500">Schedule and manage bookings by day and stylist.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} /> New appointment
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost p-2" onClick={() => setDay(addDays(day, -1))}>
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[160px] text-center font-medium text-slate-700">
            {isSameDay(day, new Date()) ? "Today, " : ""}
            {format(day, "EEEE, MMM d")}
          </div>
          <button className="btn-ghost p-2" onClick={() => setDay(addDays(day, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
        <button className="btn-secondary" onClick={() => setDay(startOfDay(new Date()))}>
          Today
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-slate-400">Loading schedule...</p>
        ) : workingStaff.length === 0 ? (
          <p className="p-6 text-slate-400">No stylists yet — add staff first.</p>
        ) : (
          <div className="flex min-w-[720px]">
            <div className="w-16 shrink-0 border-r border-slate-100">
              <div className="h-14 border-b border-slate-100" />
              {hours.map((h) => (
                <div key={h} style={{ height: 60 * PX_PER_MIN }} className="border-b border-slate-50 px-1 pt-1 text-[10px] text-slate-400">
                  {format(new Date(2000, 0, 1, h), "h a")}
                </div>
              ))}
            </div>
            {workingStaff.map((s) => {
              const staffAppts = (appointments || []).filter((a) => a.staffId === s.id && a.status !== "CANCELLED");
              return (
                <div key={s.id} className="relative flex-1 border-r border-slate-100 last:border-r-0">
                  <div className="flex h-14 flex-col items-center justify-center border-b border-slate-100 px-1">
                    <Avatar name={s.name} color={s.avatarColor} size={26} />
                    <span className="mt-1 truncate text-[11px] font-medium text-slate-600">{s.name.split(" ")[0]}</span>
                  </div>
                  <div className="relative" style={{ height: (DAY_END_HOUR - DAY_START_HOUR + 1) * 60 * PX_PER_MIN }}>
                    {hours.map((h) => (
                      <div key={h} className="absolute left-0 right-0 border-b border-slate-50" style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MIN }} />
                    ))}
                    {staffAppts.map((a) => {
                      const top = Math.max(0, minutesFromDayStart(a.startTime)) * PX_PER_MIN;
                      const durationMin = (parseISO(a.endTime).getTime() - parseISO(a.startTime).getTime()) / 60000;
                      const height = Math.max(24, durationMin * PX_PER_MIN - 2);
                      return (
                        <button
                          key={a.id}
                          onClick={() => {
                            setEditing(a);
                            setModalOpen(true);
                          }}
                          className={`absolute left-1 right-1 overflow-hidden rounded-lg border p-1.5 text-left text-[11px] shadow-sm transition hover:z-10 hover:shadow-md ${
                            a.status === "COMPLETED"
                              ? "border-emerald-200 bg-emerald-50"
                              : a.status === "NO_SHOW"
                              ? "border-red-200 bg-red-50"
                              : "border-brand-200 bg-brand-50"
                          }`}
                          style={{ top, height }}
                        >
                          <div className="truncate font-semibold text-slate-700">
                            {a.client.firstName} {a.client.lastName}
                          </div>
                          <div className="truncate text-slate-500">{a.services.map((sv) => sv.service.name).join(", ")}</div>
                          <div className="text-slate-400">{format(parseISO(a.startTime), "h:mm a")}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        appointment={editing}
        defaultDate={day}
        onCancelAppointment={editing ? () => handleCancel(editing.id) : undefined}
      />
    </div>
  );
}

function AppointmentModal({
  open,
  onClose,
  appointment,
  defaultDate,
  onCancelAppointment,
}: {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  defaultDate: Date;
  onCancelAppointment?: () => void;
}) {
  const { data: clients } = useClients();
  const { data: staff } = useStaff();
  const { data: services } = useServices();
  const saveAppointment = useSaveAppointment();

  const [clientId, setClientId] = useState(appointment?.clientId || "");
  const [staffId, setStaffId] = useState(appointment?.staffId || "");
  const [serviceIds, setServiceIds] = useState<string[]>(appointment?.services.map((s) => s.serviceId) || []);
  const [date, setDate] = useState(format(appointment ? parseISO(appointment.startTime) : defaultDate, "yyyy-MM-dd"));
  const [time, setTime] = useState(appointment ? format(parseISO(appointment.startTime), "HH:mm") : "10:00");
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [status, setStatus] = useState(appointment?.status || "SCHEDULED");

  // Reset local state whenever a different appointment (or "new") is opened.
  useMemo(() => {
    setClientId(appointment?.clientId || "");
    setStaffId(appointment?.staffId || "");
    setServiceIds(appointment?.services.map((s) => s.serviceId) || []);
    setDate(format(appointment ? parseISO(appointment.startTime) : defaultDate, "yyyy-MM-dd"));
    setTime(appointment ? format(parseISO(appointment.startTime), "HH:mm") : "10:00");
    setNotes(appointment?.notes || "");
    setStatus(appointment?.status || "SCHEDULED");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, open]);

  const selectedServices = (services || []).filter((s) => serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (serviceIds.length === 0) {
      toast.error("Select at least one service");
      return;
    }
    const startTime = new Date(`${date}T${time}:00`).toISOString();
    try {
      await saveAppointment.mutateAsync({
        id: appointment?.id,
        clientId,
        staffId,
        startTime,
        serviceIds,
        notes,
        status: appointment ? status : undefined,
      });
      toast.success(appointment ? "Appointment updated" : "Appointment booked");
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={appointment ? "Edit appointment" : "New appointment"} width="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="label">Stylist</label>
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
              <option value="">Select stylist</option>
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
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label">Services</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
            {services?.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                  {s.name}
                </span>
                <span className="text-xs text-slate-400">
                  {s.durationMinutes}min · ${s.price.toFixed(2)}
                </span>
              </label>
            ))}
          </div>
          {selectedServices.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Total: {totalDuration} min · ${totalPrice.toFixed(2)}
            </p>
          )}
        </div>

        {appointment && (
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {onCancelAppointment ? (
            <button type="button" className="btn-danger" onClick={onCancelAppointment}>
              <X size={14} /> Cancel appointment
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn-primary" disabled={saveAppointment.isPending}>
              {saveAppointment.isPending ? "Saving..." : appointment ? "Save changes" : "Book appointment"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
