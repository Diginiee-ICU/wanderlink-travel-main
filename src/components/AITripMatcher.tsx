import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Wallet,
  Compass,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trips, type Trip } from "@/lib/trip-catalog";
import { getTripRecommendations } from "@/lib/trip-recommendations.functions";
import { trackBookingFormStart, trackTripView } from "@/lib/analytics";

interface RecommendationItem {
  tripName: string;
  reason: string;
  trip?: Trip;
}

interface AITripMatcherProps {
  onSelectTrip: (tripName: string, date?: string) => void;
}

const QUICK_INSPIRATIONS = [
  "High mountains, brisk air, scenic road trip",
  "Gentle backwaters, village walks, local food",
  "Pink palaces, old architecture, bazaars",
];

export function AITripMatcher({ onSelectTrip }: AITripMatcherProps) {
  // Default dates: 1 month ahead for realistic travel planning
  const tomorrow = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 86400000 * 37).toISOString().slice(0, 10);

  const [interests, setInterests] = useState("");
  const [budget, setBudget] = useState("50000");
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(nextWeek);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!interests.trim() || interests.trim().length < 3) {
      errs.interests = "Please describe your travel interests (at least 3 characters).";
    }
    const numBudget = Number(budget);
    if (!budget || isNaN(numBudget) || numBudget < 1000) {
      errs.budget = "Please enter a valid budget (minimum ₹1,000).";
    }
    if (!startDate) {
      errs.startDate = "Please select a start date.";
    }
    if (!endDate) {
      errs.endDate = "Please select an end date.";
    } else if (startDate && endDate < startDate) {
      errs.endDate = "End date must be on or after your start date.";
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrorMessage(null);
    setRecommendations(null);

    const numBudget = Number(budget);

    try {
      const result = await getTripRecommendations({
        data: {
          interests: interests.trim(),
          budget: numBudget,
          startDate,
          endDate,
        },
      });

      if (result.error) {
        // Fallback gracefully to catalog matching when AI gateway is unreachable or unconfigured
        fallbackCatalogMatch(numBudget, startDate, endDate, result.error);
        return;
      }

      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendations(result.recommendations as RecommendationItem[]);
        // Track trip views for the recommendations
        result.recommendations.forEach((rec) => {
          if (rec.trip) {
            trackTripView({
              tripName: rec.trip.name,
              destination: rec.trip.destination,
              budgetFrom: rec.trip.budgetFrom,
              style: rec.trip.style,
              source: "ai_recommendation",
            });
          }
        });
      } else {
        fallbackCatalogMatch(
          numBudget,
          startDate,
          endDate,
          "No AI matches were found within the exact dates and budget.",
        );
      }
    } catch (err) {
      console.error("AI recommendation request error:", err);
      fallbackCatalogMatch(
        numBudget,
        startDate,
        endDate,
        "AI recommendation service is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  function fallbackCatalogMatch(
    budgetAmount: number,
    start: string,
    end: string,
    reasonHint: string,
  ) {
    const startMs = Date.parse(`${start}T00:00:00.000Z`);
    const endMs = Date.parse(`${end}T00:00:00.000Z`);
    const nights = Math.max(1, Math.floor((endMs - startMs) / 86400000));

    // Find trips within budget and duration
    const matching = trips.filter(
      (trip) => trip.budgetFrom <= budgetAmount && trip.durationDays <= nights + 1,
    );

    if (matching.length > 0) {
      setErrorMessage(
        `${reasonHint} Here are matching journeys from our catalogue based on your budget (₹${budgetAmount.toLocaleString("en-IN")}) and dates:`,
      );
      const fallbackRecs: RecommendationItem[] = matching.map((trip) => ({
        tripName: trip.name,
        trip,
        reason: `Fits comfortably in your ${nights}-day window and starting budget of ₹${trip.budgetFrom.toLocaleString("en-IN")}.`,
      }));
      setRecommendations(fallbackRecs);
    } else {
      setErrorMessage(
        `${reasonHint} We couldn't find a catalog journey under ₹${budgetAmount.toLocaleString("en-IN")} within ${nights} days. Try increasing your budget or duration.`,
      );
      setRecommendations([]);
    }
  }

  function handleSelectRecommendation(tripName: string) {
    trackBookingFormStart({
      journey: tripName,
      source: "ai_recommendation",
    });
    onSelectTrip(tripName, startDate);
  }

  return (
    <section
      id="ai-trip-matcher"
      className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-14"
      aria-labelledby="ai-matcher-heading"
    >
      <div className="relative overflow-hidden rounded-xl border border-sea/20 bg-gradient-to-br from-card via-surface-soft to-card p-6 shadow-sm sm:p-10 lg:p-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sea">
            <Sparkles className="size-4" aria-hidden="true" />
            <span>AI Trip Matcher</span>
          </div>
          <h2 id="ai-matcher-heading" className="mt-2 font-display text-4xl sm:text-5xl">
            Describe your ideal journey.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Tell us what brings you alive, your budget, and when you’d like to go. We’ll recommend
            journeys that fit your rhythm, complete with reasons why.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-12" noValidate>
          {/* Interests description */}
          <div className="grid gap-2 md:col-span-12">
            <Label htmlFor="ai-interests" className="flex items-center gap-1.5 font-medium">
              <Compass className="size-4 text-sea" aria-hidden="true" />
              <span>What would you love to experience?</span>
            </Label>
            <textarea
              id="ai-interests"
              rows={3}
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. Quiet mountain roads, traditional food, heritage havelis, slow mornings by the water..."
              maxLength={500}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-invalid={Boolean(validationErrors.interests)}
              aria-describedby={validationErrors.interests ? "ai-interests-error" : undefined}
            />
            {validationErrors.interests && (
              <p id="ai-interests-error" className="text-xs text-destructive">
                {validationErrors.interests}
              </p>
            )}

            {/* Quick Inspiration chips */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Inspirations:</span>
              {QUICK_INSPIRATIONS.map((insp) => (
                <button
                  key={insp}
                  type="button"
                  onClick={() => setInterests(insp)}
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground transition hover:border-sea hover:text-foreground"
                >
                  + {insp}
                </button>
              ))}
            </div>
          </div>

          {/* Budget input */}
          <div className="grid gap-2 sm:col-span-4 md:col-span-4">
            <Label htmlFor="ai-budget" className="flex items-center gap-1.5 font-medium">
              <Wallet className="size-4 text-sea" aria-hidden="true" />
              <span>Total budget (INR ₹)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                id="ai-budget"
                type="number"
                min={1000}
                max={5000000}
                step={1000}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="pl-7"
                aria-invalid={Boolean(validationErrors.budget)}
                aria-describedby={validationErrors.budget ? "ai-budget-error" : undefined}
              />
            </div>
            {validationErrors.budget && (
              <p id="ai-budget-error" className="text-xs text-destructive">
                {validationErrors.budget}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div className="grid gap-2 sm:col-span-4 md:col-span-4">
            <Label htmlFor="ai-start-date" className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-4 text-sea" aria-hidden="true" />
              <span>Start date</span>
            </Label>
            <Input
              id="ai-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-invalid={Boolean(validationErrors.startDate)}
              aria-describedby={validationErrors.startDate ? "ai-start-date-error" : undefined}
            />
            {validationErrors.startDate && (
              <p id="ai-start-date-error" className="text-xs text-destructive">
                {validationErrors.startDate}
              </p>
            )}
          </div>

          {/* End Date */}
          <div className="grid gap-2 sm:col-span-4 md:col-span-4">
            <Label htmlFor="ai-end-date" className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-4 text-sea" aria-hidden="true" />
              <span>End date</span>
            </Label>
            <Input
              id="ai-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-invalid={Boolean(validationErrors.endDate)}
              aria-describedby={validationErrors.endDate ? "ai-end-date-error" : undefined}
            />
            {validationErrors.endDate && (
              <p id="ai-end-date-error" className="text-xs text-destructive">
                {validationErrors.endDate}
              </p>
            )}
          </div>

          {/* Submit button */}
          <div className="pt-2 md:col-span-12">
            <Button type="submit" size="lg" disabled={loading} className="gap-2.5 px-6">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Matching with Elsewhere AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden="true" />
                  <span>Find matching journeys</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Informative message / Fallback notice */}
        {errorMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-background/80 p-4 text-sm text-muted-foreground">
            <AlertCircle className="size-5 shrink-0 text-sea" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Recommendations list */}
        {recommendations && recommendations.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="font-display text-2xl font-medium sm:text-3xl">
              Recommended journeys for you
            </h3>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              Based on your stated interests, budget, and travel dates
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => {
                const tripData = rec.trip || trips.find((t) => t.name === rec.tripName);
                if (!tripData) return null;

                return (
                  <div
                    key={rec.tripName}
                    className="flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md"
                  >
                    <div>
                      {tripData.image && (
                        <div className="relative aspect-[16/10] overflow-hidden bg-surface-soft">
                          <img
                            src={tripData.image}
                            alt={tripData.imageAlt}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-sea">
                            {tripData.durationDays} days
                          </span>
                        </div>
                      )}
                      <div className="p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-sea">
                          {tripData.region}
                        </p>
                        <h4 className="mt-1 font-display text-2xl leading-tight">
                          {tripData.name}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground">
                          From ₹{tripData.budgetFrom.toLocaleString("en-IN")} per person
                        </p>

                        <div className="mt-4 rounded-md border border-sea/20 bg-surface-soft/60 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sea">
                            <CheckCircle className="size-3.5" aria-hidden="true" />
                            <span>Why this matches</span>
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                            {rec.reason}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border p-5 pt-3">
                      <Button
                        variant="default"
                        className="w-full gap-2 text-xs"
                        onClick={() => handleSelectRecommendation(tripData.name)}
                      >
                        <span>Plan this journey</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
