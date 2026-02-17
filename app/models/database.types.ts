export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
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
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
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
          settings: Json;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          settings?: Json;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          settings?: Json;
        };
        Relationships: [];
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
            isOneToOne: false;
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
            isOneToOne: false;
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
            isOneToOne: false;
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
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
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
            isOneToOne: false;
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
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      solves: {
        Row: {
          game_id: string;
          id: number;
          room_id: number;
          solved_at: string | null;
          started_at: string | null;
          user_id: string;
        };
        Insert: {
          game_id: string;
          id?: number;
          room_id: number;
          solved_at?: string | null;
          started_at?: string | null;
          user_id: string;
        };
        Update: {
          game_id?: string;
          id?: number;
          room_id?: number;
          solved_at?: string | null;
          started_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "solves_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solves_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solves_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
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
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      game_visibility: ["PUBLIC", "PRIVATE", "UNLISTED"],
    },
  },
} as const;
