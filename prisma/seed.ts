import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe in FK-safe order — seed is meant to be re-run on every boot
  // since Render's disk is ephemeral.
  await prisma.redemption.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.task.deleteMany();
  await prisma.companionState.deleteMany();
  await prisma.rewardItem.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { name: "Demo User", streak: 3 },
  });

  await prisma.companionState.create({
    data: { userId: user.id, level: 2, xp: 40, mood: "content" },
  });

  await prisma.task.createMany({
    data: [
      { userId: user.id, title: "Clean the kitchen", difficulty: 2 },
      { userId: user.id, title: "Reply to that email", difficulty: 1 },
      { userId: user.id, title: "Go for a 10-minute walk", difficulty: 1 },
      { userId: user.id, title: "Do the laundry", difficulty: 2 },
      { userId: user.id, title: "Finish the report draft", difficulty: 3 },
    ],
  });

  await prisma.pointsLedger.createMany({
    data: [
      { userId: user.id, amount: 20, reason: "task-complete" },
      { userId: user.id, amount: 15, reason: "task-complete" },
      { userId: user.id, amount: 5, reason: "streak-bonus" },
    ],
  });

  await prisma.rewardItem.createMany({
    data: [
      {
        name: "Meadow theme",
        description: "A soft green backdrop for your companion.",
        cost: 30,
        kind: "theme",
      },
      {
        name: "Tiny hat",
        description: "A small hat. Very dignified.",
        cost: 20,
        kind: "accessory",
      },
      {
        name: "Skip-a-day token",
        description: "Protects your streak through one missed day.",
        cost: 50,
        kind: "skip-token",
      },
    ],
  });

  console.log(`Seeded demo user ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
