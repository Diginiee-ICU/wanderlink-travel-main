import { describe, expect, it } from "vitest";
import { z } from "zod";

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

describe("Trip recommendation validation", () => {
  it("accepts valid traveler preferences", () => {
    const valid = {
      interests: "Quiet mountain roads and village walks",
      budget: 50000,
      startDate: "2027-05-01",
      endDate: "2027-05-10",
    };

    const parsed = inputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects interest text shorter than 3 characters", () => {
    const invalid = {
      interests: "hi",
      budget: 50000,
      startDate: "2027-05-01",
      endDate: "2027-05-10",
    };

    const parsed = inputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects budget below minimum 1000", () => {
    const invalid = {
      interests: "Exploring lakes and forests",
      budget: 500,
      startDate: "2027-05-01",
      endDate: "2027-05-10",
    };

    const parsed = inputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects end date before start date", () => {
    const invalid = {
      interests: "Exploring lakes and forests",
      budget: 35000,
      startDate: "2027-05-10",
      endDate: "2027-05-01",
    };

    const parsed = inputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("End date must be on or after your start date.");
    }
  });
});
