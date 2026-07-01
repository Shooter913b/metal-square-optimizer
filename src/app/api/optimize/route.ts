import { runOptimizeLocal } from "@/lib/optimizer/server";
import type { DemandItem, OptimizeOptions, StockOption } from "@/lib/types";
import { OptimizationError } from "@/lib/validation";

export const runtime = "nodejs";

/** Allow optimal solves up to 5 minutes (local dev / Node deployments). */
export const maxDuration = 300;

type OptimizeRequest = {
  demands: DemandItem[];
  stocks: StockOption[];
  options: OptimizeOptions;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OptimizeRequest;

    if (!body.demands?.length || !body.stocks?.length || !body.options) {
      return Response.json({ message: "Invalid optimization request." }, { status: 400 });
    }

    const result = await runOptimizeLocal(body.demands, body.stocks, body.options);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof OptimizationError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Optimization failed.";

    return Response.json({ message }, { status: 400 });
  }
}
