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
      ai_feedback_examples: {
        Row: {
          ai_risk_percentage: number
          corrected_risk_level: string
          created_at: string
          disease_name: string
          doctor_notes: string | null
          id: string
          patient_age: number | null
          patient_sex: string | null
          screening_id: string
        }
        Insert: {
          ai_risk_percentage: number
          corrected_risk_level: string
          created_at?: string
          disease_name: string
          doctor_notes?: string | null
          id?: string
          patient_age?: number | null
          patient_sex?: string | null
          screening_id: string
        }
        Update: {
          ai_risk_percentage?: number
          corrected_risk_level?: string
          created_at?: string
          disease_name?: string
          doctor_notes?: string | null
          id?: string
          patient_age?: number | null
          patient_sex?: string | null
          screening_id?: string
        }
        Relationships: []
      }
      biomarker_profiles: {
        Row: {
          biomarker_name: string
          created_at: string
          id: string
          is_abnormal: boolean
          reference_range_high: number | null
          reference_range_low: number | null
          screening_id: string
          unit: string
          value: number
        }
        Insert: {
          biomarker_name: string
          created_at?: string
          id?: string
          is_abnormal?: boolean
          reference_range_high?: number | null
          reference_range_low?: number | null
          screening_id: string
          unit?: string
          value: number
        }
        Update: {
          biomarker_name?: string
          created_at?: string
          id?: string
          is_abnormal?: boolean
          reference_range_high?: number | null
          reference_range_low?: number | null
          screening_id?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_profiles_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "health_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_risk_assessments: {
        Row: {
          confidence: number
          created_at: string
          disagreement: boolean
          disease_name: string
          evidence: Json | null
          id: string
          rationale: string | null
          recommended_actions: Json | null
          risk_percentage: number
          rule_based_level: string | null
          screening_id: string
          time_horizon: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          disagreement?: boolean
          disease_name: string
          evidence?: Json | null
          id?: string
          rationale?: string | null
          recommended_actions?: Json | null
          risk_percentage?: number
          rule_based_level?: string | null
          screening_id: string
          time_horizon?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          disagreement?: boolean
          disease_name?: string
          evidence?: Json | null
          id?: string
          rationale?: string | null
          recommended_actions?: Json | null
          risk_percentage?: number
          rule_based_level?: string | null
          screening_id?: string
          time_horizon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disease_risk_assessments_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "health_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_validations: {
        Row: {
          corrected_disease: string | null
          created_at: string
          doctor_id: string
          doctor_notes: string | null
          id: string
          observation_id: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          corrected_disease?: string | null
          created_at?: string
          doctor_id: string
          doctor_notes?: string | null
          id?: string
          observation_id: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          corrected_disease?: string | null
          created_at?: string
          doctor_id?: string
          doctor_notes?: string | null
          id?: string
          observation_id?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_validations_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "observations"
            referencedColumns: ["id"]
          },
        ]
      }
      health_screenings: {
        Row: {
          ai_analysis_complete: boolean
          clinical_notes: string | null
          created_at: string
          family_history: Json | null
          id: string
          imaging_findings: string
          imaging_regions: Json | null
          patient_age: number
          patient_identifier: string
          patient_name: string
          patient_sex: string
          screening_type: string
          status: string
          submitted_by: string
          test_results: Json
          updated_at: string
        }
        Insert: {
          ai_analysis_complete?: boolean
          clinical_notes?: string | null
          created_at?: string
          family_history?: Json | null
          id?: string
          imaging_findings?: string
          imaging_regions?: Json | null
          patient_age: number
          patient_identifier?: string
          patient_name?: string
          patient_sex?: string
          screening_type?: string
          status?: string
          submitted_by: string
          test_results?: Json
          updated_at?: string
        }
        Update: {
          ai_analysis_complete?: boolean
          clinical_notes?: string | null
          created_at?: string
          family_history?: Json | null
          id?: string
          imaging_findings?: string
          imaging_regions?: Json | null
          patient_age?: number
          patient_identifier?: string
          patient_name?: string
          patient_sex?: string
          screening_type?: string
          status?: string
          submitted_by?: string
          test_results?: Json
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          severity: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          severity?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      observations: {
        Row: {
          ai_risk_level: string | null
          case_count: number
          city: string
          confidence_scores: number[] | null
          country: string
          created_at: string
          id: string
          notes: string | null
          outbreak_alert: boolean | null
          predicted_diseases: string[] | null
          rainfall: number | null
          region: string
          rule_risk_level: string
          status: string
          symptoms: string[]
          temperature: number | null
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          ai_risk_level?: string | null
          case_count?: number
          city?: string
          confidence_scores?: number[] | null
          country?: string
          created_at?: string
          id?: string
          notes?: string | null
          outbreak_alert?: boolean | null
          predicted_diseases?: string[] | null
          rainfall?: number | null
          region?: string
          rule_risk_level?: string
          status?: string
          symptoms?: string[]
          temperature?: number | null
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          ai_risk_level?: string | null
          case_count?: number
          city?: string
          confidence_scores?: number[] | null
          country?: string
          created_at?: string
          id?: string
          notes?: string | null
          outbreak_alert?: boolean | null
          predicted_diseases?: string[] | null
          rainfall?: number | null
          region?: string
          rule_risk_level?: string
          status?: string
          symptoms?: string[]
          temperature?: number | null
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          auto_flag_high_risk: boolean
          created_at: string
          high_risk_threshold: number
          id: string
          medium_risk_threshold: number
          notify_admins_new_users: boolean
          notify_doctors_high_risk: boolean
          notify_doctors_outbreak: boolean
          outbreak_alert_threshold: number
          updated_at: string
        }
        Insert: {
          auto_flag_high_risk?: boolean
          created_at?: string
          high_risk_threshold?: number
          id?: string
          medium_risk_threshold?: number
          notify_admins_new_users?: boolean
          notify_doctors_high_risk?: boolean
          notify_doctors_outbreak?: boolean
          outbreak_alert_threshold?: number
          updated_at?: string
        }
        Update: {
          auto_flag_high_risk?: boolean
          created_at?: string
          high_risk_threshold?: number
          id?: string
          medium_risk_threshold?: number
          notify_admins_new_users?: boolean
          notify_doctors_high_risk?: boolean
          notify_doctors_outbreak?: boolean
          outbreak_alert_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_location: string | null
          display_name: string
          id: string
          patient_identifier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_location?: string | null
          display_name?: string
          id?: string
          patient_identifier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_location?: string | null
          display_name?: string
          id?: string
          patient_identifier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      screening_validations: {
        Row: {
          corrected_risk_level: string | null
          created_at: string
          doctor_id: string
          doctor_notes: string
          id: string
          screening_id: string
          signed_off_at: string | null
          updated_at: string
          validation_status: string
        }
        Insert: {
          corrected_risk_level?: string | null
          created_at?: string
          doctor_id: string
          doctor_notes?: string
          id?: string
          screening_id: string
          signed_off_at?: string | null
          updated_at?: string
          validation_status?: string
        }
        Update: {
          corrected_risk_level?: string | null
          created_at?: string
          doctor_id?: string
          doctor_notes?: string
          id?: string
          screening_id?: string
          signed_off_at?: string | null
          updated_at?: string
          validation_status?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_patient_identifier: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_doctor: { Args: never; Returns: boolean }
      is_patient: { Args: never; Returns: boolean }
      is_volunteer: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "volunteer" | "doctor" | "admin" | "patient"
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
      app_role: ["volunteer", "doctor", "admin", "patient"],
    },
  },
} as const
