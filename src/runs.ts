export type Cycle = "WLTC" | "NEDC" | "RDE";
export type RunStatus = "planned" | "running" | "done";

export interface MeasurementRun {
  id: string;
  vehicleId: string;
  cycle: Cycle;
  co2GramsPerKm: number;
  status: RunStatus;
  createdAt: string;
}

export interface NewRun {
  vehicleId: string;
  cycle: Cycle;
  co2GramsPerKm: number;
}

export class ValidationError extends Error {
  constructor(public readonly details: string[]) {
    super("validation failed");
  }
}

export class TransitionError extends Error {
  constructor(public readonly from: RunStatus, public readonly to: RunStatus) {
    super("invalid transition");
  }
}

const CYCLES: Cycle[] = ["WLTC", "NEDC", "RDE"];
const STATUSES: RunStatus[] = ["planned", "running", "done"];
const ALLOWED_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  planned: ["running"],
  running: ["done"],
  done: [],
};

export function validateNewRun(input: unknown): NewRun {
  const details: string[] = [];
  const body = (input ?? {}) as Record<string, unknown>;

  if (typeof body.vehicleId !== "string" || body.vehicleId.trim() === "") {
    details.push("vehicleId must be a non-empty string");
  }
  if (!CYCLES.includes(body.cycle as Cycle)) {
    details.push(`cycle must be one of ${CYCLES.join("|")}`);
  }
  if (typeof body.co2GramsPerKm !== "number" || Number.isNaN(body.co2GramsPerKm)) {
    details.push("co2GramsPerKm must be a number");
  }
  if (details.length > 0) throw new ValidationError(details);

  return {
    vehicleId: (body.vehicleId as string).trim(),
    cycle: body.cycle as Cycle,
    co2GramsPerKm: body.co2GramsPerKm as number,
  };
}

export function isRunStatus(value: unknown): value is RunStatus {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

export class RunStore {
  private readonly runs = new Map<string, MeasurementRun>();
  private seq = 0;

  constructor(seed: NewRun[] = []) {
    for (const run of seed) this.create(run);
  }

  list(vehicleId?: string): MeasurementRun[] {
    const all = [...this.runs.values()];
    return vehicleId ? all.filter((r) => r.vehicleId === vehicleId) : all;
  }

  get(id: string): MeasurementRun | undefined {
    return this.runs.get(id);
  }

  transition(id: string, to: RunStatus): MeasurementRun | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;
    if (!ALLOWED_TRANSITIONS[run.status].includes(to)) {
      throw new TransitionError(run.status, to);
    }
    run.status = to;
    return run;
  }

  create(input: NewRun): MeasurementRun {
    this.seq += 1;
    const run: MeasurementRun = {
      id: `run-${String(this.seq).padStart(4, "0")}`,
      ...input,
      status: "planned",
      createdAt: new Date().toISOString(),
    };
    this.runs.set(run.id, run);
    return run;
  }
}

export const SEED_RUNS: NewRun[] = [
  { vehicleId: "WVW-1001", cycle: "WLTC", co2GramsPerKm: 118.4 },
  { vehicleId: "WVW-1001", cycle: "RDE", co2GramsPerKm: 131.9 },
  { vehicleId: "WVW-2042", cycle: "WLTC", co2GramsPerKm: 97.2 },
  { vehicleId: "WVW-3310", cycle: "NEDC", co2GramsPerKm: 104.0 },
];
