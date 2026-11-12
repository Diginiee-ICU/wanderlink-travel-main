import keralaImage from "@/assets/kerala-backwaters.jpg";
import ladakhImage from "@/assets/himalaya-journey.jpg";
import jaipurImage from "@/assets/rajasthan-jaipur.jpg";

export type TripPolicy = {
  cancellation: string;
  payment: string;
  booking: string;
};

export type Trip = {
  name: string;
  region: string;
  destination: string;
  description: string;
  image: string;
  imageAlt: string;
  style: string;
  durationDays: number;
  budgetFrom: number;
  className: string;
  policies: TripPolicy;
};

export const defaultPolicies: TripPolicy = {
  cancellation:
    "Free cancellation up to 15 days before departure for a full refund (less non-refundable third-party permits/monument fees). 50% refund for cancellations between 7 and 14 days prior. Non-refundable within 7 days of departure.",
  payment:
    "20% advance deposit to secure boutique stays and private transport upon itinerary confirmation. The remaining 80% balance is payable 14 days before journey start. All taxes included; no hidden booking fees.",
  booking:
    "Private, made-for-you itinerary finalized through direct WhatsApp consultation. Clear, inclusive quote agreed before payment. Stays, internal transit, and guided experiences included as detailed in your plan.",
};

export const trips: Trip[] = [
  {
    name: "Ladakh, the high road",
    region: "JAMMU & KASHMIR",
    destination: "Ladakh",
    description: "A little more sky, a little less hurry.",
    image: ladakhImage,
    imageAlt: "Mountain road winding through the high ranges of Ladakh",
    style: "Mountain & adventure",
    durationDays: 7,
    budgetFrom: 45000,
    className: "md:col-span-7",
    policies: {
      cancellation:
        "Free cancellation up to 15 days before departure. Cancellations between 7 and 14 days receive a 50% refund (less high-altitude restricted area permit costs). Non-refundable within 7 days.",
      payment:
        "20% advance deposit upon itinerary confirmation to secure 4x4 private transport and boutique high-altitude camps; remaining 80% due 14 days prior to travel.",
      booking:
        "Includes dedicated 4x4 vehicle with oxygen cylinder, inner-line permit processing, handpicked homestays/camps, and daily breakfast. Flights not included.",
    },
  },
  {
    name: "The Kerala backwaters",
    region: "KERALA",
    destination: "Kerala",
    description: "Follow the water into a slower world.",
    image: keralaImage,
    imageAlt: "A wooden houseboat floating through the Kerala backwaters",
    style: "Slow travel & nature",
    durationDays: 5,
    budgetFrom: 28000,
    className: "md:col-span-5 md:mt-24",
    policies: {
      cancellation:
        "Free cancellation up to 15 days before boarding. 50% refund between 7 and 14 days prior. Non-refundable within 7 days of cruise departure.",
      payment:
        "20% advance deposit upon itinerary finalization to reserve private traditional houseboat; balance due 14 days before departure. Transparent rates with no card surcharges.",
      booking:
        "Includes exclusive crewed houseboat, freshly prepared regional meals onboard, guided village canoe transfers, and local taxes. Clear, itemized plan shared before confirmation.",
    },
  },
  {
    name: "A softer side of Jaipur",
    region: "RAJASTHAN",
    destination: "Rajasthan",
    description: "Old pink walls and the long way home.",
    image: jaipurImage,
    imageAlt: "The pink sandstone Hawa Mahal palace in Jaipur",
    style: "Culture & heritage",
    durationDays: 3,
    budgetFrom: 18000,
    className: "md:col-span-5",
    policies: {
      cancellation:
        "Free cancellation up to 15 days before arrival. 50% refund between 7 and 14 days prior; non-refundable within 7 days of arrival.",
      payment:
        "20% advance deposit upon itinerary agreement to lock heritage haveli suites; remaining 80% due 14 days prior to check-in.",
      booking:
        "Includes curated heritage haveli stay, air-conditioned private car for city exploration, expert local walking guide, and monument entries as specified. No hidden fees.",
    },
  },
];

export const tripNames = trips.map((trip) => trip.name) as [string, ...string[]];
