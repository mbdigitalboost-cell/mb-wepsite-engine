/**
 * Hand-written to match the Platform migrations exactly:
 *   supabase/platform/migrations/0001_profiles_customers_websites.sql
 *   supabase/platform/migrations/0002_customer_users.sql
 *   supabase/platform/migrations/0003_audit_logs.sql
 *   supabase/platform/migrations/0004_platform_rls.sql
 *
 * Once a real Platform Supabase project exists, this can be regenerated
 * from the live schema with:
 *
 *   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
 *
 * Until then, keep this file in sync by hand whenever a platform
 * migration file changes — it's what keeps every `.from("customers")` /
 * `.from("customer_users")` call type-checked against the real schema
 * instead of `any`.
 *
 * This describes the PLATFORM project's schema only. Each customer's own
 * Supabase project (site_settings, hero_sections, solutions, ...) will
 * get its own, separate types file once the customer-template migrations
 * exist (Phase 5) — the two schemas are never mixed here.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CustomerStatus = "active" | "inactive";
export type WebsiteStatus = "active" | "inactive";
/**
 * `admin` rows have `customer_id: null` (global access to every
 * customer). `customer` rows always have a `customer_id` (scoped to
 * exactly that customer). Enforced in the database by
 * customer_users_role_scope_check, not just by convention here.
 */
export type AppRole = "admin" | "customer";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: CustomerStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: CustomerStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: CustomerStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      websites: {
        Row: {
          id: string;
          customer_id: string;
          name: string;
          slug: string;
          domain: string | null;
          status: WebsiteStatus;
          template: string | null;
          supabase_connection_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          name: string;
          slug: string;
          domain?: string | null;
          status?: WebsiteStatus;
          template?: string | null;
          supabase_connection_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          status?: WebsiteStatus;
          template?: string | null;
          supabase_connection_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "websites_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_users: {
        Row: {
          id: string;
          customer_id: string | null;
          user_id: string;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          user_id: string;
          role: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          user_id?: string;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_users_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_users_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          customer_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          customer_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          customer_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      customer_status: CustomerStatus;
      website_status: WebsiteStatus;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
