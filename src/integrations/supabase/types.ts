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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          analysis_type: string
          created_at: string
          id: string
          provider: string
          result: Json
          subject_id: string
          subject_type: string
        }
        Insert: {
          analysis_type: string
          created_at?: string
          id?: string
          provider?: string
          result: Json
          subject_id: string
          subject_type: string
        }
        Update: {
          analysis_type?: string
          created_at?: string
          id?: string
          provider?: string
          result?: Json
          subject_id?: string
          subject_type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          problem_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          problem_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
          message: string | null
          recipient_id: string
          requester_id: string
          responded_at: string | null
          startup_id: string | null
          status: Database["public"]["Enums"]["connection_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          recipient_id: string
          requester_id: string
          responded_at?: string | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          recipient_id?: string
          requester_id?: string
          responded_at?: string | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "connections_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          ai_disclaimer_accepted: boolean
          created_at: string
          id: string
          policy_version: string
          privacy_accepted: boolean
          terms_accepted: boolean
          user_id: string
        }
        Insert: {
          ai_disclaimer_accepted: boolean
          created_at?: string
          id?: string
          policy_version: string
          privacy_accepted: boolean
          terms_accepted: boolean
          user_id: string
        }
        Update: {
          ai_disclaimer_accepted?: boolean
          created_at?: string
          id?: string
          policy_version?: string
          privacy_accepted?: boolean
          terms_accepted?: boolean
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          is_private: boolean
          name: string
          owner_id: string
          startup_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          id?: string
          is_private?: boolean
          name: string
          owner_id: string
          startup_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          is_private?: boolean
          name?: string
          owner_id?: string
          startup_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_profiles: {
        Row: {
          industry: string | null
          industry_interests: string[]
          linkedin_url: string | null
          skills: string[]
          startup_experience: string | null
          startup_status: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          industry?: string | null
          industry_interests?: string[]
          linkedin_url?: string | null
          skills?: string[]
          startup_experience?: string | null
          startup_status?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          industry?: string | null
          industry_interests?: string[]
          linkedin_url?: string | null
          skills?: string[]
          startup_experience?: string | null
          startup_status?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      general_profiles: {
        Row: {
          interests: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          interests?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          interests?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investor_profiles: {
        Row: {
          firm_name: string | null
          investment_interests: string[]
          investment_max: number | null
          investment_min: number | null
          investor_type: string | null
          preferred_industries: string[]
          preferred_stages: string[]
          professional_profile: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          website: string | null
        }
        Insert: {
          firm_name?: string | null
          investment_interests?: string[]
          investment_max?: number | null
          investment_min?: number | null
          investor_type?: string | null
          preferred_industries?: string[]
          preferred_stages?: string[]
          professional_profile?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website?: string | null
        }
        Update: {
          firm_name?: string | null
          investment_interests?: string[]
          investment_max?: number | null
          investment_min?: number | null
          investor_type?: string | null
          preferred_industries?: string[]
          preferred_stages?: string[]
          professional_profile?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          connection_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          connection_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          connection_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          startup_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          startup_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          startup_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      problems: {
        Row: {
          author_id: string
          category: string
          comment_count: number
          created_at: string
          description: string
          frequency: string | null
          id: string
          image_url: string | null
          location: string | null
          tags: string[]
          title: string
          updated_at: string
          upvote_count: number
          who_faces: string | null
        }
        Insert: {
          author_id: string
          category: string
          comment_count?: number
          created_at?: string
          description: string
          frequency?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          upvote_count?: number
          who_faces?: string | null
        }
        Update: {
          author_id?: string
          category?: string
          comment_count?: number
          created_at?: string
          description?: string
          frequency?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          upvote_count?: number
          who_faces?: string | null
        }
        Relationships: []
      }
      profile_private: {
        Row: {
          email: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_public: boolean
          location: string | null
          notification_prefs: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          id: string
          is_public?: boolean
          location?: string | null
          notification_prefs?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_public?: boolean
          location?: string | null
          notification_prefs?: Json
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      startups: {
        Row: {
          business_model: string | null
          created_at: string
          description: string | null
          founder_id: string
          funding_requirement: number | null
          id: string
          industry: string | null
          is_public: boolean
          location: string | null
          logo_url: string | null
          market_info: string | null
          name: string
          problem: string | null
          problem_id: string | null
          solution: string | null
          stage: string
          tagline: string | null
          target_users: string | null
          team: Json
          updated_at: string
          validation_score: number | null
          website: string | null
        }
        Insert: {
          business_model?: string | null
          created_at?: string
          description?: string | null
          founder_id: string
          funding_requirement?: number | null
          id?: string
          industry?: string | null
          is_public?: boolean
          location?: string | null
          logo_url?: string | null
          market_info?: string | null
          name: string
          problem?: string | null
          problem_id?: string | null
          solution?: string | null
          stage?: string
          tagline?: string | null
          target_users?: string | null
          team?: Json
          updated_at?: string
          validation_score?: number | null
          website?: string | null
        }
        Update: {
          business_model?: string | null
          created_at?: string
          description?: string | null
          founder_id?: string
          funding_requirement?: number | null
          id?: string
          industry?: string | null
          is_public?: boolean
          location?: string | null
          logo_url?: string | null
          market_info?: string | null
          name?: string
          problem?: string | null
          problem_id?: string | null
          solution?: string | null
          stage?: string
          tagline?: string | null
          target_users?: string | null
          team?: Json
          updated_at?: string
          validation_score?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          id: string
          options: Json
          position: number
          prompt: string
          required: boolean
          survey_id: string
          type: string
        }
        Insert: {
          id?: string
          options?: Json
          position?: number
          prompt: string
          required?: boolean
          survey_id: string
          type: string
        }
        Update: {
          id?: string
          options?: Json
          position?: number
          prompt?: string
          required?: boolean
          survey_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          created_at: string
          id: string
          respondent_id: string
          survey_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          respondent_id: string
          survey_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          respondent_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          description: string | null
          founder_id: string
          id: string
          problem_id: string | null
          published_at: string | null
          response_count: number
          startup_id: string | null
          status: Database["public"]["Enums"]["survey_status"]
          target_audience: Json
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          founder_id: string
          id?: string
          problem_id?: string | null
          published_at?: string | null
          response_count?: number
          startup_id?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          target_audience?: Json
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          founder_id?: string
          id?: string
          problem_id?: string | null
          published_at?: string | null
          response_count?: number
          startup_id?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          target_audience?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_follows: {
        Row: {
          created_at: string
          id: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          topic?: string
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
      verification_records: {
        Row: {
          company_registration: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          investor_type: string | null
          legal_company_name: string | null
          legal_name: string | null
          notes: string | null
          organization: string | null
          ownership_attestation: boolean
          professional_reference: string | null
          professional_role: string | null
          reviewed_at: string | null
          startup_id: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          company_registration?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          investor_type?: string | null
          legal_company_name?: string | null
          legal_name?: string | null
          notes?: string | null
          organization?: string | null
          ownership_attestation?: boolean
          professional_reference?: string | null
          professional_role?: string | null
          reviewed_at?: string | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          company_registration?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          investor_type?: string | null
          legal_company_name?: string | null
          legal_name?: string | null
          notes?: string | null
          organization?: string | null
          ownership_attestation?: boolean
          professional_reference?: string | null
          professional_role?: string | null
          reviewed_at?: string | null
          startup_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_records_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_startup: {
        Args: { _startup: string; _user: string }
        Returns: boolean
      }
      can_view_survey: {
        Args: { _survey: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      is_connected: { Args: { _a: string; _b: string }; Returns: boolean }
      is_connection_participant: {
        Args: { _conn: string; _user: string }
        Returns: boolean
      }
      is_verified_founder: { Args: { _user_id: string }; Returns: boolean }
      is_verified_investor: { Args: { _user_id: string }; Returns: boolean }
      notify_user: {
        Args: {
          _body: string
          _link: string
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
      startup_owner: { Args: { _startup: string }; Returns: string }
    }
    Enums: {
      app_role: "founder" | "investor" | "general_user" | "moderator"
      connection_status: "pending" | "accepted" | "rejected"
      report_status: "open" | "reviewed" | "resolved" | "dismissed"
      survey_status: "draft" | "published" | "closed"
      verification_status: "pending" | "under_review" | "verified" | "rejected"
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
      app_role: ["founder", "investor", "general_user", "moderator"],
      connection_status: ["pending", "accepted", "rejected"],
      report_status: ["open", "reviewed", "resolved", "dismissed"],
      survey_status: ["draft", "published", "closed"],
      verification_status: ["pending", "under_review", "verified", "rejected"],
    },
  },
} as const
