import { prisma } from "@/lib/prisma";

export type GoalRoomEventType =
  | "goal.created"
  | "checkin.completed"
  | "penalty.applied"
  | "goal.ended"
  | "coach.highlight"
  | "reflection.generated";

export async function appendGoalRoomEvent(input: {
  goalId: string;
  userId: string;
  type: GoalRoomEventType;
  payload: Record<string, unknown>;
  occurredAt?: Date;
  idempotencyKey?: string;
}) {
  const data = {
    goalId: input.goalId,
    userId: input.userId,
    type: input.type,
    payload: JSON.stringify(input.payload),
    occurredAt: input.occurredAt ?? new Date(),
    idempotencyKey: input.idempotencyKey,
  };

  if (!input.idempotencyKey) {
    return prisma.goalRoomEvent.create({ data });
  }

  return prisma.goalRoomEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: data,
    update: {},
  });
}

export function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
