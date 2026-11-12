import { useState, useEffect } from "react";
import { MessageCircle, X, ArrowUpRight, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createWhatsAppUrl } from "@/lib/whatsapp-booking";
import { trackWhatsAppEnquiryClick, trackBookingFormStart } from "@/lib/analytics";

interface WhatsAppWidgetProps {
  onOpenBookingForm: (journey?: string) => void;
}

export function WhatsAppWidget({ onOpenBookingForm }: WhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  // Subtle prompt badge appears after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPrompted(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  function handleDirectChat() {
    const greeting = "Hello! I'd like to enquire about planning a journey with Elsewhere.";
    trackWhatsAppEnquiryClick({
      journey: "Direct WhatsApp Widget",
      travelers: 1,
      hasDate: false,
      hasNote: false,
    });
    window.open(createWhatsAppUrl(greeting), "_blank", "noopener,noreferrer");
    setIsOpen(false);
  }

  function handleOpenForm() {
    trackBookingFormStart({
      journey: "An India journey",
      source: "whatsapp_floating_widget",
    });
    onOpenBookingForm("An India journey");
    setIsOpen(false);
  }

  return (
    <aside aria-label="WhatsApp enquiry options" className="fixed bottom-6 right-6 z-50">
      {/* Expanded Chat Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="whatsapp-card-title"
          className="mb-3 w-[calc(100vw-3rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-sea-deep px-4 py-3.5 text-primary-foreground">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="grid size-9 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <MessageCircle className="size-5" />
                </div>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sea-deep bg-emerald-400" />
              </div>
              <div>
                <p id="whatsapp-card-title" className="text-sm font-semibold leading-tight">
                  Elsewhere Curators
                </p>
                <p className="text-[11px] text-primary-foreground/75">
                  Typically replies within a few hours
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-primary-foreground/75 transition hover:bg-white/10 hover:text-primary-foreground"
              aria-label="Close WhatsApp chat card"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <div className="rounded-xl rounded-tl-sm bg-surface-soft p-3.5 text-xs leading-relaxed text-foreground/90">
              <p>
                Hello! Looking for a slower, more thoughtful trip across India? Tell us your preferred rhythm and dates, and we’ll plan it with you.
              </p>
              <span className="mt-1.5 block text-[10px] text-muted-foreground">Direct planning on WhatsApp</span>
            </div>

            <div className="mt-4 grid gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleDirectChat}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <MessageCircle className="size-4" />
                <span>Chat on WhatsApp</span>
                <ArrowUpRight className="size-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenForm}
                className="w-full gap-2 text-xs"
              >
                <Send className="size-3.5" />
                <span>Customize via Booking Form</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger & Badge */}
      <div className="flex items-center gap-2.5">
        {!isOpen && hasPrompted && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden items-center gap-2 rounded-full border border-border bg-background/95 px-3.5 py-2 text-xs font-medium text-foreground shadow-md backdrop-blur transition hover:bg-background sm:flex"
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Plan on WhatsApp</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close WhatsApp chat widget" : "Open WhatsApp chat widget"}
          className="relative grid size-13 place-items-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isOpen ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <>
              <MessageCircle className="size-6.5" aria-hidden="true" />
              <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3.5 rounded-full border-2 border-background bg-emerald-400" />
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
