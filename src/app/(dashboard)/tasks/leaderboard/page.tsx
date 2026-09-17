"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api-client";
import { StreakBadge, BadgeChip } from "@/components/tasks/StreakBadge";

interface Row {
  userId: string;
  name: string;
  role: string;
  department: string;
  regionCode: string;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  badges: string[];
}

interface Stats {
  gamification: {
    currentStreak: number;
    bestStreak: number;
    totalPoints: number;
    badges: string[];
  };
  pending: number;
  overdue: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe] = useState<{ userId: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setMe(d.user))
      .catch(() => {});
    api
      .get<{ data: Row[] }>("/tasks/leaderboard")
      .then((r) => setRows(r.data))
      .catch(() => {});
    api
      .get<Stats>("/tasks/me/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  const myRank = me ? rows.findIndex((r) => r.userId === me.userId) + 1 : 0;

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-[10px] font-semibold tracking-[.2em] text-brand-olive/50">
          RECOGNITION
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-brand-brown">
          Leaderboard
        </h1>
      </div>

      {stats && (
        <Card className="mb-5 p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/50">
                Your rank
              </p>
              <p className="font-display text-[24px] font-bold text-brand-brown">
                {myRank > 0 ? `#${myRank}` : "—"}
              </p>
            </div>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/50">
                Points
              </p>
              <p className="font-display text-[24px] font-bold text-brand-brown">
                {stats.gamification.totalPoints}
              </p>
            </div>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/50">
                Streak
              </p>
              <StreakBadge streak={stats.gamification.currentStreak} />
            </div>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/50">
                Best streak
              </p>
              <p className="font-display text-[20px] font-bold text-brand-brown">
                {stats.gamification.bestStreak}
              </p>
            </div>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/50">
                Open / overdue
              </p>
              <p className="text-[14px] text-brand-brown">
                {stats.pending} /{" "}
                <span
                  className={stats.overdue ? "font-bold text-danger" : ""}
                >
                  {stats.overdue}
                </span>
              </p>
            </div>
            {stats.gamification.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {stats.gamification.badges.map((b) => (
                  <BadgeChip key={b} code={b} />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-brown/10">
              {["#", "Name", "Role", "Dept", "Region", "Points", "Streak", "Best", "Badges"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-display text-[10px] font-semibold uppercase tracking-[.12em] text-brand-olive/60"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-brown/6">
            {rows.map((r, i) => (
              <tr
                key={r.userId}
                className={
                  me && r.userId === me.userId ? "bg-brand-tan/5" : ""
                }
              >
                <td className="px-4 py-3 font-display text-[14px] font-bold text-brand-brown">
                  {i + 1}
                </td>
                <td className="px-4 py-3 text-[13px] text-brand-brown">
                  {r.name}
                </td>
                <td className="px-4 py-3 text-[12px] text-brand-olive">
                  {r.role}
                </td>
                <td className="px-4 py-3 text-[12px] text-brand-olive">
                  {r.department}
                </td>
                <td className="px-4 py-3 text-[12px] text-brand-olive">
                  {r.regionCode}
                </td>
                <td className="px-4 py-3 font-mono text-[13px] font-semibold text-brand-brown">
                  {r.totalPoints}
                </td>
                <td className="px-4 py-3">
                  <StreakBadge streak={r.currentStreak} />
                </td>
                <td className="px-4 py-3 text-[12px] text-brand-olive">
                  {r.bestStreak}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.badges.map((b) => (
                      <BadgeChip key={b} code={b} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-[13px] text-brand-olive/50"
                >
                  No completions yet. Be the first!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
