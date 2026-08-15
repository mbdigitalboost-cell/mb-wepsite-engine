/**
 * Hand-written to match the CUSTOMER TEMPLATE migrations exactly:
 *   supabase/customer-template/migrations/0001_site_settings_pages.sql
 *   supabase/customer-template/migrations/0002_content_tables.sql
 *   supabase/customer-template/migrations/0003_seo_tracking_media_nav.sql
 *   supabase/customer-template/migrations/0004_leads.sql
 *   supabase/customer-template/migrations/0005_customer_rls.sql
 *
 * Deliberately separate from lib/supabase/types.ts (the PLATFORM
 * project's schema) — the two are never the same database and must
 * never be mixed. Once a real customer Supabase project exists, this can
 * be regenerated from the live schema with:
 *
 *   npx supabase gen types typescript --project-id <customer-project-id> > lib/cms/customer-types.ts
 *
 * Until then, keep this in sync by hand whenever a customer-template
 * migration file changes.
 */
export type CustomerJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: CustomerJson | undefined }
  | CustomerJson[];

export type ContentStatus = "draft" | "published" | "archived";
export type LeadStatus = "new" | "contacted" | "closed";

/**
 * NOTE: every row type below is a `type` alias (never an `interface`).
 * This matters more than style: TypeScript only treats a plain object
 * `type` as assignable to an index-signature type like
 * `Record<string, unknown>`; a declared `interface` (even with identical
 * members) is NOT assignable to `Record<string, unknown>`, because
 * interfaces are open for declaration merging and don't get an implicit
 * index signature. `@supabase/postgrest-js`'s `GenericTable` requires
 * `Row`/`Insert`/`Update` to extend `Record<string, unknown>` — so an
 * `interface`-typed Row silently fails that `extends` check, the
 * conditional type collapses to `never`, and every `.from(...)` call
 * (even with a literal string table name) resolves to `never`. Keep
 * these as `type` aliases with `&` composition, not `interface extends`.
 */
type ContentRow = {
  id: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
};

export type SiteSettingsRow = ContentRow & {
  company_name: string | null;
  alternate_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  service_area: string | null;
  working_hours: string | null;
  logo: string | null;
  logo_white: string | null;
  favicon: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  radius: string | null;
  button_style: string | null;
};

export type PageRow = ContentRow & {
  slug: string;
  title: string;
  sort_order: number;
};

export type HeroSectionRow = ContentRow & {
  page_id: string | null;
  heading: string;
  subtext: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  background_image: string | null;
};

/** Shared shape for services / solutions / projects / campaigns rows. */
export type NamedContentRow = ContentRow & {
  title: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
};

export type TestimonialRow = ContentRow & {
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  image: string | null;
  sort_order: number;
};

export type FaqRow = ContentRow & {
  question: string;
  answer: string;
  sort_order: number;
};

export type NavigationItemRow = ContentRow & {
  label: string;
  href: string;
  sort_order: number;
};

export type SeoSettingsRow = {
  id: string;
  page_id: string | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  og_image: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  created_at: string;
  updated_at: string;
};

/** Full row — service_role only, see 0005_customer_rls.sql. Never fetched by the public adapter path. */
export type TrackingSettingsRow = {
  id: string;
  ga4_id: string | null;
  gtm_id: string | null;
  meta_pixel_id: string | null;
  meta_capi_enabled: boolean;
  meta_capi_token: string | null;
  created_at: string;
  updated_at: string;
};

/** The only tracking projection anon/authenticated can ever read — see the tracking_public_settings view. */
export type TrackingPublicSettingsRow = {
  ga4_id: string | null;
  gtm_id: string | null;
  meta_pixel_id: string | null;
};

export type MediaAssetRow = {
  id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  alt_text: string | null;
  type: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
};

/** Type-only helper (no runtime code) — shapes a Tables[x] entry the way @supabase/supabase-js expects. */
type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type CustomerDatabase = {
  public: {
    Tables: {
      site_settings: TableDef<SiteSettingsRow, Partial<SiteSettingsRow>, Partial<SiteSettingsRow>>;
      pages: TableDef<PageRow, Partial<PageRow>, Partial<PageRow>>;
      hero_sections: TableDef<HeroSectionRow, Partial<HeroSectionRow>, Partial<HeroSectionRow>>;
      services: TableDef<NamedContentRow, Partial<NamedContentRow>, Partial<NamedContentRow>>;
      solutions: TableDef<NamedContentRow, Partial<NamedContentRow>, Partial<NamedContentRow>>;
      projects: TableDef<NamedContentRow, Partial<NamedContentRow>, Partial<NamedContentRow>>;
      campaigns: TableDef<NamedContentRow, Partial<NamedContentRow>, Partial<NamedContentRow>>;
      testimonials: TableDef<TestimonialRow, Partial<TestimonialRow>, Partial<TestimonialRow>>;
      faqs: TableDef<FaqRow, Partial<FaqRow>, Partial<FaqRow>>;
      navigation_items: TableDef<NavigationItemRow, Partial<NavigationItemRow>, Partial<NavigationItemRow>>;
      seo_settings: TableDef<SeoSettingsRow, Partial<SeoSettingsRow>, Partial<SeoSettingsRow>>;
      tracking_settings: TableDef<TrackingSettingsRow, Partial<TrackingSettingsRow>, Partial<TrackingSettingsRow>>;
      media_assets: TableDef<MediaAssetRow, Partial<MediaAssetRow>, Partial<MediaAssetRow>>;
      leads: TableDef<LeadRow, Partial<LeadRow>, Partial<LeadRow>>;
    };
    Views: {
      tracking_public_settings: {
        Row: TrackingPublicSettingsRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      content_status: ContentStatus;
      lead_status: LeadStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
