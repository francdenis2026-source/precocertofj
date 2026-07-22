export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activation_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          plan_id: string | null
          subscription_id: string | null
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          plan_id?: string | null
          subscription_id?: string | null
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          plan_id?: string | null
          subscription_id?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          notes: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      ai_quota: {
        Row: {
          created_at: string
          id: string
          month_key: string
          quota_limit: number
          reset_at: string
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_key: string
          quota_limit?: number
          reset_at: string
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_key?: string
          quota_limit?: number
          reset_at?: string
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          credits_cents: number
          error_message: string | null
          function_name: string
          id: string
          model: string | null
          prompt_tokens: number
          success: boolean
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          credits_cents?: number
          error_message?: string | null
          function_name: string
          id?: string
          model?: string | null
          prompt_tokens?: number
          success?: boolean
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          credits_cents?: number
          error_message?: string | null
          function_name?: string
          id?: string
          model?: string | null
          prompt_tokens?: number
          success?: boolean
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          is_visitor: boolean
          meta: Json
          route: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          is_visitor?: boolean
          meta?: Json
          route?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          is_visitor?: boolean
          meta?: Json
          route?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      catalog_image_jobs: {
        Row: {
          attempts: number
          catalog_id: string
          created_at: string
          duration_ms: number | null
          finished_at: string | null
          id: string
          image_url: string | null
          last_error: string | null
          priority: number
          provider: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          catalog_id: string
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          image_url?: string | null
          last_error?: string | null
          priority?: number
          provider?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          catalog_id?: string
          created_at?: string
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          image_url?: string | null
          last_error?: string | null
          priority?: number
          provider?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_image_jobs_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_suggestions: {
        Row: {
          applied_at: string | null
          confidence: number | null
          created_at: string
          id: string
          product_catalog_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          scan_id: string | null
          source_name: string
          status: string
          suggested_brand: string | null
          suggested_normalized_name: string | null
          suggested_package: string | null
          suggested_type: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          product_catalog_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          scan_id?: string | null
          source_name: string
          status?: string
          suggested_brand?: string | null
          suggested_normalized_name?: string | null
          suggested_package?: string | null
          suggested_type?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          product_catalog_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          scan_id?: string | null
          source_name?: string
          status?: string
          suggested_brand?: string | null
          suggested_normalized_name?: string | null
          suggested_package?: string | null
          suggested_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_suggestions_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_suggestions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      category_icon_overrides: {
        Row: {
          created_at: string
          kind: string
          slug: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          kind: string
          slug: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          kind?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      checkout_orders: {
        Row: {
          approved_at: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          discount_cents: number
          final_cents: number
          id: string
          license_code_id: string | null
          original_cents: number
          plan_id: string
          provider: string
          provider_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          final_cents: number
          id?: string
          license_code_id?: string | null
          original_cents: number
          plan_id: string
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          final_cents?: number
          id?: string
          license_code_id?: string | null
          original_cents?: number
          plan_id?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "promo_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_orders_license_code_id_fkey"
            columns: ["license_code_id"]
            isOneToOne: false
            referencedRelation: "license_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "license_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_submissions: {
        Row: {
          admin_notes: string | null
          attachment_paths: string[]
          city: string | null
          created_at: string
          email: string
          external_ref: string | null
          full_name: string | null
          id: string
          market_name: string | null
          notified_at: string | null
          purchase_date: string | null
          receipts_count: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_days: number | null
          reward_granted: boolean
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          attachment_paths?: string[]
          city?: string | null
          created_at?: string
          email: string
          external_ref?: string | null
          full_name?: string | null
          id?: string
          market_name?: string | null
          notified_at?: string | null
          purchase_date?: string | null
          receipts_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_days?: number | null
          reward_granted?: boolean
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          attachment_paths?: string[]
          city?: string | null
          created_at?: string
          email?: string
          external_ref?: string | null
          full_name?: string | null
          id?: string
          market_name?: string | null
          notified_at?: string | null
          purchase_date?: string | null
          receipts_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_days?: number | null
          reward_granted?: boolean
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      edit_audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          active: boolean
          address: string | null
          brand_color: string | null
          city: string
          cnpj: string | null
          created_at: string
          created_by: string | null
          id: string
          ie: string | null
          kind: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          state: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          brand_color?: string | null
          city: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ie?: string | null
          kind?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          brand_color?: string | null
          city?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ie?: string | null
          kind?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      favorite_items: {
        Row: {
          catalog_id: string
          created_at: string
          id: string
          last_checked_at: string | null
          last_market: string | null
          last_price: number | null
          preferred_establishment_id: string | null
          sort_order: number
          target_price: number | null
          user_id: string
        }
        Insert: {
          catalog_id: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_market?: string | null
          last_price?: number | null
          preferred_establishment_id?: string | null
          sort_order?: number
          target_price?: number | null
          user_id: string
        }
        Update: {
          catalog_id?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_market?: string | null
          last_price?: number | null
          preferred_establishment_id?: string | null
          sort_order?: number
          target_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_items_preferred_establishment_id_fkey"
            columns: ["preferred_establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_markets: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string | null
          last_total: number | null
          market_name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_total?: number | null
          market_name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_total?: number | null
          market_name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          alert_threshold: number | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          kind: string
          monthly_budget: number | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          monthly_budget?: number | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold?: number | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          monthly_budget?: number | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_scheduled: {
        Row: {
          amount: number | null
          category_id: string | null
          completed_transaction_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          list_id: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          completed_transaction_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          list_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          completed_transaction_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          list_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_scheduled_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_scheduled_completed_transaction_id_fkey"
            columns: ["completed_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_scheduled_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          is_recurring: boolean
          metadata: Json
          occurred_on: string
          payment_method: string | null
          recurrence_rule: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          is_recurring?: boolean
          metadata?: Json
          occurred_on?: string
          payment_method?: string | null
          recurrence_rule?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          is_recurring?: boolean
          metadata?: Json
          occurred_on?: string
          payment_method?: string | null
          recurrence_rule?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          created_count: number
          error_count: number
          establishment_id: string | null
          id: string
          market_name: string | null
          note: string | null
          skipped_count: number
          source: string
          status: string
          total_count: number
          updated_at: string
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_count?: number
          error_count?: number
          establishment_id?: string | null
          id?: string
          market_name?: string | null
          note?: string | null
          skipped_count?: number
          source: string
          status?: string
          total_count?: number
          updated_at?: string
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_count?: number
          error_count?: number
          establishment_id?: string | null
          id?: string
          market_name?: string | null
          note?: string | null
          skipped_count?: number
          source?: string
          status?: string
          total_count?: number
          updated_at?: string
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      import_items: {
        Row: {
          batch_id: string
          confidence: number | null
          created_at: string
          id: string
          log: string | null
          price: number | null
          product_name: string
          quantity: number | null
          scan_id: string | null
          status: string
          unit: string | null
        }
        Insert: {
          batch_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          log?: string | null
          price?: number | null
          product_name: string
          quantity?: number | null
          scan_id?: string | null
          status: string
          unit?: string | null
        }
        Update: {
          batch_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          log?: string | null
          price?: number | null
          product_name?: string
          quantity?: number | null
          scan_id?: string | null
          status?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_items_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      license_codes: {
        Row: {
          buyer_user_id: string | null
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          notes: string | null
          plan_id: string
          price_cents: number
          redeemed_at: string | null
          redeemed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_user_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          plan_id: string
          price_cents: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_user_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          plan_id?: string
          price_cents?: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_codes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "license_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      license_plans: {
        Row: {
          active: boolean
          created_at: string
          days: number
          description: string | null
          id: string
          name: string
          price_cents: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days: number
          description?: string | null
          id?: string
          name: string
          price_cents: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days?: number
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          cpf_masked: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          reason: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          cpf_masked?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          cpf_masked?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          created_at: string
          email: boolean
          in_app: boolean
          market_savings_min: number
          price_drop_pct: number
          push: boolean
          target_price_only: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: boolean
          in_app?: boolean
          market_savings_min?: number
          price_drop_pct?: number
          push?: boolean
          target_price_only?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: boolean
          in_app?: boolean
          market_savings_min?: number
          price_drop_pct?: number
          push?: boolean
          target_price_only?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          external_ref: string | null
          id: string
          new_paid_until: string | null
          paid_at: string
          payer_email: string | null
          payer_name: string | null
          payment_id: string
          plan_days: number
          plan_id: string | null
          plan_name: string | null
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          new_paid_until?: string | null
          paid_at?: string
          payer_email?: string | null
          payer_name?: string | null
          payment_id: string
          plan_days?: number
          plan_id?: string | null
          plan_name?: string | null
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          new_paid_until?: string | null
          paid_at?: string
          payer_email?: string | null
          payer_name?: string | null
          payment_id?: string
          plan_days?: number
          plan_id?: string | null
          plan_name?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_reset_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          cpf: string
          created_at: string
          expires_at: string
          id: string
          phone_masked: string
          request_ip: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          cpf: string
          created_at?: string
          expires_at: string
          id?: string
          phone_masked: string
          request_ip?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          cpf?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_masked?: string
          request_ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          cycle: string
          days: number
          description: string
          features: Json
          highlight: boolean
          id: string
          name: string
          original_price: number | null
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cycle: string
          days: number
          description?: string
          features?: Json
          highlight?: boolean
          id: string
          name: string
          original_price?: number | null
          price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cycle?: string
          days?: number
          description?: string
          features?: Json
          highlight?: boolean
          id?: string
          name?: string
          original_price?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      price_alert_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          direction: string
          display_name: string | null
          establishment_id: string | null
          id: string
          last_price: number | null
          last_triggered_at: string | null
          product_key: string
          target_price: number | null
          threshold_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          direction?: string
          display_name?: string | null
          establishment_id?: string | null
          id?: string
          last_price?: number | null
          last_triggered_at?: string | null
          product_key: string
          target_price?: number | null
          threshold_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          direction?: string
          display_name?: string | null
          establishment_id?: string | null
          id?: string
          last_price?: number | null
          last_triggered_at?: string | null
          product_key?: string
          target_price?: number | null
          threshold_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alert_subscriptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          catalog_id: string | null
          created_at: string
          diff_pct: number | null
          display_name: string | null
          id: string
          kind: string
          market_name: string | null
          new_price: number | null
          prev_price: number | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          diff_pct?: number | null
          display_name?: string | null
          id?: string
          kind: string
          market_name?: string | null
          new_price?: number | null
          prev_price?: number | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          diff_pct?: number | null
          display_name?: string | null
          id?: string
          kind?: string
          market_name?: string | null
          new_price?: number | null
          prev_price?: number | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          attachment: Json | null
          author: string
          created_at: string
          id: string
          note: string | null
          owner_id: string
          previous_price: number | null
          price: number
          product_id: string
          reason: string
        }
        Insert: {
          attachment?: Json | null
          author?: string
          created_at?: string
          id?: string
          note?: string | null
          owner_id?: string
          previous_price?: number | null
          price: number
          product_id: string
          reason?: string
        }
        Update: {
          attachment?: Json | null
          author?: string
          created_at?: string
          id?: string
          note?: string | null
          owner_id?: string
          previous_price?: number | null
          price?: number
          product_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_reports: {
        Row: {
          action_taken: string | null
          admin_notes: string | null
          barcode: string | null
          correct_price: number | null
          created_at: string
          establishment_id: string | null
          evidence_url: string | null
          id: string
          notes: string | null
          product_name: string
          product_slug: string | null
          reason: string
          reported_price: number | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          admin_notes?: string | null
          barcode?: string | null
          correct_price?: number | null
          created_at?: string
          establishment_id?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          product_name: string
          product_slug?: string | null
          reason: string
          reported_price?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          admin_notes?: string | null
          barcode?: string | null
          correct_price?: number | null
          created_at?: string
          establishment_id?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          product_name?: string
          product_slug?: string | null
          reason?: string
          reported_price?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_reports_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_blocklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          pattern: string
          pattern_norm: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          pattern: string
          pattern_norm?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          pattern?: string
          pattern_norm?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          created_at: string
          default_unit: string | null
          display_name: string
          id: string
          image_search_attempted_at: string | null
          image_search_found: boolean | null
          image_source: string | null
          image_url: string | null
          normalized_name: string
          product_key: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          default_unit?: string | null
          display_name: string
          id?: string
          image_search_attempted_at?: string | null
          image_search_found?: boolean | null
          image_source?: string | null
          image_url?: string | null
          normalized_name: string
          product_key?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          default_unit?: string | null
          display_name?: string
          id?: string
          image_search_attempted_at?: string | null
          image_search_found?: boolean | null
          image_source?: string | null
          image_url?: string | null
          normalized_name?: string
          product_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_catalog_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          catalog_id: string | null
          created_at: string
          error_code: string | null
          field: string | null
          id: string
          metadata: Json
          new_value: string | null
          old_value: string | null
          result: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          catalog_id?: string | null
          created_at?: string
          error_code?: string | null
          field?: string | null
          id?: string
          metadata?: Json
          new_value?: string | null
          old_value?: string | null
          result?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          catalog_id?: string | null
          created_at?: string
          error_code?: string | null
          field?: string | null
          id?: string
          metadata?: Json
          new_value?: string | null
          old_value?: string | null
          result?: string | null
        }
        Relationships: []
      }
      product_comparison_cache: {
        Row: {
          avg_price: number | null
          catalog_slug: string | null
          category: string | null
          cheapest_establishment_id: string | null
          cheapest_store: string | null
          display_name: string | null
          image_url: string | null
          last_seen_at: string | null
          max_price: number | null
          min_price: number | null
          product_key: string
          savings_pct: number | null
          size_key: number
          size_unit: string
          size_value: number | null
          store_count: number
          stores: Json
          total_scans: number
          updated_at: string
        }
        Insert: {
          avg_price?: number | null
          catalog_slug?: string | null
          category?: string | null
          cheapest_establishment_id?: string | null
          cheapest_store?: string | null
          display_name?: string | null
          image_url?: string | null
          last_seen_at?: string | null
          max_price?: number | null
          min_price?: number | null
          product_key: string
          savings_pct?: number | null
          size_key?: number
          size_unit?: string
          size_value?: number | null
          store_count?: number
          stores?: Json
          total_scans?: number
          updated_at?: string
        }
        Update: {
          avg_price?: number | null
          catalog_slug?: string | null
          category?: string | null
          cheapest_establishment_id?: string | null
          cheapest_store?: string | null
          display_name?: string | null
          image_url?: string | null
          last_seen_at?: string | null
          max_price?: number | null
          min_price?: number | null
          product_key?: string
          savings_pct?: number | null
          size_key?: number
          size_unit?: string
          size_value?: number | null
          store_count?: number
          stores?: Json
          total_scans?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_price_history: {
        Row: {
          brand: string | null
          captured_at: string
          change_pct: number | null
          created_at: string
          establishment_id: string
          id: string
          previous_price: number | null
          price: number
          product_key: string
          product_name: string
          scan_id: string | null
          size_unit: string | null
          size_value: number | null
          source: string
        }
        Insert: {
          brand?: string | null
          captured_at?: string
          change_pct?: number | null
          created_at?: string
          establishment_id: string
          id?: string
          previous_price?: number | null
          price: number
          product_key: string
          product_name: string
          scan_id?: string | null
          size_unit?: string | null
          size_value?: number | null
          source?: string
        }
        Update: {
          brand?: string | null
          captured_at?: string
          change_pct?: number | null
          created_at?: string
          establishment_id?: string
          id?: string
          previous_price?: number | null
          price?: number
          product_key?: string
          product_name?: string
          scan_id?: string | null
          size_unit?: string | null
          size_value?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_stats: {
        Row: {
          avg_price: number
          display_name: string | null
          last_seen_at: string | null
          max_price: number
          min_price: number
          p25_price: number | null
          p75_price: number | null
          product_key: string
          samples: number
          stores_count: number
          updated_at: string
        }
        Insert: {
          avg_price: number
          display_name?: string | null
          last_seen_at?: string | null
          max_price: number
          min_price: number
          p25_price?: number | null
          p75_price?: number | null
          product_key: string
          samples?: number
          stores_count?: number
          updated_at?: string
        }
        Update: {
          avg_price?: number
          display_name?: string | null
          last_seen_at?: string | null
          max_price?: number
          min_price?: number
          p25_price?: number | null
          p75_price?: number | null
          product_key?: string
          samples?: number
          stores_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          current_price: number
          ean: string
          id: string
          name: string
          owner_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          current_price: number
          ean: string
          id?: string
          name: string
          owner_id?: string
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_price?: number
          ean?: string
          id?: string
          name?: string
          owner_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          city: string | null
          cpf: string
          created_at: string
          full_name: string
          id: string
          last_seen_at: string | null
          neighborhood: string | null
          paid_until: string | null
          phone: string
          total_logins: number
          trial_ends_at: string
          trial_started_at: string
          ui_prefs: Json
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          city?: string | null
          cpf: string
          created_at?: string
          full_name: string
          id: string
          last_seen_at?: string | null
          neighborhood?: string | null
          paid_until?: string | null
          phone: string
          total_logins?: number
          trial_ends_at?: string
          trial_started_at?: string
          ui_prefs?: Json
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          city?: string | null
          cpf?: string
          created_at?: string
          full_name?: string
          id?: string
          last_seen_at?: string | null
          neighborhood?: string | null
          paid_until?: string | null
          phone?: string
          total_logins?: number
          trial_ends_at?: string
          trial_started_at?: string
          ui_prefs?: Json
          updated_at?: string
        }
        Relationships: []
      }
      promo_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          percent_off: number
          redemptions: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          percent_off: number
          redemptions?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          percent_off?: number
          redemptions?: number
          updated_at?: string
        }
        Relationships: []
      }
      receipt_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          extract: Json | null
          id: string
          image_data: string | null
          image_url: string | null
          progress: number
          receipt_id: string | null
          status: string
          step_label: string | null
          suggested_establishment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extract?: Json | null
          id?: string
          image_data?: string | null
          image_url?: string | null
          progress?: number
          receipt_id?: string | null
          status?: string
          step_label?: string | null
          suggested_establishment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extract?: Json | null
          id?: string
          image_data?: string | null
          image_url?: string | null
          progress?: number
          receipt_id?: string | null
          status?: string
          step_label?: string | null
          suggested_establishment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_jobs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_jobs_suggested_establishment_id_fkey"
            columns: ["suggested_establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          access_key: string | null
          amount_paid: number | null
          coupon_number: string | null
          created_at: string
          created_by: string | null
          establishment_id: string
          id: string
          image_url: string | null
          issued_at: string | null
          raw_ocr: Json | null
          total: number | null
          updated_at: string
        }
        Insert: {
          access_key?: string | null
          amount_paid?: number | null
          coupon_number?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id: string
          id?: string
          image_url?: string | null
          issued_at?: string | null
          raw_ocr?: Json | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          access_key?: string | null
          amount_paid?: number | null
          coupon_number?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          id?: string
          image_url?: string | null
          issued_at?: string | null
          raw_ocr?: Json | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          role: string
          target_email: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          role: string
          target_email?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          role?: string
          target_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      saved_baskets: {
        Row: {
          created_at: string
          filters: Json
          id: string
          mode: string
          name: string
          share_token: string | null
          snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          mode?: string
          name: string
          share_token?: string | null
          snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          mode?: string
          name?: string
          share_token?: string | null
          snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          average_price: number | null
          barcode: string | null
          created_at: string
          diff_pct: number | null
          establishment_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          market_name: string | null
          price_captured: number | null
          product_name: string | null
          quantity: number | null
          receipt_id: string | null
          status: string
          total_price: number | null
          unit: string | null
          user_id: string | null
          verdict: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          average_price?: number | null
          barcode?: string | null
          created_at?: string
          diff_pct?: number | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          market_name?: string | null
          price_captured?: number | null
          product_name?: string | null
          quantity?: number | null
          receipt_id?: string | null
          status?: string
          total_price?: number | null
          unit?: string | null
          user_id?: string | null
          verdict?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          average_price?: number | null
          barcode?: string | null
          created_at?: string
          diff_pct?: number | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          market_name?: string | null
          price_captured?: number | null
          product_name?: string | null
          quantity?: number | null
          receipt_id?: string | null
          status?: string
          total_price?: number | null
          unit?: string | null
          user_id?: string | null
          verdict?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      search_synonym_groups: {
        Row: {
          active: boolean
          canonical: string
          created_at: string
          exclude_tokens: string[]
          id: string
          synonyms: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          canonical: string
          created_at?: string
          exclude_tokens?: string[]
          id?: string
          synonyms?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          canonical?: string
          created_at?: string
          exclude_tokens?: string[]
          id?: string
          synonyms?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      shared_comparisons: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          image_url: string | null
          market_name: string | null
          products: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          market_name?: string | null
          products?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          market_name?: string | null
          products?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          catalog_id: string | null
          category: string | null
          checked: boolean
          created_at: string
          display_name: string | null
          id: string
          list_id: string
          notes: string | null
          purchased_at: string | null
          purchased_price: number | null
          quantity: number
          unit: string | null
        }
        Insert: {
          catalog_id?: string | null
          category?: string | null
          checked?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          list_id: string
          notes?: string | null
          purchased_at?: string | null
          purchased_price?: number | null
          quantity?: number
          unit?: string | null
        }
        Update: {
          catalog_id?: string | null
          category?: string | null
          checked?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          list_id?: string
          notes?: string | null
          purchased_at?: string | null
          purchased_price?: number | null
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_basket_alerts: {
        Row: {
          active: boolean
          basket_snapshot: Json
          created_at: string
          establishment_id: string
          establishment_name: string
          id: string
          last_evaluated_total: number | null
          last_triggered_at: string | null
          target_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          basket_snapshot?: Json
          created_at?: string
          establishment_id: string
          establishment_name: string
          id?: string
          last_evaluated_total?: number | null
          last_triggered_at?: string | null
          target_total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          basket_snapshot?: Json
          created_at?: string
          establishment_id?: string
          establishment_name?: string
          id?: string
          last_evaluated_total?: number | null
          last_triggered_at?: string | null
          target_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_basket_alerts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      store_quotes: {
        Row: {
          cart: Json
          comparison: Json | null
          created_at: string
          id: string
          is_public: boolean
          store_id: string
          store_name: string
          user_id: string
        }
        Insert: {
          cart: Json
          comparison?: Json | null
          created_at?: string
          id?: string
          is_public?: boolean
          store_id: string
          store_name: string
          user_id: string
        }
        Update: {
          cart?: Json
          comparison?: Json | null
          created_at?: string
          id?: string
          is_public?: boolean
          store_id?: string
          store_name?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          activation_code: string | null
          created_at: string
          email: string
          email_sent: boolean
          expires_at: string | null
          external_ref: string | null
          id: string
          name: string
          payment_id: string | null
          plan_id: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          activation_code?: string | null
          created_at?: string
          email: string
          email_sent?: boolean
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          name: string
          payment_id?: string | null
          plan_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activation_code?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean
          expires_at?: string | null
          external_ref?: string | null
          id?: string
          name?: string
          payment_id?: string | null
          plan_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          event_type: string | null
          external_id: string | null
          headers: Json | null
          id: string
          last_processed_at: string | null
          payload: Json
          provider: string
          signature_valid: boolean
          status: string
          subscriber_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          headers?: Json | null
          id?: string
          last_processed_at?: string | null
          payload: Json
          provider?: string
          signature_valid?: boolean
          status?: string
          subscriber_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          headers?: Json | null
          id?: string
          last_processed_at?: string | null
          payload?: Json
          provider?: string
          signature_valid?: boolean
          status?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      collaborator_public_stats: {
        Row: {
          cities_count: number | null
          collaborators_count: number | null
          submissions_count: number | null
        }
        Relationships: []
      }
      finance_monthly_summary_v: {
        Row: {
          category_color: string | null
          category_id: string | null
          category_kind: string | null
          category_name: string | null
          category_slug: string | null
          entries: number | null
          month: string | null
          total: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_log_action: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _notes?: string
          _target_id?: string
          _target_type: string
        }
        Returns: string
      }
      admin_review_collab_submission: {
        Args: {
          _admin_notes?: string
          _id: string
          _rejection_reason?: string
          _reward_days?: number
          _status: string
        }
        Returns: {
          admin_notes: string | null
          attachment_paths: string[]
          city: string | null
          created_at: string
          email: string
          external_ref: string | null
          full_name: string | null
          id: string
          market_name: string | null
          notified_at: string | null
          purchase_date: string | null
          receipts_count: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_days: number | null
          reward_granted: boolean
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "collaborator_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_paid_license: {
        Args: { _license_id: string; _mp_payment_id: string }
        Returns: {
          new_paid_until: string
          success: boolean
        }[]
      }
      approve_checkout_order: {
        Args: { _order_id: string; _provider_ref?: string }
        Returns: {
          license_code: string
          order_id: string
        }[]
      }
      attach_collab_submissions_to_user: {
        Args: { _email: string; _user_id: string }
        Returns: number
      }
      catalog_image_job_provider_stats: {
        Args: never
        Returns: {
          avg_duration_ms: number
          done: number
          failed: number
          provider: string
          total: number
          total_attempts: number
        }[]
      }
      catalog_image_job_stats: {
        Args: never
        Returns: {
          cancelled: number
          done: number
          failed: number
          pending: number
          processing: number
          total: number
        }[]
      }
      classify_product_category: { Args: { name: string }; Returns: string }
      consume_ai_quota: {
        Args: { _amount?: number; _user_id: string }
        Returns: {
          allowed: boolean
          quota_limit: number
          reset_at: string
          used: number
        }[]
      }
      enqueue_catalog_image_jobs: {
        Args: never
        Returns: {
          enqueued: number
        }[]
      }
      enqueue_catalog_image_refresh: {
        Args: { _force?: boolean; _older_than_days?: number }
        Returns: {
          enqueued: number
        }[]
      }
      enqueue_catalog_image_refresh_internal: {
        Args: { _force?: boolean; _older_than_days?: number }
        Returns: {
          enqueued: number
        }[]
      }
      ensure_finance_food_categories: { Args: never; Returns: undefined }
      ensure_finance_utility_categories: {
        Args: never
        Returns: {
          alert_threshold: number | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          kind: string
          monthly_budget: number | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "finance_categories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      establishment_metrics: {
        Args: never
        Returns: {
          active: boolean
          cache_rows: number
          establishment_id: string
          last_scan_at: string
          name: string
          scans_total: number
          size_variants: number
          stale: boolean
          unique_products: number
        }[]
      }
      extract_product_size: {
        Args: { name: string }
        Returns: {
          size_unit: string
          size_value: number
        }[]
      }
      finance_seed_default_categories: {
        Args: never
        Returns: {
          alert_threshold: number | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          kind: string
          monthly_budget: number | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "finance_categories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_similar_scans: {
        Args: {
          p_establishment_id: string
          p_name: string
          p_threshold?: number
        }
        Returns: {
          id: string
          price_captured: number
          product_name: string
          similarity: number
        }[]
      }
      generate_license_code_string: { Args: never; Returns: string }
      get_coverage_overview: {
        Args: never
        Returns: {
          cobertura_pct: number
          establishment_id: string
          faltando: number
          name: string
          produtos: number
        }[]
      }
      get_missing_products_for_establishment: {
        Args: {
          _category?: string
          _establishment_id: string
          _limit?: number
          _search?: string
        }
        Returns: {
          avg_price: number
          category: string
          display_name: string
          max_price: number
          min_price: number
          product_key: string
          stores_count: number
        }[]
      }
      get_or_create_ai_quota: {
        Args: { _default_limit?: number; _user_id: string }
        Returns: {
          created_at: string
          id: string
          month_key: string
          quota_limit: number
          reset_at: string
          updated_at: string
          used: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_quota"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_present_products_for_establishment: {
        Args: {
          _category?: string
          _establishment_id: string
          _limit?: number
          _search?: string
        }
        Returns: {
          avg_price: number
          category: string
          display_name: string
          last_seen_at: string
          local_price: number
          max_price: number
          min_price: number
          product_key: string
          stores_count: number
        }[]
      }
      get_price_comparisons: {
        Args: { p_category?: string }
        Returns: {
          avg_price: number
          catalog_slug: string
          category: string
          cheapest_establishment_id: string
          cheapest_store: string
          display_name: string
          image_url: string
          last_seen_at: string
          max_price: number
          min_price: number
          product_key: string
          savings_pct: number
          size_unit: string
          size_value: number
          store_count: number
          stores: Json
          total_scans: number
        }[]
      }
      get_region_options: {
        Args: never
        Returns: {
          city: string
          neighborhood: string
          scan_count: number
        }[]
      }
      get_unlock_rate_by_route: {
        Args: { days?: number }
        Returns: {
          conversions: number
          route: string
          unlock_clicks: number
          views: number
        }[]
      }
      get_visitor_daily_metrics: {
        Args: { days?: number }
        Returns: {
          day: string
          total_events: number
          users: number
          visitors: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      infer_size_from_name: { Args: { p_name: string }; Returns: string }
      is_product_blocked: { Args: { p_name: string }; Returns: boolean }
      normalize_product_key: { Args: { name: string }; Returns: string }
      normalize_product_name: { Args: { p_name: string }; Returns: string }
      plan_conversion_metrics: {
        Args: never
        Returns: {
          conversion_pct: number
          discount_cents: number
          gross_cents: number
          net_cents: number
          orders_approved: number
          orders_pending: number
          orders_total: number
          plan_id: string
          plan_name: string
          plan_slug: string
          price_cents: number
        }[]
      }
      platform_public_stats: {
        Args: never
        Returns: {
          active_comparisons: number
          establishments: number
          price_drops_7d: number
        }[]
      }
      rebuild_comparison_cache_all: {
        Args: never
        Returns: {
          rebuilt: number
        }[]
      }
      redeem_license_code: {
        Args: { _code: string; _user_id: string }
        Returns: {
          added_days: number
          message: string
          new_paid_until: string
          success: boolean
        }[]
      }
      refresh_comparison_cache_key: {
        Args: { _key: string }
        Returns: undefined
      }
      refresh_product_price_stats_all: {
        Args: never
        Returns: {
          refreshed: number
        }[]
      }
      refresh_product_price_stats_key: {
        Args: { _key: string }
        Returns: undefined
      }
      search_catalog_suggestions: {
        Args: { _limit?: number; _q: string }
        Returns: {
          brand: string
          category: string
          display_name: string
          id: string
          image_url: string
          is_fuzzy: boolean
          similarity: number
        }[]
      }
      search_scans_unaccented: {
        Args: { _limit?: number; _q: string }
        Returns: {
          created_at: string
          market_name: string
          price_captured: number
          product_name: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      validate_promo_coupon: {
        Args: { _code: string }
        Returns: {
          code: string
          id: string
          percent_off: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
