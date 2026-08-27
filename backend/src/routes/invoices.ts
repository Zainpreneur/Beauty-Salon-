import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  type: z.enum(["SERVICE", "PRODUCT"]),
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
});

const createSchema = z.object({
  clientId: z.string(),
  staffId: z.string(),
  appointmentId: z.string().optional(),
  items: z.array(itemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  amountPaid: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["CASH", "CARD", "ONLINE", "WALLET"]).default("CASH"),
});

function computeStatus(total: number, amountPaid: number): "PAID" | "PARTIAL" | "UNPAID" {
  if (amountPaid >= total && total > 0) return "PAID";
  if (amountPaid > 0) return "PARTIAL";
  return "UNPAID";
}

async function nextInvoiceNumber() {
  const count = await prisma.invoice.count();
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;
  return `INV-${ymd}-${String(count + 1).padStart(4, "0")}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId, status, from, to } = req.query as Record<string, string | undefined>;
    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: clientId || undefined,
        status: status ? (status as any) : undefined,
        createdAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
      include: { client: true, staff: { select: { id: true, name: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, staff: true, items: true, appointment: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const itemsWithTotals = data.items.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));
    const subtotal = itemsWithTotals.reduce((sum, i) => sum + i.total, 0);
    const total = Math.max(0, subtotal - data.discount + data.tax);
    const status = computeStatus(total, data.amountPaid);
    const invoiceNumber = await nextInvoiceNumber();

    const productItems = itemsWithTotals.filter((i) => i.type === "PRODUCT" && i.productId);
    for (const item of productItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId! } });
      if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
      if (product.quantityInStock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { status: 400 });
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: data.clientId,
          staffId: data.staffId,
          appointmentId: data.appointmentId,
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          amountPaid: data.amountPaid,
          status,
          paymentMethod: data.paymentMethod,
          items: {
            create: itemsWithTotals.map((i) => ({
              type: i.type,
              productId: i.productId,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.total,
            })),
          },
        },
        include: { items: true, client: true, staff: true },
      });

      for (const item of productItems) {
        await tx.product.update({
          where: { id: item.productId! },
          data: { quantityInStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId!,
            type: "OUT",
            quantity: item.quantity,
            reason: `Sold on invoice ${invoiceNumber}`,
            userId: req.user!.id,
          },
        });
      }

      if (data.appointmentId) {
        await tx.appointment.update({ where: { id: data.appointmentId }, data: { status: "COMPLETED" } });
      }

      return created;
    });

    res.status(201).json(invoice);
  })
);

router.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const { amount, paymentMethod } = z
      .object({ amount: z.number().positive(), paymentMethod: z.enum(["CASH", "CARD", "ONLINE", "WALLET"]).optional() })
      .parse(req.body);
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const amountPaid = invoice.amountPaid + amount;
    const status = computeStatus(invoice.total, amountPaid);
    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { amountPaid, status, paymentMethod: paymentMethod ?? invoice.paymentMethod },
      include: { items: true, client: true },
    });
    res.json(updated);
  })
);

router.post(
  "/:id/refund",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: "REFUNDED" },
    });
    res.json(invoice);
  })
);

export default router;
