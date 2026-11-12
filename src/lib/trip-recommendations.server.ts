import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, Output, streamText } from "ai";
import { z } from "zod";

import { trips } from "./trip-catalog";

const runIdHeader = "X-Lovable-AIG-Run-ID";

const tripNames = trips.map((trip) => trip.name) as [string, ...string[]];

const recommendationSchema = z
  .object({
    recommendations: z
      .array(
        z
          .object({
            tripName: z.enum(tripNames),
            reason: z.string(),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();

function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(runIdHeader)) headers.set(runIdHeader, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(runIdHeader)?.trim() || undefined;
      return response;
    },
  };
}

export async function recommendTrips(input: {
  interests: string;
  budget: number;
  startDate: string;
  endDate: string;
  initialRunId?: string;
}) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI recommendations are temporarily unavailable.");

  const runIdFetch = createRunIdFetch(input.initialRunId);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const tripOptions = trips.map(
    ({ name, destination, description, style, durationDays, budgetFrom }) => ({
      name,
      destination,
      description,
      style,
      durationDays,
      budgetFromINR: budgetFrom,
    }),
  );

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    output: Output.object({ schema: recommendationSchema }),
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Match the traveler's stated interests, total budget in INR, and dates to the best trips from this exact catalogue. Recommend only trips whose listed starting budget is within their budget and whose listed duration fits within the travel dates. Give brief, specific reasons based on catalogue details and their interests. Return JSON only, with zero to three recommendations. Do not invent availability, itinerary details, or terms.",
          traveler: {
            interests: input.interests,
            budgetINR: input.budget,
            startDate: input.startDate,
            endDate: input.endDate,
          },
          tripOptions,
        }),
      },
    ],
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  let output;
  try {
    // Awaiting the structured output consumes the upstream stream before returning this one-shot result.
    output = await result.output;
  } catch (error) {
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 403) throw new Error(error.message);
      if (error.statusCode === 402) throw new Error(error.message);
      if (error.statusCode === 401)
        throw new Error("AI recommendations are not configured correctly.");
      if (error.statusCode === 429 || error.statusCode >= 500) {
        throw new Error("Trip recommendations are temporarily busy. Please try again shortly.");
      }
    }
    throw error;
  }

  if (!output || !Array.isArray(output.recommendations)) {
    throw new Error("No matching trips found. Try changing your dates, interests, or budget.");
  }

  const byName = new Map(trips.map((trip) => [trip.name, trip]));
  const recommendations = output.recommendations
    .map((recommendation) => ({ ...recommendation, trip: byName.get(recommendation.tripName) }))
    .filter(
      (recommendation) =>
        recommendation.trip &&
        recommendation.trip.budgetFrom <= input.budget &&
        recommendation.trip.durationDays <= getNights(input.startDate, input.endDate) + 1,
    )
    .map(({ trip, ...recommendation }) => ({
      tripName: recommendation.tripName,
      reason: recommendation.reason,
      trip,
    }));

  if (recommendations.length === 0) {
    return { recommendations: [], runId: runIdFetch.getRunId() };
  }

  return { recommendations, runId: runIdFetch.getRunId() };
}

function getNights(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return Math.floor((end - start) / 86_400_000);
}
