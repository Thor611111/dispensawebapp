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
      admin_activity_log: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          source?: string
        }
        Relationships: []
      }
      app_owners: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_tokens: {
        Row: {
          breakfast_time: string
          created_at: string
          default_meal_minutes: number
          dinner_time: string
          household_id: string
          last_accessed_at: string | null
          lunch_time: string
          snack_time: string
          token: string
          user_id: string
        }
        Insert: {
          breakfast_time?: string
          created_at?: string
          default_meal_minutes?: number
          dinner_time?: string
          household_id: string
          last_accessed_at?: string | null
          lunch_time?: string
          snack_time?: string
          token: string
          user_id: string
        }
        Update: {
          breakfast_time?: string
          created_at?: string
          default_meal_minutes?: number
          dinner_time?: string
          household_id?: string
          last_accessed_at?: string | null
          lunch_time?: string
          snack_time?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          note: string | null
          spent_on: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          note?: string | null
          spent_on?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          note?: string | null
          spent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          added_by: string | null
          category: string | null
          created_at: string
          expires_on: string | null
          household_id: string
          id: string
          kcal_per_unit: number | null
          last_used_at: string | null
          location: Database["public"]["Enums"]["food_location"]
          name: string
          pantry_id: string | null
          price: number | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          category?: string | null
          created_at?: string
          expires_on?: string | null
          household_id: string
          id?: string
          kcal_per_unit?: number | null
          last_used_at?: string | null
          location?: Database["public"]["Enums"]["food_location"]
          name: string
          pantry_id?: string | null
          price?: number | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          category?: string | null
          created_at?: string
          expires_on?: string | null
          household_id?: string
          id?: string
          kcal_per_unit?: number | null
          last_used_at?: string | null
          location?: Database["public"]["Enums"]["food_location"]
          name?: string
          pantry_id?: string | null
          price?: number | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          member_kind: Database["public"]["Enums"]["member_kind"]
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          member_kind?: Database["public"]["Enums"]["member_kind"]
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          member_kind?: Database["public"]["Enums"]["member_kind"]
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      meal_plan_entries: {
        Row: {
          day_date: string
          id: string
          meal_plan_id: string
          notes: string | null
          recipe_id: string | null
          recipe_title_snapshot: string | null
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Insert: {
          day_date: string
          id?: string
          meal_plan_id: string
          notes?: string | null
          recipe_id?: string | null
          recipe_title_snapshot?: string | null
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Update: {
          day_date?: string
          id?: string
          meal_plan_id?: string
          notes?: string | null
          recipe_id?: string | null
          recipe_title_snapshot?: string | null
          slot?: Database["public"]["Enums"]["meal_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          household_id: string
          id: string
          reasoning: string | null
          total_estimated_cost: number | null
          week_start: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          reasoning?: string | null
          total_estimated_cost?: number | null
          week_start: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          reasoning?: string | null
          total_estimated_cost?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          daily_send_hour: number
          email_enabled: boolean
          expiry_alerts: boolean
          household_id: string
          push_enabled: boolean
          shopping_reminders: boolean
          updated_at: string
          weekly_plan_reminders: boolean
        }
        Insert: {
          daily_send_hour?: number
          email_enabled?: boolean
          expiry_alerts?: boolean
          household_id: string
          push_enabled?: boolean
          shopping_reminders?: boolean
          updated_at?: string
          weekly_plan_reminders?: boolean
        }
        Update: {
          daily_send_hour?: number
          email_enabled?: boolean
          expiry_alerts?: boolean
          household_id?: string
          push_enabled?: boolean
          shopping_reminders?: boolean
          updated_at?: string
          weekly_plan_reminders?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantries: {
        Row: {
          created_at: string
          household_id: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          icon?: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_household_id: string | null
          display_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_household_id?: string | null
          display_name?: string | null
          id: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_household_id?: string | null
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      push_send_log: {
        Row: {
          body: string | null
          category: string
          created_at: string
          error_message: string | null
          household_id: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          error_message?: string | null
          household_id?: string | null
          id?: string
          status: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          error_message?: string | null
          household_id?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          household_id: string | null
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          household_id?: string | null
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          household_id?: string | null
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_feedback: {
        Row: {
          created_at: string
          feedback: Database["public"]["Enums"]["feedback_type"]
          id: string
          recipe_id: string | null
          recipe_title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: Database["public"]["Enums"]["feedback_type"]
          id?: string
          recipe_id?: string | null
          recipe_title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          recipe_id?: string | null
          recipe_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_feedback_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          name: string
          quantity: number | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          id?: string
          name: string
          quantity?: number | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          id?: string
          name?: string
          quantity?: number | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_views: {
        Row: {
          id: string
          recipe_id: string | null
          recipe_title: string | null
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          recipe_id?: string | null
          recipe_title?: string | null
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string | null
          recipe_title?: string | null
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          diets: Database["public"]["Enums"]["diet_type"][]
          difficulty: string | null
          estimated_cost: number | null
          household_id: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_favorite: boolean
          is_system: boolean
          prep_minutes: number | null
          servings: number
          source_url: string | null
          tags: string[]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          diets?: Database["public"]["Enums"]["diet_type"][]
          difficulty?: string | null
          estimated_cost?: number | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_favorite?: boolean
          is_system?: boolean
          prep_minutes?: number | null
          servings?: number
          source_url?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          diets?: Database["public"]["Enums"]["diet_type"][]
          difficulty?: string | null
          estimated_cost?: number | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_favorite?: boolean
          is_system?: boolean
          prep_minutes?: number | null
          servings?: number
          source_url?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recommended_products: {
        Row: {
          category: string | null
          created_at: string
          household_id: string
          id: string
          name: string
          reason: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          household_id: string
          id?: string
          name: string
          reason?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          reason?: string | null
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          category: string | null
          checked: boolean
          created_at: string
          estimated_price: number | null
          household_id: string
          id: string
          name: string
          quantity: number
          source: string
          unit: string
        }
        Insert: {
          category?: string | null
          checked?: boolean
          created_at?: string
          estimated_price?: number | null
          household_id: string
          id?: string
          name: string
          quantity?: number
          source?: string
          unit?: string
        }
        Update: {
          category?: string | null
          checked?: boolean
          created_at?: string
          estimated_price?: number | null
          household_id?: string
          id?: string
          name?: string
          quantity?: number
          source?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          allergies: string[]
          currency: string
          diets: Database["public"]["Enums"]["diet_type"][]
          dislikes: string[]
          expiry_warning_days: number
          goals: string[]
          household_id: string
          household_size: number
          monthly_budget: number | null
          updated_at: string
          weekly_budget: number | null
        }
        Insert: {
          allergies?: string[]
          currency?: string
          diets?: Database["public"]["Enums"]["diet_type"][]
          dislikes?: string[]
          expiry_warning_days?: number
          goals?: string[]
          household_id: string
          household_size?: number
          monthly_budget?: number | null
          updated_at?: string
          weekly_budget?: number | null
        }
        Update: {
          allergies?: string[]
          currency?: string
          diets?: Database["public"]["Enums"]["diet_type"][]
          dislikes?: string[]
          expiry_warning_days?: number
          goals?: string[]
          household_id?: string
          household_size?: number
          monthly_budget?: number | null
          updated_at?: string
          weekly_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
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
      accept_household_invite: { Args: { _code: string }; Returns: string }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          current_household_id: string
          display_name: string
          email: string
          id: string
          is_admin: boolean
          is_owner: boolean
          last_sign_in_at: string
        }[]
      }
      admin_log: {
        Args: {
          _level: string
          _message: string
          _metadata: Json
          _source: string
        }
        Returns: undefined
      }
      admin_overview: { Args: never; Returns: Json }
      admin_purge_user_data: {
        Args: { _target_user: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _target_user: string
        }
        Returns: undefined
      }
      admin_update_display_name: {
        Args: { _name: string; _target_user: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_owner: { Args: never; Returns: boolean }
      is_household_adult: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      shares_household_with: {
        Args: { _other: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      diet_type:
        | "omnivore"
        | "vegetarian"
        | "vegan"
        | "pescatarian"
        | "gluten_free"
        | "lactose_free"
        | "keto"
        | "mediterranean"
      feedback_type: "liked" | "disliked" | "never"
      food_location: "fridge" | "freezer" | "pantry" | "other"
      meal_slot: "breakfast" | "lunch" | "dinner" | "snack"
      member_kind: "adult" | "child"
      member_role: "owner" | "member"
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
      diet_type: [
        "omnivore",
        "vegetarian",
        "vegan",
        "pescatarian",
        "gluten_free",
        "lactose_free",
        "keto",
        "mediterranean",
      ],
      feedback_type: ["liked", "disliked", "never"],
      food_location: ["fridge", "freezer", "pantry", "other"],
      meal_slot: ["breakfast", "lunch", "dinner", "snack"],
      member_kind: ["adult", "child"],
      member_role: ["owner", "member"],
    },
  },
} as const
