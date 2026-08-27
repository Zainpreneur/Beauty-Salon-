import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@salon.com" },
    update: {},
    create: {
      name: "Amara Okafor",
      email: "admin@salon.com",
      passwordHash,
      role: "ADMIN",
      phone: "555-0100",
      avatarColor: "#7c5cff",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@salon.com" },
    update: {},
    create: {
      name: "Priya Nair",
      email: "manager@salon.com",
      passwordHash,
      role: "MANAGER",
      phone: "555-0101",
      avatarColor: "#ff8a5c",
    },
  });

  const stylist1 = await prisma.user.upsert({
    where: { email: "jordan@salon.com" },
    update: {},
    create: {
      name: "Jordan Blake",
      email: "jordan@salon.com",
      passwordHash,
      role: "STAFF",
      phone: "555-0102",
      commissionPct: 40,
      avatarColor: "#38b2ac",
    },
  });

  const stylist2 = await prisma.user.upsert({
    where: { email: "lena@salon.com" },
    update: {},
    create: {
      name: "Lena Rossi",
      email: "lena@salon.com",
      passwordHash,
      role: "STAFF",
      phone: "555-0103",
      commissionPct: 35,
      avatarColor: "#e879a6",
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: "front@salon.com" },
    update: {},
    create: {
      name: "Sam Torres",
      email: "front@salon.com",
      passwordHash,
      role: "RECEPTIONIST",
      phone: "555-0104",
      avatarColor: "#63b3ed",
    },
  });

  const staff = [stylist1, stylist2, manager];
  for (const s of staff) {
    for (let day = 1; day <= 6; day++) {
      await prisma.staffSchedule.upsert({
        where: { staffId_dayOfWeek: { staffId: s.id, dayOfWeek: day } },
        update: {},
        create: { staffId: s.id, dayOfWeek: day, startTime: "09:00", endTime: "18:00" },
      });
    }
  }

  const serviceData = [
    { name: "Women's Haircut", category: "Hair", durationMinutes: 45, price: 55 },
    { name: "Men's Haircut", category: "Hair", durationMinutes: 30, price: 35 },
    { name: "Hair Coloring", category: "Hair", durationMinutes: 90, price: 120 },
    { name: "Blowout & Style", category: "Hair", durationMinutes: 40, price: 45 },
    { name: "Classic Manicure", category: "Nails", durationMinutes: 30, price: 30 },
    { name: "Gel Pedicure", category: "Nails", durationMinutes: 45, price: 50 },
    { name: "Signature Facial", category: "Skin", durationMinutes: 60, price: 85 },
    { name: "Swedish Massage", category: "Spa", durationMinutes: 60, price: 95 },
    { name: "Eyebrow Threading", category: "Skin", durationMinutes: 15, price: 20 },
    { name: "Full Body Waxing", category: "Spa", durationMinutes: 75, price: 110 },
  ];
  const services = [];
  for (const s of serviceData) {
    services.push(
      await prisma.service.upsert({
        where: { id: s.name.replace(/\s+/g, "-").toLowerCase() },
        update: {},
        create: { id: s.name.replace(/\s+/g, "-").toLowerCase(), ...s },
      })
    );
  }

  const productData = [
    { name: "Shampoo - Argan Oil 250ml", sku: "SHP-ARG-250", category: "Hair Care", costPrice: 4, retailPrice: 14, quantityInStock: 32, reorderLevel: 10 },
    { name: "Conditioner - Keratin 250ml", sku: "CND-KER-250", category: "Hair Care", costPrice: 4.5, retailPrice: 15, quantityInStock: 28, reorderLevel: 10 },
    { name: "Hair Color Tube - Chestnut", sku: "CLR-CHT-60", category: "Coloring", costPrice: 6, retailPrice: 18, quantityInStock: 8, reorderLevel: 10 },
    { name: "Gel Nail Polish - Ruby Red", sku: "NPL-RBY-15", category: "Nails", costPrice: 3, retailPrice: 12, quantityInStock: 20, reorderLevel: 8 },
    { name: "Facial Serum - Vitamin C", sku: "SER-VTC-30", category: "Skin Care", costPrice: 7, retailPrice: 28, quantityInStock: 4, reorderLevel: 5 },
    { name: "Massage Oil - Lavender 200ml", sku: "OIL-LAV-200", category: "Spa", costPrice: 5, retailPrice: 20, quantityInStock: 15, reorderLevel: 6 },
  ];
  for (const p of productData) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
  }

  const clientData = [
    { firstName: "Olivia", lastName: "Bennett", phone: "555-1001", email: "olivia.b@example.com" },
    { firstName: "Noah", lastName: "Kim", phone: "555-1002", email: "noah.kim@example.com" },
    { firstName: "Ava", lastName: "Martinez", phone: "555-1003", email: "ava.m@example.com" },
    { firstName: "Liam", lastName: "Chen", phone: "555-1004", email: "liam.chen@example.com" },
    { firstName: "Sophia", lastName: "Ibrahim", phone: "555-1005", email: "sophia.i@example.com" },
  ];
  const clients = [];
  for (const c of clientData) {
    const existing = await prisma.client.findFirst({ where: { phone: c.phone } });
    clients.push(existing ?? (await prisma.client.create({ data: c })));
  }

  const existingAppts = await prisma.appointment.count();
  if (existingAppts === 0) {
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const client = clients[i % clients.length];
      const stylist = i % 2 === 0 ? stylist1 : stylist2;
      const service = services[i % services.length];
      const start = new Date(now);
      start.setDate(now.getDate() + (i % 5) - 1);
      start.setHours(9 + (i % 6), i % 2 === 0 ? 0 : 30, 0, 0);
      const end = new Date(start.getTime() + service.durationMinutes * 60000);

      await prisma.appointment.create({
        data: {
          clientId: client.id,
          staffId: stylist.id,
          startTime: start,
          endTime: end,
          status: start < now ? "COMPLETED" : "SCHEDULED",
          services: {
            create: [{ serviceId: service.id, priceSnapshot: service.price, durationSnapshot: service.durationMinutes }],
          },
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Login with: admin@salon.com / password123 (or manager@/jordan@/lena@/front@salon.com)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
