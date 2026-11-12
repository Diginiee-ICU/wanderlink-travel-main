import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { recommendTrips } from "./trip-recommendations.server";

const inputSchema = z
  .object({
    interests: z.string().trim().min(3).max(500),
    budget: z.number().int().min(1000).max(5000000),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((input) => input.endDate >= input.startDate, {
    path: ["endDate"],
    message: "End date must be on or after your start date.",
  });

export const getTripRecommendations = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      return { ...(await recommendTrips(data)), error: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Trip recommendations could not be generated.";
      console.error("Trip recommendations failed:", message);
      return { recommendations: [], error: message };
    }
  });
