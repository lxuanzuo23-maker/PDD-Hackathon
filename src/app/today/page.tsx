"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3;
  status: string;
}

interface TasksResponse {
  tasks: Task[];
  streak: number;
  pointsBalance: number;
}

export default function TodayPage() {
  const [data, setData] = useState<TasksResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-moss-900">Today</h1>
          <p className="text-sm text-moss-500">Pick one thing. Just start it.</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-spark font-semibold">
            🔥 {loading ? "…" : data?.streak ?? 0}
          </div>
          <div className="text-xs text-moss-500">
            {loading ? "…" : data?.pointsBalance ?? 0} pts
          </div>
        </div>
      </header>

      {loading && <p className="text-moss-500 text-sm">Loading today's tasks…</p>}

      {!loading && data?.tasks.length === 0 && (
        <p className="text-moss-500 text-sm">
          Nothing on your list yet — that's fine. Add one small thing.
        </p>
      )}

      <ul className="space-y-3">
        {data?.tasks.map((task) => (
          <li
            key={task.id}
            className="bg-moss-50 rounded-2xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-moss-900">{task.title}</p>
              <p className="text-xs text-moss-500">difficulty {task.difficulty}/3</p>
            </div>
            <Link
              href={`/coach?taskId=${task.id}`}
              className="text-sm font-semibold text-spark border border-spark rounded-full px-3 py-1"
            >
              I'm stuck
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
