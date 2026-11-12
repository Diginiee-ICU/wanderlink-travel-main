import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Globe2,
  Info,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";

import hikingImage from "@/assets/uttarakhand-hiking.jpg";
import ladakhImage from "@/assets/himalaya-journey.jpg";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trips, defaultPolicies, type Trip } from "@/lib/trip-catalog";
import { bookingSchema, createBookingMessage, createWhatsAppUrl } from "@/lib/whatsapp-booking";
import { trackTripView, trackBookingFormStart, trackWhatsAppEnquiryClick } from "@/lib/analytics";
import { Preloader } from "@/components/Preloader";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";

type BookingField = "name" | "phone" | "journey" | "date" | "travelers" | "note";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elsewhere — Thoughtful journeys across India" },
      {
        name: "description",
        content:
          "Find a different pace with thoughtful, made-for-you journeys through the many landscapes of India. Enquire and plan directly on WhatsApp.",
      },
      { property: "og:title", content: "Elsewhere — Thoughtful journeys across India" },
      {
        property: "og:description",
        content:
          "Find a different pace with thoughtful, made-for-you journeys through the many landscapes of India.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:image:alt", content: "Elsewhere — Thoughtful journeys across India" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-image.jpg" },
    ],
  }),
  component: Index,
});

function Index() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [journey, setJourney] = useState("Ladakh, the high road");
  const [initialDate, setInitialDate] = useState("");
  const [errors, setErrors] = useState<Partial<Record<BookingField, string>>>({});

  // Filter state
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");

  // Expanded policy states per trip
  const [expandedPolicyTrip, setExpandedPolicyTrip] = useState<string | null>(null);

  // Set of viewed trips to avoid duplicate view events per session
  const viewedTripsRef = useRef<Set<string>>(new Set());

  // Extract unique filter options
  const destinations = useMemo(() => {
    return Array.from(new Set(trips.map((t) => t.destination)));
  }, []);

  const styles = useMemo(() => {
    return Array.from(new Set(trips.map((t) => t.style)));
  }, []);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (destinationFilter !== "all" && trip.destination !== destinationFilter) {
        return false;
      }
      if (styleFilter !== "all" && trip.style !== styleFilter) {
        return false;
      }
      if (durationFilter !== "all") {
        if (durationFilter === "short" && trip.durationDays > 4) return false;
        if (durationFilter === "medium" && (trip.durationDays < 5 || trip.durationDays > 7))
          return false;
        if (durationFilter === "long" && trip.durationDays < 8) return false;
      }
      if (budgetFilter !== "all") {
        const maxBudget = Number(budgetFilter);
        if (trip.budgetFrom > maxBudget) return false;
      }
      return true;
    });
  }, [destinationFilter, styleFilter, durationFilter, budgetFilter]);

  const hasActiveFilters =
    destinationFilter !== "all" ||
    styleFilter !== "all" ||
    durationFilter !== "all" ||
    budgetFilter !== "all";

  function resetFilters() {
    setDestinationFilter("all");
    setStyleFilter("all");
    setDurationFilter("all");
    setBudgetFilter("all");
  }

  // IntersectionObserver to track trip views as travelers scroll
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tripName = entry.target.getAttribute("data-trip-name");
            if (tripName && !viewedTripsRef.current.has(tripName)) {
              viewedTripsRef.current.add(tripName);
              const trip = trips.find((t) => t.name === tripName);
              if (trip) {
                trackTripView({
                  tripName: trip.name,
                  destination: trip.destination,
                  budgetFrom: trip.budgetFrom,
                  style: trip.style,
                  source: "catalog_scroll",
                });
              }
            }
          }
        });
      },
      { threshold: 0.3 },
    );

    const tripElements = document.querySelectorAll("[data-trip-name]");
    tripElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [filteredTrips]);

  function startBooking(
    selectedJourney = "Ladakh, the high road",
    source = "direct",
    prefillDate = "",
  ) {
    setJourney(selectedJourney);
    setInitialDate(prefillDate);
    setErrors({});
    trackBookingFormStart({
      journey: selectedJourney,
      source,
    });
    setBookingOpen(true);
  }

  function togglePolicies(trip: Trip) {
    const isOpening = expandedPolicyTrip !== trip.name;
    const nextState = isOpening ? trip.name : null;
    setExpandedPolicyTrip(nextState);

    if (isOpening) {
      trackTripView({
        tripName: trip.name,
        destination: trip.destination,
        budgetFrom: trip.budgetFrom,
        style: trip.style,
        source: "policy_expand",
      });
    }
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const dateValue = (formData.get("date") as string) || initialDate;

    const result = bookingSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone"),
      journey,
      date: dateValue,
      travelers: formData.get("travelers"),
      note: formData.get("note"),
    });

    if (!result.success) {
      const nextErrors: Partial<Record<BookingField, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as BookingField] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    // Track analytics for WhatsApp enquiry click
    trackWhatsAppEnquiryClick({
      journey: result.data.journey,
      travelers: result.data.travelers,
      hasDate: Boolean(result.data.date),
      hasNote: Boolean(result.data.note),
      date: result.data.date,
    });

    window.open(
      createWhatsAppUrl(createBookingMessage(result.data)),
      "_blank",
      "noopener,noreferrer",
    );
    setBookingOpen(false);
  }

  return (
    <main className="overflow-hidden bg-background text-foreground">
      {/* Navigation Header */}
      <header className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-14">
        <a href="#top" className="flex items-center gap-3" aria-label="Elsewhere, home">
          <span
            className="grid size-10 place-items-center rounded-full border border-primary/20 text-primary"
            aria-hidden="true"
          >
            <Globe2 className="size-[18px]" />
          </span>
          <span>
            <span className="block font-display text-[25px] leading-none">elsewhere</span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Travel, differently
            </span>
          </span>
        </a>

        <nav
          className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
          aria-label="Main navigation"
        >
          <a className="transition-colors hover:text-primary" href="#journeys">
            Journeys
          </a>
          <a className="transition-colors hover:text-primary" href="#our-way">
            Our way
          </a>
          <a className="transition-colors hover:text-primary" href="#get-in-touch">
            Get in touch
          </a>
        </nav>

        <Button
          className="h-10 gap-2 px-4"
          onClick={() => startBooking("Ladakh, the high road", "nav")}
        >
          <span>Plan a journey</span>
          <ArrowUpRight aria-hidden="true" />
        </Button>
      </header>

      {/* Hero Section */}
      <section
        id="top"
        className="mx-auto max-w-[1440px] px-3 sm:px-8 lg:px-14"
        aria-labelledby="hero-heading"
      >
        <div className="relative isolate min-h-[440px] overflow-hidden bg-sea-deep sm:min-h-[540px] lg:min-h-[610px]">
          <img
            src={ladakhImage}
            alt="An open road running into the Himalayan ranges of Ladakh"
            width={1712}
            height={1008}
            fetchPriority="high"
            className="absolute inset-0 -z-20 size-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sea-deep/75 via-sea-deep/25 to-transparent" />
          <div className="flex min-h-[440px] items-center px-7 py-14 sm:min-h-[540px] sm:px-14 lg:min-h-[610px] lg:px-20">
            <div className="max-w-[620px] text-primary-foreground">
              <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/85">
                <span className="h-px w-8 bg-tide" /> A little further, a little freer
              </p>
              <h1
                id="hero-heading"
                className="max-w-[600px] font-display text-6xl leading-[0.92] sm:text-7xl lg:text-8xl"
              >
                Find your way to <em className="font-normal">elsewhere.</em>
              </h1>
              <p className="mt-6 max-w-[410px] text-base leading-relaxed text-primary-foreground/90 sm:text-lg">
                Thoughtful journeys through India, made around the things you love to discover.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-12 gap-3 px-5"
                  onClick={() => startBooking("Ladakh, the high road", "hero")}
                >
                  Find your journey <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
          <span className="absolute bottom-5 right-7 hidden text-xs text-primary-foreground/90 sm:block lg:right-10">
            34°09′ N &nbsp; 77°34′ E — Ladakh
          </span>
        </div>

        <div className="grid gap-6 border-b border-border py-8 sm:grid-cols-[1fr_auto] sm:items-center lg:px-8 lg:py-10">
          <div className="flex items-start gap-4">
            <span className="mt-1 font-display text-3xl text-lagoon" aria-hidden="true">
              01
            </span>
            <div>
              <h2 className="font-display text-3xl leading-none sm:text-4xl">
                A country of a thousand different ways.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                From the high Himalaya to the backwaters, we plan trips that feel like yours from
                the very first turn.
              </p>
            </div>
          </div>
          <a
            href="#journeys"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-lagoon"
          >
            Explore journeys <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Journeys Section with Filters & Clear Policies */}
      <section
        id="journeys"
        className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-14 lg:py-24"
        aria-labelledby="journeys-heading"
      >
        <div className="mb-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-sea">
              A few places to begin
            </p>
            <h2 id="journeys-heading" className="font-display text-5xl leading-none sm:text-6xl">
              Somewhere to start.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Consider these an open invitation. Every journey can take its own shape, backed by clear
            booking and cancellation terms.
          </p>
        </div>

        {/* Feature 3: Destination, Travel Style, Duration, Budget Filters */}
        <div className="mb-10 rounded-lg border border-border bg-surface-soft/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sea">
              <Filter className="size-3.5" aria-hidden="true" />
              <span>Filter journeys</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Showing {filteredTrips.length} of {trips.length}{" "}
                {trips.length === 1 ? "journey" : "journeys"}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Destination filter */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="filter-destination"
                className="text-xs font-medium text-muted-foreground"
              >
                Destination
              </Label>
              <select
                id="filter-destination"
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                className="h-9 w-full rounded border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All destinations</option>
                {destinations.map((dest) => (
                  <option key={dest} value={dest}>
                    {dest}
                  </option>
                ))}
              </select>
            </div>

            {/* Travel style filter */}
            <div className="grid gap-1.5">
              <Label htmlFor="filter-style" className="text-xs font-medium text-muted-foreground">
                Travel style
              </Label>
              <select
                id="filter-style"
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="h-9 w-full rounded border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All travel styles</option>
                {styles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration filter */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="filter-duration"
                className="text-xs font-medium text-muted-foreground"
              >
                Duration
              </Label>
              <select
                id="filter-duration"
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="h-9 w-full rounded border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Any duration</option>
                <option value="short">Short (up to 4 days)</option>
                <option value="medium">Medium (5–7 days)</option>
                <option value="long">Long (8+ days)</option>
              </select>
            </div>

            {/* Budget filter */}
            <div className="grid gap-1.5">
              <Label htmlFor="filter-budget" className="text-xs font-medium text-muted-foreground">
                Starting budget
              </Label>
              <select
                id="filter-budget"
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
                className="h-9 w-full rounded border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Any budget</option>
                <option value="20000">Up to ₹20,000</option>
                <option value="30000">Up to ₹30,000</option>
                <option value="50000">Up to ₹50,000</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trips Grid */}
        {filteredTrips.length === 0 ? (
          <div className="my-12 rounded-lg border border-dashed border-border p-12 text-center">
            <p className="font-display text-3xl">No journeys match your filters.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filter criteria or let us create a custom trip for you.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all filters
              </Button>
              <Button
                size="sm"
                onClick={() => startBooking("Somewhere else in India", "empty_filter_cta")}
              >
                Tell us where you want to go
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-12 md:gap-y-8">
            {filteredTrips.map((trip, index) => (
              <article
                key={trip.name}
                data-trip-name={trip.name}
                className={`group flex flex-col justify-between ${trip.className}`}
              >
                <div>
                  <button
                    className="relative block aspect-[1.55/1] w-full cursor-pointer overflow-hidden bg-surface-soft text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Plan a trip: ${trip.name}`}
                    onClick={() => startBooking(trip.name, "trip_card_image")}
                  >
                    <img
                      src={trip.image}
                      alt={trip.imageAlt}
                      width={index === 0 ? 1712 : 800}
                      height={index === 0 ? 1008 : 1008}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                    />
                    <span
                      className="absolute left-4 top-4 grid size-9 place-items-center rounded-full bg-background/90 font-display text-lg text-primary"
                      aria-hidden="true"
                    >
                      0{index + 1}
                    </span>
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <span className="rounded bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sea">
                        {trip.durationDays} days
                      </span>
                      <span className="rounded bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        From ₹{trip.budgetFrom.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-start justify-between gap-4 pt-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sea">
                          {trip.region}
                        </p>
                        <span className="text-[10px] text-muted-foreground">• {trip.style}</span>
                      </div>
                      <h3 className="mt-1 font-display text-3xl sm:text-4xl">{trip.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{trip.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="mt-2 size-10 shrink-0 rounded-full border-primary/25 text-primary"
                      aria-label={`Ask about ${trip.name}`}
                      title={`Ask about ${trip.name}`}
                      onClick={() => startBooking(trip.name, "trip_card_button")}
                    >
                      <ArrowUpRight aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {/* Feature 4: Clear Cancellation, Payment, and Booking Policies on Each Trip */}
                <div className="mt-4 border-t border-border/70 pt-3">
                  <button
                    type="button"
                    onClick={() => togglePolicies(trip)}
                    className="flex w-full items-center justify-between text-left text-xs font-medium text-muted-foreground transition hover:text-primary"
                    aria-expanded={expandedPolicyTrip === trip.name}
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-sea" aria-hidden="true" />
                      <span>Cancellation, payment & booking policies</span>
                    </span>
                    <span className="text-[11px] underline">
                      {expandedPolicyTrip === trip.name ? "Hide policies" : "View policies"}
                    </span>
                  </button>

                  {expandedPolicyTrip === trip.name && (
                    <div className="mt-3 rounded border border-border bg-card p-3.5 text-xs text-foreground/90">
                      <div className="grid gap-2.5">
                        <div>
                          <p className="font-semibold text-primary flex items-center gap-1">
                            <ShieldCheck className="size-3 text-sea" aria-hidden="true" />
                            <span>Cancellation:</span>
                          </p>
                          <p className="mt-0.5 text-muted-foreground leading-relaxed">
                            {trip.policies.cancellation}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-primary flex items-center gap-1">
                            <CreditCard className="size-3 text-sea" aria-hidden="true" />
                            <span>Payment:</span>
                          </p>
                          <p className="mt-0.5 text-muted-foreground leading-relaxed">
                            {trip.policies.payment}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-primary flex items-center gap-1">
                            <FileText className="size-3 text-sea" aria-hidden="true" />
                            <span>Booking & Inclusions:</span>
                          </p>
                          <p className="mt-0.5 text-muted-foreground leading-relaxed">
                            {trip.policies.booking}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}

            <div className="flex min-h-64 flex-col justify-center border-y border-border py-10 md:col-span-7 md:ml-8 md:border-y-0 md:border-l md:pl-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sea">
                YOUR PACE, YOUR PLACE
              </p>
              <p className="mt-3 max-w-xl font-display text-4xl leading-tight sm:text-5xl">
                Have another corner of India in mind?
              </p>
              <Button
                variant="link"
                className="mt-4 h-auto w-fit gap-2 px-0 py-2 text-base"
                onClick={() => startBooking("Somewhere else in India", "somewhere_else_cta")}
              >
                Tell us what you’re dreaming of <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Our Way Section */}
      <section
        id="our-way"
        className="bg-sea-deep text-primary-foreground"
        aria-labelledby="our-way-heading"
      >
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-20 lg:px-14 lg:py-24">
          <div className="relative min-h-[300px] overflow-hidden sm:min-h-[410px]">
            <img
              src={hikingImage}
              alt="Two walkers following a green mountain path in Uttarakhand"
              width={800}
              height={1008}
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute bottom-0 left-0 bg-background px-5 py-3 text-xs text-foreground">
              The longer, greener way around — Uttarakhand
            </div>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-tide">
              There’s no one way to go
            </p>
            <h2 id="our-way-heading" className="font-display text-5xl leading-[0.98] sm:text-6xl">
              Good trips make room for the unexpected.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/80">
              We start with what matters to you: an early walk, a long lunch, the road less
              travelled. Then we put the pieces together, with the time and space to enjoy being
              there.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 h-12 gap-3 px-5"
              onClick={() => startBooking("A made-for-you journey", "our_way_cta")}
            >
              Let’s talk about your trip <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer
        id="get-in-touch"
        className="mx-auto grid max-w-[1440px] gap-7 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-14"
        aria-label="Contact Elsewhere"
      >
        <div>
          <p className="font-display text-4xl">Somewhere lovely is closer than you think.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us what you’d like to see. We’ll start there.
          </p>
        </div>
        <Button
          size="lg"
          className="h-12 gap-3 px-5"
          onClick={() => startBooking("An India journey", "footer")}
        >
          <MessageCircle aria-hidden="true" /> Start a conversation{" "}
          <ArrowUpRight aria-hidden="true" />
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5 text-xs text-muted-foreground md:col-span-2">
          <span>elsewhere &nbsp;·&nbsp; Travel, differently</span>
          <span>Thoughtfully planned journeys across India</span>
        </div>
      </footer>

      {/* Booking Form Dialog with Explicit Policies */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-background p-5 sm:max-w-xl sm:p-8">
          <DialogHeader className="pr-8 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sea">
              THE FIRST STEP
            </p>
            <DialogTitle className="font-display text-4xl font-normal leading-none sm:text-5xl">
              Let’s make a little plan.
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              Share a few details and we’ll open a WhatsApp message for you to review and send.
            </DialogDescription>
          </DialogHeader>

          <form
            className="mt-2 grid gap-x-5 gap-y-4 sm:grid-cols-2"
            onSubmit={submitBooking}
            noValidate
          >
            <div className="grid gap-2">
              <Label htmlFor="booking-name">Your name</Label>
              <Input
                id="booking-name"
                name="name"
                autoComplete="name"
                maxLength={100}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "booking-name-error" : undefined}
              />
              {errors.name && (
                <p id="booking-name-error" className="text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="booking-phone">Phone number</Label>
              <Input
                id="booking-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={25}
                placeholder="+91 98765 43210"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "booking-phone-error" : undefined}
              />
              {errors.phone && (
                <p id="booking-phone-error" className="text-xs text-destructive">
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="booking-journey">Journey</Label>
              <select
                id="booking-journey"
                value={journey}
                onChange={(event) => setJourney(event.target.value)}
                className="h-10 w-full border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {trips.map((trip) => (
                  <option key={trip.name} value={trip.name}>
                    {trip.name} (from ₹{trip.budgetFrom.toLocaleString("en-IN")})
                  </option>
                ))}
                <option value="Somewhere else in India">Somewhere else in India</option>
                <option value="A made-for-you journey">A made-for-you journey</option>
                <option value="An India journey">An India journey</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="booking-date">Preferred travel date</Label>
              <Input
                id="booking-date"
                name="date"
                type="date"
                defaultValue={initialDate}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "booking-date-error" : undefined}
              />
              {errors.date && (
                <p id="booking-date-error" className="text-xs text-destructive">
                  {errors.date}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="booking-travelers">Travellers</Label>
              <select
                id="booking-travelers"
                name="travelers"
                defaultValue="2"
                className="h-10 w-full border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Array.from({ length: 20 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1} {index === 0 ? "traveller" : "travellers"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="booking-note">
                Anything else we should know?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <textarea
                id="booking-note"
                name="note"
                rows={3}
                maxLength={600}
                className="w-full resize-y border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="A place you’d love to see, the pace you prefer…"
                aria-invalid={Boolean(errors.note)}
                aria-describedby={errors.note ? "booking-note-error" : undefined}
              />
              {errors.note && (
                <p id="booking-note-error" className="text-xs text-destructive">
                  {errors.note}
                </p>
              )}
            </div>

            {/* Feature 4: Cancellation, Payment, and Booking Policies on Booking Form */}
            <div className="rounded border border-border bg-surface-soft/60 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sea">
                <ShieldCheck className="size-4" aria-hidden="true" />
                <span>Our Clear Booking & Cancellation Terms</span>
              </div>
              <div className="mt-3 grid gap-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-foreground shrink-0">• Cancellation:</span>
                  <span>
                    {trips.find((t) => t.name === journey)?.policies.cancellation ??
                      defaultPolicies.cancellation}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-foreground shrink-0">• Payment:</span>
                  <span>
                    {trips.find((t) => t.name === journey)?.policies.payment ??
                      defaultPolicies.payment}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-foreground shrink-0">• Consultation:</span>
                  <span>
                    Initial planning on WhatsApp is free. Transparent quotes provided with no hidden
                    booking fees before any commitment.
                  </span>
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-1 h-12 gap-3 sm:col-span-2">
              <MessageCircle aria-hidden="true" /> Continue to WhatsApp{" "}
              <ArrowRight aria-hidden="true" />
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground sm:col-span-2">
              Your message opens in WhatsApp. It’s sent only when you choose Send there.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
