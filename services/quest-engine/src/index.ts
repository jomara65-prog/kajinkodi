import "dotenv/config";
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const intervalMs = Number(process.env.QUEST_TICK_MS ?? 60000);

async function awardDailyQuestPoints(): Promise<void> {
  const sql = `
    with completions as (
      select qc.user_id, q.reward_xp
      from quest_completion qc
      join quest q on q.id = qc.quest_id
      where qc.awarded = false
      limit 250
    ), updates as (
      update user_profile u
      set xp = u.xp + c.reward_xp
      from completions c
      where u.id = c.user_id
      returning u.id
    )
    update quest_completion qc
    set awarded = true
    where qc.user_id in (select id from updates)
    and qc.awarded = false;
  `;
  await db.query(sql);
}

async function refreshMonthlyLeaderboard(): Promise<void> {
  const sql = `
    insert into leaderboard_monthly (month_key, user_id, score, rank)
    select
      to_char(now(), 'YYYY-MM') as month_key,
      user_id,
      score,
      dense_rank() over(order by score desc) as rank
    from (
      select user_id, coalesce(sum(points), 0) as score
      from xp_transaction
      where created_at >= date_trunc('month', now())
      group by user_id
    ) s
    on conflict (month_key, user_id)
    do update set score = excluded.score, rank = excluded.rank;
  `;
  await db.query(sql);
}

async function tick(): Promise<void> {
  try {
    await awardDailyQuestPoints();
    await refreshMonthlyLeaderboard();
    console.log("quest-engine tick complete");
  } catch (error) {
    console.error("quest-engine tick failed", error);
  }
}

console.log(`quest-engine running with interval ${intervalMs}ms`);

function scheduleNextTick(): void {
  setTimeout(() => {
    void tick().finally(() => {
      scheduleNextTick();
    });
  }, intervalMs);
}

void tick().finally(() => {
  scheduleNextTick();
});
