import { z } from "zod";

export const WHATSAPP_NUMBER = "917409200341";

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a phone number with country code.")
  .max(25, "Phone number is too long.")
  .regex(/^[+\d\s()-]+$/, "Use only digits, spaces, +, parentheses, or hyphens.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid phone number.");

export const bookingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "Name is too long."),
  phone: phoneSchema,
  journey: z.string().trim().min(1).max(100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a travel date.")
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Choose a valid date."),
  travelers: z.coerce.number().int("Choose a whole number.").min(1).max(20),
  note: z.string().trim().max(600, "Please keep your note under 600 characters."),
});

export type BookingDetails = z.infer<typeof bookingSchema>;

export function createWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function createBookingMessage(booking: BookingDetails): string {
  const date = new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return [
    "Hello! I'd like to enquire about a trip.",
    `Journey: ${booking.journey}`,
    `Preferred date: ${date}`,
    `Travellers: ${booking.travelers}`,
    `Name: ${booking.name}`,
    `Phone: ${booking.phone}`,
    booking.note ? `A little more: ${booking.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
