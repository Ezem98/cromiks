export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          rarity: string
          unlock_condition: Json
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          display_order?: number | null
          icon_name?: string | null
          id: string
          is_active?: boolean
          name: string
          rarity?: string
          unlock_condition: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rarity?: string
          unlock_condition?: Json
        }
        Relationships: []
      }
      cards: {
        Row: {
          album_id: string
          card_number: number
          content: Json
          created_at: string
          description: string | null
          id: string
          legendary_brief: Json | null
          metadata: Json
          name: string
          page_id: string | null
          rarity: Database['public']['Enums']['card_rarity']
          updated_at: string
        }
        Insert: {
          album_id: string
          card_number: number
          content?: Json
          created_at?: string
          description?: string | null
          id: string
          legendary_brief?: Json | null
          metadata?: Json
          name: string
          page_id?: string | null
          rarity: Database['public']['Enums']['card_rarity']
          updated_at?: string
        }
        Update: {
          album_id?: string
          card_number?: number
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          legendary_brief?: Json | null
          metadata?: Json
          name?: string
          page_id?: string | null
          rarity?: Database['public']['Enums']['card_rarity']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cards_page_id_fkey'
            columns: ['page_id']
            isOneToOne: false
            referencedRelation: 'pages'
            referencedColumns: ['id']
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'coin_transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      mission_templates: {
        Row: {
          config: Json
          created_at: string
          description: string
          id: string
          is_daily_pool: boolean
          reward_card_count: number | null
          reward_coins: number | null
          reward_pack_type: Database['public']['Enums']['pack_type'] | null
          title: string
          type: Database['public']['Enums']['mission_type']
          weight: number | null
        }
        Insert: {
          config: Json
          created_at?: string
          description: string
          id: string
          is_daily_pool?: boolean
          reward_card_count?: number | null
          reward_coins?: number | null
          reward_pack_type?: Database['public']['Enums']['pack_type'] | null
          title: string
          type: Database['public']['Enums']['mission_type']
          weight?: number | null
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string
          id?: string
          is_daily_pool?: boolean
          reward_card_count?: number | null
          reward_coins?: number | null
          reward_pack_type?: Database['public']['Enums']['pack_type'] | null
          title?: string
          type?: Database['public']['Enums']['mission_type']
          weight?: number | null
        }
        Relationships: []
      }
      packs: {
        Row: {
          available_at: string
          card_count: number
          context: Json
          expires_at: string | null
          id: string
          opened_at: string | null
          rolled_card_ids: string[] | null
          status: Database['public']['Enums']['pack_status']
          type: Database['public']['Enums']['pack_type']
          user_id: string
        }
        Insert: {
          available_at?: string
          card_count?: number
          context?: Json
          expires_at?: string | null
          id?: string
          opened_at?: string | null
          rolled_card_ids?: string[] | null
          status?: Database['public']['Enums']['pack_status']
          type: Database['public']['Enums']['pack_type']
          user_id: string
        }
        Update: {
          available_at?: string
          card_count?: number
          context?: Json
          expires_at?: string | null
          id?: string
          opened_at?: string | null
          rolled_card_ids?: string[] | null
          status?: Database['public']['Enums']['pack_status']
          type?: Database['public']['Enums']['pack_type']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'packs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      pages: {
        Row: {
          album_id: string
          bonus_card_ids: string[] | null
          card_range_end: number
          card_range_start: number
          created_at: string
          description: string | null
          id: string
          page_number: number
          subtitle: string | null
          title: string
        }
        Insert: {
          album_id: string
          bonus_card_ids?: string[] | null
          card_range_end: number
          card_range_start: number
          created_at?: string
          description?: string | null
          id: string
          page_number: number
          subtitle?: string | null
          title: string
        }
        Update: {
          album_id?: string
          bonus_card_ids?: string[] | null
          card_range_end?: number
          card_range_start?: number
          created_at?: string
          description?: string | null
          id?: string
          page_number?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean
          language: Database['public']['Enums']['user_language']
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_public?: boolean
          language?: Database['public']['Enums']['user_language']
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean
          language?: Database['public']['Enums']['user_language']
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      share_events: {
        Row: {
          card_id: string
          created_at: string
          format: string | null
          id: string
          platform: Database['public']['Enums']['share_platform']
          referral_completed_at: string | null
          referral_token: string | null
          referred_user_id: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          format?: string | null
          id?: string
          platform: Database['public']['Enums']['share_platform']
          referral_completed_at?: string | null
          referral_token?: string | null
          referred_user_id?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          format?: string | null
          id?: string
          platform?: Database['public']['Enums']['share_platform']
          referral_completed_at?: string | null
          referral_token?: string | null
          referred_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'share_events_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'share_events_referred_user_id_fkey'
            columns: ['referred_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'share_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      streaks: {
        Row: {
          current_streak: number
          last_claim_date: string | null
          longest_streak: number
          total_claims: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          total_claims?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          total_claims?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'streaks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tips: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          foundation: string
          id: string
          is_anonymous: boolean
          message: string | null
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_status: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          foundation: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_status?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          foundation?: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tips_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          is_pinned: boolean
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          is_pinned?: boolean
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          is_pinned?: boolean
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_badges_badge_id_fkey'
            columns: ['badge_id']
            isOneToOne: false
            referencedRelation: 'badges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_badges_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_cards: {
        Row: {
          card_id: string
          copies: number
          first_obtained_at: string
          is_pinned: boolean
          last_obtained_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          copies?: number
          first_obtained_at?: string
          is_pinned?: boolean
          last_obtained_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          copies?: number
          first_obtained_at?: string
          is_pinned?: boolean
          last_obtained_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_cards_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_cards_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_coins_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_missions: {
        Row: {
          assigned_at: string
          claimed_at: string | null
          completed_at: string | null
          expires_at: string | null
          id: string
          mission_template_id: string
          progress: number
          status: Database['public']['Enums']['mission_status']
          target: number
          user_id: string
        }
        Insert: {
          assigned_at?: string
          claimed_at?: string | null
          completed_at?: string | null
          expires_at?: string | null
          id?: string
          mission_template_id: string
          progress?: number
          status?: Database['public']['Enums']['mission_status']
          target: number
          user_id: string
        }
        Update: {
          assigned_at?: string
          claimed_at?: string | null
          completed_at?: string | null
          expires_at?: string | null
          id?: string
          mission_template_id?: string
          progress?: number
          status?: Database['public']['Enums']['mission_status']
          target?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_missions_mission_template_id_fkey'
            columns: ['mission_template_id']
            isOneToOne: false
            referencedRelation: 'mission_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_missions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _advance_missions: {
        Args: {
          p_context?: Json
          p_increment?: number
          p_type: Database['public']['Enums']['mission_type']
          p_user_id: string
        }
        Returns: undefined
      }
      _check_and_unlock_badges: {
        Args: { p_condition_type: string; p_context?: Json; p_user_id: string }
        Returns: undefined
      }
      _coin_reward_for_rarity: {
        Args: { p_rarity: Database['public']['Enums']['card_rarity'] }
        Returns: number
      }
      claim_daily_pack: {
        Args: never
        Returns: {
          is_first_claim: boolean
          new_streak: number
          pack_id: string
        }[]
      }
      claim_mission: {
        Args: { p_user_mission_id: string }
        Returns: {
          out_cards_earned: number
          out_coins_earned: number
          out_new_balance: number
          out_pack_id: string
        }[]
      }
      complete_referral: {
        Args: { p_referral_token: string }
        Returns: {
          referred_pack_id: string
          referrer_id: string
          referrer_pack_id: string
        }[]
      }
      dismantle_card: {
        Args: { p_card_id: string; p_count?: number }
        Returns: {
          coins_earned: number
          copies_left: number
          new_balance: number
        }[]
      }
      open_pack: {
        Args: { p_pack_id: string }
        Returns: {
          card_name: string
          card_role: string
          card_tier: Database['public']['Enums']['card_rarity']
          coin_reward: number
          coins_after: number
          coins_earned: number
          copies_after: number
          image_url: string
          is_new: boolean
          out_card_id: string
          out_card_number: number
          pack_type: Database['public']['Enums']['pack_type']
          was_replay: boolean
        }[]
      }
      pin_card: { Args: { p_card_id: string }; Returns: undefined }
      record_share: {
        Args: {
          p_card_id: string
          p_format?: string
          p_platform: Database['public']['Enums']['share_platform']
        }
        Returns: {
          referral_token: string
          share_id: string
        }[]
      }
      roll_cards: {
        Args: { p_album_id: string; p_count?: number }
        Returns: string[]
      }
      unpin_card: { Args: { p_card_id: string }; Returns: undefined }
    }
    Enums: {
      card_rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
      content_type: 'photo' | 'video' | 'audio' | 'relator_clip'
      mission_status: 'active' | 'completed' | 'claimed' | 'expired'
      mission_type:
        | 'open_pack'
        | 'pin_card'
        | 'share_card'
        | 'collect_rarity'
        | 'complete_page'
        | 'login_streak'
      pack_status: 'pending' | 'opening' | 'opened' | 'expired'
      pack_type: 'daily' | 'mission' | 'match' | 'streak' | 'referral' | 'welcome' | 'premium'
      share_platform:
        | 'whatsapp'
        | 'twitter'
        | 'instagram'
        | 'tiktok'
        | 'facebook'
        | 'telegram'
        | 'copy_link'
        | 'other'
      user_language: 'es' | 'en' | 'pt' | 'it'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      card_rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      content_type: ['photo', 'video', 'audio', 'relator_clip'],
      mission_status: ['active', 'completed', 'claimed', 'expired'],
      mission_type: [
        'open_pack',
        'pin_card',
        'share_card',
        'collect_rarity',
        'complete_page',
        'login_streak',
      ],
      pack_status: ['pending', 'opening', 'opened', 'expired'],
      pack_type: ['daily', 'mission', 'match', 'streak', 'referral', 'welcome', 'premium'],
      share_platform: [
        'whatsapp',
        'twitter',
        'instagram',
        'tiktok',
        'facebook',
        'telegram',
        'copy_link',
        'other',
      ],
      user_language: ['es', 'en', 'pt', 'it'],
    },
  },
} as const
