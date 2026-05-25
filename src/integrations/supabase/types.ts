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
          builder_session_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          context_message: string | null
          created_at: string
          error_message: string | null
          id: string
          implementador_id: string | null
          inputs: Json
          output: Json | null
          source_solution_id: string | null
          status: Database["public"]["Enums"]["builder_status"]
          status_note: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          builder_session_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          context_message?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          implementador_id?: string | null
          inputs?: Json
          output?: Json | null
          source_solution_id?: string | null
          status?: Database["public"]["Enums"]["builder_status"]
          status_note?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          builder_session_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          context_message?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          implementador_id?: string | null
          inputs?: Json
          output?: Json | null
          source_solution_id?: string | null
          status?: Database["public"]["Enums"]["builder_status"]
          status_note?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_projects_builder_session_id_fkey"
            columns: ["builder_session_id"]
            isOneToOne: false
            referencedRelation: "builder_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_projects_source_solution_id_fkey"
            columns: ["source_solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_sessions: {
        Row: {
          answers: Json
          created_at: string
          current_step: number
          generated_n8n: string | null
          generated_prompt: string | null
          id: string
          solution_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          current_step?: number
          generated_n8n?: string | null
          generated_prompt?: string | null
          id?: string
          solution_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          current_step?: number
          generated_n8n?: string | null
          generated_prompt?: string | null
          id?: string
          solution_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_sessions_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string | null
          order_index: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          order_index?: number
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          order_index?: number
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          order_index: number
          title: string
          video_url: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number
          title: string
          video_url?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
          onboarding_completed: boolean | null
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
          onboarding_completed?: boolean | null
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
          onboarding_completed?: boolean | null
          role?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sales_prospects: {
        Row: {
          analysis: Json
          company_name: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          documents: Json
          id: string
          industry: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
          what_sells: string | null
        }
        Insert: {
          analysis?: Json
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          documents?: Json
          id?: string
          industry?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
          what_sells?: string | null
        }
        Update: {
          analysis?: Json
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          documents?: Json
          id?: string
          industry?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
          what_sells?: string | null
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
      solution_comments: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number | null
          solution_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          solution_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          solution_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_comments_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_steps_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          solution_id: string
          step: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          solution_id: string
          step: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          solution_id?: string
          step?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_steps_progress_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_tools: {
        Row: {
          display_order: number | null
          is_essential: boolean
          solution_id: string
          tool_id: string
        }
        Insert: {
          display_order?: number | null
          is_essential?: boolean
          solution_id: string
          tool_id: string
        }
        Update: {
          display_order?: number | null
          is_essential?: boolean
          solution_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_tools_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions: {
        Row: {
          builder_questions: Json | null
          category: Database["public"]["Enums"]["solution_category"]
          checklist_items: string[] | null
          cover_image_url: string | null
          created_at: string
          development_time_minutes: number | null
          difficulty: Database["public"]["Enums"]["solution_difficulty"]
          estimated_time: string
          featured: boolean | null
          features: string[]
          icon_name: string
          id: string
          integrations: string[]
          is_featured: boolean
          long_description: string
          lovable_remix_url: string | null
          n8n_template: string | null
          platform_investment: string | null
          prompt_template: string | null
          resources: Json
          roi_estimate: string
          short_description: string
          slug: string
          status: string | null
          title: string
          tokens_per_execution: number | null
          tools_required: string[]
          video_url: string | null
        }
        Insert: {
          builder_questions?: Json | null
          category: Database["public"]["Enums"]["solution_category"]
          checklist_items?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          development_time_minutes?: number | null
          difficulty: Database["public"]["Enums"]["solution_difficulty"]
          estimated_time: string
          featured?: boolean | null
          features?: string[]
          icon_name?: string
          id?: string
          integrations?: string[]
          is_featured?: boolean
          long_description: string
          lovable_remix_url?: string | null
          n8n_template?: string | null
          platform_investment?: string | null
          prompt_template?: string | null
          resources?: Json
          roi_estimate: string
          short_description: string
          slug: string
          status?: string | null
          title: string
          tokens_per_execution?: number | null
          tools_required?: string[]
          video_url?: string | null
        }
        Update: {
          builder_questions?: Json | null
          category?: Database["public"]["Enums"]["solution_category"]
          checklist_items?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          development_time_minutes?: number | null
          difficulty?: Database["public"]["Enums"]["solution_difficulty"]
          estimated_time?: string
          featured?: boolean | null
          features?: string[]
          icon_name?: string
          id?: string
          integrations?: string[]
          is_featured?: boolean
          long_description?: string
          lovable_remix_url?: string | null
          n8n_template?: string | null
          platform_investment?: string | null
          prompt_template?: string | null
          resources?: Json
          roi_estimate?: string
          short_description?: string
          slug?: string
          status?: string | null
          title?: string
          tokens_per_execution?: number | null
          tools_required?: string[]
          video_url?: string | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          cost_label: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          monthly_cost_usd: number | null
          name: string
          slug: string
          website: string | null
        }
        Insert: {
          cost_label?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          monthly_cost_usd?: number | null
          name: string
          slug: string
          website?: string | null
        }
        Update: {
          cost_label?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          monthly_cost_usd?: number | null
          name?: string
          slug?: string
          website?: string | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_implementer_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      builder_status:
        | "generating"
        | "ready"
        | "error"
        | "pending"
        | "completed"
        | "assigned"
        | "in_progress"
        | "cancelled"
      solution_category:
        | "ventas"
        | "marketing"
        | "atencion"
        | "finanzas"
        | "operaciones"
        | "rrhh"
        | "modelos_ia"
        | "juridico"
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
      builder_status: [
        "generating",
        "ready",
        "error",
        "pending",
        "completed",
        "assigned",
        "in_progress",
        "cancelled",
      ],
      solution_category: [
        "ventas",
        "marketing",
        "atencion",
        "finanzas",
        "operaciones",
        "rrhh",
        "modelos_ia",
        "juridico",
      ],
      solution_difficulty: ["principiante", "intermedio", "avanzado"],
    },
  },
} as const
