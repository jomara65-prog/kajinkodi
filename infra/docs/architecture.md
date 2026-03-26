# Kajinkodi Architecture

## Components
- API service: client-facing endpoints for logs, boards, profiles
- Quest engine: awards XP and refreshes leaderboards
- IoT ingest: consumes trap telemetry from MQTT and records events
- PostgreSQL/PostGIS: geospatial data and core relational store

## Event Flow
1. Trap devices publish telemetry via cell or LoRa gateway.
2. MQTT topic receives events: `kajinkodi/trap/{id}/event`.
3. IoT ingest validates payload and persists trap event.
4. Alert evaluator emits user alerts for tamper/open door rules.
5. API reads aggregated trap and quest data for mobile clients.

## Security and Safety
- Enforce role-based access for trap command endpoints.
- Keep command audit logs immutable.
- Add legal rule checks by region before allowing actuation.
- Require confirmation windows for dangerous commands.
