import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unit: z.string().optional(),
  costPrice: z.number().nonnegative(),
  retailPrice: z.number().nonnegative(),
  quantityInStock: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
});

const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int(),
  reason: z.string().optional(),
});

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const lowStockOnly = req.query.lowStock === "true";
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(lowStockOnly ? {} : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json(lowStockOnly ? products.filter((p) => p.quantityInStock <= p.reorderLevel) : products);
  })
);

router.post(
  "/products",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  })
);

router.put(
  "/products/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  })
);

router.delete(
  "/products/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).send();
  })
);

router.post(
  "/products/:id/movements",
  asyncHandler(async (req, res) => {
    const data = movementSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const delta = data.type === "OUT" ? -Math.abs(data.quantity) : Math.abs(data.quantity);
    const newQty = data.type === "ADJUSTMENT" ? data.quantity : product.quantityInStock + delta;
    if (newQty < 0) return res.status(400).json({ error: "Insufficient stock" });

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          userId: req.user!.id,
        },
      }),
      prisma.product.update({ where: { id: product.id }, data: { quantityInStock: newQty } }),
    ]);
    res.status(201).json(movement);
  })
);

router.get(
  "/products/:id/movements",
  asyncHandler(async (req, res) => {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(movements);
  })
);

export default router;
