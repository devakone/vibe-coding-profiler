export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analysis_insights: {
        Row: {
          generated_at: string
          generator_version: string
          id: string
          insights_json: Json
          job_id: string
          persona_confidence: string | null
          persona_delta: Json
          persona_id: string | null
          persona_label: string | null
          share_template: Json
          sources: Json
          tech_signals: Json
        }
        Insert: {
          generated_at?: string
          generator_version?: string
          id?: string
          insights_json: Json
          job_id: string
          persona_confidence?: string | null
          persona_delta?: Json
          persona_id?: string | null
          persona_label?: string | null
          share_template?: Json
          sources?: Json
          tech_signals?: Json
        }
        Update: {
          generated_at?: string
          generator_version?: string
          id?: string
          insights_json?: Json
          job_id?: string
          persona_confidence?: string | null
          persona_delta?: Json
          persona_id?: string | null
          persona_label?: string | null
          share_template?: Json
          sources?: Json
          tech_signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analysis_insights_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          analyzer_version: string
          commit_count: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          repo_id: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          analyzer_version?: string
          commit_count?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          repo_id: string
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          analyzer_version?: string
          commit_count?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          repo_id?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "repos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_metrics: {
        Row: {
          computed_at: string
          events_json: Json
          id: string
          job_id: string
          metrics_json: Json
        }
        Insert: {
          computed_at?: string
          events_json: Json
          id?: string
          job_id: string
          metrics_json: Json
        }
        Update: {
          computed_at?: string
          events_json?: Json
          id?: string
          job_id?: string
          metrics_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analysis_metrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_reports: {
        Row: {
          evidence_json: Json
          generated_at: string
          id: string
          job_id: string
          llm_model: string
          narrative_json: Json
          vibe_type: string | null
        }
        Insert: {
          evidence_json: Json
          generated_at?: string
          id?: string
          job_id: string
          llm_model?: string
          narrative_json: Json
          vibe_type?: string | null
        }
        Update: {
          evidence_json?: Json
          generated_at?: string
          id?: string
          job_id?: string
          llm_model?: string
          narrative_json?: Json
          vibe_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      github_accounts: {
        Row: {
          created_at: string
          encrypted_token: string
          github_user_id: number
          id: string
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_token: string
          github_user_id: number
          id?: string
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_token?: string
          github_user_id?: number
          id?: string
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_coverage_reports: {
        Row: {
          created_at: string
          created_by: string | null
          fallback_count: number
          fallback_percentage: number
          id: string
          notes: string | null
          persona_counts: Json
          real_user_fallbacks: Json
          sample_fallbacks: Json
          step_size: number
          total_combinations: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fallback_count: number
          fallback_percentage: number
          id?: string
          notes?: string | null
          persona_counts: Json
          real_user_fallbacks?: Json
          sample_fallbacks: Json
          step_size?: number
          total_combinations: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fallback_count?: number
          fallback_percentage?: number
          id?: string
          notes?: string | null
          persona_counts?: Json
          real_user_fallbacks?: Json
          sample_fallbacks?: Json
          step_size?: number
          total_combinations?: number
        }
        Relationships: [
          {
            foreignKeyName: "persona_coverage_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      repos: {
        Row: {
          created_at: string
          default_branch: string
          full_name: string
          github_id: number
          id: string
          is_private: boolean
          name: string
          owner: string
        }
        Insert: {
          created_at?: string
          default_branch?: string
          full_name: string
          github_id: number
          id?: string
          is_private?: boolean
          name: string
          owner: string
        }
        Update: {
          created_at?: string
          default_branch?: string
          full_name?: string
          github_id?: number
          id?: string
          is_private?: boolean
          name?: string
          owner?: string
        }
        Relationships: []
      }
      user_action_rate_limits: {
        Row: {
          action: string
          count: number
          created_at: string
          updated_at: string
          user_id: string
          window_key: number
          window_seconds: number
        }
        Insert: {
          action: string
          count?: number
          created_at?: string
          updated_at?: string
          user_id: string
          window_key: number
          window_seconds: number
        }
        Update: {
          action?: string
          count?: number
          created_at?: string
          updated_at?: string
          user_id?: string
          window_key?: number
          window_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_action_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_history: {
        Row: {
          created_at: string | null
          id: string
          llm_key_source: string | null
          llm_model: string | null
          profile_snapshot: Json
          trigger_job_id: string | null
          user_id: string
          version_number: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          llm_key_source?: string | null
          llm_model?: string | null
          profile_snapshot: Json
          trigger_job_id?: string | null
          user_id: string
          version_number?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          llm_key_source?: string | null
          llm_model?: string | null
          profile_snapshot?: Json
          trigger_job_id?: string | null
          user_id?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_history_trigger_job_id_fkey"
            columns: ["trigger_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          axes_json: Json
          cards_json: Json | null
          created_at: string | null
          id: string
          job_ids: string[]
          llm_key_source: string | null
          llm_model: string | null
          narrative_json: Json | null
          persona_confidence: string
          persona_id: string
          persona_name: string
          persona_score: number
          persona_tagline: string | null
          regenerating: boolean
          repo_personas_json: Json
          total_commits: number
          total_repos: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          axes_json?: Json
          cards_json?: Json | null
          created_at?: string | null
          id?: string
          job_ids?: string[]
          llm_key_source?: string | null
          llm_model?: string | null
          narrative_json?: Json | null
          persona_confidence: string
          persona_id: string
          persona_name: string
          persona_score?: number
          persona_tagline?: string | null
          regenerating?: boolean
          repo_personas_json?: Json
          total_commits?: number
          total_repos?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          axes_json?: Json
          cards_json?: Json | null
          created_at?: string | null
          id?: string
          job_ids?: string[]
          llm_key_source?: string | null
          llm_model?: string | null
          narrative_json?: Json | null
          persona_confidence?: string
          persona_id?: string
          persona_name?: string
          persona_score?: number
          persona_tagline?: string | null
          regenerating?: boolean
          repo_personas_json?: Json
          total_commits?: number
          total_repos?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_repos: {
        Row: {
          connected_at: string
          disconnected_at: string | null
          id: string
          repo_id: string
          settings_json: Json
          user_id: string
        }
        Insert: {
          connected_at?: string
          disconnected_at?: string | null
          id?: string
          repo_id: string
          settings_json?: Json
          user_id: string
        }
        Update: {
          connected_at?: string
          disconnected_at?: string | null
          id?: string
          repo_id?: string
          settings_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_repos_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "repos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_repos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          github_id: number | null
          github_username: string | null
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          github_id?: number | null
          github_username?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          github_id?: number | null
          github_username?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      vibe_insights: {
        Row: {
          axes_json: Json
          cards_json: Json | null
          evidence_json: Json | null
          generated_at: string
          id: string
          job_id: string
          persona_confidence: string
          persona_id: string
          persona_name: string
          persona_score: number
          persona_tagline: string | null
          updated_at: string
          version: string
        }
        Insert: {
          axes_json?: Json
          cards_json?: Json | null
          evidence_json?: Json | null
          generated_at?: string
          id?: string
          job_id: string
          persona_confidence: string
          persona_id: string
          persona_name: string
          persona_score?: number
          persona_tagline?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          axes_json?: Json
          cards_json?: Json | null
          evidence_json?: Json | null
          generated_at?: string
          id?: string
          job_id?: string
          persona_confidence?: string
          persona_id?: string
          persona_name?: string
          persona_score?: number
          persona_tagline?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_insights_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_analysis_job: {
        Args: { p_analyzer_version: string }
        Returns: string
      }
      consume_user_action_rate_limit: {
        Args: {
          p_action: string
          p_max_count: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

