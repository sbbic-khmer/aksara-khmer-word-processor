import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting seed...")

  // Seed default app settings
  await prisma.appSetting.upsert({
    where: { key: "ad_frequency_schedule" },
    update: {},
    create: {
      key: "ad_frequency_schedule",
      value: [2, 5, 10, 15], // Minutes between ads
    },
  })

  await prisma.appSetting.upsert({
    where: { key: "default_storage_limit_bytes" },
    update: {},
    create: {
      key: "default_storage_limit_bytes",
      value: 5242880, // 5MB
    },
  })

  console.log("Seed completed successfully")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("Seed failed:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
