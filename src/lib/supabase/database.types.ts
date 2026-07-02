export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: { 
          id: string; 
          created_at: string; 
          name: string; 
          sector: string | null; 
          address: string | null;
          zip: string | null; 
          city: string | null; 
          country: string | null;
          email: string | null; 
          contact: string | null; 
          phone: string | null;
          service: string | null;
          notes: string | null;
          organization_id: string; 
        };
        Insert: { 
          id?: string; 
          created_at?: string; 
          name: string; 
          sector?: string | null; 
          address?: string | null;
          zip?: string | null; 
          city?: string | null; 
          country?: string | null;
          email?: string | null; 
          contact?: string | null; 
          phone?: string | null;
          service?: string | null;
          notes?: string | null;
          organization_id: string; 
        };
        Update: { 
          id?: string; 
          created_at?: string; 
          name?: string; 
          sector?: string | null; 
          address?: string | null;
          zip?: string | null; 
          city?: string | null; 
          country?: string | null;
          email?: string | null; 
          contact?: string | null; 
          phone?: string | null;
          service?: string | null;
          notes?: string | null;
          organization_id?: string; 
        };
        Relationships: [{ foreignKeyName: "clients_org_fkey", columns: ["organization_id"], isOneToOne: false, referencedRelation: "organizations", referencedColumns: ["id"] }];
      },
      organization_members: {
        Row: { created_at: string; organization_id: string; role: string; user_id: string; }
        Insert: { created_at?: string; organization_id: string; role?: string; user_id: string; }
        Update: { created_at?: string; organization_id?: string; role?: string; user_id?: string; }
        Relationships: []
      },
      organizations: {
        Row: { created_at: string; id: string; name: string; owner_user_id: string | null; slug: string | null; type: string; updated_at: string; }
        Insert: { created_at?: string; id?: string; name: string; owner_user_id?: string | null; slug?: string | null; type?: string; updated_at?: string; }
        Update: { created_at?: string; id?: string; name?: string; owner_user_id?: string | null; slug?: string | null; type?: string; updated_at?: string; }
        Relationships: []
      },
      profiles: {
        Row: { created_at: string; email: string | null; full_name: string | null; id: string; role: string | null; updated_at: string; }
        Insert: { created_at?: string; email?: string | null; full_name?: string | null; id: string; role?: string | null; updated_at?: string; }
        Update: { created_at?: string; email?: string | null; full_name?: string | null; id?: string; role?: string | null; updated_at?: string; }
        Relationships: []
      },
      projects: {
        Row: { created_at: string; created_by: string; description: string | null; id: string; name: string; organization_id: string; status: string; updated_at: string; }
        Insert: { created_at?: string; created_by: string; description?: string | null; id?: string; name: string; organization_id: string; status?: string; updated_at?: string; }
        Update: { created_at?: string; created_by?: string; description?: string | null; id?: string; name?: string; organization_id?: string; status?: string; updated_at?: string; }
        Relationships: []
      },
      tasks: {
        Row: { created_at: string; created_by: string; details: string | null; id: string; organization_id: string; project_id: string; status: string; title: string; updated_at: string; }
        Insert: { created_at?: string; created_by: string; details?: string | null; id?: string; organization_id: string; project_id: string; status?: string; title: string; updated_at?: string; }
        Update: { created_at?: string; created_by?: string; details?: string | null; id?: string; organization_id?: string; project_id?: string; status?: string; title?: string; updated_at?: string; }
        Relationships: []
      }
    },
    Views: { [_ in never]: never },
    Functions: { [_ in never]: never },
    Enums: { [_ in never]: never },
    CompositeTypes: { [_ in never]: never }
  }
}