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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          investment_id: string | null
          source: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          investment_id?: string | null
          source?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investment_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_earnings_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          admin_share_rate: number
          id: string
          investor_module_status: string
          investor_share_rate: number
          setting_key: string
          total_interest_rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_share_rate?: number
          id?: string
          investor_module_status?: string
          investor_share_rate?: number
          setting_key: string
          total_interest_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_share_rate?: number
          id?: string
          investor_module_status?: string
          investor_share_rate?: number
          setting_key?: string
          total_interest_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      case_documents: {
        Row: {
          case_id: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          notes: string | null
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "consultation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_cases: {
        Row: {
          assigned_to: string | null
          case_type: string
          created_at: string
          description: string | null
          id: string
          progress: number | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          case_type: string
          created_at?: string
          description?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          case_type?: string
          created_at?: string
          description?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          case_id: string | null
          consultation_type: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          scheduled_date: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          consultation_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          consultation_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "consultation_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_amount_history: {
        Row: {
          applied_retroactively: boolean
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          group_id: string
          id: string
          new_amount: number
          note: string | null
          old_amount: number
        }
        Insert: {
          applied_retroactively?: boolean
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          group_id: string
          id?: string
          new_amount: number
          note?: string | null
          old_amount: number
        }
        Update: {
          applied_retroactively?: boolean
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          group_id?: string
          id?: string
          new_amount?: number
          note?: string | null
          old_amount?: number
        }
        Relationships: []
      }
      contribution_groups: {
        Row: {
          contribution_amount: number
          created_at: string
          current_month: number
          description: string | null
          id: string
          is_active: boolean | null
          last_progressed_at: string | null
          name: string
          progression_mode: string
          requires_approval: boolean
          rotation_start_date: string | null
          total_months: number
          updated_at: string
        }
        Insert: {
          contribution_amount?: number
          created_at?: string
          current_month?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_progressed_at?: string | null
          name: string
          progression_mode?: string
          requires_approval?: boolean
          rotation_start_date?: string | null
          total_months?: number
          updated_at?: string
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          current_month?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_progressed_at?: string | null
          name?: string
          progression_mode?: string
          requires_approval?: boolean
          rotation_start_date?: string | null
          total_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      contribution_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          monthly_contribution_id: string
          payment_date: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          monthly_contribution_id: string
          payment_date?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          monthly_contribution_id?: string
          payment_date?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_payments_monthly_contribution_id_fkey"
            columns: ["monthly_contribution_id"]
            isOneToOne: false
            referencedRelation: "monthly_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_splits: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_paid: boolean
          month: number
          split_amount: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_paid?: boolean
          month: number
          split_amount: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_paid?: boolean
          month?: number
          split_amount?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contribution_splits_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contribution_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_admin_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          is_active: boolean | null
          join_month: number | null
          join_year: number | null
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean | null
          join_month?: number | null
          join_year?: number | null
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean | null
          join_month?: number | null
          join_year?: number | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contribution_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_notification_settings: {
        Row: {
          beneficiary_template: string | null
          created_at: string
          group_id: string
          id: string
          notify_beneficiary_change: boolean
          notify_split_assignment: boolean
          split_template: string | null
          updated_at: string
        }
        Insert: {
          beneficiary_template?: string | null
          created_at?: string
          group_id: string
          id?: string
          notify_beneficiary_change?: boolean
          notify_split_assignment?: boolean
          split_template?: string | null
          updated_at?: string
        }
        Update: {
          beneficiary_template?: string | null
          created_at?: string
          group_id?: string
          id?: string
          notify_beneficiary_change?: boolean
          notify_split_assignment?: boolean
          split_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      group_scheduled_reminders: {
        Row: {
          created_at: string
          day_of_month: number | null
          group_id: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          group_id: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          group_id?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          investment_id: string | null
          payout_status: string
          reference: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          investment_id?: string | null
          payout_status?: string
          reference?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investment_id?: string | null
          payout_status?: string
          reference?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          admin_due: number
          admin_share_rate: number | null
          amount: number
          created_at: string
          duration_months: number
          end_date: string | null
          id: string
          interest_rate: number
          investor_due: number
          investor_id: string
          investor_share_rate: number | null
          notes: string | null
          payout_status: string | null
          start_date: string
          status: string
          total_return: number
          updated_at: string
        }
        Insert: {
          admin_due?: number
          admin_share_rate?: number | null
          amount: number
          created_at?: string
          duration_months?: number
          end_date?: string | null
          id?: string
          interest_rate?: number
          investor_due?: number
          investor_id: string
          investor_share_rate?: number | null
          notes?: string | null
          payout_status?: string | null
          start_date?: string
          status?: string
          total_return?: number
          updated_at?: string
        }
        Update: {
          admin_due?: number
          admin_share_rate?: number | null
          amount?: number
          created_at?: string
          duration_months?: number
          end_date?: string | null
          id?: string
          interest_rate?: number
          investor_due?: number
          investor_id?: string
          investor_share_rate?: number | null
          notes?: string | null
          payout_status?: string | null
          start_date?: string
          status?: string
          total_return?: number
          updated_at?: string
        }
        Relationships: []
      }
      investor_payments: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          investment_id: string
          investor_id: string
          notes: string | null
          party: string
          payment_date: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          investment_id: string
          investor_id: string
          notes?: string | null
          party?: string
          payment_date?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          investment_id?: string
          investor_id?: string
          notes?: string | null
          party?: string
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_payments_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      loan_assignments: {
        Row: {
          amount: number
          assigned_at: string
          assigned_by: string | null
          assignment_share: number
          created_at: string
          id: string
          investor_id: string
          loan_request_id: string
          responded_at: string | null
          response_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          assigned_at?: string
          assigned_by?: string | null
          assignment_share?: number
          created_at?: string
          id?: string
          investor_id: string
          loan_request_id: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          assigned_at?: string
          assigned_by?: string | null
          assignment_share?: number
          created_at?: string
          id?: string
          investor_id?: string
          loan_request_id?: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_assignments_loan_request_id_fkey"
            columns: ["loan_request_id"]
            isOneToOne: false
            referencedRelation: "loan_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_disbursements: {
        Row: {
          amount: number
          created_at: string
          disbursed_at: string
          id: string
          investor_id: string
          loan_id: string
          loan_request_id: string
          notes: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          disbursed_at?: string
          id?: string
          investor_id: string
          loan_id: string
          loan_request_id: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          disbursed_at?: string
          id?: string
          investor_id?: string
          loan_id?: string
          loan_request_id?: string
          notes?: string | null
        }
        Relationships: []
      }
      loan_guarantors: {
        Row: {
          created_at: string
          guarantor_id: string
          id: string
          loan_request_id: string
          responded_at: string | null
          response_note: string | null
          status: string
        }
        Insert: {
          created_at?: string
          guarantor_id: string
          id?: string
          loan_request_id: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          guarantor_id?: string
          id?: string
          loan_request_id?: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_guarantors_loan_request_id_fkey"
            columns: ["loan_request_id"]
            isOneToOne: false
            referencedRelation: "loan_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_repayment_distributions: {
        Row: {
          amount: number
          created_at: string
          id: string
          investor_id: string
          loan_id: string
          loan_repayment_id: string
          share_percent: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          investor_id: string
          loan_id: string
          loan_repayment_id: string
          share_percent: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investor_id?: string
          loan_id?: string
          loan_repayment_id?: string
          share_percent?: number
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount: number
          amount_due: number | null
          created_at: string
          due_date: string | null
          id: string
          loan_id: string
          notes: string | null
          repayment_date: string | null
          repayment_type: string | null
        }
        Insert: {
          amount: number
          amount_due?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          loan_id: string
          notes?: string | null
          repayment_date?: string | null
          repayment_type?: string | null
        }
        Update: {
          amount?: number
          amount_due?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          loan_id?: string
          notes?: string | null
          repayment_date?: string | null
          repayment_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          borrower_id: string
          created_at: string
          duration_months: number
          funding_source: string
          group_id: string
          id: string
          investor_id: string | null
          purpose: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          borrower_id: string
          created_at?: string
          duration_months?: number
          funding_source?: string
          group_id: string
          id?: string
          investor_id?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          borrower_id?: string
          created_at?: string
          duration_months?: number
          funding_source?: string
          group_id?: string
          id?: string
          investor_id?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      loan_signatures: {
        Row: {
          created_at: string
          id: string
          loan_request_id: string
          signature_data: string
          signed_at: string
          signer_id: string
          signer_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          loan_request_id: string
          signature_data: string
          signed_at?: string
          signer_id: string
          signer_role: string
        }
        Update: {
          created_at?: string
          id?: string
          loan_request_id?: string
          signature_data?: string
          signed_at?: string
          signer_id?: string
          signer_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_signatures_loan_request_id_fkey"
            columns: ["loan_request_id"]
            isOneToOne: false
            referencedRelation: "loan_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          group_id: string
          id: string
          investor_id: string | null
          issued_date: string | null
          monthly_repayment: number | null
          outstanding_balance: number
          principal_amount: number
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          investor_id?: string | null
          issued_date?: string | null
          monthly_repayment?: number | null
          outstanding_balance: number
          principal_amount: number
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          investor_id?: string | null
          issued_date?: string | null
          monthly_repayment?: number | null
          outstanding_balance?: number
          principal_amount?: number
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contribution_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          group_id: string
          id: string
          notes: string | null
          phone: string | null
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          group_id: string
          id?: string
          notes?: string | null
          phone?: string | null
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          group_id?: string
          id?: string
          notes?: string | null
          phone?: string | null
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      monthly_contributions: {
        Row: {
          beneficiary_account_name: string | null
          beneficiary_account_number: string | null
          beneficiary_bank_name: string | null
          beneficiary_sort_code: string | null
          beneficiary_user_id: string | null
          created_at: string
          group_id: string
          id: string
          is_finalized: boolean | null
          month: number
          total_collected: number | null
          total_expected: number | null
          updated_at: string
          year: number
        }
        Insert: {
          beneficiary_account_name?: string | null
          beneficiary_account_number?: string | null
          beneficiary_bank_name?: string | null
          beneficiary_sort_code?: string | null
          beneficiary_user_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          is_finalized?: boolean | null
          month: number
          total_collected?: number | null
          total_expected?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          beneficiary_account_name?: string | null
          beneficiary_account_number?: string | null
          beneficiary_bank_name?: string | null
          beneficiary_sort_code?: string | null
          beneficiary_user_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          is_finalized?: boolean | null
          month?: number
          total_collected?: number | null
          total_expected?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contribution_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          email: string | null
          failed_login_attempts: number
          full_name: string | null
          id: string
          locked_at: string | null
          membership_number: string | null
          must_change_password: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          failed_login_attempts?: number
          full_name?: string | null
          id?: string
          locked_at?: string | null
          membership_number?: string | null
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          failed_login_attempts?: number
          full_name?: string | null
          id?: string
          locked_at?: string | null
          membership_number?: string | null
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean | null
          rating: number
          review_text: string
          service_type: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          rating: number
          review_text: string
          service_type?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          rating?: number
          review_text?: string
          service_type?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      travel_clients: {
        Row: {
          created_at: string
          id: string
          service_type: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_type?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_type?: string[] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_group_month: { Args: { _group_id: string }; Returns: Json }
      approve_membership_request: {
        Args: { _request_id: string; _user_id: string }
        Returns: Json
      }
      check_missing_beneficiaries: { Args: never; Returns: Json }
      get_group_members: {
        Args: { _group_id: string }
        Returns: {
          contribution_amount: number
          full_name: string
          joined_at: string
          membership_number: string
          role: string
          user_id: string
        }[]
      }
      get_same_group_guarantors: {
        Args: { _user_id: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      group_admin_group_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      investor_available_balance: {
        Args: { _investor_id: string }
        Returns: number
      }
      investor_available_balances: {
        Args: never
        Returns: {
          available_balance: number
          full_name: string
          investor_id: string
          total_capital: number
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_for_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_admin: { Args: { _user_id: string }; Returns: boolean }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_guarantor_for_request: {
        Args: { _loan_request_id: string; _user_id: string }
        Returns: boolean
      }
      is_loan_borrower: {
        Args: { _loan_request_id: string; _user_id: string }
        Returns: boolean
      }
      notify_personalized_contribution: {
        Args: { _group_id: string; _month: number; _year: number }
        Returns: undefined
      }
      recalc_monthly_expected: {
        Args: { _group_id: string; _month: number; _year: number }
        Returns: undefined
      }
      recalc_monthly_totals: {
        Args: { _group_id: string; _month: number; _year: number }
        Returns: undefined
      }
      reject_membership_request: {
        Args: { _note?: string; _request_id: string }
        Returns: Json
      }
      send_unpaid_reminders: { Args: never; Returns: Json }
      update_group_contribution_amount: {
        Args: {
          _apply_retroactive?: boolean
          _group_id: string
          _new_amount: number
          _note?: string
        }
        Returns: Json
      }
      update_loan_status: {
        Args: {
          _actor_id?: string
          _loan_request_id: string
          _new_status: string
          _note?: string
        }
        Returns: Json
      }
      v_month_name_from_int: { Args: { _m: number }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "contributor"
        | "travel_client"
        | "investor"
        | "group_admin"
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
      app_role: [
        "admin",
        "contributor",
        "travel_client",
        "investor",
        "group_admin",
      ],
    },
  },
} as const
