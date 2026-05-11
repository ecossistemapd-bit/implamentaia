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
      allowed_emails: {
        Row: {
          created_at: string
          email: string
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      builder_projects: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          inputs: Json
          output: Json | null
          source_solution_id: string | null
          status: Database["public"]["Enums"]["builder_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          inputs?: Json
          output?: Json | null
          source_solution_id?: string | null
          status?: Database["public"]["Enums"]["builder_status"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          inputs?: Json
          output?: Json | null
          source_solution_id?: string | null
          status?: Database["public"]["Enums"]["builder_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_projects_source_solution_id_fkey"
            columns: ["source_solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          industry: string | null
          role: string | null
          team_size: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          industry?: string | null
          role?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          role?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_solutions: {
        Row: {
          id: string
          saved_at: string
          solution_id: string
          user_id: string
        }
        Insert: {
          id?: string
          saved_at?: string
          solution_id: string
          user_id: string
        }
        Update: {
          id?: string
          saved_at?: string
          solution_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_solutions_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions: {
        Row: {
          category: Database["public"]["Enums"]["solution_category"]
          created_at: string
          difficulty: Database["public"]["Enums"]["solution_difficulty"]
          estimated_time: string
          features: string[]
          icon_name: string
          id: string
          integrations: string[]
          is_featured: boolean
          long_description: string
          prompt_template: string | null
          roi_estimate: string
          short_description: string
          slug: string
          title: string
          tools_required: string[]
        }
        Insert: {
          category: Database["public"]["Enums"]["solution_category"]
          created_at?: string
          difficulty: Database["public"]["Enums"]["solution_difficulty"]
          estimated_time: string
          features?: string[]
          icon_name?: string
          id?: string
          integrations?: string[]
          is_featured?: boolean
          long_description: string
          prompt_template?: string | null
          roi_estimate: string
          short_description: string
          slug: string
          title: string
          tools_required?: string[]
        }
        Update: {
          category?: Database["public"]["Enums"]["solution_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["solution_difficulty"]
          estimated_time?: string
          features?: string[]
          icon_name?: string
          id?: string
          integrations?: string[]
          is_featured?: boolean
          long_description?: string
          prompt_template?: string | null
          roi_estimate?: string
          short_description?: string
          slug?: string
          title?: string
          tools_required?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      builder_status: "generating" | "ready" | "error"
      solution_category:
        | "ventas"
        | "marketing"
        | "atencion"
        | "finanzas"
        | "operaciones"
        | "rrhh"
      solution_difficulty: "principiante" | "intermedio" | "avanzado"
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
      builder_status: ["generating", "ready", "error"],
      solution_category: [
        "ventas",
        "marketing",
        "atencion",
        "finanzas",
        "operaciones",
        "rrhh",
      ],
      solution_difficulty: ["principiante", "intermedio", "avanzado"],
    },
  },
} as const
