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
      appointments: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          preferred_date: string
          preferred_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          preferred_date: string
          preferred_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_date?: string
          preferred_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_subtype: string | null
          account_type: string
          available_balance: number
          created_at: string
          current_balance: number
          id: string
          institution_name: string
          is_active: boolean
          last_synced_at: string | null
          plaid_access_token: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_subtype?: string | null
          account_type: string
          available_balance?: number
          created_at?: string
          current_balance?: number
          id?: string
          institution_name: string
          is_active?: boolean
          last_synced_at?: string | null
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          available_balance?: number
          created_at?: string
          current_balance?: number
          id?: string
          institution_name?: string
          is_active?: boolean
          last_synced_at?: string | null
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          due_date: string
          id: string
          name: string
          recurrence: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          due_date: string
          id?: string
          name: string
          recurrence?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          recurrence?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          balance: number
          created_at: string
          due_date: string | null
          id: string
          interest_rate: number
          minimum_payment: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          minimum_payment?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          minimum_payment?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_blueprints: {
        Row: {
          annual_expenses: number
          created_at: string
          current_investments: number
          expected_return: number
          fin_number: number
          id: string
          monthly_contribution: number
          projected_retirement_income: number
          retirement_age: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_expenses?: number
          created_at?: string
          current_investments?: number
          expected_return?: number
          fin_number?: number
          id?: string
          monthly_contribution?: number
          projected_retirement_income?: number
          retirement_age?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_expenses?: number
          created_at?: string
          current_investments?: number
          expected_return?: number
          fin_number?: number
          id?: string
          monthly_contribution?: number
          projected_retirement_income?: number
          retirement_age?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json
          connected_status: string
          created_at: string
          id: string
          integration_type: string
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          config?: Json
          connected_status?: string
          created_at?: string
          id?: string
          integration_type: string
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          config?: Json
          connected_status?: string
          created_at?: string
          id?: string
          integration_type?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      paychecks: {
        Row: {
          amount: number
          created_at: string
          id: string
          pay_date: string
          recurrence: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          pay_date: string
          recurrence?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pay_date?: string
          recurrence?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          starting_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          starting_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          starting_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          current_saved: number
          goal_name: string
          id: string
          linked_bank_account_id: string | null
          monthly_contribution: number
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_saved?: number
          goal_name: string
          id?: string
          linked_bank_account_id?: string | null
          monthly_contribution?: number
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_saved?: number
          goal_name?: string
          id?: string
          linked_bank_account_id?: string | null
          monthly_contribution?: number
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_linked_bank_account_id_fkey"
            columns: ["linked_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          merchant: string | null
          plaid_transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          merchant?: string | null
          plaid_transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          merchant?: string | null
          plaid_transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
