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
 *
 * FAZ 2A EKİ (2026-09-16): aşağıdaki 8 tablo —
 *   supabase/platform/migrations/0016_categories_brands.sql
 *   supabase/platform/migrations/0017_products.sql
 *   supabase/platform/migrations/0018_product_variants_options.sql
 *   supabase/platform/migrations/0019_product_images.sql
 * — bu dördü PRODUCTION'A UYGULANDI (TAKTİKALP46 P0 PRODUCTION MIGRATION
 * RESULT raporu) ve production'daki gerçek pg_constraint/pg_policies
 * çıktısıyla doğrulandı; bu blok o gerçek şemayla birebir eşleşecek
 * şekilde elle yazıldı (tahmin değil). category_id/brand_id (products) ve
 * variant_id (product_images) composite FK'leri
 * `on delete set null (<col>)` kullanıyor — bu, hangi kolonun null
 * olacağını PostgreSQL'e açıkça söyler (store_id ASLA null olmaz); bu
 * TypeScript tip tanımlarında görünmez (FK davranışı DB'de yaşar), sadece
 * Relationships dizisindeki `columns`/`referencedColumns` çift-kolonlu
 * (composite) olarak yansıtılır.
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
      /** FAZ 2A, migration 0016_categories_brands.sql. Production'a uygulandı. */
      categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      /** FAZ 2A, migration 0016_categories_brands.sql. Production'a uygulandı. */
      brands: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          is_active: boolean;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brands_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      /**
       * FAZ 2A, migration 0017_products.sql. Production'a uygulandı.
       * category_id/brand_id: composite FK (col, store_id) -> categories/brands(id, store_id),
       * `on delete set null (category_id)` / `on delete set null (brand_id)` — store_id ASLA null olmaz
       * (bkz. P0 MIGRATION HARDENING FIX raporu). sku NULLABLE'dır (DB'de `not null` yok) — app-layer'da
       * (lib/validation/product.ts) zorunlu kılınması ayrı bir iş kararı, DB kısıtı değil. is_published
       * KOLONU YOK (bilinçli — bkz. migration dosyasının kendi header yorumu): is_active tek başına hem
       * admin togglesı hem anon RLS kapısı, store_homepage_sections/store_navigation_items ile aynı desen.
       */
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          brand_id: string | null;
          name: string;
          slug: string;
          sku: string | null;
          short_description: string | null;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          stock: number;
          track_inventory: boolean;
          is_active: boolean;
          sort_order: number;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          category_id?: string | null;
          brand_id?: string | null;
          name: string;
          slug: string;
          sku?: string | null;
          short_description?: string | null;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          stock?: number;
          track_inventory?: boolean;
          is_active?: boolean;
          sort_order?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          category_id?: string | null;
          brand_id?: string | null;
          name?: string;
          slug?: string;
          sku?: string | null;
          short_description?: string | null;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          stock?: number;
          track_inventory?: boolean;
          is_active?: boolean;
          sort_order?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_store_id_fkey";
            columns: ["category_id", "store_id"];
            referencedRelation: "categories";
            referencedColumns: ["id", "store_id"];
          },
          {
            foreignKeyName: "products_brand_id_store_id_fkey";
            columns: ["brand_id", "store_id"];
            referencedRelation: "brands";
            referencedColumns: ["id", "store_id"];
          },
        ];
      };
      /**
       * FAZ 2A, migration 0018_product_variants_options.sql. Production'a uygulandı.
       * price/compare_at_price NULLABLE = ürünün fiyatını miras alır (app katmanında çözülür).
       */
      product_variants: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          sku: string | null;
          name: string;
          price: number | null;
          compare_at_price: number | null;
          stock: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          sku?: string | null;
          name: string;
          price?: number | null;
          compare_at_price?: number | null;
          stock?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          sku?: string | null;
          name?: string;
          price?: number | null;
          compare_at_price?: number | null;
          stock?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_store_id_fkey";
            columns: ["product_id", "store_id"];
            referencedRelation: "products";
            referencedColumns: ["id", "store_id"];
          },
        ];
      };
      /**
       * FAZ 2A, migration 0019_product_images.sql. Production'a uygulandı.
       * variant_id: composite FK (variant_id, store_id) -> product_variants(id, store_id),
       * `on delete set null (variant_id)` — store_id ASLA null olmaz. storage_path bir Supabase
       * Storage BUCKET PATH'idir, public URL DEĞİL (bkz. migration'ın kendi header yorumu).
       * DİKKAT: bu tabloda updated_at KOLONU YOK (diğer FAZ 2A tablolarının aksine).
       */
      product_images: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          variant_id: string | null;
          storage_path: string;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          variant_id?: string | null;
          storage_path: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          variant_id?: string | null;
          storage_path?: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_product_id_store_id_fkey";
            columns: ["product_id", "store_id"];
            referencedRelation: "products";
            referencedColumns: ["id", "store_id"];
          },
          {
            foreignKeyName: "product_images_variant_id_store_id_fkey";
            columns: ["variant_id", "store_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id", "store_id"];
          },
        ];
      };
      /**
       * FAZ 2A, migration 0018_product_variants_options.sql. Production'a uygulandı.
       * DİKKAT: is_active KOLONU YOK — option_groups dashboard/configurator-only'dir (anon SELECT
       * policy'si yok), gizlenecek bir "public" görünüm olmadığı için bir bayrağa ihtiyaç yok.
       */
      option_groups: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "option_groups_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "option_groups_product_id_store_id_fkey";
            columns: ["product_id", "store_id"];
            referencedRelation: "products";
            referencedColumns: ["id", "store_id"];
          },
        ];
      };
      /**
       * FAZ 2A, migration 0018_product_variants_options.sql. Production'a uygulandı.
       * DİKKAT: is_active YOK, updated_at YOK — satırlar etkin olarak değişmez kimlikler
       * (sadece sort_order/silme değişir), bkz. migration'ın kendi header yorumu.
       */
      option_values: {
        Row: {
          id: string;
          store_id: string;
          option_group_id: string;
          value: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          option_group_id: string;
          value: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          option_group_id?: string;
          value?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "option_values_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "option_values_group_id_store_id_fkey";
            columns: ["option_group_id", "store_id"];
            referencedRelation: "option_groups";
            referencedColumns: ["id", "store_id"];
          },
        ];
      };
      /**
       * FAZ 2A, migration 0018_product_variants_options.sql. Production'a uygulandı.
       * Saf junction tablo — kendi `id`'si, `created_at`/`updated_at`'ı YOK; primary key
       * (variant_id, option_value_id) çiftidir. variant_id yönü CASCADE, option_value_id yönü
       * RESTRICT (bilinçli asimetri, bkz. migration'ın kendi header yorumu).
       */
      variant_option_values: {
        Row: {
          variant_id: string;
          option_value_id: string;
          store_id: string;
        };
        Insert: {
          variant_id: string;
          option_value_id: string;
          store_id: string;
        };
        Update: {
          variant_id?: string;
          option_value_id?: string;
          store_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_option_values_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_option_values_variant_id_store_id_fkey";
            columns: ["variant_id", "store_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id", "store_id"];
          },
          {
            foreignKeyName: "variant_option_values_option_value_id_store_id_fkey";
            columns: ["option_value_id", "store_id"];
            referencedRelation: "option_values";
            referencedColumns: ["id", "store_id"];
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
