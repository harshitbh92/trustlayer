import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { TAG_CATALOG } from "@trustlayer/shared";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  console.log("Seeding reputation tag catalog…");
  for (const tag of TAG_CATALOG) {
    await prisma.reputationTag.upsert({
      where: { slug: tag.slug },
      update: {
        label: tag.label,
        category: tag.category,
        description: tag.description,
      },
      create: {
        slug: tag.slug,
        label: tag.label,
        category: tag.category,
        description: tag.description,
      },
    });
  }
  console.log(`Seeded ${TAG_CATALOG.length} tags.`);

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminUsername = process.env.ADMIN_USERNAME?.trim() ?? "admin";

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        role: "ADMIN",
        displayName: "Platform Admin",
      },
      create: {
        email: adminEmail,
        passwordHash,
        username: adminUsername,
        displayName: "Platform Admin",
        role: "ADMIN",
        personalityProfile: { create: { questionnaireComplete: true } },
      },
    });
    console.log(`Admin user ready: ${adminEmail} (@${adminUsername})`);
  } else {
    console.log(
      "Skip admin user (set ADMIN_EMAIL + ADMIN_PASSWORD in .env to create one).",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
