/**
 * Hand-written to match the Platform migrations exactly:
 *   supabase/platform/migrations/0001_profiles_customers_websites.sql
 *   supabase/platform/migrations/0002_customer_users.sql
 *   supabase/platform/migrations/0003_audit_logs.sql
 *   supabase/platform/migrations/0004_platform_rls.sql
 *   supabase/platform/migrations/0005_expand_roles_enum.sql
 *   supabase/platform/migrations/0006_expand_roles_rbac.sql
 *   supabase/platform/migrations/0007_stores.sql
 *   supabase/platform/migrations/0008_store_extension_helpers.sql (fonksiyon, tablo eklemiyor)
 *   supabase/platform/migrations/0009_store_profile_settings.sql
 *   supabase/platform/migrations/0010_store_branding_navigation.sql
 *   supabase/platform/migrations/0011_store_homepage_builder.sql
 *
 * PHASE 2 NOTU: 0008-0011 henüz production'a UYGULANMADI (bkz. o
 * dosyaların başlığı) — bu tip tanımları migration SQL'iyle birebir
 * eşleşecek şekilde ELLE yazıldı ki kod bugünden itibaren type-check
 * edilebilsin. Migration'lar production'a uygulandıktan SONRA bu blok
 * `generate_typescript_types` ile yeniden üretilip DOĞRULANMALI (elle
 * yazılmış olması, canlı şemadan sapma riski taşır — bkz. PHASE 2 final
 * raporundaki "kalan riskler" bölümü).
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
/** Phase 1, migration 0007_stores.sql. */
export type StoreStatus = "active" | "inactive";
/** Phase 2, migration 0009_store_profile_settings.sql. */
export type StoreTaxMode = "included" | "excluded" | "disabled";
/** Phase 2, migration 0010_store_branding_navigation.sql. */
export type StoreButtonStyle = "rounded" | "square" | "pill";
export type StoreColorMode = "light" | "dark" | "system";
export type StoreNavigationMenuType = "main" | "footer" | "category";
/**
 * Phase 1 (migration 0005_expand_roles_enum.sql +
 * 0006_expand_roles_rbac.sql — enum değerleri ve onların kullanımı,
 * Postgres'in "yeni enum değeri eklendiği transaction'da kullanılamaz"
 * kısıtlaması nedeniyle İKİ AYRI dosyaya bölündü, bkz. o dosyaların
 * yorumu) genişletti: eski "admin"/"customer" iki-rollü model,
 * admin-eşdeğeri (customer_id NULL) ve store-eşdeğeri (customer_id NOT
 * NULL) iki AİLEye ayrıldı:
 *
 *   admin-eşdeğeri: super_admin, platform_admin   (+ eski "admin" —
 *     Postgres enum'dan değer SİLİNEMEZ, bu yüzden etiket enum'da kalıyor
 *     ama migration 0006'dan sonra hiçbir satırda kullanılmıyor)
 *   store-eşdeğeri: store_admin, store_editor, store_viewer (+ eski
 *     "customer", aynı sebeple)
 *
 * `customer_users_role_scope_check` (migration 0006) bu iki aileyi
 * customer_id NULL/NOT NULL kuralına bağlıyor. Kodda HİÇBİR YERDE bu
 * string'lerle doğrudan karşılaştırma yapılmamalı — bkz.
 * lib/auth/roles.ts (isAdminRole/isStoreRole/isStoreWriteRole).
 */
export type AppRole =
  | "admin"
  | "customer"
  | "super_admin"
  | "platform_admin"
  | "store_admin"
  | "store_editor"
  | "store_viewer";

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
      stores: {
        Row: {
          id: string;
          customer_id: string;
          name: string;
          slug: string;
          status: StoreStatus;
          supabase_connection_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          name: string;
          slug: string;
          status?: StoreStatus;
          supabase_connection_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          name?: string;
          slug?: string;
          status?: StoreStatus;
          supabase_connection_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stores_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Phase 2, migration 0009_store_profile_settings.sql. Henüz production'a uygulanmadı. */
      store_profiles: {
        Row: {
          store_id: string;
          display_name: string | null;
          description: string | null;
          logo_url: string | null;
          favicon_url: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          social_links: Json;
          business_info: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id: string;
          display_name?: string | null;
          description?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          social_links?: Json;
          business_info?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          display_name?: string | null;
          description?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          social_links?: Json;
          business_info?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_profiles_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Phase 2, migration 0009_store_profile_settings.sql. Henüz production'a uygulanmadı. */
      store_settings: {
        Row: {
          store_id: string;
          currency: string;
          locale: string;
          tax_mode: StoreTaxMode;
          maintenance_mode: boolean;
          maintenance_message: string | null;
          customer_settings: Json;
          order_settings: Json;
          general_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id: string;
          currency?: string;
          locale?: string;
          tax_mode?: StoreTaxMode;
          maintenance_mode?: boolean;
          maintenance_message?: string | null;
          customer_settings?: Json;
          order_settings?: Json;
          general_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          currency?: string;
          locale?: string;
          tax_mode?: StoreTaxMode;
          maintenance_mode?: boolean;
          maintenance_message?: string | null;
          customer_settings?: Json;
          order_settings?: Json;
          general_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Phase 2, migration 0010_store_branding_navigation.sql. Henüz production'a uygulanmadı. */
      store_branding: {
        Row: {
          store_id: string;
          primary_color: string | null;
          secondary_color: string | null;
          accent_color: string | null;
          button_style: StoreButtonStyle | null;
          typography: string | null;
          color_mode: StoreColorMode;
          theme_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          accent_color?: string | null;
          button_style?: StoreButtonStyle | null;
          typography?: string | null;
          color_mode?: StoreColorMode;
          theme_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          accent_color?: string | null;
          button_style?: StoreButtonStyle | null;
          typography?: string | null;
          color_mode?: StoreColorMode;
          theme_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_branding_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Phase 2, migration 0010_store_branding_navigation.sql. Henüz production'a uygulanmadı. */
      store_navigation_menus: {
        Row: {
          id: string;
          store_id: string;
          menu_type: StoreNavigationMenuType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          menu_type: StoreNavigationMenuType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          menu_type?: StoreNavigationMenuType;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_navigation_menus_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Phase 2, migration 0010_store_branding_navigation.sql. Henüz production'a uygulanmadı. */
      store_navigation_items: {
        Row: {
          id: string;
          menu_id: string;
          store_id: string;
          parent_item_id: string | null;
          label: string;
          url: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          store_id: string;
          parent_item_id?: string | null;
          label: string;
          url: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          menu_id?: string;
          store_id?: string;
          parent_item_id?: string | null;
          label?: string;
          url?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_navigation_items_menu_id_fkey";
            columns: ["menu_id"];
            referencedRelation: "store_navigation_menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_navigation_items_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Phase 2, migration 0011_store_homepage_builder.sql. Henüz production'a uygulanmadı. */
      homepage_section_types: {
        Row: {
          key: string;
          label: string;
          description: string | null;
          default_config: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          label: string;
          description?: string | null;
          default_config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          label?: string;
          description?: string | null;
          default_config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** Phase 2, migration 0011_store_homepage_builder.sql. Henüz production'a uygulanmadı. */
      store_homepage_sections: {
        Row: {
          id: string;
          store_id: string;
          section_type_key: string;
          internal_label: string | null;
          title: string | null;
          description: string | null;
          image_url: string | null;
          link_url: string | null;
          config: Json;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          section_type_key: string;
          internal_label?: string | null;
          title?: string | null;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          config?: Json;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          section_type_key?: string;
          internal_label?: string | null;
          title?: string | null;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          config?: Json;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_homepage_sections_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_homepage_sections_section_type_key_fkey";
            columns: ["section_type_key"];
            referencedRelation: "homepage_section_types";
            referencedColumns: ["key"];
          },
        ];
      };
    };
    Views: {
      /** Phase 2, migration 0009_store_profile_settings.sql. Henüz production'a uygulanmadı. Read-only projeksiyon — Insert/Update yok. */
      store_public_settings: {
        Row: {
          store_id: string;
          currency: string;
          locale: string;
          maintenance_mode: boolean;
          maintenance_message: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      customer_status: CustomerStatus;
      website_status: WebsiteStatus;
      app_role: AppRole;
      store_status: StoreStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
