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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          issue_type: Database["public"]["Enums"]["issue_type"]
          order_id: string
          resolved_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type: Database["public"]["Enums"]["issue_type"]
          order_id: string
          resolved_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: Database["public"]["Enums"]["issue_type"]
          order_id?: string
          resolved_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          base_item_cost: number | null
          chargeable_weight: number | null
          color: string | null
          created_at: string
          customs: number | null
          discount: number | null
          domestic_shipping: number | null
          domestic_tracking: string | null
          eta: string | null
          height_in: number | null
          id: string
          international_shipping: number | null
          international_tracking: string | null
          is_paid: boolean | null
          length_in: number | null
          other_fees: number | null
          other_fees_note: string | null
          payment_receipt_url: string | null
          product_image: string | null
          product_title: string | null
          product_url: string
          promo_code_id: string | null
          quantity: number
          size: string | null
          special_notes: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          tax: number | null
          total_amount: number | null
          updated_at: string
          user_id: string
          warehouse_photos: Json | null
          weight_lbs: number | null
          width_in: number | null
        }
        Insert: {
          base_item_cost?: number | null
          chargeable_weight?: number | null
          color?: string | null
          created_at?: string
          customs?: number | null
          discount?: number | null
          domestic_shipping?: number | null
          domestic_tracking?: string | null
          eta?: string | null
          height_in?: number | null
          id?: string
          international_shipping?: number | null
          international_tracking?: string | null
          is_paid?: boolean | null
          length_in?: number | null
          other_fees?: number | null
          other_fees_note?: string | null
          payment_receipt_url?: string | null
          product_image?: string | null
          product_title?: string | null
          product_url: string
          promo_code_id?: string | null
          quantity?: number
          size?: string | null
          special_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tax?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
          warehouse_photos?: Json | null
          weight_lbs?: number | null
          width_in?: number | null
        }
        Update: {
          base_item_cost?: number | null
          chargeable_weight?: number | null
          color?: string | null
          created_at?: string
          customs?: number | null
          discount?: number | null
          domestic_shipping?: number | null
          domestic_tracking?: string | null
          eta?: string | null
          height_in?: number | null
          id?: string
          international_shipping?: number | null
          international_tracking?: string | null
          is_paid?: boolean | null
          length_in?: number | null
          other_fees?: number | null
          other_fees_note?: string | null
          payment_receipt_url?: string | null
          product_image?: string | null
          product_title?: string | null
          product_url?: string
          promo_code_id?: string | null
          quantity?: number
          size?: string | null
          special_notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tax?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          warehouse_photos?: Json | null
          weight_lbs?: number | null
          width_in?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cache: {
        Row: {
          created_at: string
          height_in: number | null
          id: string
          image_url: string | null
          length_in: number | null
          updated_at: string
          url: string
          weight_lbs: number | null
          width_in: number | null
        }
        Insert: {
          created_at?: string
          height_in?: number | null
          id?: string
          image_url?: string | null
          length_in?: number | null
          updated_at?: string
          url: string
          weight_lbs?: number | null
          width_in?: number | null
        }
        Update: {
          created_at?: string
          height_in?: number | null
          id?: string
          image_url?: string | null
          length_in?: number | null
          updated_at?: string
          url?: string
          weight_lbs?: number | null
          width_in?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          full_name: string
          id: string
          is_verified: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
        }
        Relationships: []
      }
      shipping_weight_rules: {
        Row: {
          created_at: string
          id: string
          keyword: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          weight?: number
        }
        Relationships: []
      }
      stores: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          website_url: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          website_url: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          website_url?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "user"
      issue_type:
        | "wrong_item"
        | "broken_item"
        | "missing_item"
        | "wrong_size"
        | "wrong_color"
        | "other"
      order_status:
        | "pending_payment"
        | "payment_received"
        | "purchasing"
        | "purchased"
        | "domestic_shipping"
        | "at_warehouse"
        | "international_shipping"
        | "customs"
        | "out_for_delivery"
        | "delivered"
        | "under_investigation"
        | "cancelled"
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
      app_role: ["admin", "user"],
      issue_type: [
        "wrong_item",
        "broken_item",
        "missing_item",
        "wrong_size",
        "wrong_color",
        "other",
      ],
      order_status: [
        "pending_payment",
        "payment_received",
        "purchasing",
        "purchased",
        "domestic_shipping",
        "at_warehouse",
        "international_shipping",
        "customs",
        "out_for_delivery",
        "delivered",
        "under_investigation",
        "cancelled",
      ],
    },
  },
} as const
