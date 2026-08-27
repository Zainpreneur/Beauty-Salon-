import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  clientId: z.string(),
  staffId: z.string(),
  startTime: z.string().datetime(),
  serviceIds: z.array(z.string()).min(1),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  clientId: z.string().optional(),
  staffId: z.string().optional(),
  startTime: z.string().datetime().optional(),
  serviceIds: z.array(z.string()).min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
});

async function buildServicesPayload(serviceIds: string[]) {
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
  if (services.length !== serviceIds.length) {
    throw Object.assign(new Error("One or more services not found"), { status: 400 });
  }
  const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  return { services, durationMinutes };
}

async function assertNoConflict(staffId: string, start: Date, end: Date, excludeId?: string) {
  const overlap = await prisma.appointment.findFirst({
    where: {
      staffId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
  });
  if (overlap) {
    throw Object.assign(new Error("Staff member already has an appointment in this time slot"), { status: 409 });
  }
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to, staffId, status } = req.query as Record<string, string | undefined>;
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId: staffId || undefined,
        status: status ? (status as any) : undefined,
        startTime: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: {
        client: true,
        staff: { select: { id: true, name: true, avatarColor: true } },
        services: { include: { service: true } },
      },
      orderBy: { startTime: "asc" },
    });
    res.json(appointments);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { client: true, staff: true, services: { include: { service: true } }, invoice: true },
    });
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json(appointment);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const { services, durationMinutes } = await buildServicesPayload(data.serviceIds);
    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    await assertNoConflict(data.staffId, startTime, endTime);

    const appointment = await prisma.appointment.create({
      data: {
        clientId: data.clientId,
        staffId: data.staffId,
        startTime,
        endTime,
        notes: data.notes,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            priceSnapshot: s.price,
            durationSnapshot: s.durationMinutes,
          })),
        },
      },
      include: { client: true, staff: true, services: { include: { service: true } } },
    });
    res.status(201).json(appointment);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { services: true },
    });
    if (!existing) return res.status(404).json({ error: "Appointment not found" });

    let startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    let endTime = existing.endTime;
    const staffId = data.staffId ?? existing.staffId;

    if (data.serviceIds) {
      const { services, durationMinutes } = await buildServicesPayload(data.serviceIds);
      endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      await assertNoConflict(staffId, startTime, endTime, existing.id);
      await prisma.appointmentService.deleteMany({ where: { appointmentId: existing.id } });
      await prisma.appointmentService.createMany({
        data: services.map((s) => ({
          appointmentId: existing.id,
          serviceId: s.id,
          priceSnapshot: s.price,
          durationSnapshot: s.durationMinutes,
        })),
      });
    } else if (data.startTime || data.staffId) {
      const durationMinutes = (existing.endTime.getTime() - existing.startTime.getTime()) / 60000;
      endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      await assertNoConflict(staffId, startTime, endTime, existing.id);
    }

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        clientId: data.clientId,
        staffId: data.staffId,
        notes: data.notes,
        status: data.status,
        startTime,
        endTime,
      },
      include: { client: true, staff: true, services: { include: { service: true } } },
    });
    res.json(appointment);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.appointment.update({ where: { id: req.params.id }, data: { status: "CANCELLED" } });
    res.status(204).send();
  })
);

export default router;
