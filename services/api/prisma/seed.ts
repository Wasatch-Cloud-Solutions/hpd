import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPaths = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];
const envPath = envPaths.find((candidate) => existsSync(candidate));
if (envPath) config({ path: envPath });
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const teams = [
    ["Front of House", "Guest-facing restaurant operations."],
    ["Deli", "Deli preparation and service."],
    ["Private Dining", "Private dining events and service."],
  ];

  for (const [name, description] of teams) {
    await prisma.team.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {},
      create: {
        email: adminEmail.toLowerCase(),
        fullName: "Hidden Peak Administrator",
        passwordHash,
        role: Role.ADMINISTRATOR,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
