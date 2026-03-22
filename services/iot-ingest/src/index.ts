import "dotenv/config";
import mqtt from "mqtt";
import { Pool } from "pg";

const brokerUrl = process.env.MQTT_BROKER_URL ?? "mqtt://localhost:1883";
const topic = process.env.MQTT_TOPIC ?? "kajinkodi/trap/+/event";
const db = new Pool({ connectionString: process.env.DATABASE_URL });

type TrapEvent = {
  trapId: string;
  eventType: "motion" | "door" | "weight" | "tamper" | "battery";
  value?: number;
  state?: string;
  ts?: string;
};

const client = mqtt.connect(brokerUrl);

async function persistEvent(evt: TrapEvent): Promise<void> {
  const sql = `
    insert into trap_event (trap_id, event_type, value_numeric, state_text, event_ts)
    values ($1, $2, $3, $4, coalesce($5::timestamptz, now()));
  `;
  await db.query(sql, [evt.trapId, evt.eventType, evt.value ?? null, evt.state ?? null, evt.ts ?? null]);
}

async function evaluateAlerts(evt: TrapEvent): Promise<void> {
  if (evt.eventType === "tamper" || (evt.eventType === "door" && evt.state === "open")) {
    console.log("ALERT", { trapId: evt.trapId, reason: evt.eventType, state: evt.state });
  }
}

client.on("connect", () => {
  console.log(`iot-ingest connected to ${brokerUrl}`);
  client.subscribe(topic, (err) => {
    if (err) console.error("subscribe failed", err);
  });
});

client.on("message", async (_topic, payload) => {
  try {
    const evt = JSON.parse(payload.toString()) as TrapEvent;
    if (!evt.trapId || !evt.eventType) {
      return;
    }
    await persistEvent(evt);
    await evaluateAlerts(evt);
  } catch (error) {
    console.error("event handling failed", error);
  }
});
