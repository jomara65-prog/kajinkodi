import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { Pool } from "pg";
import { z } from "zod";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(limiter);

app.get("/health", async (_req, res) => {
  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const dbStatus = hasDbUrl ? "configured" : "missing DATABASE_URL";
  res.json({ ok: hasDbUrl, service: "api", db: dbStatus });
});

app.get("/leaderboard/monthly", async (_req, res) => {
  const query = `
    select month_key, user_id, score, rank
    from leaderboard_monthly
    where month_key = to_char(now(), 'YYYY-MM')
    order by rank asc
    limit 100;
  `;
  try {
    const result = await db.query(query);
    res.json({ items: result.rows });
  } catch (error) {
    console.error("leaderboard query failed", error);
    res.status(500).json({ error: "leaderboard query failed" });
  }
});

app.post("/logs/catch", async (req, res) => {
  const payload = z.object({
    userId: z.string().uuid(),
    species: z.string().min(2),
    weightKg: z.number().nonnegative().optional(),
    lat: z.number(),
    lon: z.number(),
    notes: z.string().max(1000).optional()
  });

  const parsed = payload.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId, species, weightKg, lat, lon, notes } = parsed.data;
  const sql = `
    insert into catch_log (user_id, species, weight_kg, geom, notes)
    values ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6)
    returning id, created_at;
  `;

  try {
    const result = await db.query(sql, [userId, species, weightKg ?? null, lon, lat, notes ?? null]);
    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    console.error("catch log insert failed", error);
    res.status(500).json({ error: "failed to store catch log" });
  }
});

app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
