import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.all === "true";
    const services = await prisma.service.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json(services);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json(service);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.service.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
