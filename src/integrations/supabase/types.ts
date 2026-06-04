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
      advertiser_briefs: {
        Row: {
          advertiser_id: string
          audience_target: string | null
          budget_max: number | null
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
          vehicle_types: Database["public"]["Enums"]["vehicle_type"][]
          zones: string[]
        }
        Insert: {
          advertiser_id: string
          audience_target?: string | null
          budget_max?: number | null
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
          vehicle_types?: Database["public"]["Enums"]["vehicle_type"][]
          zones?: string[]
        }
        Update: {
          advertiser_id?: string
          audience_target?: string | null
          budget_max?: number | null
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
          vehicle_types?: Database["public"]["Enums"]["vehicle_type"][]
          zones?: string[]
        }
        Relationships: []
      }
      advertiser_profiles: {
        Row: {
          city: string | null
          company: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          siret: string | null
          siret_denomination: string | null
          siret_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          siret?: string | null
          siret_denomination?: string | null
          siret_verified_at?: string | null
          updated_at?: string
          user_id?: string
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
      campaign_requests: {
        Row: {
          admin_notes: string | null
          company: string
          created_at: string
          creative_files: string[]
          daily_end_time: string | null
          daily_start_time: string | null
          days_count: number | null
          email: string
          end_date: string | null
          estimated_impressions_per_day: number | null
          id: string
          message: string
          owner_response: string
          route_pois: string[] | null
          route_waypoints: string[] | null
          route_zones: string[] | null
          spot_id: string
          spot_location: string | null
          spot_name: string
          spot_price: number | null
          start_date: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          company: string
          created_at?: string
          creative_files?: string[]
          daily_end_time?: string | null
          daily_start_time?: string | null
          days_count?: number | null
          email: string
          end_date?: string | null
          estimated_impressions_per_day?: number | null
          id?: string
          message: string
          owner_response?: string
          route_pois?: string[] | null
          route_waypoints?: string[] | null
          route_zones?: string[] | null
          spot_id: string
          spot_location?: string | null
          spot_name: string
          spot_price?: number | null
          start_date?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          company?: string
          created_at?: string
          creative_files?: string[]
          daily_end_time?: string | null
          daily_start_time?: string | null
          days_count?: number | null
          email?: string
          end_date?: string | null
          estimated_impressions_per_day?: number | null
          id?: string
          message?: string
          owner_response?: string
          route_pois?: string[] | null
          route_waypoints?: string[] | null
          route_zones?: string[] | null
          spot_id?: string
          spot_location?: string | null
          spot_name?: string
          spot_price?: number | null
          start_date?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
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
          updated_at: string
          user_id: string
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
          updated_at?: string
          user_id: string
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
          updated_at?: string
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
          condition: Database["public"]["Enums"]["vehicle_condition"] | null
          created_at: string
          description: string | null
          format_publicitaire: string | null
          id: string
          km_per_day: number | null
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
          condition?: Database["public"]["Enums"]["vehicle_condition"] | null
          created_at?: string
          description?: string | null
          format_publicitaire?: string | null
          id?: string
          km_per_day?: number | null
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
          condition?: Database["public"]["Enums"]["vehicle_condition"] | null
          created_at?: string
          description?: string | null
          format_publicitaire?: string | null
          id?: string
          km_per_day?: number | null
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
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
    }
    Enums: {
      app_role: "admin" | "user" | "owner" | "advertiser"
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
      app_role: ["admin", "user", "owner", "advertiser"],
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
      ],
    },
  },
} as const
