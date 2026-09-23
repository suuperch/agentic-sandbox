import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "./config.js";
import { RunStore, TransitionError, ValidationError, isRunStatus, validateNewRun } from "./runs.js";

export const APP_VERSION = "1.0.0";

export interface AppContext {
  config: AppConfig;
  store: RunStore;
}

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export function createApp({ config, store }: AppContext): Express {
  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: APP_VERSION, region: config.region });
  });

  app.get("/api/runs", (req, res) => {
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
    res.json(store.list(vehicleId));
  });

  app.get("/api/runs/:id", (req, res) => {
    const run = store.get(req.params.id);
    if (!run) return res.status(404).json({ error: "run not found", id: req.params.id });
    return res.json(run);
  });

  app.post("/api/runs", (req, res) => {
    const input = validateNewRun(req.body);
    const run = store.create(input);
    res.status(201).json(run);
  });

  app.patch("/api/runs/:id/status", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!isRunStatus(body.status)) {
      throw new ValidationError(["status must be one of planned|running|done"]);
    }
    const run = store.get(req.params.id);
    if (!run) return res.status(404).json({ error: "run not found", id: req.params.id });
    const updated = store.transition(req.params.id, body.status);
    return res.json(updated);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message, details: err.details });
    }
    if (err instanceof TransitionError) {
      return res.status(409).json({ error: err.message, from: err.from, to: err.to });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "invalid JSON body" });
    }
    console.error(JSON.stringify({ level: "error", msg: "unhandled", err: String(err) }));
    return res.status(500).json({ error: "internal error" });
  });

  return app;
}
