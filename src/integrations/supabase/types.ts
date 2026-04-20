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
      appointments: {
        Row: {
          id: string
          user_id: string
          date: string
          type: string
          title: string
          time: string | null
          location: string | null
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          type?: string
          title: string
          time?: string | null
          location?: string | null
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          type?: string
          title?: string
          time?: string | null
          location?: string | null
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: string
          title: string
          body?: string | null
          read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          accessories_config: Json | null
          amount_paid: number | null
          client_address: string
          client_name: string
          color_external: string | null
          color_internal: string | null
          created_at: string
          delivery_notes: string | null
          depth_mm: number | null
          dispute_notes: string | null
          estimated_delivery_date: string | null
          estimated_price: number | null
          external_space_mm: number | null
          frame_type: string | null
          glass_type: string | null
          handle_type: string | null
          has_box: boolean | null
          has_dispute: boolean | null
          has_modification: boolean | null
          has_mosquito_net: boolean | null
          has_motorization: boolean | null
          has_shutter: boolean | null
          height_mm: number
          id: string
          installation_type: string | null
          internal_space_mm: number | null
          is_level: boolean | null
          is_plumb: boolean | null
          is_square: boolean | null
          laying_type: string | null
          material: string | null
          modification_notes: string | null
          notes: string | null
          num_panels: number | null
          opening_direction: string | null
          order_group_id: string | null
          order_item_index: number | null
          order_total_items: number | null
          out_of_square_mm: number | null
          panel_type: string | null
          payment_method: string | null
          payment_status: string | null
          photo_urls: string[] | null
          product_type: string
          remove_old: boolean | null
          status: string
          survey_type: string
          updated_at: string
          user_id: string
          width_mm: number
        }
        Insert: {
          accessories_config?: Json | null
          amount_paid?: number | null
          client_address?: string
          client_name?: string
          color_external?: string | null
          color_internal?: string | null
          created_at?: string
          delivery_notes?: string | null
          depth_mm?: number | null
          dispute_notes?: string | null
          estimated_delivery_date?: string | null
          estimated_price?: number | null
          external_space_mm?: number | null
          frame_type?: string | null
          glass_type?: string | null
          handle_type?: string | null
          has_box?: boolean | null
          has_dispute?: boolean | null
          has_modification?: boolean | null
          has_mosquito_net?: boolean | null
          has_motorization?: boolean | null
          has_shutter?: boolean | null
          height_mm: number
          id?: string
          installation_type?: string | null
          internal_space_mm?: number | null
          is_level?: boolean | null
          is_plumb?: boolean | null
          is_square?: boolean | null
          laying_type?: string | null
          material?: string | null
          modification_notes?: string | null
          notes?: string | null
          num_panels?: number | null
          opening_direction?: string | null
          order_group_id?: string | null
          order_item_index?: number | null
          order_total_items?: number | null
          out_of_square_mm?: number | null
          panel_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          photo_urls?: string[] | null
          product_type: string
          remove_old?: boolean | null
          status?: string
          survey_type: string
          updated_at?: string
          user_id: string
          width_mm: number
        }
        Update: {
          accessories_config?: Json | null
          amount_paid?: number | null
          client_address?: string
          client_name?: string
          color_external?: string | null
          color_internal?: string | null
          created_at?: string
          delivery_notes?: string | null
          depth_mm?: number | null
          dispute_notes?: string | null
          estimated_delivery_date?: string | null
          estimated_price?: number | null
          external_space_mm?: number | null
          frame_type?: string | null
          glass_type?: string | null
          handle_type?: string | null
          has_box?: boolean | null
          has_dispute?: boolean | null
          has_modification?: boolean | null
          has_mosquito_net?: boolean | null
          has_motorization?: boolean | null
          has_shutter?: boolean | null
          height_mm?: number
          id?: string
          installation_type?: string | null
          internal_space_mm?: number | null
          is_level?: boolean | null
          is_plumb?: boolean | null
          is_square?: boolean | null
          laying_type?: string | null
          material?: string | null
          modification_notes?: string | null
          notes?: string | null
          num_panels?: number | null
          opening_direction?: string | null
          order_group_id?: string | null
          order_item_index?: number | null
          order_total_items?: number | null
          out_of_square_mm?: number | null
          panel_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          photo_urls?: string[] | null
          product_type?: string
          remove_old?: boolean | null
          status?: string
          survey_type?: string
          updated_at?: string
          user_id?: string
          width_mm?: number
        }
        Relationships: []
      }
      news: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          link: string | null
          published: boolean
          social_link: string | null
          summary: string
          tag: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
          published?: boolean
          social_link?: string | null
          summary?: string
          tag?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
          published?: boolean
          social_link?: string | null
          summary?: string
          tag?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_number: string | null
          measurement_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number?: string | null
          measurement_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number?: string | null
          measurement_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url: string
          sort_order?: number
          title?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          client_code: string
          company_name: string
          created_at: string
          email: string
          id: string
          logo_url: string | null
          phone: string
          supplier_logos: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          client_code?: string
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          phone?: string
          supplier_logos?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          client_code?: string
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          phone?: string
          supplier_logos?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_objectives: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          month: number | null
          period: string
          product_type: string | null
          target_amount: number | null
          target_count: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          month?: number | null
          period?: string
          product_type?: string | null
          target_amount?: number | null
          target_count?: number | null
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          month?: number | null
          period?: string
          product_type?: string | null
          target_amount?: number | null
          target_count?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "dealer" | "user"
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
      app_role: ["admin", "dealer", "user"],
    },
  },
} as const
