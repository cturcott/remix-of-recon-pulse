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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          dealership_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          dealership_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          dealership_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      dealerships: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          group_name: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          state: string | null
          status: string
          store_code: string | null
          timezone: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          group_name?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          state?: string | null
          status?: string
          store_code?: string | null
          timezone?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          group_name?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          state?: string | null
          status?: string
          store_code?: string | null
          timezone?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      notification_event_recipients: {
        Row: {
          bounce_type: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string
          id: string
          notification_event_id: string
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bounce_type?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          notification_event_id: string
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bounce_type?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          notification_event_id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_event_recipients_notification_event_id_fkey"
            columns: ["notification_event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string
          dealership_id: string
          error_message: string | null
          event_type: string
          id: string
          metadata_json: Json | null
          provider: string | null
          provider_message_id: string | null
          status: string
          tag: string | null
          template_key: string | null
          triggered_at: string
          triggered_by_user_id: string | null
          updated_at: string
          vehicle_id: string
          workflow_stage_id: string | null
        }
        Insert: {
          created_at?: string
          dealership_id: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata_json?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          status?: string
          tag?: string | null
          template_key?: string | null
          triggered_at?: string
          triggered_by_user_id?: string | null
          updated_at?: string
          vehicle_id: string
          workflow_stage_id?: string | null
        }
        Update: {
          created_at?: string
          dealership_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata_json?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          status?: string
          tag?: string | null
          template_key?: string | null
          triggered_at?: string
          triggered_by_user_id?: string | null
          updated_at?: string
          vehicle_id?: string
          workflow_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_workflow_stage_id_fkey"
            columns: ["workflow_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_dealership_id: string | null
          email: string
          first_name: string
          id: string
          last_login_at: string | null
          last_name: string
          phone: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_dealership_id?: string | null
          email: string
          first_name: string
          id?: string
          last_login_at?: string | null
          last_name: string
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_dealership_id?: string | null
          email?: string
          first_name?: string
          id?: string
          last_login_at?: string | null
          last_name?: string
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_dealership_id_fkey"
            columns: ["default_dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_items: {
        Row: {
          actual_cost: number | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string
          created_by: string | null
          dealership_id: string
          denial_reason: string | null
          denied_at: string | null
          denied_by: string | null
          description: string
          estimated_cost: number | null
          id: string
          stage_id: string | null
          status: string
          updated_at: string
          vehicle_id: string
          vendor_name: string | null
        }
        Insert: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          dealership_id: string
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          stage_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
          vendor_name?: string | null
        }
        Update: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          dealership_id?: string
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          stage_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_items_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_items_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_notification_rule_recipients: {
        Row: {
          created_at: string
          id: string
          recipient_type: string
          stage_notification_rule_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_type?: string
          stage_notification_rule_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_type?: string
          stage_notification_rule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_notification_rule_recipie_stage_notification_rule_id_fkey"
            columns: ["stage_notification_rule_id"]
            isOneToOne: false
            referencedRelation: "stage_notification_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_notification_rules: {
        Row: {
          created_at: string
          dealership_id: string
          escalation_after_minutes: number | null
          escalation_enabled: boolean
          id: string
          notifications_enabled: boolean
          reminder_after_minutes: number | null
          reminder_enabled: boolean
          template_key_escalation: string | null
          template_key_reminder: string | null
          template_key_stage_entry: string | null
          updated_at: string
          updated_by_user_id: string | null
          workflow_stage_id: string
        }
        Insert: {
          created_at?: string
          dealership_id: string
          escalation_after_minutes?: number | null
          escalation_enabled?: boolean
          id?: string
          notifications_enabled?: boolean
          reminder_after_minutes?: number | null
          reminder_enabled?: boolean
          template_key_escalation?: string | null
          template_key_reminder?: string | null
          template_key_stage_entry?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          workflow_stage_id: string
        }
        Update: {
          created_at?: string
          dealership_id?: string
          escalation_after_minutes?: number | null
          escalation_enabled?: boolean
          id?: string
          notifications_enabled?: boolean
          reminder_after_minutes?: number | null
          reminder_enabled?: boolean
          template_key_escalation?: string | null
          template_key_reminder?: string | null
          template_key_stage_entry?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          workflow_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_notification_rules_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_notification_rules_workflow_stage_id_fkey"
            columns: ["workflow_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dealership_assignments: {
        Row: {
          created_at: string
          dealership_id: string
          id: string
          is_default: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dealership_id: string
          id?: string
          is_default?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dealership_id?: string
          id?: string
          is_default?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dealership_assignments_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_photos: {
        Row: {
          created_at: string
          dealership_id: string
          file_url: string
          id: string
          photo_type: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          dealership_id: string
          file_url: string
          id?: string
          photo_type?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          dealership_id?: string
          file_url?: string
          id?: string
          photo_type?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          dealership_id: string
          from_stage_id: string | null
          id: string
          note: string | null
          reason_code: string | null
          to_stage_id: string
          vehicle_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          dealership_id: string
          from_stage_id?: string | null
          id?: string
          note?: string | null
          reason_code?: string | null
          to_stage_id: string
          vehicle_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          dealership_id?: string
          from_stage_id?: string | null
          id?: string
          note?: string | null
          reason_code?: string | null
          to_stage_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_stage_history_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_stage_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          acquisition_source: string | null
          acv: number | null
          body_style: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          dealership_id: string
          drivetrain: string | null
          engine: string | null
          exterior_color: string | null
          fuel_type: string | null
          id: string
          interior_color: string | null
          lot_location: string | null
          make: string | null
          mileage: number
          model: string | null
          notes: string | null
          status: string
          stock_number: string | null
          trim: string | null
          updated_at: string
          vin: string
          year: number | null
        }
        Insert: {
          acquisition_source?: string | null
          acv?: number | null
          body_style?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          dealership_id: string
          drivetrain?: string | null
          engine?: string | null
          exterior_color?: string | null
          fuel_type?: string | null
          id?: string
          interior_color?: string | null
          lot_location?: string | null
          make?: string | null
          mileage: number
          model?: string | null
          notes?: string | null
          status?: string
          stock_number?: string | null
          trim?: string | null
          updated_at?: string
          vin: string
          year?: number | null
        }
        Update: {
          acquisition_source?: string | null
          acv?: number | null
          body_style?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          dealership_id?: string
          drivetrain?: string | null
          engine?: string | null
          exterior_color?: string | null
          fuel_type?: string | null
          id?: string
          interior_color?: string | null
          lot_location?: string | null
          make?: string | null
          mileage?: number
          model?: string | null
          notes?: string | null
          status?: string
          stock_number?: string | null
          trim?: string | null
          updated_at?: string
          vin?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      vin_decode_logs: {
        Row: {
          created_by: string | null
          decode_payload: Json | null
          decode_status: string
          decoded_at: string | null
          id: string
          vehicle_id: string | null
          vin: string
        }
        Insert: {
          created_by?: string | null
          decode_payload?: Json | null
          decode_status?: string
          decoded_at?: string | null
          id?: string
          vehicle_id?: string | null
          vin: string
        }
        Update: {
          created_by?: string | null
          decode_payload?: Json | null
          decode_status?: string
          decoded_at?: string | null
          id?: string
          vehicle_id?: string | null
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vin_decode_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          created_at: string
          dealership_id: string
          id: string
          is_active: boolean
          is_completion_stage: boolean
          is_required: boolean
          is_start_stage: boolean
          name: string
          sort_order: number
          stage_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealership_id: string
          id?: string
          is_active?: boolean
          is_completion_stage?: boolean
          is_required?: boolean
          is_start_stage?: boolean
          name: string
          sort_order?: number
          stage_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealership_id?: string
          id?: string
          is_active?: boolean
          is_completion_stage?: boolean
          is_required?: boolean
          is_start_stage?: boolean
          name?: string
          sort_order?: number
          stage_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_dealership_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_dealership: {
        Args: { _dealership_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "dealership_admin"
        | "recon_manager"
        | "department_user"
        | "read_only"
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
      app_role: [
        "platform_admin",
        "dealership_admin",
        "recon_manager",
        "department_user",
        "read_only",
      ],
    },
  },
} as const
