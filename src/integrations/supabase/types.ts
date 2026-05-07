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
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
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
      user_preferences: {
        Row: {
          allergies: string[]
          currency: string
          diets: Database["public"]["Enums"]["diet_type"][]
          dislikes: string[]
          goals: string[]
          household_id: string
          household_size: number
          updated_at: string
          weekly_budget: number | null
        }
        Insert: {
          allergies?: string[]
          currency?: string
          diets?: Database["public"]["Enums"]["diet_type"][]
          dislikes?: string[]
          goals?: string[]
          household_id: string
          household_size?: number
          updated_at?: string
          weekly_budget?: number | null
        }
        Update: {
          allergies?: string[]
          currency?: string
          diets?: Database["public"]["Enums"]["diet_type"][]
          dislikes?: string[]
          goals?: string[]
          household_id?: string
          household_size?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
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
      member_role: ["owner", "member"],
    },
  },
} as const
