import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { Preloader } from "@/components/Preloader";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import { clearAnalyticsEvents, getRecentAnalyticsEvents } from "@/lib/analytics";

describe("Preloader component", () => {
  it("renders with role='status' and displays brand name", () => {
    render(<Preloader minDuration={100} />);
    const preloader = screen.getByRole("status");
    expect(preloader).toBeInTheDocument();
    expect(screen.getByText("elsewhere")).toBeInTheDocument();
    expect(screen.getByText("Travel, differently")).toBeInTheDocument();
  });
});

describe("WhatsApp floating widget", () => {
  beforeEach(() => {
    clearAnalyticsEvents();
  });

  it("renders the floating WhatsApp toggle button", () => {
    render(<WhatsAppWidget onOpenBookingForm={vi.fn()} />);
    const button = screen.getByLabelText(/Open WhatsApp chat widget/i);
    expect(button).toBeInTheDocument();
  });

  it("opens the chat card when clicked and closes when X is clicked", () => {
    render(<WhatsAppWidget onOpenBookingForm={vi.fn()} />);
    const button = screen.getByLabelText(/Open WhatsApp chat widget/i);

    fireEvent.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Elsewhere Curators/i)).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Close WhatsApp chat card/i);
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenBookingForm and tracks analytics when 'Customize via Booking Form' is clicked", () => {
    const handleOpenForm = vi.fn();
    render(<WhatsAppWidget onOpenBookingForm={handleOpenForm} />);

    // Open widget
    fireEvent.click(screen.getByLabelText(/Open WhatsApp chat widget/i));

    // Click customize form
    const formBtn = screen.getByText(/Customize via Booking Form/i);
    fireEvent.click(formBtn);

    expect(handleOpenForm).toHaveBeenCalledWith("An India journey");

    const events = getRecentAnalyticsEvents();
    const startEvent = events.find((e) => e.eventName === "booking_form_start");
    expect(startEvent).toBeDefined();
    expect(startEvent?.properties.source).toBe("whatsapp_floating_widget");
  });

  it("tracks whatsapp_enquiry_click when 'Chat on WhatsApp' is clicked", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WhatsAppWidget onOpenBookingForm={vi.fn()} />);

    // Open widget
    fireEvent.click(screen.getByLabelText(/Open WhatsApp chat widget/i));

    // Click chat on whatsapp
    const chatBtn = screen.getByText(/Chat on WhatsApp/i);
    fireEvent.click(chatBtn);

    expect(openSpy).toHaveBeenCalled();
    const events = getRecentAnalyticsEvents();
    const clickEvent = events.find((e) => e.eventName === "whatsapp_enquiry_click");
    expect(clickEvent).toBeDefined();
    expect(clickEvent?.properties.journey).toBe("Direct WhatsApp Widget");

    openSpy.mockRestore();
  });
});
