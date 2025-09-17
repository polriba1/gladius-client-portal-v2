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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_client_access: {
        Row: {
          admin_user_id: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          admin_user_id: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          admin_user_id?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs_salutdental: {
        Row: {
          audio_call: string | null
          call_duration_seconds: number | null
          call_transcript: string | null
          created_at: string
          id: number
          phone_id: string | null
          score: string | null
          summary: string | null
        }
        Insert: {
          audio_call?: string | null
          call_duration_seconds?: number | null
          call_transcript?: string | null
          created_at?: string
          id?: number
          phone_id?: string | null
          score?: string | null
          summary?: string | null
        }
        Update: {
          audio_call?: string | null
          call_duration_seconds?: number | null
          call_transcript?: string | null
          created_at?: string
          id?: number
          phone_id?: string | null
          score?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      call_logs_tecnics_bcn_sat: {
        Row: {
          call_cost: string | null
          call_duration_seconds: string | null
          call_intent: string | null
          call_recording: string | null
          call_summary: string | null
          call_transcript: string | null
          created_at: string
          id: number
          phone_id: string | null
          score: string | null
        }
        Insert: {
          call_cost?: string | null
          call_duration_seconds?: string | null
          call_intent?: string | null
          call_recording?: string | null
          call_summary?: string | null
          call_transcript?: string | null
          created_at?: string
          id?: number
          phone_id?: string | null
          score?: string | null
        }
        Update: {
          call_cost?: string | null
          call_duration_seconds?: string | null
          call_intent?: string | null
          call_recording?: string | null
          call_summary?: string | null
          call_transcript?: string | null
          created_at?: string
          id?: number
          phone_id?: string | null
          score?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          color_principal: string | null
          id: string
          logo_url: string | null
          nom: string
          template: string | null
        }
        Insert: {
          color_principal?: string | null
          id?: string
          logo_url?: string | null
          nom: string
          template?: string | null
        }
        Update: {
          color_principal?: string | null
          id?: string
          logo_url?: string | null
          nom?: string
          template?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          brand: string | null
          client_id: string
          contract_number: string | null
          created_at: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id: string
          installation_date: string | null
          location_description: string | null
          model: string | null
          notes: string | null
          serial_number: string | null
          updated_at: string
          warranty_expires: string | null
        }
        Insert: {
          brand?: string | null
          client_id: string
          contract_number?: string | null
          created_at?: string
          equipment_type: Database["public"]["Enums"]["equipment_type"]
          id?: string
          installation_date?: string | null
          location_description?: string | null
          model?: string | null
          notes?: string | null
          serial_number?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Update: {
          brand?: string | null
          client_id?: string
          contract_number?: string | null
          created_at?: string
          equipment_type?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          installation_date?: string | null
          location_description?: string | null
          model?: string | null
          notes?: string | null
          serial_number?: string | null
          updated_at?: string
          warranty_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hvac_tickets: {
        Row: {
          access_instructions: string | null
          actual_cost: number | null
          actual_end: string | null
          actual_start: string | null
          assigned_at: string | null
          assigned_to: string | null
          call_recording_url: string | null
          call_transcript: string | null
          client_id: string
          closed_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          dispatcher_id: string | null
          en_route_at: string | null
          equipment_description: string | null
          equipment_id: string | null
          estimated_cost: number | null
          estimated_duration: number | null
          id: string
          internal_notes: string | null
          invoice_id: string | null
          invoiced_at: string | null
          labor_hours: number | null
          labor_rate: number | null
          linked_call_id: number | null
          on_site_at: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          public_notes: string | null
          quote_id: string | null
          requester_email: string | null
          requester_name: string
          requester_phone: string
          scheduled_at: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          site_address: string
          site_lat: number | null
          site_lng: number | null
          sla_breached: boolean | null
          sla_resolution_due: string | null
          sla_resolution_hours: number | null
          sla_response_due: string | null
          sla_response_hours: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          symptoms: string | null
          tags: string[] | null
          ticket_number: string
          triaged_at: string | null
          updated_at: string
        }
        Insert: {
          access_instructions?: string | null
          actual_cost?: number | null
          actual_end?: string | null
          actual_start?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          call_recording_url?: string | null
          call_transcript?: string | null
          client_id: string
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          dispatcher_id?: string | null
          en_route_at?: string | null
          equipment_description?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          estimated_duration?: number | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          invoiced_at?: string | null
          labor_hours?: number | null
          labor_rate?: number | null
          linked_call_id?: number | null
          on_site_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          public_notes?: string | null
          quote_id?: string | null
          requester_email?: string | null
          requester_name: string
          requester_phone: string
          scheduled_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          site_address: string
          site_lat?: number | null
          site_lng?: number | null
          sla_breached?: boolean | null
          sla_resolution_due?: string | null
          sla_resolution_hours?: number | null
          sla_response_due?: string | null
          sla_response_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          symptoms?: string | null
          tags?: string[] | null
          ticket_number: string
          triaged_at?: string | null
          updated_at?: string
        }
        Update: {
          access_instructions?: string | null
          actual_cost?: number | null
          actual_end?: string | null
          actual_start?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          call_recording_url?: string | null
          call_transcript?: string | null
          client_id?: string
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          dispatcher_id?: string | null
          en_route_at?: string | null
          equipment_description?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          estimated_duration?: number | null
          id?: string
          internal_notes?: string | null
          invoice_id?: string | null
          invoiced_at?: string | null
          labor_hours?: number | null
          labor_rate?: number | null
          linked_call_id?: number | null
          on_site_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          public_notes?: string | null
          quote_id?: string | null
          requester_email?: string | null
          requester_name?: string
          requester_phone?: string
          scheduled_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          site_address?: string
          site_lat?: number | null
          site_lng?: number | null
          sla_breached?: boolean | null
          sla_resolution_due?: string | null
          sla_resolution_hours?: number | null
          sla_response_due?: string | null
          sla_response_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          symptoms?: string | null
          tags?: string[] | null
          ticket_number?: string
          triaged_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hvac_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hvac_tickets_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hvac_tickets_linked_call_id_fkey"
            columns: ["linked_call_id"]
            isOneToOne: false
            referencedRelation: "call_logs_tecnics_bcn_sat"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          in_stock: number | null
          min_stock: number | null
          name: string
          part_number: string
          supplier: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          in_stock?: number | null
          min_stock?: number | null
          name: string
          part_number: string
          supplier?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          in_stock?: number | null
          min_stock?: number | null
          name?: string
          part_number?: string
          supplier?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_client_id: string | null
          admin_role: Database["public"]["Enums"]["admin_role"] | null
          can_switch_clients: boolean | null
          client_id: string
          id: string
        }
        Insert: {
          active_client_id?: string | null
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          can_switch_clients?: boolean | null
          client_id: string
          id: string
        }
        Update: {
          active_client_id?: string | null
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          can_switch_clients?: boolean | null
          client_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_client_id_fkey"
            columns: ["active_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_activity: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "hvac_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_public: boolean | null
          ticket_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_public?: boolean | null
          ticket_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          ticket_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "hvac_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_parts: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          part_id: string
          quantity: number
          ticket_id: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          part_id: string
          quantity?: number
          ticket_id: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          part_id?: string
          quantity?: number
          ticket_id?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "hvac_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_salutdental: {
        Row: {
          ai_notes: string | null
          created_at: string
          id: number
          nota_assistant: string | null
          phone_id: string | null
          ticket_status: string | null
          ticket_type: string | null
          user_name: string | null
          user_status: string | null
        }
        Insert: {
          ai_notes?: string | null
          created_at?: string
          id?: number
          nota_assistant?: string | null
          phone_id?: string | null
          ticket_status?: string | null
          ticket_type?: string | null
          user_name?: string | null
          user_status?: string | null
        }
        Update: {
          ai_notes?: string | null
          created_at?: string
          id?: number
          nota_assistant?: string | null
          phone_id?: string | null
          ticket_status?: string | null
          ticket_type?: string | null
          user_name?: string | null
          user_status?: string | null
        }
        Relationships: []
      }
      tickets_tecnics_bcn_sat: {
        Row: {
          agent_status: string | null
          ai_notes: string | null
          created_at: string
          id: number
          notes: string | null
          phone_id: string | null
          ticket_status: string | null
          ticket_type: string | null
          user_name: string | null
        }
        Insert: {
          agent_status?: string | null
          ai_notes?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          phone_id?: string | null
          ticket_status?: string | null
          ticket_type?: string | null
          user_name?: string | null
        }
        Update: {
          agent_status?: string | null
          ai_notes?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          phone_id?: string | null
          ticket_status?: string | null
          ticket_type?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_accessible_clients: {
        Args: { _user_id: string }
        Returns: {
          color_principal: string | null
          id: string
          logo_url: string | null
          nom: string
          template: string | null
        }[]
      }
      get_profile_security_fields: {
        Args: { _id: string }
        Returns: {
          admin_role: Database["public"]["Enums"]["admin_role"]
          can_switch_clients: boolean
          client_id: string
        }[]
      }
      get_salutdental_calls: {
        Args: Record<PropertyKey, never>
        Returns: {
          "Audio Trucada": string
          created_at: string
          Data: string
          id: number
          Resum: string
          Score: string
          Telèfon: string
          "Temps Trucada": string
          "Transcripció Trucada": string
        }[]
      }
      get_user_client_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_security_event: {
        Args: {
          details?: Json
          event_type: string
          record_id?: string
          table_name: string
        }
        Returns: undefined
      }
      switch_admin_client_context: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role: "super_admin" | "client_admin" | "user"
      equipment_type:
        | "air_conditioner"
        | "heat_pump"
        | "furnace"
        | "boiler"
        | "water_heater"
        | "ventilation_system"
        | "thermostat"
        | "air_filter"
        | "ductwork"
        | "other"
      ticket_priority: "emergency" | "same_day" | "standard"
      ticket_status:
        | "created"
        | "triaged"
        | "scheduled"
        | "assigned"
        | "en_route"
        | "on_site"
        | "in_progress"
        | "parts_needed"
        | "completed"
        | "invoiced"
        | "closed"
        | "cancelled"
      user_role: "admin" | "dispatcher" | "technician" | "viewer"
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
      admin_role: ["super_admin", "client_admin", "user"],
      equipment_type: [
        "air_conditioner",
        "heat_pump",
        "furnace",
        "boiler",
        "water_heater",
        "ventilation_system",
        "thermostat",
        "air_filter",
        "ductwork",
        "other",
      ],
      ticket_priority: ["emergency", "same_day", "standard"],
      ticket_status: [
        "created",
        "triaged",
        "scheduled",
        "assigned",
        "en_route",
        "on_site",
        "in_progress",
        "parts_needed",
        "completed",
        "invoiced",
        "closed",
        "cancelled",
      ],
      user_role: ["admin", "dispatcher", "technician", "viewer"],
    },
  },
} as const
