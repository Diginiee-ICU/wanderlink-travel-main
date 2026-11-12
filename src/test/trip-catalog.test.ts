import { describe, expect, it } from "vitest";

import { trips, defaultPolicies, tripNames } from "@/lib/trip-catalog";

describe("Trip catalogue and policies", () => {
  it("contains all curated trips with required fields", () => {
    expect(trips.length).toBeGreaterThanOrEqual(3);
    for (const trip of trips) {
      expect(trip.name).toBeTruthy();
      expect(trip.destination).toBeTruthy();
      expect(trip.region).toBeTruthy();
      expect(trip.description).toBeTruthy();
      expect(trip.style).toBeTruthy();
      expect(trip.durationDays).toBeGreaterThan(0);
      expect(trip.budgetFrom).toBeGreaterThan(0);
    }
  });

  it("each trip has clear cancellation, payment, and booking policies", () => {
    for (const trip of trips) {
      expect(trip.policies).toBeDefined();
      expect(trip.policies.cancellation).toMatch(/cancellation|refund/i);
      expect(trip.policies.payment).toMatch(/advance|deposit|payment|due/i);
      expect(trip.policies.booking).toMatch(/includes|booking|itinerary/i);
    }
  });

  it("default policies provide conservative terms", () => {
    expect(defaultPolicies.cancellation).toContain("Free cancellation");
    expect(defaultPolicies.payment).toContain("20% advance");
    expect(defaultPolicies.booking).toContain("WhatsApp");
  });

  it("tripNames array matches trips", () => {
    expect(tripNames).toEqual(trips.map((t) => t.name));
  });
});
