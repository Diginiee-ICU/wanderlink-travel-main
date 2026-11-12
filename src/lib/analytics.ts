export type TripViewEvent = {
  tripName: string;
  destination?: string;
  budgetFrom?: number;
  style?: string;
  source?: string;
};

export type BookingFormStartEvent = {
  journey: string;
  source: string;
};

export type WhatsAppEnquiryClickEvent = {
  journey: string;
  travelers: number;
  hasDate: boolean;
  hasNote: boolean;
  date?: string;
};

export type AnalyticsEventRecord = {
  eventName: "trip_view" | "booking_form_start" | "whatsapp_enquiry_click";
  properties: Record<string, unknown>;
  timestamp: number;
};

// Internal buffer of tracked events (useful for tests and in-app diagnostics)
const recentEvents: AnalyticsEventRecord[] = [];
const MAX_BUFFER_SIZE = 100;

function recordEvent(
  eventName: AnalyticsEventRecord["eventName"],
  properties: Record<string, unknown>,
) {
  const record: AnalyticsEventRecord = {
    eventName,
    properties,
    timestamp: Date.now(),
  };

  recentEvents.push(record);
  if (recentEvents.length > MAX_BUFFER_SIZE) {
    recentEvents.shift();
  }

  if (typeof window !== "undefined") {
    try {
      window.__lovableEvents?.track?.(eventName, properties);
    } catch (error) {
      console.warn("Lovable analytics tracking error:", error);
    }

    try {
      window.dispatchEvent(
        new CustomEvent("analytics:event", {
          detail: record,
        }),
      );
    } catch {
      // Ignore errors in environments that lack CustomEvent
    }
  }

  return record;
}

/**
 * Track when a user views a trip card or preview.
 */
export function trackTripView(data: TripViewEvent): AnalyticsEventRecord {
  return recordEvent("trip_view", {
    trip_name: data.tripName,
    destination: data.destination ?? "Unknown",
    budget_from: data.budgetFrom,
    style: data.style,
    source: data.source ?? "catalog",
  });
}

/**
 * Track when a user initiates the booking enquiry form.
 */
export function trackBookingFormStart(data: BookingFormStartEvent): AnalyticsEventRecord {
  return recordEvent("booking_form_start", {
    journey: data.journey,
    source: data.source,
  });
}

/**
 * Track when a user submits the booking form to open WhatsApp.
 */
export function trackWhatsAppEnquiryClick(data: WhatsAppEnquiryClickEvent): AnalyticsEventRecord {
  return recordEvent("whatsapp_enquiry_click", {
    journey: data.journey,
    travelers: data.travelers,
    has_date: data.hasDate,
    has_note: data.hasNote,
    date: data.date,
  });
}

/**
 * Helper to inspect tracked events (for test assertions and debugging).
 */
export function getRecentAnalyticsEvents(): readonly AnalyticsEventRecord[] {
  return recentEvents;
}

/**
 * Clear the internal analytics buffer (useful between tests).
 */
export function clearAnalyticsEvents(): void {
  recentEvents.length = 0;
}
