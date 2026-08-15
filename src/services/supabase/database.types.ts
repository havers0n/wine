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
          plot_catalog_id: number;
          work_date: string;
          team: string;
          planned_samples: number;
          color: string;
          coordinator_note: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          work_plan_id: number;
          id: string;
          plot_catalog_id: number;
          work_date: string;
          team?: string;
          planned_samples?: number;
          color?: string;
          coordinator_note?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          work_date?: string;
          plot_catalog_id?: number;
          team?: string;
          planned_samples?: number;
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
          {
            foreignKeyName: 'plan_items_plot_catalog_id_fkey';
            columns: ['plot_catalog_id'];
            isOneToOne: false;
            referencedRelation: 'plot_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      plot_catalog: {
        Row: {
          id: number;
          workspace_id: number;
          farm: string;
          vineyard: string;
          plot_name: string;
          plot_code: string;
          sector: string;
          variety: string;
          planting_year: number | null;
          area: number | null;
          agronomist: string;
          sample_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          workspace_id: number;
          farm?: string;
          vineyard?: string;
          plot_name: string;
          plot_code?: string;
          sector?: string;
          variety?: string;
          planting_year?: number | null;
          area?: number | null;
          agronomist?: string;
          sample_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          farm?: string;
          vineyard?: string;
          plot_name?: string;
          plot_code?: string;
          sector?: string;
          variety?: string;
          planting_year?: number | null;
          area?: number | null;
          agronomist?: string;
          sample_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plot_catalog_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
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
export type PlotCatalogRow = Database['public']['Tables']['plot_catalog']['Row'];
export type PlotCatalogInsert = Database['public']['Tables']['plot_catalog']['Insert'];
