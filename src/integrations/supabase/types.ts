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
      admin_cron_logs: {
        Row: {
          executed_at: string
          id: number
          job_name: string
          max_retries: number
          parent_log_id: number | null
          result: Json | null
          retry_count: number
          status: string
        }
        Insert: {
          executed_at?: string
          id?: number
          job_name: string
          max_retries?: number
          parent_log_id?: number | null
          result?: Json | null
          retry_count?: number
          status?: string
        }
        Update: {
          executed_at?: string
          id?: number
          job_name?: string
          max_retries?: number
          parent_log_id?: number | null
          result?: Json | null
          retry_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_cron_logs_parent_log_id_fkey"
            columns: ["parent_log_id"]
            isOneToOne: false
            referencedRelation: "admin_cron_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_briefs: {
        Row: {
          ad_format: string | null
          advertiser_id: string
          audience_target: string | null
          budget_max: number | null
          created_at: string
          creative_files: string[]
          days_count: number | null
          description: string
          end_date: string
          id: string
          poseur_fee: number | null
          start_date: string
          status: Database["public"]["Enums"]["brief_status"]
          title: string
          updated_at: string
          vehicle_count: number | null
          vehicle_id: string | null
          vehicle_types: Database["public"]["Enums"]["vehicle_type"][]
          zone_area_km2: number | null
          zone_polygon: unknown
          zones: string[]
        }
        Insert: {
          ad_format?: string | null
          advertiser_id: string
          audience_target?: string | null
          budget_max?: number | null
          created_at?: string
          creative_files?: string[]
          days_count?: number | null
          description: string
          end_date: string
          id?: string
          poseur_fee?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["brief_status"]
          title: string
          updated_at?: string
          vehicle_count?: number | null
          vehicle_id?: string | null
          vehicle_types?: Database["public"]["Enums"]["vehicle_type"][]
          zone_area_km2?: number | null
          zone_polygon?: unknown
          zones?: string[]
        }
        Update: {
          ad_format?: string | null
          advertiser_id?: string
          audience_target?: string | null
          budget_max?: number | null
          created_at?: string
          creative_files?: string[]
          days_count?: number | null
          description?: string
          end_date?: string
          id?: string
          poseur_fee?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["brief_status"]
          title?: string
          updated_at?: string
          vehicle_count?: number | null
          vehicle_id?: string | null
          vehicle_types?: Database["public"]["Enums"]["vehicle_type"][]
          zone_area_km2?: number | null
          zone_polygon?: unknown
          zones?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_briefs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_profiles: {
        Row: {
          account_type: string
          activation_j1_sent_at: string | null
          activation_j7_sent_at: string | null
          address: string | null
          cgu_accepted_at: string | null
          cgu_version: string | null
          city: string | null
          commercial_id: string | null
          company: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          referral_code: string | null
          referred_by_advertiser_id: string | null
          siret: string | null
          siret_denomination: string | null
          siret_verified_at: string | null
          target_region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          activation_j1_sent_at?: string | null
          activation_j7_sent_at?: string | null
          address?: string | null
          cgu_accepted_at?: string | null
          cgu_version?: string | null
          city?: string | null
          commercial_id?: string | null
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          referral_code?: string | null
          referred_by_advertiser_id?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          target_region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          activation_j1_sent_at?: string | null
          activation_j7_sent_at?: string | null
          address?: string | null
          cgu_accepted_at?: string | null
          cgu_version?: string | null
          city?: string | null
          commercial_id?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          referral_code?: string | null
          referred_by_advertiser_id?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          target_region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_profiles_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertiser_profiles_referred_by_advertiser_id_fkey"
            columns: ["referred_by_advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_referral_rewards: {
        Row: {
          created_at: string
          credited_at: string | null
          id: string
          referee_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          credited_at?: string | null
          id?: string
          referee_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          credited_at?: string | null
          id?: string
          referee_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_referral_rewards_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertiser_referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_wallets: {
        Row: {
          advertiser_id: string
          balance: number
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          balance?: number
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_brief_data: {
        Row: {
          answers: Json
          created_at: string
          generated_text_brief: string | null
          id: string
          mockup_prompt: string | null
          mockup_url: string | null
          regeneration_count: number
          service_type: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          generated_text_brief?: string | null
          id?: string
          mockup_prompt?: string | null
          mockup_url?: string | null
          regeneration_count?: number
          service_type: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          generated_text_brief?: string | null
          id?: string
          mockup_prompt?: string | null
          mockup_url?: string | null
          regeneration_count?: number
          service_type?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      ai_brief_summaries: {
        Row: {
          action_required: boolean
          advertiser_id: string
          brief_id: string
          expires_at: string
          generated_at: string
          id: string
          model: string
          proposal_count: number
          summary_text: string
        }
        Insert: {
          action_required?: boolean
          advertiser_id: string
          brief_id: string
          expires_at?: string
          generated_at?: string
          id?: string
          model?: string
          proposal_count?: number
          summary_text: string
        }
        Update: {
          action_required?: boolean
          advertiser_id?: string
          brief_id?: string
          expires_at?: string
          generated_at?: string
          id?: string
          model?: string
          proposal_count?: number
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_brief_summaries_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: true
            referencedRelation: "advertiser_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_summaries: {
        Row: {
          action_required: boolean
          conversation_id: string
          expires_at: string
          generated_at: string
          id: string
          message_count: number
          model: string
          negotiation_status: string
          summary: string
          user_id: string
        }
        Insert: {
          action_required?: boolean
          conversation_id: string
          expires_at: string
          generated_at?: string
          id?: string
          message_count?: number
          model?: string
          negotiation_status?: string
          summary: string
          user_id: string
        }
        Update: {
          action_required?: boolean
          conversation_id?: string
          expires_at?: string
          generated_at?: string
          id?: string
          message_count?: number
          model?: string
          negotiation_status?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_translations: {
        Row: {
          cache_key: string
          created_at: string
          detected_lang: string
          message_id: string | null
          model: string
          target_lang: string
          translation: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          detected_lang?: string
          message_id?: string | null
          model?: string
          target_lang: string
          translation: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          detected_lang?: string
          message_id?: string | null
          model?: string
          target_lang?: string
          translation?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          properties: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_transfer_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          campaign_request_id: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          receipt_path: string | null
          reference: string
          reviewed_at: string | null
          status: string
          stripe_account_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          receipt_path?: string | null
          reference: string
          reviewed_at?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          receipt_path?: string | null
          reference?: string
          reviewed_at?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfer_requests_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_requests_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      brief_proposals: {
        Row: {
          brief_id: string
          created_at: string
          id: string
          message: string | null
          owner_id: string
          price_per_day: number
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          brief_id: string
          created_at?: string
          id?: string
          message?: string | null
          owner_id: string
          price_per_day: number
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          brief_id?: string
          created_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          price_per_day?: number
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_proposals_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "advertiser_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_proposals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_proposals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_allocations: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          vehicle_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          vehicle_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_allocations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_allocations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          active_minutes: number
          campaign_request_id: string
          created_at: string
          day: string
          distance_traveled_in_zone_m: number
          distance_traveled_m: number
          id: string
          points_in_zone: number
          points_total: number
          updated_at: string
        }
        Insert: {
          active_minutes?: number
          campaign_request_id: string
          created_at?: string
          day?: string
          distance_traveled_in_zone_m?: number
          distance_traveled_m?: number
          id?: string
          points_in_zone?: number
          points_total?: number
          updated_at?: string
        }
        Update: {
          active_minutes?: number
          campaign_request_id?: string
          created_at?: string
          day?: string
          distance_traveled_in_zone_m?: number
          distance_traveled_m?: number
          id?: string
          points_in_zone?: number
          points_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_metrics_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaign_monthly_stats: {
        Row: {
          active_vehicles_count: number
          advertiser_id: string
          campaign_id: string
          created_at: string
          estimated_impressions: number
          heatmap_summary_url: string | null
          id: string
          pdf_storage_url: string | null
          report_period: string
          total_kilometers: number
        }
        Insert: {
          active_vehicles_count?: number
          advertiser_id: string
          campaign_id: string
          created_at?: string
          estimated_impressions?: number
          heatmap_summary_url?: string | null
          id?: string
          pdf_storage_url?: string | null
          report_period: string
          total_kilometers?: number
        }
        Update: {
          active_vehicles_count?: number
          advertiser_id?: string
          campaign_id?: string
          created_at?: string
          estimated_impressions?: number
          heatmap_summary_url?: string | null
          id?: string
          pdf_storage_url?: string | null
          report_period?: string
          total_kilometers?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_monthly_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_monthly_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      beta_whitelist: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          note: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          note?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      campaign_requests: {
        Row: {
          admin_notes: string | null
          commercial_id: string | null
          commission_amount_cents: number | null
          commission_paid_at: string | null
          company: string
          country_code: string
          created_at: string
          creative_files: string[]
          daily_end_time: string | null
          daily_start_time: string | null
          days_count: number | null
          depose_fee_cents: number | null
          depose_installer_user_id: string | null
          depose_notes: string | null
          depose_payout_status: string | null
          depose_photos: Json | null
          depose_reviewed_at: string | null
          depose_status: string | null
          depose_stripe_transfer_id: string | null
          email: string
          end_date: string | null
          estimated_impressions_per_day: number | null
          id: string
          installation_address: string | null
          installation_impossible_at: string | null
          installation_impossible_photos: string[]
          installation_impossible_reason: string | null
          installation_notes: string | null
          installation_photos: Json | null
          installation_reviewed_at: string | null
          installation_status: string
          message: string
          owner_amount_cents: number | null
          owner_response: string
          owner_transferred_at: string | null
          paid_amount_cents: number | null
          paid_at: string | null
          payment_status: string
          payout_status: string
          payout_transferred_at: string | null
          platform_fee_cents: number | null
          pm_status: string
          pose_fee_cents: number | null
          pose_installer_user_id: string | null
          pose_location_type: string | null
          pose_payout_status: string | null
          pose_stripe_transfer_id: string | null
          route_pois: string[] | null
          route_waypoints: string[] | null
          route_zones: string[] | null
          spot_id: string
          spot_location: string | null
          spot_name: string
          spot_price: number | null
          start_date: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          stripe_transfer_id: string | null
          subscription_current_period_end: string | null
          subscription_customer_id: string | null
          subscription_status: string | null
          target_region: string | null
          timezone: string
          total_price: number | null
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
          zone_area_km2: number | null
          zone_polygon: unknown
        }
        Insert: {
          admin_notes?: string | null
          commercial_id?: string | null
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          company: string
          country_code?: string
          created_at?: string
          creative_files?: string[]
          daily_end_time?: string | null
          daily_start_time?: string | null
          days_count?: number | null
          depose_fee_cents?: number | null
          depose_installer_user_id?: string | null
          depose_notes?: string | null
          depose_payout_status?: string | null
          depose_photos?: Json | null
          depose_reviewed_at?: string | null
          depose_status?: string | null
          depose_stripe_transfer_id?: string | null
          email: string
          end_date?: string | null
          estimated_impressions_per_day?: number | null
          id?: string
          installation_address?: string | null
          installation_impossible_at?: string | null
          installation_impossible_photos?: string[]
          installation_impossible_reason?: string | null
          installation_notes?: string | null
          installation_photos?: Json | null
          installation_reviewed_at?: string | null
          installation_status?: string
          message: string
          owner_amount_cents?: number | null
          owner_response?: string
          owner_transferred_at?: string | null
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_status?: string
          payout_status?: string
          payout_transferred_at?: string | null
          platform_fee_cents?: number | null
          pm_status?: string
          pose_fee_cents?: number | null
          pose_installer_user_id?: string | null
          pose_location_type?: string | null
          pose_payout_status?: string | null
          pose_stripe_transfer_id?: string | null
          route_pois?: string[] | null
          route_waypoints?: string[] | null
          route_zones?: string[] | null
          spot_id: string
          spot_location?: string | null
          spot_name: string
          spot_price?: number | null
          start_date?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          stripe_transfer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_customer_id?: string | null
          subscription_status?: string | null
          target_region?: string | null
          timezone?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
          zone_area_km2?: number | null
          zone_polygon?: unknown
        }
        Update: {
          admin_notes?: string | null
          commercial_id?: string | null
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          company?: string
          country_code?: string
          created_at?: string
          creative_files?: string[]
          daily_end_time?: string | null
          daily_start_time?: string | null
          days_count?: number | null
          depose_fee_cents?: number | null
          depose_installer_user_id?: string | null
          depose_notes?: string | null
          depose_payout_status?: string | null
          depose_photos?: Json | null
          depose_reviewed_at?: string | null
          depose_status?: string | null
          depose_stripe_transfer_id?: string | null
          email?: string
          end_date?: string | null
          estimated_impressions_per_day?: number | null
          id?: string
          installation_address?: string | null
          installation_impossible_at?: string | null
          installation_impossible_photos?: string[]
          installation_impossible_reason?: string | null
          installation_notes?: string | null
          installation_photos?: Json | null
          installation_reviewed_at?: string | null
          installation_status?: string
          message?: string
          owner_amount_cents?: number | null
          owner_response?: string
          owner_transferred_at?: string | null
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_status?: string
          payout_status?: string
          payout_transferred_at?: string | null
          platform_fee_cents?: number | null
          pm_status?: string
          pose_fee_cents?: number | null
          pose_installer_user_id?: string | null
          pose_location_type?: string | null
          pose_payout_status?: string | null
          pose_stripe_transfer_id?: string | null
          route_pois?: string[] | null
          route_waypoints?: string[] | null
          route_zones?: string[] | null
          spot_id?: string
          spot_location?: string | null
          spot_name?: string
          spot_price?: number | null
          start_date?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          stripe_transfer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_customer_id?: string | null
          subscription_status?: string | null
          target_region?: string | null
          timezone?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
          zone_area_km2?: number | null
          zone_polygon?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "campaign_requests_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "commercial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          advertiser_id: string | null
          end_date: string
          id: string
          region_id: string | null
          start_date: string
          status: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          advertiser_id?: string | null
          end_date: string
          id?: string
          region_id?: string | null
          start_date: string
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          advertiser_id?: string | null
          end_date?: string
          id?: string
          region_id?: string | null
          start_date?: string
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      commercial_profiles: {
        Row: {
          active: boolean
          cgu_accepted_at: string | null
          city: string | null
          commission_rate: number
          company: string | null
          created_at: string
          full_name: string
          id: string
          legal_address: string | null
          legal_status: string | null
          phone: string | null
          referral_code: string
          siret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          cgu_accepted_at?: string | null
          city?: string | null
          commission_rate?: number
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          legal_address?: string | null
          legal_status?: string | null
          phone?: string | null
          referral_code: string
          siret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          cgu_accepted_at?: string | null
          city?: string | null
          commission_rate?: number
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          legal_address?: string | null
          legal_status?: string | null
          phone?: string | null
          referral_code?: string
          siret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_leads: {
        Row: {
          budget_range: string | null
          company_name: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          plan: string
          siret: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          company_name?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          plan?: string
          siret?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          company_name?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          plan?: string
          siret?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      control_photo_requests: {
        Row: {
          admin_notes: string | null
          admin_validated: boolean | null
          campaign_request_id: string | null
          cq_checked_at: string | null
          cq_fraud_score: number
          cq_status: string
          created_at: string
          deadline_at: string
          driver_id: string | null
          fraud_flags: Json
          id: string
          photo_accuracy: number | null
          photo_lat: number | null
          photo_lng: number | null
          photo_path: string | null
          photo_type: string | null
          scheduled_at: string
          status: string
          submitted_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_validated?: boolean | null
          campaign_request_id?: string | null
          cq_checked_at?: string | null
          cq_fraud_score?: number
          cq_status?: string
          created_at?: string
          deadline_at: string
          driver_id?: string | null
          fraud_flags?: Json
          id?: string
          photo_accuracy?: number | null
          photo_lat?: number | null
          photo_lng?: number | null
          photo_path?: string | null
          photo_type?: string | null
          scheduled_at?: string
          status?: string
          submitted_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_validated?: boolean | null
          campaign_request_id?: string | null
          cq_checked_at?: string | null
          cq_fraud_score?: number
          cq_status?: string
          created_at?: string
          deadline_at?: string
          driver_id?: string | null
          fraud_flags?: Json
          id?: string
          photo_accuracy?: number | null
          photo_lat?: number | null
          photo_lng?: number | null
          photo_path?: string | null
          photo_type?: string | null
          scheduled_at?: string
          status?: string
          submitted_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_photo_requests_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_photo_requests_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "control_photo_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "cq_dashboard"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "control_photo_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_photo_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cq_jobs: {
        Row: {
          campaign_request_id: string | null
          created_at: string
          driver_id: string | null
          error_message: string | null
          id: string
          job_type: string
          payload: Json
          photo_request_id: string | null
          processed_at: string | null
          status: string
          vehicle_id: string | null
        }
        Insert: {
          campaign_request_id?: string | null
          created_at?: string
          driver_id?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          payload?: Json
          photo_request_id?: string | null
          processed_at?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          campaign_request_id?: string | null
          created_at?: string
          driver_id?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          payload?: Json
          photo_request_id?: string | null
          processed_at?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cq_jobs_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cq_jobs_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "cq_jobs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "cq_dashboard"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "cq_jobs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cq_jobs_photo_request_id_fkey"
            columns: ["photo_request_id"]
            isOneToOne: false
            referencedRelation: "control_photo_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cq_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_assets: {
        Row: {
          ad_format: string | null
          advertiser_id: string
          brief_id: string | null
          cost_cents: number
          created_at: string
          id: string
          prompt: string | null
          provider: string
          storage_path: string | null
          type: string
          url: string
          vehicle_types: string[]
        }
        Insert: {
          ad_format?: string | null
          advertiser_id: string
          brief_id?: string | null
          cost_cents?: number
          created_at?: string
          id?: string
          prompt?: string | null
          provider: string
          storage_path?: string | null
          type: string
          url: string
          vehicle_types?: string[]
        }
        Update: {
          ad_format?: string | null
          advertiser_id?: string
          brief_id?: string | null
          cost_cents?: number
          created_at?: string
          id?: string
          prompt?: string | null
          provider?: string
          storage_path?: string | null
          type?: string
          url?: string
          vehicle_types?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "creative_assets_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "advertiser_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      device_integrity_checks: {
        Row: {
          attestation_raw: Json | null
          checked_at: string
          device_id: string
          id: string
          is_emulator: boolean
          is_mock_enabled: boolean
          is_rooted: boolean
          platform: string | null
          play_integrity_verdict: string | null
          user_id: string
          wallet_frozen: boolean
        }
        Insert: {
          attestation_raw?: Json | null
          checked_at?: string
          device_id: string
          id?: string
          is_emulator?: boolean
          is_mock_enabled?: boolean
          is_rooted?: boolean
          platform?: string | null
          play_integrity_verdict?: string | null
          user_id: string
          wallet_frozen?: boolean
        }
        Update: {
          attestation_raw?: Json | null
          checked_at?: string
          device_id?: string
          id?: string
          is_emulator?: boolean
          is_mock_enabled?: boolean
          is_rooted?: boolean
          platform?: string | null
          play_integrity_verdict?: string | null
          user_id?: string
          wallet_frozen?: boolean
        }
        Relationships: []
      }
      driver_fraud_scores: {
        Row: {
          driver_id: string
          last_alert_at: string | null
          score: number
          status: string
          total_alerts: number
          updated_at: string
        }
        Insert: {
          driver_id: string
          last_alert_at?: string | null
          score?: number
          status?: string
          total_alerts?: number
          updated_at?: string
        }
        Update: {
          driver_id?: string
          last_alert_at?: string | null
          score?: number
          status?: string
          total_alerts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_fraud_scores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "cq_dashboard"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_fraud_scores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_skills: {
        Row: {
          driver_id: string
          skill_id: string
          verified_at: string | null
        }
        Insert: {
          driver_id: string
          skill_id: string
          verified_at?: string | null
        }
        Update: {
          driver_id?: string
          skill_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_skills_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "cq_dashboard"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_skills_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_trust_scores: {
        Row: {
          control_requests_expired: number
          control_requests_ok: number
          control_requests_rejected: number
          control_requests_total: number
          driver_id: string
          gps_anomaly_flags: number
          last_updated_at: string
          score: number
          zone_compliance_pct: number | null
        }
        Insert: {
          control_requests_expired?: number
          control_requests_ok?: number
          control_requests_rejected?: number
          control_requests_total?: number
          driver_id: string
          gps_anomaly_flags?: number
          last_updated_at?: string
          score?: number
          zone_compliance_pct?: number | null
        }
        Update: {
          control_requests_expired?: number
          control_requests_ok?: number
          control_requests_rejected?: number
          control_requests_total?: number
          driver_id?: string
          gps_anomaly_flags?: number
          last_updated_at?: string
          score?: number
          zone_compliance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_trust_scores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "cq_dashboard"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_trust_scores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          owner_id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gps_fraud_alerts: {
        Row: {
          alert_type: string
          campaign_request_id: string | null
          computed_speed_kmh: number | null
          detected_at: string
          distance_m: number | null
          driver_id: string | null
          elapsed_s: number | null
          fraud_score: number | null
          id: string
          notes: string | null
          point_a: Json | null
          point_b: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          vehicle_id: string
        }
        Insert: {
          alert_type: string
          campaign_request_id?: string | null
          computed_speed_kmh?: number | null
          detected_at?: string
          distance_m?: number | null
          driver_id?: string | null
          elapsed_s?: number | null
          fraud_score?: number | null
          id?: string
          notes?: string | null
          point_a?: Json | null
          point_b?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          vehicle_id: string
        }
        Update: {
          alert_type?: string
          campaign_request_id?: string | null
          computed_speed_kmh?: number | null
          detected_at?: string
          distance_m?: number | null
          driver_id?: string | null
          elapsed_s?: number | null
          fraud_score?: number | null
          id?: string
          notes?: string | null
          point_a?: Json | null
          point_b?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_fraud_alerts_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_fraud_alerts_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "gps_fraud_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "cq_dashboard"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "gps_fraud_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_fraud_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_sync_log: {
        Row: {
          created_at: string
          error_message: string | null
          hubspot_id: string | null
          id: string
          object_type: string
          supabase_id: string
          sync_status: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          hubspot_id?: string | null
          id?: string
          object_type: string
          supabase_id: string
          sync_status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          hubspot_id?: string | null
          id?: string
          object_type?: string
          supabase_id?: string
          sync_status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      installation_missions: {
        Row: {
          accepted_at: string | null
          admin_notes: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          campaign_request_id: string
          completed_at: string | null
          created_at: string
          dispatch_radius_km: number
          fault_cause: string | null
          fee_cents: number
          id: string
          location_address: string | null
          location_city: string | null
          location_geom: unknown
          location_lat: number | null
          location_lng: number | null
          location_postal_code: string | null
          mission_type: string
          payee_id: string | null
          payee_user_id: string | null
          payout_status: string
          payout_transferred_at: string | null
          pose_impossible_reason: string | null
          pose_impossible_reported_at: string | null
          provider_notes: string | null
          rejection_reason: string | null
          scheduled_date: string | null
          scheduled_time_slot: string | null
          started_at: string | null
          status: string
          stripe_transfer_id: string | null
          updated_at: string
          validation_submitted_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          campaign_request_id: string
          completed_at?: string | null
          created_at?: string
          dispatch_radius_km?: number
          fault_cause?: string | null
          fee_cents?: number
          id?: string
          location_address?: string | null
          location_city?: string | null
          location_geom?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_postal_code?: string | null
          mission_type: string
          payee_id?: string | null
          payee_user_id?: string | null
          payout_status?: string
          payout_transferred_at?: string | null
          pose_impossible_reason?: string | null
          pose_impossible_reported_at?: string | null
          provider_notes?: string | null
          rejection_reason?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          started_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          validation_submitted_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          campaign_request_id?: string
          completed_at?: string | null
          created_at?: string
          dispatch_radius_km?: number
          fault_cause?: string | null
          fee_cents?: number
          id?: string
          location_address?: string | null
          location_city?: string | null
          location_geom?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_postal_code?: string | null
          mission_type?: string
          payee_id?: string | null
          payee_user_id?: string | null
          payout_status?: string
          payout_transferred_at?: string | null
          pose_impossible_reason?: string | null
          pose_impossible_reported_at?: string | null
          provider_notes?: string | null
          rejection_reason?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          started_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          validation_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_missions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_missions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "installation_missions_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_moderation_queue: {
        Row: {
          campaign_request_id: string
          created_at: string
          id: string
          mission_id: string
          mission_type: string | null
          poseur_name: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          campaign_request_id: string
          created_at?: string
          id?: string
          mission_id: string
          mission_type?: string | null
          poseur_name?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          campaign_request_id?: string
          created_at?: string
          id?: string
          mission_id?: string
          mission_type?: string | null
          poseur_name?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_moderation_queue_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_moderation_queue_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "installation_moderation_queue_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "installation_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          advertiser_id: string
          amount_ht: number
          amount_ttc: number
          campaign_id: string
          created_at: string
          id: string
          invoice_number: string
          pdf_url: string | null
          status: string
          vat_amount: number
        }
        Insert: {
          advertiser_id: string
          amount_ht: number
          amount_ttc: number
          campaign_id: string
          created_at?: string
          id?: string
          invoice_number: string
          pdf_url?: string | null
          status?: string
          vat_amount: number
        }
        Update: {
          advertiser_id?: string
          amount_ht?: number
          amount_ttc?: number
          campaign_id?: string
          created_at?: string
          id?: string
          invoice_number?: string
          pdf_url?: string | null
          status?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          brief_id: string
          created_at: string
          id: string
          moderation: Json | null
          proposal_id: string | null
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          brief_id: string
          created_at?: string
          id?: string
          moderation?: Json | null
          proposal_id?: string | null
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          brief_id?: string
          created_at?: string
          id?: string
          moderation?: Json | null
          proposal_id?: string | null
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "advertiser_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "brief_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_dispatch_log: {
        Row: {
          dispatched_at: string
          distance_km: number | null
          id: string
          mission_id: string
          payee_id: string
          payee_user_id: string
          responded_at: string | null
          response: string
        }
        Insert: {
          dispatched_at?: string
          distance_km?: number | null
          id?: string
          mission_id: string
          payee_id: string
          payee_user_id: string
          responded_at?: string | null
          response?: string
        }
        Update: {
          dispatched_at?: string
          distance_km?: number | null
          id?: string
          mission_id?: string
          payee_id?: string
          payee_user_id?: string
          responded_at?: string | null
          response?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_dispatch_log_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "installation_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_dispatch_log_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_proofs: {
        Row: {
          id: string
          metadata: Json | null
          mission_id: string
          proof_type: string
          storage_path: string
          storage_url: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          mission_id: string
          proof_type: string
          storage_path: string
          storage_url?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          mission_id?: string
          proof_type?: string
          storage_path?: string
          storage_url?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_proofs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "installation_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_alerts: {
        Row: {
          brief_id: string | null
          conversation_id: string | null
          created_at: string
          flags: string[]
          id: string
          intent: string
          message_id: string | null
          proposal_id: string | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          sender_id: string | null
          severity: number
          suggested_action: string | null
        }
        Insert: {
          brief_id?: string | null
          conversation_id?: string | null
          created_at?: string
          flags?: string[]
          id?: string
          intent?: string
          message_id?: string | null
          proposal_id?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string | null
          severity?: number
          suggested_action?: string | null
        }
        Update: {
          brief_id?: string | null
          conversation_id?: string | null
          created_at?: string
          flags?: string[]
          id?: string
          intent?: string
          message_id?: string | null
          proposal_id?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string | null
          severity?: number
          suggested_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_alerts_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "advertiser_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_penalties: {
        Row: {
          amount_eur: number
          campaign_request_id: string
          created_at: string
          fault_cause: string
          id: string
          mission_id: string
          notes: string | null
          owner_user_id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          amount_eur?: number
          campaign_request_id: string
          created_at?: string
          fault_cause: string
          id?: string
          mission_id: string
          notes?: string | null
          owner_user_id: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          amount_eur?: number
          campaign_request_id?: string
          created_at?: string
          fault_cause?: string
          id?: string
          mission_id?: string
          notes?: string | null
          owner_user_id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_penalties_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_penalties_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "owner_penalties_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "installation_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      obstacle_reports: {
        Row: {
          admin_notes: string | null
          admin_validated: boolean
          admin_validated_at: string | null
          campaign_id: string | null
          description: string | null
          id: string
          impact_end: string | null
          impact_start: string | null
          metadata: Json
          obstacle_type: string
          photo_paths: string[]
          reported_at: string
          vehicle_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_validated?: boolean
          admin_validated_at?: string | null
          campaign_id?: string | null
          description?: string | null
          id?: string
          impact_end?: string | null
          impact_start?: string | null
          metadata?: Json
          obstacle_type: string
          photo_paths?: string[]
          reported_at?: string
          vehicle_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_validated?: boolean
          admin_validated_at?: string | null
          campaign_id?: string | null
          description?: string | null
          id?: string
          impact_end?: string | null
          impact_start?: string | null
          metadata?: Json
          obstacle_type?: string
          photo_paths?: string[]
          reported_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obstacle_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obstacle_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          bio: string | null
          city: string | null
          company: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          siret: string | null
          siret_denomination: string | null
          siret_verified_at: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_connect_account_id: string | null
          stripe_details_submitted: boolean
          stripe_onboarding_completed_at: string | null
          stripe_payouts_enabled: boolean
          stripe_requirements_due: string[] | null
          updated_at: string
          user_id: string
          vigilance_attestation_url: string | null
          vigilance_date_verification: string | null
          vigilance_gains_cumules_centimes: number
          vigilance_notes: string | null
          vigilance_seuil_atteint_at: string | null
          vigilance_statut: string
        }
        Insert: {
          bio?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_onboarding_completed_at?: string | null
          stripe_payouts_enabled?: boolean
          stripe_requirements_due?: string[] | null
          updated_at?: string
          user_id: string
          vigilance_attestation_url?: string | null
          vigilance_date_verification?: string | null
          vigilance_gains_cumules_centimes?: number
          vigilance_notes?: string | null
          vigilance_seuil_atteint_at?: string | null
          vigilance_statut?: string
        }
        Update: {
          bio?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_onboarding_completed_at?: string | null
          stripe_payouts_enabled?: boolean
          stripe_requirements_due?: string[] | null
          updated_at?: string
          user_id?: string
          vigilance_attestation_url?: string | null
          vigilance_date_verification?: string | null
          vigilance_gains_cumules_centimes?: number
          vigilance_notes?: string | null
          vigilance_seuil_atteint_at?: string | null
          vigilance_statut?: string
        }
        Relationships: []
      }
      owner_reviews: {
        Row: {
          advertiser_id: string
          campaign_request_id: string | null
          comment: string | null
          created_at: string
          id: string
          owner_id: string
          rating: number
        }
        Insert: {
          advertiser_id: string
          campaign_request_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          owner_id: string
          rating: number
        }
        Update: {
          advertiser_id?: string
          campaign_request_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "owner_reviews_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: true
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_reviews_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: true
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "owner_reviews_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_wallets: {
        Row: {
          balance_ht: number
          created_at: string
          id: string
          owner_id: string
          stripe_connect_id: string | null
        }
        Insert: {
          balance_ht?: number
          created_at?: string
          id?: string
          owner_id: string
          stripe_connect_id?: string | null
        }
        Update: {
          balance_ht?: number
          created_at?: string
          id?: string
          owner_id?: string
          stripe_connect_id?: string | null
        }
        Relationships: []
      }
      partner_profiles: {
        Row: {
          admin_notes: string | null
          city: string | null
          company: string | null
          created_at: string
          description: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          referral_code: string | null
          siret: string | null
          siret_denomination: string | null
          siret_verified_at: string | null
          status: string
          stripe_subscription_period_end: string | null
          stripe_subscription_status: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          status?: string
          stripe_subscription_period_end?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          referral_code?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          status?: string
          stripe_subscription_period_end?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      payee_earnings: {
        Row: {
          amount_cents: number
          campaign_request_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          paid_at: string | null
          payee_user_id: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          payee_user_id: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          payee_user_id?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payee_earnings_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payee_earnings_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      payee_profiles: {
        Row: {
          certification_notes: string | null
          certification_status: string
          cgu_accepted_at: string | null
          cgu_version: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          kind: string
          notes: string | null
          phone: string | null
          siret: string | null
          siret_denomination: string | null
          siret_verified_at: string | null
          status: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_connect_account_id: string | null
          stripe_details_submitted: boolean
          stripe_onboarding_completed_at: string | null
          stripe_payouts_enabled: boolean
          updated_at: string
          user_id: string
          vehicle_kind: string | null
          vehicle_plate: string | null
        }
        Insert: {
          certification_notes?: string | null
          certification_status?: string
          cgu_accepted_at?: string | null
          cgu_version?: string | null
          city?: string | null
          created_at?: string
          full_name: string
          id?: string
          kind?: string
          notes?: string | null
          phone?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_onboarding_completed_at?: string | null
          stripe_payouts_enabled?: boolean
          updated_at?: string
          user_id: string
          vehicle_kind?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          certification_notes?: string | null
          certification_status?: string
          cgu_accepted_at?: string | null
          cgu_version?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          kind?: string
          notes?: string | null
          phone?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_account_id?: string | null
          stripe_details_submitted?: boolean
          stripe_onboarding_completed_at?: string | null
          stripe_payouts_enabled?: boolean
          updated_at?: string
          user_id?: string
          vehicle_kind?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      pm_coverage_snapshots: {
        Row: {
          campaign_request_id: string
          coverage_rate: number
          created_at: string
          id: string
          positions_count: number
          snapshot_date: string
          zone_intersect_pct: number
        }
        Insert: {
          campaign_request_id: string
          coverage_rate?: number
          created_at?: string
          id?: string
          positions_count?: number
          snapshot_date: string
          zone_intersect_pct?: number
        }
        Update: {
          campaign_request_id?: string
          coverage_rate?: number
          created_at?: string
          id?: string
          positions_count?: number
          snapshot_date?: string
          zone_intersect_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "pm_coverage_snapshots_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_coverage_snapshots_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      pm_jobs: {
        Row: {
          campaign_request_id: string
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          payload: Json
          processed_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_request_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          payload?: Json
          processed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_request_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_jobs_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_jobs_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      pricing_seasonal_multipliers: {
        Row: {
          end_date: string
          id: number
          multiplier: number
          name: string
          start_date: string
        }
        Insert: {
          end_date: string
          id?: number
          multiplier?: number
          name: string
          start_date: string
        }
        Update: {
          end_date?: string
          id?: number
          multiplier?: number
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      pricing_zone_multipliers: {
        Row: {
          base_multiplier: number
          region_id: string
          updated_at: string | null
        }
        Insert: {
          base_multiplier?: number
          region_id: string
          updated_at?: string | null
        }
        Update: {
          base_multiplier?: number
          region_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_positions: {
        Row: {
          accuracy: number | null
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          provider_id: string
          recorded_at: string
          service_quote_id: string | null
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          provider_id: string
          recorded_at?: string
          service_quote_id?: string | null
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          provider_id?: string
          recorded_at?: string
          service_quote_id?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_positions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "provider_positions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "public_provider_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "provider_positions_service_quote_id_fkey"
            columns: ["service_quote_id"]
            isOneToOne: false
            referencedRelation: "service_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_profiles: {
        Row: {
          admin_notes: string | null
          company: string
          coverage_areas: string[]
          created_at: string
          description: string
          docs_ai_report: Json | null
          docs_ai_status: string | null
          email: string
          embedding: string | null
          formation_doc_urls: string[] | null
          full_name: string
          id_doc_url: string | null
          kbis_url: string | null
          logo_url: string | null
          phone: string | null
          portfolio_urls: string[]
          pose_location_types: string[] | null
          pricing_info: string | null
          rc_pro_expiry: string | null
          rc_pro_url: string | null
          rib_url: string | null
          services: string[]
          siret: string | null
          status: string
          stripe_subscription_id: string | null
          stripe_subscription_period_end: string | null
          stripe_subscription_status: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          company: string
          coverage_areas?: string[]
          created_at?: string
          description: string
          docs_ai_report?: Json | null
          docs_ai_status?: string | null
          email: string
          embedding?: string | null
          formation_doc_urls?: string[] | null
          full_name: string
          id_doc_url?: string | null
          kbis_url?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_urls?: string[]
          pose_location_types?: string[] | null
          pricing_info?: string | null
          rc_pro_expiry?: string | null
          rc_pro_url?: string | null
          rib_url?: string | null
          services?: string[]
          siret?: string | null
          status?: string
          stripe_subscription_id?: string | null
          stripe_subscription_period_end?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          company?: string
          coverage_areas?: string[]
          created_at?: string
          description?: string
          docs_ai_report?: Json | null
          docs_ai_status?: string | null
          email?: string
          embedding?: string | null
          formation_doc_urls?: string[] | null
          full_name?: string
          id_doc_url?: string | null
          kbis_url?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_urls?: string[]
          pose_location_types?: string[] | null
          pricing_info?: string | null
          rc_pro_expiry?: string | null
          rc_pro_url?: string | null
          rib_url?: string | null
          services?: string[]
          siret?: string | null
          status?: string
          stripe_subscription_id?: string | null
          stripe_subscription_period_end?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      refund_claims_moderation: {
        Row: {
          analyzed_at: string
          compliance_eligible: boolean
          compliance_reason: string
          created_at: string
          decision: string
          decision_justification: string
          extracted_facts: string[]
          id: string
          model_version: string
          policy_violations: string[]
          processing_ms: number | null
          raw_response: Json | null
          refund_request_id: string
          risk_score: string
          risk_score_numeric: number
          risk_signals: string[]
          suggested_admin_note: string
          tone_flags: string[]
        }
        Insert: {
          analyzed_at?: string
          compliance_eligible: boolean
          compliance_reason: string
          created_at?: string
          decision: string
          decision_justification: string
          extracted_facts?: string[]
          id?: string
          model_version: string
          policy_violations?: string[]
          processing_ms?: number | null
          raw_response?: Json | null
          refund_request_id: string
          risk_score: string
          risk_score_numeric: number
          risk_signals?: string[]
          suggested_admin_note: string
          tone_flags?: string[]
        }
        Update: {
          analyzed_at?: string
          compliance_eligible?: boolean
          compliance_reason?: string
          created_at?: string
          decision?: string
          decision_justification?: string
          extracted_facts?: string[]
          id?: string
          model_version?: string
          policy_violations?: string[]
          processing_ms?: number | null
          raw_response?: Json | null
          refund_request_id?: string
          risk_score?: string
          risk_score_numeric?: number
          risk_signals?: string[]
          suggested_admin_note?: string
          tone_flags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "refund_claims_moderation_refund_request_id_fkey"
            columns: ["refund_request_id"]
            isOneToOne: true
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number | null
          campaign_request_id: string | null
          created_at: string
          id: string
          reason: string
          status: string
          stripe_refund_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents?: number | null
          campaign_request_id?: string | null
          created_at?: string
          id?: string
          reason: string
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number | null
          campaign_request_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          campaign_request_id: string | null
          channel: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          reason: string
          status: string
          stripe_refund_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          campaign_request_id?: string | null
          channel?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          reason: string
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          campaign_request_id?: string | null
          channel?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          reason?: string
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      service_quotes: {
        Row: {
          advertiser_id: string
          ai_brief_id: string | null
          attachments: string[]
          created_at: string
          deadline: string | null
          format: string | null
          id: string
          impossible_at: string | null
          impossible_photos: string[] | null
          impossible_reason: string | null
          message: string
          provider_id: string
          quantity: number | null
          quoted_at: string | null
          quoted_currency: string | null
          quoted_message: string | null
          quoted_price_cents: number | null
          service_type: string
          status: string
          updated_at: string
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          advertiser_id: string
          ai_brief_id?: string | null
          attachments?: string[]
          created_at?: string
          deadline?: string | null
          format?: string | null
          id?: string
          impossible_at?: string | null
          impossible_photos?: string[] | null
          impossible_reason?: string | null
          message: string
          provider_id: string
          quantity?: number | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_message?: string | null
          quoted_price_cents?: number | null
          service_type: string
          status?: string
          updated_at?: string
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          advertiser_id?: string
          ai_brief_id?: string | null
          attachments?: string[]
          created_at?: string
          deadline?: string | null
          format?: string | null
          id?: string
          impossible_at?: string | null
          impossible_photos?: string[] | null
          impossible_reason?: string | null
          message?: string
          provider_id?: string
          quantity?: number | null
          quoted_at?: string | null
          quoted_currency?: string | null
          quoted_message?: string | null
          quoted_price_cents?: number | null
          service_type?: string
          status?: string
          updated_at?: string
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_quotes_ai_brief_id_fkey"
            columns: ["ai_brief_id"]
            isOneToOne: false
            referencedRelation: "ai_brief_data"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          label: string
          revenue_boost_pct: number | null
          slug: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label: string
          revenue_boost_pct?: number | null
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          revenue_boost_pct?: number | null
          slug?: string
        }
        Relationships: []
      }
      status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_status: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_status: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
          type: string
        }
        Insert: {
          id: string
          payload: Json
          processed_at?: string | null
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      support_email_queue: {
        Row: {
          created_at: string
          room_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          room_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          room_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_email_queue_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "support_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "support_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      support_rooms: {
        Row: {
          advertiser_id: string
          created_at: string
          id: string
          last_read_at: string | null
          status: string
        }
        Insert: {
          advertiser_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          status?: string
        }
        Update: {
          advertiser_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_rooms_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          context_url: string | null
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          context_url?: string | null
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          context_url?: string | null
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      sv_contracts: {
        Row: {
          campaign_request_id: string
          content_md: string | null
          contract_type: string
          created_at: string
          expires_at: string | null
          id: string
          party_user_id: string
          pdf_url: string | null
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_request_id: string
          content_md?: string | null
          contract_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          party_user_id: string
          pdf_url?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_request_id?: string
          content_md?: string | null
          contract_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          party_user_id?: string
          pdf_url?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sv_contracts_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sv_contracts_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      sv_payout_queue: {
        Row: {
          amount_cents: number
          campaign_request_id: string
          created_at: string
          currency: string
          error_message: string | null
          id: string
          payout_type: string
          processed_at: string | null
          recipient_user_id: string
          retry_count: number
          scheduled_at: string
          status: string
          stripe_account_id: string | null
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
        }
        Insert: {
          amount_cents: number
          campaign_request_id: string
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          payout_type: string
          processed_at?: string | null
          recipient_user_id: string
          retry_count?: number
          scheduled_at?: string
          status?: string
          stripe_account_id?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
        }
        Update: {
          amount_cents?: number
          campaign_request_id?: string
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          payout_type?: string
          processed_at?: string | null
          recipient_user_id?: string
          retry_count?: number
          scheduled_at?: string
          status?: string
          stripe_account_id?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sv_payout_queue_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sv_payout_queue_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      sv_refund_decisions: {
        Row: {
          campaign_request_id: string
          created_at: string
          decided_at: string
          decision: string
          executed_at: string | null
          id: string
          reason: string | null
          refund_amount_cents: number
          refund_request_id: string | null
          stripe_refund_id: string | null
        }
        Insert: {
          campaign_request_id: string
          created_at?: string
          decided_at?: string
          decision: string
          executed_at?: string | null
          id?: string
          reason?: string | null
          refund_amount_cents?: number
          refund_request_id?: string | null
          stripe_refund_id?: string | null
        }
        Update: {
          campaign_request_id?: string
          created_at?: string
          decided_at?: string
          decision?: string
          executed_at?: string | null
          id?: string
          reason?: string | null
          refund_amount_cents?: number
          refund_request_id?: string | null
          stripe_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sv_refund_decisions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sv_refund_decisions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "sv_refund_decisions_refund_request_id_fkey"
            columns: ["refund_request_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          dismissed_at: string | null
          href: string | null
          id: string
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dismissed_at?: string | null
          href?: string | null
          id?: string
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dismissed_at?: string | null
          href?: string | null
          id?: string
          kind?: string
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
      vehicle_positions: {
        Row: {
          accuracy: number | null
          campaign_request_id: string | null
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          owner_id: string
          recorded_at: string
          speed: number | null
          vehicle_id: string
        }
        Insert: {
          accuracy?: number | null
          campaign_request_id?: string | null
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          owner_id: string
          recorded_at?: string
          speed?: number | null
          vehicle_id: string
        }
        Update: {
          accuracy?: number | null
          campaign_request_id?: string | null
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          owner_id?: string
          recorded_at?: string
          speed?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_positions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_positions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "vehicle_positions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_skills: {
        Row: {
          skill_id: string
          vehicle_id: string
          verified_at: string | null
        }
        Insert: {
          skill_id: string
          vehicle_id: string
          verified_at?: string | null
        }
        Update: {
          skill_id?: string
          vehicle_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_skills_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          admin_notes: string | null
          ai_verification: Json | null
          brand: string | null
          color: string | null
          condition: Database["public"]["Enums"]["vehicle_condition"] | null
          covering_zone: Json | null
          created_at: string
          description: string | null
          driver_id: string | null
          format_publicitaire: string | null
          id: string
          km_per_day: number | null
          last_lat: number | null
          last_lng: number | null
          last_position_at: string | null
          license_plate: string | null
          model: string | null
          name: string
          owner_id: string
          photos: string[] | null
          price_per_day: number
          status: Database["public"]["Enums"]["vehicle_status"]
          surface_m2: number | null
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
          zones: string[] | null
        }
        Insert: {
          admin_notes?: string | null
          ai_verification?: Json | null
          brand?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["vehicle_condition"] | null
          covering_zone?: Json | null
          created_at?: string
          description?: string | null
          driver_id?: string | null
          format_publicitaire?: string | null
          id?: string
          km_per_day?: number | null
          last_lat?: number | null
          last_lng?: number | null
          last_position_at?: string | null
          license_plate?: string | null
          model?: string | null
          name: string
          owner_id: string
          photos?: string[] | null
          price_per_day: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          surface_m2?: number | null
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          zones?: string[] | null
        }
        Update: {
          admin_notes?: string | null
          ai_verification?: Json | null
          brand?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["vehicle_condition"] | null
          covering_zone?: Json | null
          created_at?: string
          description?: string | null
          driver_id?: string | null
          format_publicitaire?: string | null
          id?: string
          km_per_day?: number | null
          last_lat?: number | null
          last_lng?: number | null
          last_position_at?: string | null
          license_plate?: string | null
          model?: string | null
          name?: string
          owner_id?: string
          photos?: string[] | null
          price_per_day?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          surface_m2?: number | null
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          zones?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "cq_dashboard"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          campaign_request_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          kind: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          kind: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          kind?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "campaign_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_campaign_request_id_fkey"
            columns: ["campaign_request_id"]
            isOneToOne: false
            referencedRelation: "sv_dashboard"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cq_dashboard: {
        Row: {
          controls_ok: number | null
          controls_total: number | null
          driver_id: string | null
          fraud_alerts: number | null
          fraud_score: number | null
          full_name: string | null
          gps_flags: number | null
          open_gps_alerts: number | null
          pending_reviews: number | null
          trust_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      hs_sync_dashboard: {
        Row: {
          error_message: string | null
          hubspot_id: string | null
          id: string | null
          label: string | null
          object_type: string | null
          supabase_id: string | null
          sync_status: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          error_message?: string | null
          hubspot_id?: string | null
          id?: string | null
          label?: never
          object_type?: string | null
          supabase_id?: string | null
          sync_status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          error_message?: string | null
          hubspot_id?: string | null
          id?: string | null
          label?: never
          object_type?: string | null
          supabase_id?: string | null
          sync_status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_provider_profiles: {
        Row: {
          company: string | null
          coverage_areas: string[] | null
          created_at: string | null
          description: string | null
          full_name: string | null
          logo_url: string | null
          portfolio_urls: string[] | null
          pricing_info: string | null
          services: string[] | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          company?: string | null
          coverage_areas?: string[] | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          logo_url?: string | null
          portfolio_urls?: string[] | null
          pricing_info?: string | null
          services?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          company?: string | null
          coverage_areas?: string[] | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          logo_url?: string | null
          portfolio_urls?: string[] | null
          pricing_info?: string | null
          services?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      sv_dashboard: {
        Row: {
          campaign_id: string | null
          contracts_count: number | null
          depose_fee_cents: number | null
          depose_payout_status: string | null
          depose_stripe_transfer_id: string | null
          done_payouts: number | null
          owner_amount_cents: number | null
          paid_amount_cents: number | null
          payout_status: string | null
          pending_payouts: number | null
          pm_status: string | null
          pose_fee_cents: number | null
          pose_payout_status: string | null
          pose_stripe_transfer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          contracts_count?: never
          depose_fee_cents?: number | null
          depose_payout_status?: string | null
          depose_stripe_transfer_id?: string | null
          done_payouts?: never
          owner_amount_cents?: number | null
          paid_amount_cents?: number | null
          payout_status?: string | null
          pending_payouts?: never
          pm_status?: string | null
          pose_fee_cents?: number | null
          pose_payout_status?: string | null
          pose_stripe_transfer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          contracts_count?: never
          depose_fee_cents?: number | null
          depose_payout_status?: string | null
          depose_stripe_transfer_id?: string | null
          done_payouts?: never
          owner_amount_cents?: number | null
          paid_amount_cents?: number | null
          payout_status?: string | null
          pending_payouts?: never
          pm_status?: string | null
          pose_fee_cents?: number | null
          pose_payout_status?: string | null
          pose_stripe_transfer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_dispatched_mission: {
        Args: { p_installer_uid: string; p_mission_id: string }
        Returns: Json
      }
      apply_wallet_transaction: {
        Args: {
          p_amount_cents: number
          p_campaign_request_id?: string
          p_currency?: string
          p_description?: string
          p_kind: string
          p_stripe_checkout_session_id?: string
          p_stripe_payment_intent_id?: string
          p_stripe_refund_id?: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_dynamic_campaign_price: {
        Args: {
          p_base_price: number
          p_end_date: string
          p_region_id: string
          p_start_date: string
        }
        Returns: number
      }
      call_send_push: { Args: { payload: Json }; Returns: undefined }
      check_incomplete_stripe_onboarding: { Args: never; Returns: Json }
      check_is_admin: { Args: never; Returns: boolean }
      credit_advertiser_referral: {
        Args: { p_referee_user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_available_installers: {
        Args: {
          p_lat: number
          p_lng: number
          p_mission_date?: string
          p_radius_km?: number
        }
        Returns: {
          city: string
          distance_km: number
          full_name: string
          last_position_at: string
          payee_id: string
          phone: string
          stripe_connect_id: string
          user_id: string
        }[]
      }
      fn_cq_recompute_trust: {
        Args: { p_driver_id: string }
        Returns: undefined
      }
      fn_pm_call_edge: {
        Args: { p_body: Json; p_function_name: string }
        Returns: undefined
      }
      get_owner_financial_analytics: {
        Args: { p_owner_id: string }
        Returns: Json
      }
      get_support_analytics: { Args: never; Returns: Json }
      get_vehicle_booked_periods: {
        Args: { p_vehicle_id: string }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_point_in_campaign_zone: {
        Args: { p_campaign_id: string; p_lat: number; p_lng: number }
        Returns: boolean
      }
      match_providers: {
        Args: {
          filter_category?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          company: string
          coverage_areas: string[]
          description: string
          full_name: string
          logo_url: string
          pricing_info: string
          services: string[]
          similarity: number
          user_id: string
          website: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      pm_calc_coverage_rate: {
        Args: { p_campaign_id: string; p_date?: string }
        Returns: number
      }
      pm_find_matching_vehicles: {
        Args: { p_brief_id: string; p_max_results?: number }
        Returns: {
          geo_overlap_pct: number
          owner_id: string
          price_per_day: number
          score: number
          vehicle_id: string
        }[]
      }
      process_campaign_wallet_payment: {
        Args: {
          p_advertiser_id: string
          p_amount: number
          p_end_date: string
          p_region_id: string
          p_start_date: string
        }
        Returns: Json
      }
      process_expired_campaigns_payouts: { Args: never; Returns: Json }
      process_support_email_queue: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_campaign_gps_batch: {
        Args: { p_campaign_id: string; p_points: Json }
        Returns: {
          active_minutes: number
          distance_in_zone_m: number
          points_in_zone: number
          points_total: number
        }[]
      }
      retry_bank_transfer: { Args: { request_id: string }; Returns: Json }
      retry_failed_cron_jobs: { Args: never; Returns: Json }
      run_advertiser_activation_followup: { Args: never; Returns: Json }
      settle_campaign_from_wallet: {
        Args: { p_campaign_request_id: string; p_description?: string }
        Returns: {
          already_paid: boolean
          amount_cents: number
        }[]
      }
      trigger_bank_transfers_processing: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "owner"
        | "advertiser"
        | "driver"
        | "provider"
        | "partner"
      brief_status: "open" | "closed" | "fulfilled" | "cancelled"
      proposal_status: "pending" | "accepted" | "rejected" | "withdrawn"
      vehicle_condition: "excellent" | "bon" | "moyen" | "mauvais"
      vehicle_status: "pending" | "approved" | "rejected" | "paused"
      vehicle_type:
        | "food_truck"
        | "van"
        | "taxi"
        | "scooter"
        | "voiture"
        | "autre"
        | "velo_cargo"
        | "velo_remorque"
        | "triporteur"
        | "tutuk"
        | "sac_a_dos_lcd"
        | "sac_a_dos_affiche"
        | "camion_boxled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "user",
        "owner",
        "advertiser",
        "driver",
        "provider",
        "partner",
      ],
      brief_status: ["open", "closed", "fulfilled", "cancelled"],
      proposal_status: ["pending", "accepted", "rejected", "withdrawn"],
      vehicle_condition: ["excellent", "bon", "moyen", "mauvais"],
      vehicle_status: ["pending", "approved", "rejected", "paused"],
      vehicle_type: [
        "food_truck",
        "van",
        "taxi",
        "scooter",
        "voiture",
        "autre",
        "velo_cargo",
        "velo_remorque",
        "triporteur",
        "tutuk",
        "sac_a_dos_lcd",
        "sac_a_dos_affiche",
        "camion_boxled",
      ],
    },
  },
} as const
