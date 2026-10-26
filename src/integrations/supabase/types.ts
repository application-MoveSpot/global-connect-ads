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
      admin_intrusion_attempts: {
        Row: {
          attempted_at: string
          email: string | null
          id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          email?: string | null
          id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string | null
          id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      advertiser_briefs: {
        Row: {
          ad_format: string | null
          advertiser_id: string
          audience_target: string | null
          budget_max: number | null
          poseur_fee: number | null
          created_at: string
          creative_files: string[]
          days_count: number | null
          description: string
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["brief_status"]
          title: string
          updated_at: string
          vehicle_count: number
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
          poseur_fee?: number | null
          created_at?: string
          creative_files?: string[]
          days_count?: number | null
          description: string
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["brief_status"]
          title: string
          updated_at?: string
          vehicle_count?: number
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
          poseur_fee?: number | null
          created_at?: string
          creative_files?: string[]
          days_count?: number | null
          description?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["brief_status"]
          title?: string
          updated_at?: string
          vehicle_count?: number
          vehicle_types?: Database["public"]["Enums"]["vehicle_type"][]
          zone_area_km2?: number | null
          zone_polygon?: unknown
          zones?: string[]
        }
        Relationships: []
      }
      advertiser_profiles: {
        Row: {
          account_type: string
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
          referred_by_advertiser_id: string | null
          siret: string | null
          siret_denomination: string | null
          siret_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
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
          referred_by_advertiser_id?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
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
          referred_by_advertiser_id?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_profiles_referred_by_advertiser_id_fkey"
            columns: ["referred_by_advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transfer_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          campaign_request_id: string | null
          created_at: string
          currency: string
          id: string
          receipt_path: string | null
          reference: string
          reviewed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          receipt_path?: string | null
          reference: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          campaign_request_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          receipt_path?: string | null
          reference?: string
          reviewed_at?: string | null
          status?: string
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
        ]
      }
      campaign_requests: {
        Row: {
          admin_notes: string | null
          audience: string | null
          campaign_goal: string | null
          company: string
          country_code: string | null
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
          subscription_status: string | null
          timezone: string | null
          total_price: number | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
          zone_area_km2: number | null
          zone_polygon: unknown
        }
        Insert: {
          admin_notes?: string | null
          audience?: string | null
          campaign_goal?: string | null
          company: string
          country_code?: string | null
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
          subscription_status?: string | null
          timezone?: string | null
          total_price?: number | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
          zone_area_km2?: number | null
          zone_polygon?: unknown
        }
        Update: {
          admin_notes?: string | null
          audience?: string | null
          campaign_goal?: string | null
          company?: string
          country_code?: string | null
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
          subscription_status?: string | null
          timezone?: string | null
          total_price?: number | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
          zone_area_km2?: number | null
          zone_polygon?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "campaign_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      control_photo_requests: {
        Row: {
          admin_notes: string | null
          admin_validated: boolean
          campaign_request_id: string | null
          created_at: string
          deadline_at: string
          driver_id: string | null
          fraud_flags: Json
          id: string
          photo_accuracy: number | null
          photo_lat: number | null
          photo_lng: number | null
          photo_path: string | null
          scheduled_at: string
          status: string
          submitted_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_validated?: boolean
          campaign_request_id?: string | null
          created_at?: string
          deadline_at: string
          driver_id?: string | null
          fraud_flags?: Json
          id?: string
          photo_accuracy?: number | null
          photo_lat?: number | null
          photo_lng?: number | null
          photo_path?: string | null
          scheduled_at: string
          status?: string
          submitted_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_validated?: boolean
          campaign_request_id?: string | null
          created_at?: string
          deadline_at?: string
          driver_id?: string | null
          fraud_flags?: Json
          id?: string
          photo_accuracy?: number | null
          photo_lat?: number | null
          photo_lng?: number | null
          photo_path?: string | null
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
      cron_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
      messages: {
        Row: {
          body: string
          brief_id: string
          created_at: string
          id: string
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
          updated_at: string
          user_id: string
          vigilance_attestation_url: string | null
          vigilance_date_verification: string | null
          vigilance_gains_cumules_centimes: number | null
          vigilance_notes: string | null
          vigilance_seuil_atteint_at: string | null
          vigilance_statut: string | null
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
          updated_at?: string
          user_id: string
          vigilance_attestation_url?: string | null
          vigilance_date_verification?: string | null
          vigilance_gains_cumules_centimes?: number | null
          vigilance_notes?: string | null
          vigilance_seuil_atteint_at?: string | null
          vigilance_statut?: string | null
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
          updated_at?: string
          user_id?: string
          vigilance_attestation_url?: string | null
          vigilance_date_verification?: string | null
          vigilance_gains_cumules_centimes?: number | null
          vigilance_notes?: string | null
          vigilance_seuil_atteint_at?: string | null
          vigilance_statut?: string | null
        }
        Relationships: []
      }
      owner_reviews: {
        Row: {
          advertiser_id: string
          campaign_request_id: string
          comment: string | null
          created_at: string
          id: string
          owner_id: string
          rating: number
        }
        Insert: {
          advertiser_id: string
          campaign_request_id: string
          comment?: string | null
          created_at?: string
          id?: string
          owner_id: string
          rating: number
        }
        Update: {
          advertiser_id?: string
          campaign_request_id?: string
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
        ]
      }
      partner_profiles: {
        Row: {
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
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_period_end: string | null
          stripe_subscription_status: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
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
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_period_end?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
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
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
        ]
      }
      payee_profiles: {
        Row: {
          certification_notes: string | null
          certification_status: string
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
        ]
      }
      provider_profiles: {
        Row: {
          admin_notes: string | null
          company: string
          coverage_areas: string[]
          created_at: string
          description: string
          email: string
          full_name: string
          id_doc_url: string | null
          kbis_url: string | null
          logo_url: string | null
          phone: string | null
          portfolio_urls: string[]
          pose_location_types: string[]
          pricing_info: string | null
          rc_pro_expiry: string | null
          rc_pro_url: string | null
          rib_url: string | null
          services: string[]
          siret: string | null
          status: string
          stripe_customer_id: string | null
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
          email: string
          full_name: string
          id_doc_url?: string | null
          kbis_url?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_urls?: string[]
          pose_location_types?: string[]
          pricing_info?: string | null
          rc_pro_expiry?: string | null
          rc_pro_url?: string | null
          rib_url?: string | null
          services?: string[]
          siret?: string | null
          status?: string
          stripe_customer_id?: string | null
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
          email?: string
          full_name?: string
          id_doc_url?: string | null
          kbis_url?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_urls?: string[]
          pose_location_types?: string[]
          pricing_info?: string | null
          rc_pro_expiry?: string | null
          rc_pro_url?: string | null
          rib_url?: string | null
          services?: string[]
          siret?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_period_end?: string | null
          stripe_subscription_status?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
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
        ]
      }
      service_quotes: {
        Row: {
          advertiser_id: string
          attachments: string[]
          created_at: string
          deadline: string | null
          format: string | null
          id: string
          impossible_at: string | null
          impossible_photos: string[]
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
          vehicle_id: string | null
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          advertiser_id: string
          attachments?: string[]
          created_at?: string
          deadline?: string | null
          format?: string | null
          id?: string
          impossible_at?: string | null
          impossible_photos?: string[]
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
          vehicle_id?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          advertiser_id?: string
          attachments?: string[]
          created_at?: string
          deadline?: string | null
          format?: string | null
          id?: string
          impossible_at?: string | null
          impossible_photos?: string[]
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
          vehicle_id?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_quotes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_status: string | null
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_status?: string | null
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
            foreignKeyName: "vehicle_positions_vehicle_id_fkey"
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
    }
    Functions: {
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
      check_beta_access: { Args: never; Returns: boolean }
      check_is_admin: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fleet_public_stats: { Args: never; Returns: Json }
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
      is_point_in_campaign_zone: {
        Args: { p_campaign_id: string; p_lat: number; p_lng: number }
        Returns: boolean
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
      settle_campaign_from_wallet: {
        Args: { p_campaign_request_id: string; p_description?: string }
        Returns: {
          already_paid: boolean
          amount_cents: number
        }[]
      }
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
