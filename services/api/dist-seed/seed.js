"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const dotenv_1 = require("dotenv");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const envPaths = [(0, node_path_1.resolve)(process.cwd(), ".env"), (0, node_path_1.resolve)(process.cwd(), "../../.env")];
const envPath = envPaths.find((candidate) => (0, node_fs_1.existsSync)(candidate));
if (envPath)
    (0, dotenv_1.config)({ path: envPath });
const prisma = new client_1.PrismaClient();
async function main() {
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
                role: client_1.Role.ADMINISTRATOR,
            },
        });
    }
}
main()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
});
