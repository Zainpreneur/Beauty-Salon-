import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "RECEPTIONIST"]),
  phone: z.string().optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  avatarColor: z.string().optional(),
});

const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  isOff: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const staff = await prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        commissionPct: true,
        avatarColor: true,
        createdAt: true,
      },
    });
    res.json(staff);
  })
);

router.get(
  "/:id/schedule",
  asyncHandler(async (req, res) => {
    const schedule = await prisma.staffSchedule.findMany({
      where: { staffId: req.params.id },
      orderBy: { dayOfWeek: "asc" },
    });
    res.json(schedule);
  })
);

router.put(
  "/:id/schedule",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const entries = z.array(scheduleSchema).parse(req.body);
    await prisma.$transaction(
      entries.map((entry) =>
        prisma.staffSchedule.upsert({
          where: { staffId_dayOfWeek: { staffId: req.params.id, dayOfWeek: entry.dayOfWeek } },
          update: entry,
          create: { ...entry, staffId: req.params.id },
        })
      )
    );
    const schedule = await prisma.staffSchedule.findMany({ where: { staffId: req.params.id } });
    res.json(schedule);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = staffSchema.parse(req.body);
    if (!data.password) return res.status(400).json({ error: "Password is required for new staff" });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        commissionPct: data.commissionPct ?? 0,
        avatarColor: data.avatarColor ?? "#7c5cff",
        passwordHash,
      },
    });
    res.status(201).json({ ...user, passwordHash: undefined });
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = staffSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.password;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    res.json({ ...user, passwordHash: undefined });
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
