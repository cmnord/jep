export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          game_id: string | null;
          id: number;
          name: string;
          note: string | null;
          round: number;
        };
        Insert: {
          created_at?: string;
          game_id?: string | null;
          id?: number;
          name: string;
          note?: string | null;
          round?: number;
        };
        Update: {
          created_at?: string;
          game_id?: string | null;
          id?: number;
          name?: string;
          note?: string | null;
          round?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_game_id_fkey";
            columns: ["game_id"];
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      clues: {
        Row: {
          answer: string;
          category_id: number;
          clue: string;
          id: number;
          image_src: string | null;
          long_form: boolean;
          value: number;
          wagerable: boolean;
        };
        Insert: {
          answer: string;
          category_id: number;
          clue: string;
          id?: number;
          image_src?: string | null;
          long_form?: boolean;
          value: number;
          wagerable?: boolean;
        };
        Update: {
          answer?: string;
          category_id?: number;
          clue?: string;
          id?: number;
          image_src?: string | null;
          long_form?: boolean;
          value?: number;
          wagerable?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "clues_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          author: string;
          copyright: string | null;
          created_at: string;
          id: string;
          note: string | null;
          title: string;
          uploaded_by: string | null;
          visibility: Database["public"]["Enums"]["game_visibility"];
        };
        Insert: {
          author: string;
          copyright?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          title: string;
          uploaded_by?: string | null;
          visibility?: Database["public"]["Enums"]["game_visibility"];
        };
        Update: {
          author?: string;
          copyright?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          title?: string;
          uploaded_by?: string | null;
          visibility?: Database["public"]["Enums"]["game_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "games_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          created_by: string | null;
          game_id: string;
          id: number;
          reason: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          game_id: string;
          id?: number;
          reason: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          game_id?: string;
          id?: number;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_game_id_fkey";
            columns: ["game_id"];
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      room_events: {
        Row: {
          id: number;
          payload: Json | null;
          room_id: number;
          ts: string;
          type: string;
        };
        Insert: {
          id?: number;
          payload?: Json | null;
          room_id: number;
          ts?: string;
          type: string;
        };
        Update: {
          id?: number;
          payload?: Json | null;
          room_id?: number;
          ts?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_events_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          game_id: string;
          id: number;
          name: string;
        };
        Insert: {
          game_id: string;
          id?: number;
          name: string;
        };
        Update: {
          game_id?: string;
          id?: number;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_game_id_fkey";
            columns: ["game_id"];
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      game_visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buckets_owner_fkey";
            columns: ["owner"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      extension: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      filename: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      foldername: {
        Args: {
          name: string;
        };
        Returns: unknown;
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: {
          size: number;
          bucket_id: string;
        }[];
      };
      search: {
        Args: {
          prefix: string;
          bucketname: string;
          limits?: number;
          levels?: number;
          offsets?: number;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          name: string;
          id: string;
          updated_at: string;
          created_at: string;
          last_accessed_at: string;
          metadata: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
