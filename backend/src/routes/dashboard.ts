import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      todayAppointments,
      todayRevenueAgg,
      monthRevenueAgg,
      totalClients,
      newClientsThisMonth,
      lowStockCount,
      upcoming,
      revenueLast30,
      topServices,
    ] = await Promise.all([
      prisma.appointment.count({ where: { startTime: { gte: todayStart, lte: todayEnd }, status: { notIn: ["CANCELLED"] } } }),
      prisma.invoice.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart, lte: todayEnd }, status: { not: "REFUNDED" } } }),
      prisma.invoice.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart }, status: { not: "REFUNDED" } } }),
      prisma.client.count({ where: { active: true } }),
      prisma.client.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.product.findMany({ where: { active: true } }).then((ps) => ps.filter((p) => p.quantityInStock <= p.reorderLevel).length),
      prisma.appointment.findMany({
        where: { startTime: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
        take: 6,
        orderBy: { startTime: "asc" },
        include: { client: true, staff: { select: { name: true, avatarColor: true } }, services: { include: { service: true } } },
      }),
      prisma.invoice.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "REFUNDED" } },
        select: { createdAt: true, total: true },
      }),
      prisma.appointmentService.groupBy({
        by: ["serviceId"],
        _count: { serviceId: true },
        orderBy: { _count: { serviceId: "desc" } },
        take: 5,
      }),
    ]);

    const revenueByDay: Record<string, number> = {};
    for (const inv of revenueLast30) {
      const key = inv.createdAt.toISOString().slice(0, 10);
      revenueByDay[key] = (revenueByDay[key] || 0) + inv.total;
    }

    const serviceIds = topServices.map((s) => s.serviceId);
    const serviceDetails = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
    const topServicesResolved = topServices.map((s) => ({
      service: serviceDetails.find((sd) => sd.id === s.serviceId),
      bookings: s._count.serviceId,
    }));

    res.json({
      todayAppointments,
      todayRevenue: todayRevenueAgg._sum.total || 0,
      monthRevenue: monthRevenueAgg._sum.total || 0,
      totalClients,
      newClientsThisMonth,
      lowStockCount,
      upcoming,
      revenueByDay,
      topServices: topServicesResolved,
    });
  })
);

export default router;
