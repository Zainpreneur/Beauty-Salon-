import { format, parseISO } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CalendarCheck, DollarSign, Users, AlertTriangle } from "lucide-react";
import { useDashboard } from "../hooks/useResources";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs font-medium text-slate-400">{label}</div>
        <div className="text-2xl font-semibold text-slate-800">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();

  const chartData = data
    ? Object.entries(data.revenueByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, total]) => ({ date, total }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Good day, {user?.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">Here's what's happening at the salon today.</p>
      </div>

      {isLoading || !data ? (
        <div className="text-slate-400">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={CalendarCheck} label="Today's appointments" value={String(data.todayAppointments)} tint="bg-brand-50 text-brand-600" />
            <StatCard icon={DollarSign} label="Today's revenue" value={`$${data.todayRevenue.toFixed(2)}`} sub={`$${data.monthRevenue.toFixed(2)} this month`} tint="bg-emerald-50 text-emerald-600" />
            <StatCard icon={Users} label="Total clients" value={String(data.totalClients)} sub={`+${data.newClientsThisMonth} this month`} tint="bg-blush-50 text-blush-500" />
            <StatCard icon={AlertTriangle} label="Low stock items" value={String(data.lowStockCount)} tint="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="card xl:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue — last 30 days</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => format(parseISO(d), "MMM d")}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={20}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    labelFormatter={(d) => format(parseISO(d as string), "MMM d, yyyy")}
                    contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Top services</h2>
              <div className="space-y-3">
                {data.topServices.length === 0 && <p className="text-sm text-slate-400">No bookings yet.</p>}
                {data.topServices.map(({ service, bookings }) =>
                  service ? (
                    <div key={service.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-slate-700">{service.name}</div>
                        <div className="text-xs text-slate-400">{service.category}</div>
                      </div>
                      <span className="badge bg-brand-50 text-brand-700">{bookings} booked</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Upcoming appointments</h2>
            <div className="space-y-3">
              {data.upcoming.length === 0 && <p className="text-sm text-slate-400">Nothing scheduled yet.</p>}
              {data.upcoming.map((appt) => (
                <div key={appt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={appt.staff.name} color={appt.staff.avatarColor} size={32} />
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {appt.client.firstName} {appt.client.lastName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {appt.services.map((s) => s.service.name).join(", ")} · with {appt.staff.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{format(parseISO(appt.startTime), "MMM d, h:mm a")}</span>
                    <StatusBadge status={appt.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
