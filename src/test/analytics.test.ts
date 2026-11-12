import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  trackTripView,
  trackBookingFormStart,
  trackWhatsAppEnquiryClick,
  getRecentAnalyticsEvents,
  clearAnalyticsEvents,
} from "@/lib/analytics";

describe("Analytics tracking", () => {
  beforeEach(() => {
    clearAnalyticsEvents();
    // Reset window mock
    window.__lovableEvents = undefined;
  });

  it("tracks trip_view events and stores them in the buffer", () => {
    const trackMock = vi.fn();
    window.__lovableEvents = { track: trackMock };

    const record = trackTripView({
      tripName: "Ladakh, the high road",
      destination: "Ladakh",
      budgetFrom: 45000,
      style: "Mountain & adventure",
      source: "catalog_scroll",
    });

    expect(record.eventName).toBe("trip_view");
    expect(record.properties).toEqual({
      trip_name: "Ladakh, the high road",
      destination: "Ladakh",
      budget_from: 45000,
      style: "Mountain & adventure",
      source: "catalog_scroll",
    });
    expect(trackMock).toHaveBeenCalledWith("trip_view", record.properties);

    const buffer = getRecentAnalyticsEvents();
    expect(buffer).toHaveLength(1);
    expect(buffer[0].eventName).toBe("trip_view");
  });

  it("tracks booking_form_start with journey and source", () => {
    const trackMock = vi.fn();
    window.__lovableEvents = { track: trackMock };

    const record = trackBookingFormStart({
      journey: "The Kerala backwaters",
      source: "trip_card_button",
    });

    expect(record.eventName).toBe("booking_form_start");
    expect(record.properties).toEqual({
      journey: "The Kerala backwaters",
      source: "trip_card_button",
    });
    expect(trackMock).toHaveBeenCalledWith("booking_form_start", record.properties);
  });

  it("tracks whatsapp_enquiry_click when enquiry is initiated", () => {
    const trackMock = vi.fn();
    window.__lovableEvents = { track: trackMock };

    const record = trackWhatsAppEnquiryClick({
      journey: "A softer side of Jaipur",
      travelers: 2,
      hasDate: true,
      hasNote: false,
      date: "2027-04-10",
    });

    expect(record.eventName).toBe("whatsapp_enquiry_click");
    expect(record.properties).toEqual({
      journey: "A softer side of Jaipur",
      travelers: 2,
      has_date: true,
      has_note: false,
      date: "2027-04-10",
    });
    expect(trackMock).toHaveBeenCalledWith("whatsapp_enquiry_click", record.properties);
  });

  it("dispatches DOM CustomEvent when tracking", () => {
    const listener = vi.fn();
    window.addEventListener("analytics:event", listener);

    trackTripView({
      tripName: "Test Journey",
      destination: "Test Destination",
    });

    expect(listener).toHaveBeenCalled();
    window.removeEventListener("analytics:event", listener);
  });

  it("safely handles tracking errors without throwing", () => {
    window.__lovableEvents = {
      track: () => {
        throw new Error("Telemetry service failed");
      },
    };

    expect(() => {
      trackTripView({
        tripName: "Safe Journey",
        destination: "Safe",
      });
    }).not.toThrow();

    expect(getRecentAnalyticsEvents()).toHaveLength(1);
  });
});
