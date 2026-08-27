import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import {
  Appointment,
  Client,
  DashboardSummary,
  Invoice,
  Product,
  Service,
  Staff,
  StaffScheduleEntry,
  StockMovement,
} from "../types";

// ---- Dashboard ----
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
    refetchInterval: 60000,
  });
}

// ---- Clients ----
export function useClients(q = "") {
  return useQuery({
    queryKey: ["clients", q],
    queryFn: async () => (await api.get<Client[]>("/clients", { params: { q } })).data,
  });
}

export function useClient(id?: string) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => (await api.get<Client>(`/clients/${id}`)).data,
    enabled: !!id,
  });
}

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Client> & { id?: string }) => {
      const { id, ...data } = payload;
      if (id) return (await api.put<Client>(`/clients/${id}`, data)).data;
      return (await api.post<Client>("/clients", data)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

// ---- Services ----
export function useServices(all = false) {
  return useQuery({
    queryKey: ["services", all],
    queryFn: async () => (await api.get<Service[]>("/services", { params: { all } })).data,
  });
}

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Service> & { id?: string }) => {
      const { id, ...data } = payload;
      if (id) return (await api.put<Service>(`/services/${id}`, data)).data;
      return (await api.post<Service>("/services", data)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

// ---- Staff ----
export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await api.get<Staff[]>("/staff")).data,
  });
}

export function useSaveStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Staff> & { id?: string; password?: string }) => {
      const { id, ...data } = payload;
      if (id) return (await api.put<Staff>(`/staff/${id}`, data)).data;
      return (await api.post<Staff>("/staff", data)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useStaffSchedule(staffId?: string) {
  return useQuery({
    queryKey: ["staff-schedule", staffId],
    queryFn: async () => (await api.get<StaffScheduleEntry[]>(`/staff/${staffId}/schedule`)).data,
    enabled: !!staffId,
  });
}

export function useSaveStaffSchedule(staffId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: StaffScheduleEntry[]) =>
      (await api.put<StaffScheduleEntry[]>(`/staff/${staffId}/schedule`, entries)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-schedule", staffId] }),
  });
}

// ---- Appointments ----
export function useAppointments(params: { from?: string; to?: string; staffId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: async () => (await api.get<Appointment[]>("/appointments", { params })).data,
  });
}

export function useSaveAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: {
        id?: string;
        clientId: string;
        staffId: string;
        startTime: string;
        serviceIds: string[];
        notes?: string;
        status?: string;
      }
    ) => {
      const { id, ...data } = payload;
      if (id) return (await api.put<Appointment>(`/appointments/${id}`, data)).data;
      return (await api.post<Appointment>("/appointments", data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/appointments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ---- Invoices ----
export function useInvoices(params: { clientId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => (await api.get<Invoice[]>("/invoices", { params })).data,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<Invoice>("/invoices", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, paymentMethod }: { id: string; amount: number; paymentMethod?: string }) =>
      (await api.post<Invoice>(`/invoices/${id}/payments`, { amount, paymentMethod })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

// ---- Inventory ----
export function useProducts(lowStock = false) {
  return useQuery({
    queryKey: ["products", lowStock],
    queryFn: async () => (await api.get<Product[]>("/inventory/products", { params: { lowStock } })).data,
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Product> & { id?: string }) => {
      const { id, ...data } = payload;
      if (id) return (await api.put<Product>(`/inventory/products/${id}`, data)).data;
      return (await api.post<Product>("/inventory/products", data)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/inventory/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: ["stock-movements", productId],
    queryFn: async () => (await api.get<StockMovement[]>(`/inventory/products/${productId}/movements`)).data,
    enabled: !!productId,
  });
}

export function useAddStockMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      type,
      quantity,
      reason,
    }: {
      productId: string;
      type: "IN" | "OUT" | "ADJUSTMENT";
      quantity: number;
      reason?: string;
    }) => (await api.post(`/inventory/products/${productId}/movements`, { type, quantity, reason })).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements", vars.productId] });
    },
  });
}
