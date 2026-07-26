import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe in FK-safe order — seed is meant to be re-run on every boot
  // since Render's disk is ephemeral.
  await prisma.redemption.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.reflection.deleteMany();
  await prisma.goalRoomEvent.deleteMany();
  await prisma.coachSession.deleteMany();
  // Legacy table created by the pre-rebase Band migration. The current pivot
  // uses CheckIn; clear this FK-dependent table until its drop migration lands.
  await prisma.$executeRawUnsafe('DELETE FROM "GoalCheckIn"');
  await prisma.checkIn.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.moodCheckIn.deleteMany();
  await prisma.userTraits.deleteMany();
  await prisma.companionState.deleteMany();
  await prisma.rewardItem.deleteMany();
  await prisma.user.deleteMany();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // lastStreakAt set to yesterday (UTC) so the first demo check-in earns
  // exactly one +5 streak bonus per contract.ts STREAK_BONUS.
  const user = await prisma.user.create({
    data: { name: "Demo User", streak: 3, lastStreakAt: yesterday },
  });

  await prisma.userTraits.create({
    data: {
      userId: user.id,
      age: 27,
      gender: "prefer not to say",
      communicationStyle: "encouraging",
      motivationStyle: "support",
    },
  });

  await prisma.moodCheckIn.create({
    data: { userId: user.id, mood: "okay" },
  });

  // Seed xp at 80, not 40 — Tiny hat (cost 20) then reaches xp 100 / level
  // 3 with XP_PER_LEVEL = 50, producing the demo's promised level-up.
  await prisma.companionState.create({
    data: { userId: user.id, level: 2, xp: 80, mood: "content" },
  });

  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in60Days = new Date();
  in60Days.setDate(in60Days.getDate() + 60);

  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        title: "Clean the kitchen",
        category: "chore",
        difficulty: 2,
        checkInFrequency: "daily",
        penaltyPoints: 20,
        endDate: in30Days,
        lastCheckInAt: yesterday,
      },
      {
        userId: user.id,
        title: "Lose 10 pounds",
        category: "health",
        difficulty: 3,
        checkInFrequency: "daily",
        penaltyPoints: 20,
        endDate: in60Days,
      },
      {
        userId: user.id,
        title: "Ship the side project MVP",
        category: "project",
        difficulty: 3,
        checkInFrequency: "weekly",
        penaltyPoints: 50,
        endDate: in60Days,
      },
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
