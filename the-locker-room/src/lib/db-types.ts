export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'uploader' | 'viewer';
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'uploader' | 'viewer';
          created_at?: string;
        };
        Update: {
          team_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'uploader' | 'viewer';
          created_at?: string;
        };
      };
      game_films: {
        Row: {
          id: string;
          team_id: string;
          title: string;
          opponent: string | null;
          game_date: string | null;
          venue: string | null;
          competition_level: string | null;
          storage_bucket: string;
          storage_path: string;
          status: 'uploading' | 'ready' | 'archived' | 'failed';
          download_enabled: boolean;
          original_filename: string;
          mime_type: string | null;
          size_bytes: number | null;
          duration_seconds: number | null;
          view_count: number;
          download_count: number;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
          last_viewed_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          title: string;
          opponent?: string | null;
          game_date?: string | null;
          venue?: string | null;
          competition_level?: string | null;
          storage_bucket: string;
          storage_path: string;
          status?: 'uploading' | 'ready' | 'archived' | 'failed';
          download_enabled?: boolean;
          original_filename: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          duration_seconds?: number | null;
          view_count?: number;
          download_count?: number;
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
          last_viewed_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          title?: string;
          opponent?: string | null;
          game_date?: string | null;
          venue?: string | null;
          competition_level?: string | null;
          storage_bucket?: string;
          storage_path?: string;
          status?: 'uploading' | 'ready' | 'archived' | 'failed';
          download_enabled?: boolean;
          original_filename?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          duration_seconds?: number | null;
          view_count?: number;
          download_count?: number;
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
          last_viewed_at?: string | null;
        };
      };
      film_assets: {
        Row: {
          id: string;
          film_id: string;
          kind: 'video' | 'subtitle' | 'thumbnail';
          status: 'uploading' | 'ready' | 'archived' | 'failed';
          storage_bucket: string;
          storage_path: string;
          quality_label: string | null;
          language_code: string | null;
          original_filename: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          film_id: string;
          kind: 'video' | 'subtitle' | 'thumbnail';
          status?: 'uploading' | 'ready' | 'archived' | 'failed';
          storage_bucket: string;
          storage_path: string;
          quality_label?: string | null;
          language_code?: string | null;
          original_filename?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          film_id?: string;
          kind?: 'video' | 'subtitle' | 'thumbnail';
          status?: 'uploading' | 'ready' | 'archived' | 'failed';
          storage_bucket?: string;
          storage_path?: string;
          quality_label?: string | null;
          language_code?: string | null;
          original_filename?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      film_events: {
        Row: {
          id: string;
          film_id: string;
          actor_id: string | null;
          event_type: 'upload' | 'view' | 'download' | 'recording';
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          film_id: string;
          actor_id?: string | null;
          event_type: 'upload' | 'view' | 'download' | 'recording';
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          film_id?: string;
          actor_id?: string | null;
          event_type?: 'upload' | 'view' | 'download' | 'recording';
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      notification_recipients: {
        Row: {
          id: string;
          team_id: string;
          email: string;
          events: ('upload' | 'view' | 'download' | 'recording')[];
          enabled: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          email: string;
          events: ('upload' | 'view' | 'download' | 'recording')[];
          enabled?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          email?: string;
          events?: ('upload' | 'view' | 'download' | 'recording')[];
          enabled?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      team_role: 'owner' | 'admin' | 'uploader' | 'viewer';
      film_status: 'uploading' | 'ready' | 'archived' | 'failed';
      film_event_type: 'upload' | 'view' | 'download' | 'recording';
      film_asset_kind: 'video' | 'subtitle' | 'thumbnail';
    };
    CompositeTypes: Record<string, never>;
  };
};
