import { describe, expect, it } from "vitest";

import {
  bookingSchema,
  createBookingMessage,
  createWhatsAppUrl,
  WHATSAPP_NUMBER,
} from "@/lib/whatsapp-booking";

describe("WhatsApp booking requests", () => {
  it("opens the prepared request for the supplied India number", () => {
    const booking = bookingSchema.parse({
      name: "Asha Rao",
      phone: "+91 98765 43210",
      journey: "Ladakh, the high road",
      date: "2027-06-18",
      travelers: "2",
      note: "A quiet room, if available.",
    });

    const url = new URL(createWhatsAppUrl(createBookingMessage(booking)));

    expect(WHATSAPP_NUMBER).toBe("917409200341");
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/917409200341");
    expect(url.searchParams.get("text")).toContain("Ladakh, the high road");
    expect(url.searchParams.get("text")).toContain("Travellers: 2");
  });

  it("rejects incomplete booking requests before making a WhatsApp link", () => {
    expect(
      bookingSchema.safeParse({
        name: " ",
        phone: "abc",
        journey: "",
        date: "2027-02-31",
        travelers: "0",
        note: "",
      }).success,
    ).toBe(false);
  });
});
