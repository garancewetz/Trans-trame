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
      activity_log: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
        }
        Relationships: []
      }
      allowed_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          axes: string[]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          first_name: string
          id: string
          last_name: string
          status: string | null
          todo: string | null
          updated_by: string | null
        }
        Insert: {
          axes?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          first_name?: string
          id: string
          last_name?: string
          status?: string | null
          todo?: string | null
          updated_by?: string | null
        }
        Update: {
          axes?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
          status?: string | null
          todo?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      resource_authors: {
        Row: {
          author_id: string
          resource_id: string
        }
        Insert: {
          author_id: string
          resource_id: string
        }
        Update: {
          author_id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_authors_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          axes: string[]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          import_source_id: string | null
          original_title: string | null
          resource_type: string
          status: string | null
          title: string
          todo: string | null
          updated_by: string | null
          year: number | null
        }
        Insert: {
          axes?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id: string
          import_source_id?: string | null
          original_title?: string | null
          resource_type?: string
          status?: string | null
          title: string
          todo?: string | null
          updated_by?: string | null
          year?: number | null
        }
        Update: {
          axes?: string[]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          import_source_id?: string | null
          original_title?: string | null
          resource_type?: string
          status?: string | null
          title?: string
          todo?: string | null
          updated_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      link_citations: {
        Row: {
          citation_text: string
          context: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          edition: string
          id: string
          link_id: string
          page: string
          updated_by: string | null
        }
        Insert: {
          citation_text?: string
          context?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          edition?: string
          id?: string
          link_id: string
          page?: string
          updated_by?: string | null
        }
        Update: {
          citation_text?: string
          context?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          edition?: string
          id?: string
          link_id?: string
          page?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_citations_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          citation_text: string
          context: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          edition: string
          id: string
          page: string
          provenance: string
          source_id: string
          target_id: string
          updated_by: string | null
        }
        Insert: {
          citation_text?: string
          context?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          edition?: string
          id?: string
          page?: string
          provenance?: string
          source_id: string
          target_id: string
          updated_by?: string | null
        }
        Update: {
          citation_text?: string
          context?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          edition?: string
          id?: string
          page?: string
          provenance?: string
          source_id?: string
          target_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string
          id: string
          last_name?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_email_whitelisted: { Args: { check_email: string }; Returns: boolean }
      is_whitelisted: { Args: never; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
