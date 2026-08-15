/**
 * Canonical tracking event names shared across every customer site.
 *
 * Do not invent ad-hoc event strings at the call site — add the event here
 * first. This is what keeps GTM/GA4/Meta Pixel/Meta CAPI configuration
 * reusable across customers: every site emits the same vocabulary, so a
 * single set of GTM triggers and conversion actions works for all of them.
 */
export const TRACKING_EVENTS = {
  pageView: "page_view",
  viewContent: "view_content",
  generateLead: "generate_lead",
  contact: "contact",
  formSubmit: "form_submit",
  whatsappClick: "whatsapp_click",
  phoneClick: "phone_click",
  appointmentRequest: "appointment_request",
  purchase: "purchase",

  // Added for Petra Mühendislik (quote/service/campaign funnel) — kept
  // here rather than site-specific so any future customer with the same
  // funnel shape reuses the same event names.
  quoteRequest: "quote_request",
  serviceView: "service_view",
  campaignView: "campaign_view",
} as const;

export type TrackingEventName =
  (typeof TRACKING_EVENTS)[keyof typeof TRACKING_EVENTS];

export type TrackingPayload = Record<string, string | number | boolean | undefined>;
