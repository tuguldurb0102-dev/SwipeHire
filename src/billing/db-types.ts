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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string
          id: string
          processed_at: string | null
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string
          cover_letter: string | null
          created_at: string
          cv_path: string | null
          decided_at: string | null
          id: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          cover_letter?: string | null
          created_at?: string
          cv_path?: string | null
          decided_at?: string | null
          id?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          cover_letter?: string | null
          created_at?: string
          cv_path?: string | null
          decided_at?: string | null
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json | null
          subject: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          subject?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_prices: {
        Row: {
          active: boolean
          amount: number
          billing_interval: string | null
          billing_interval_count: number
          created_at: string
          currency: string
          ends_at: string | null
          id: string
          product_id: string
          provider_price_ref: string | null
          starts_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          billing_interval?: string | null
          billing_interval_count?: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          product_id: string
          provider_price_ref?: string | null
          starts_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          billing_interval?: string | null
          billing_interval_count?: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          product_id?: string
          provider_price_ref?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_products: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description_en: string | null
          description_mn: string | null
          id: string
          kind: string
          metadata: Json
          name_en: string
          name_mn: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description_en?: string | null
          description_mn?: string | null
          id?: string
          kind: string
          metadata?: Json
          name_en: string
          name_mn: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description_en?: string | null
          description_mn?: string | null
          id?: string
          kind?: string
          metadata?: Json
          name_en?: string
          name_mn?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          about: string | null
          age: number | null
          available_from: string | null
          avatar_path: string | null
          category: string | null
          created_at: string
          custom_skills: string[]
          cv_path: string | null
          education: Json
          email: string | null
          experience: Json
          full_name: string | null
          gender: string | null
          id: string
          location: string | null
          phone: string | null
          published: boolean
          salary_expectation: number | null
          skills: string[]
          updated_at: string
          video_path: string | null
        }
        Insert: {
          about?: string | null
          age?: number | null
          available_from?: string | null
          avatar_path?: string | null
          category?: string | null
          created_at?: string
          custom_skills?: string[]
          cv_path?: string | null
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          gender?: string | null
          id: string
          location?: string | null
          phone?: string | null
          published?: boolean
          salary_expectation?: number | null
          skills?: string[]
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          about?: string | null
          age?: number | null
          available_from?: string | null
          avatar_path?: string | null
          category?: string | null
          created_at?: string
          custom_skills?: string[]
          cv_path?: string | null
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          gender?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          published?: boolean
          salary_expectation?: number | null
          skills?: string[]
          updated_at?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          headcount: number | null
          id: string
          industry: string | null
          logo_path: string | null
          name: string
          owner_id: string
          reg_number: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          created_at?: string
          headcount?: number | null
          id?: string
          industry?: string | null
          logo_path?: string | null
          name: string
          owner_id: string
          reg_number?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          created_at?: string
          headcount?: number | null
          id?: string
          industry?: string | null
          logo_path?: string | null
          name?: string
          owner_id?: string
          reg_number?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_profiles: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string
          email: string | null
          headcount: number | null
          hr_name: string | null
          id: string
          industry: string | null
          phone: string | null
          reg_number: string | null
          salary_max: number | null
          salary_min: number | null
          selected_professions: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          headcount?: number | null
          hr_name?: string | null
          id: string
          industry?: string | null
          phone?: string | null
          reg_number?: string | null
          salary_max?: number | null
          salary_min?: number | null
          selected_professions?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          headcount?: number | null
          hr_name?: string | null
          id?: string
          industry?: string | null
          phone?: string | null
          reg_number?: string | null
          salary_max?: number | null
          salary_min?: number | null
          selected_professions?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          price_id: string | null
          product_id: string
          provider: string | null
          provider_customer_ref: string | null
          provider_subscription_ref: string | null
          source_payment_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          price_id?: string | null
          product_id: string
          provider?: string | null
          provider_customer_ref?: string | null
          provider_subscription_ref?: string | null
          source_payment_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          price_id?: string | null
          product_id?: string
          provider?: string | null
          provider_customer_ref?: string | null
          provider_subscription_ref?: string | null
          source_payment_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emp_subs_source_order_fk"
            columns: ["source_payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          company_id: string | null
          consumed_quantity: number
          created_at: string
          entitlement_type: string
          expires_at: string | null
          id: string
          metadata: Json
          product_id: string
          quantity: number
          revoked_at: string | null
          source_id: string
          source_type: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          consumed_quantity?: number
          created_at?: string
          entitlement_type: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          product_id: string
          quantity?: number
          revoked_at?: string | null
          source_id: string
          source_type: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          consumed_quantity?: number
          created_at?: string
          entitlement_type?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          product_id?: string
          quantity?: number
          revoked_at?: string | null
          source_id?: string
          source_type?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          issued_at: string | null
          metadata: Json
          paid_at: string | null
          payment_order_id: string | null
          status: string
          subtotal: number | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_order_id?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_order_id?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seeker_purchases: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          payment_order_id: string
          price_id: string
          product_id: string
          purchased_at: string
          revoked_at: string | null
          status: string
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_order_id: string
          price_id: string
          product_id: string
          purchased_at?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_order_id?: string
          price_id?: string
          product_id?: string
          purchased_at?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_seeker_purchases_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: true
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_seeker_purchases_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_seeker_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_seeker_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          employer_id: string
          headcount: number
          id: string
          location: string | null
          salary_max: number | null
          salary_min: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          employer_id: string
          headcount?: number
          id?: string
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          employer_id?: string
          headcount?: number
          id?: string
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json | null
          payload_hash: string | null
          processed_at: string | null
          processing_status: string
          provider: string
          provider_event_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          payload_hash?: string | null
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_event_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          payload_hash?: string | null
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          cancelled_at: string | null
          company_id: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          idempotency_key: string
          kind: string
          metadata: Json
          paid_at: string | null
          price_id: string
          product_id: string
          provider: string
          provider_order_ref: string | null
          status: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          idempotency_key: string
          kind: string
          metadata?: Json
          paid_at?: string | null
          price_id: string
          product_id: string
          provider?: string
          provider_order_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          kind?: string
          metadata?: Json
          paid_at?: string | null
          price_id?: string
          product_id?: string
          provider?: string
          provider_order_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          payment_order_id: string
          provider: string
          provider_payload: Json | null
          provider_transaction_ref: string | null
          raw_event_id: string | null
          status: string
          verified: boolean
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          payment_order_id: string
          provider: string
          provider_payload?: Json | null
          provider_transaction_ref?: string | null
          raw_event_id?: string | null
          status: string
          verified?: boolean
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          payment_order_id?: string
          provider?: string
          provider_payload?: Json | null
          provider_transaction_ref?: string | null
          raw_event_id?: string | null
          status?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          lang: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          lang?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          lang?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json
          payment_order_id: string
          payment_transaction_id: string | null
          processed_at: string | null
          provider_ref: string | null
          reason: string | null
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json
          payment_order_id: string
          payment_transaction_id?: string | null
          processed_at?: string | null
          provider_ref?: string | null
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          payment_order_id?: string
          payment_transaction_id?: string | null
          processed_at?: string | null
          provider_ref?: string | null
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          subject_id: string
          subject_type: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          subject_id: string
          subject_type: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          subject_id?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_candidates_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          company_id: string
          created_at: string
          id: string
          metric_code: string
          period_end: string
          period_start: string
          quantity: number
          subscription_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          metric_code: string
          period_end: string
          period_start: string
          quantity?: number
          subscription_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          metric_code?: string
          period_end?: string
          period_start?: string
          quantity?: number
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "employer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          kind: string
          lang: string
          policy_version: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: string
          kind: string
          lang: string
          policy_version: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          kind?: string
          lang?: string
          policy_version?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          document_path: string | null
          id: string
          kind: string
          reviewer_note: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          document_path?: string | null
          id?: string
          kind: string
          reviewer_note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          document_path?: string | null
          id?: string
          kind?: string
          reviewer_note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      candidate_public_view: {
        Row: {
          about: string | null
          available_from: string | null
          avatar_path: string | null
          category: string | null
          created_at: string | null
          custom_skills: string[] | null
          education: Json | null
          experience: Json | null
          full_name: string | null
          id: string | null
          location: string | null
          salary_expectation: number | null
          skills: string[] | null
        }
        Insert: {
          about?: string | null
          available_from?: string | null
          avatar_path?: string | null
          category?: string | null
          created_at?: string | null
          custom_skills?: string[] | null
          education?: Json | null
          experience?: Json | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          salary_expectation?: number | null
          skills?: string[] | null
        }
        Update: {
          about?: string | null
          available_from?: string | null
          avatar_path?: string | null
          category?: string | null
          created_at?: string | null
          custom_skills?: string[] | null
          education?: Json | null
          experience?: Json | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          salary_expectation?: number | null
          skills?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      consume_service_entitlement: {
        Args: { p_entitlement_id: string }
        Returns: {
          consumed_quantity: number
          entitlement_id: string
          quantity: number
          status: string
        }[]
      }
      create_payment_order_request: {
        Args: {
          p_company_id?: string
          p_idempotency_key: string
          p_product_code: string
          p_provider?: string
        }
        Returns: {
          amount: number
          currency: string
          kind: string
          order_id: string
          provider: string
          status: string
        }[]
      }
      current_role: { Args: never; Returns: string }
      grant_verified_entitlement: {
        Args: { p_order_id: string }
        Returns: string
      }
      increment_subscription_usage: {
        Args: {
          p_metric_code: string
          p_qty: number
          p_subscription_id: string
        }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_conversation_member: { Args: { p_conv: string }; Returns: boolean }
      owns_company: { Args: { p_company: string }; Returns: boolean }
      start_conversation: {
        Args: { p_job_id?: string; p_other_user: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
