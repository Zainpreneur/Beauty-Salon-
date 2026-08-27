export type Role = "ADMIN" | "MANAGER" | "STAFF" | "RECEPTIONIST";

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type InvoiceStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";
export type PaymentMethod = "CASH" | "CARD" | "ONLINE" | "WALLET";
export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT";
export type InvoiceItemType = "SERVICE" | "PRODUCT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  commissionPct: number;
  avatarColor: string;
  createdAt: string;
}

export interface StaffScheduleEntry {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOff?: boolean;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  notes?: string | null;
  allergies?: string | null;
  loyaltyPoints: number;
  active: boolean;
  createdAt: string;
  appointments?: Appointment[];
  invoices?: Invoice[];
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface AppointmentServiceLine {
  id: string;
  serviceId: string;
  priceSnapshot: number;
  durationSnapshot: number;
  service: Service;
}

export interface Appointment {
  id: string;
  clientId: string;
  client: Client;
  staffId: string;
  staff: { id: string; name: string; avatarColor?: string };
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string | null;
  services: AppointmentServiceLine[];
  invoice?: Invoice | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: number;
  retailPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  active: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string | null;
  createdAt: string;
  user?: { name: string } | null;
}

export interface InvoiceItem {
  id: string;
  type: InvoiceItemType;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client?: Client;
  staffId: string;
  staff?: { id: string; name: string };
  appointmentId?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  items: InvoiceItem[];
}

export interface DashboardSummary {
  todayAppointments: number;
  todayRevenue: number;
  monthRevenue: number;
  totalClients: number;
  newClientsThisMonth: number;
  lowStockCount: number;
  upcoming: Appointment[];
  revenueByDay: Record<string, number>;
  topServices: { service: Service; bookings: number }[];
}
