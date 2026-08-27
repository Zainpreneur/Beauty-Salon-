import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const clientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(3),
  gender: z.string().optional(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  address: z.string().optional(),
  notes: z.string().optional(),
  allergies: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const clients = await prisma.client.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: { services: { include: { service: true } }, staff: true },
          orderBy: { startTime: "desc" },
        },
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: {
        ...data,
        email: data.email || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
    });
    res.status(201).json(client);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...data,
        email: data.email === "" ? null : data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });
    res.json(client);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.client.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
