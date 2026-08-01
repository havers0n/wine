export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: number;
          name: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          name: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: number;
          user_id: string;
          role: string;
          team_name: string | null;
          joined_at: string;
        };
        Insert: {
          workspace_id: number;
          user_id: string;
          role: string;
          team_name?: string | null;
          joined_at?: string;
        };
        Update: {
          role?: string;
          team_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      work_plans: {
        Row: {
          id: number;
          workspace_id: number;
          name: string;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          workspace_id: number;
          name: string;
          status?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'work_plans_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_items: {
        Row: {
          work_plan_id: number;
          id: string;
          work_date: string;
          farm: string;
          plot_name: string;
          plot_code: string;
          vineyard: string;
          variety: string;
          planting_year: number | null;
          area: number | null;
          agronomist: string;
          team: string;
          planned_samples: number;
          sector: string;
          sample_type: string;
          color: string;
          coordinator_note: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          work_plan_id: number;
          id: string;
          work_date: string;
          farm?: string;
          plot_name: string;
          plot_code?: string;
          vineyard?: string;
          variety?: string;
          planting_year?: number | null;
          area?: number | null;
          agronomist?: string;
          team?: string;
          planned_samples?: number;
          sector?: string;
          sample_type?: string;
          color?: string;
          coordinator_note?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          work_date?: string;
          farm?: string;
          plot_name?: string;
          plot_code?: string;
          vineyard?: string;
          variety?: string;
          planting_year?: number | null;
          area?: number | null;
          agronomist?: string;
          team?: string;
          planned_samples?: number;
          sector?: string;
          sample_type?: string;
          color?: string;
          coordinator_note?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_items_work_plan_id_fkey';
            columns: ['work_plan_id'];
            isOneToOne: false;
            referencedRelation: 'work_plans';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type PlanItemRow = Database['public']['Tables']['plan_items']['Row'];
export type PlanItemInsert = Database['public']['Tables']['plan_items']['Insert'];
