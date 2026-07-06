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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          color: string | null
          created_at: string
          date: string
          description: string | null
          geocoded_at: string | null
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          time: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          date: string
          description?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          time?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          date?: string
          description?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          time?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          anno_acquisto: number
          categoria: string | null
          created_at: string
          dealer_id: string
          descrizione: string
          id: string
          perc_amm: number
          valore: number
        }
        Insert: {
          anno_acquisto: number
          categoria?: string | null
          created_at?: string
          dealer_id: string
          descrizione: string
          id?: string
          perc_amm?: number
          valore: number
        }
        Update: {
          anno_acquisto?: number
          categoria?: string | null
          created_at?: string
          dealer_id?: string
          descrizione?: string
          id?: string
          perc_amm?: number
          valore?: number
        }
        Relationships: []
      }
      bank_movements: {
        Row: {
          amount: number
          causale: string
          created_at: string
          dealer_id: string
          external_id: string | null
          id: string
          matched_code: string | null
          movement_date: string
          payment_id: string | null
          raw: Json
          source: string
          status: string
        }
        Insert: {
          amount: number
          causale?: string
          created_at?: string
          dealer_id: string
          external_id?: string | null
          id?: string
          matched_code?: string | null
          movement_date: string
          payment_id?: string | null
          raw?: Json
          source?: string
          status?: string
        }
        Update: {
          amount?: number
          causale?: string
          created_at?: string
          dealer_id?: string
          external_id?: string | null
          id?: string
          matched_code?: string | null
          movement_date?: string
          payment_id?: string | null
          raw?: Json
          source?: string
          status?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          code: string
          description: string
          section: string | null
          type: string
        }
        Insert: {
          code: string
          description: string
          section?: string | null
          type: string
        }
        Update: {
          code?: string
          description?: string
          section?: string | null
          type?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string | null
          dealer_id: string
          file_size: number | null
          file_url: string
          id: string
          name: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          dealer_id: string
          file_size?: number | null
          file_url: string
          id?: string
          name: string
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          dealer_id?: string
          file_size?: number | null
          file_url?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "end_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_keywords: {
        Row: {
          account_code: string
          id: string
          keywords: string[]
          priority: number
        }
        Insert: {
          account_code: string
          id?: string
          keywords: string[]
          priority?: number
        }
        Update: {
          account_code?: string
          id?: string
          keywords?: string[]
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "coding_keywords_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
      }
      coding_rules: {
        Row: {
          account_code: string
          created_at: string
          dealer_id: string
          id: string
          piva: string
        }
        Insert: {
          account_code: string
          created_at?: string
          dealer_id: string
          id?: string
          piva: string
        }
        Update: {
          account_code?: string
          created_at?: string
          dealer_id?: string
          id?: string
          piva?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_rules_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
      }
      company_profile: {
        Row: {
          cap: string
          codice_fiscale: string
          codice_sdi: string
          comune: string
          dealer_id: string
          denominazione: string
          iban: string | null
          indirizzo: string
          nazione: string
          piva: string
          provincia: string
          regime_fiscale: string
          updated_at: string
        }
        Insert: {
          cap?: string
          codice_fiscale?: string
          codice_sdi?: string
          comune?: string
          dealer_id: string
          denominazione?: string
          iban?: string | null
          indirizzo?: string
          nazione?: string
          piva?: string
          provincia?: string
          regime_fiscale?: string
          updated_at?: string
        }
        Update: {
          cap?: string
          codice_fiscale?: string
          codice_sdi?: string
          comune?: string
          dealer_id?: string
          denominazione?: string
          iban?: string | null
          indirizzo?: string
          nazione?: string
          piva?: string
          provincia?: string
          regime_fiscale?: string
          updated_at?: string
        }
        Relationships: []
      }
      dealer_quotes: {
        Row: {
          client_id: string | null
          created_at: string
          dealer_id: string
          detrazione_amount: number
          detrazione_id: string | null
          id: string
          lead_id: string | null
          markup_amount: number
          measurement_id: string | null
          notes: string | null
          posa_amount: number
          status: string
          subtotal_net: number
          taxable_base: number
          title: string
          total_gross: number
          total_net_of_bonus: number
          trasporto_amount: number
          updated_at: string
          vat_10_base: number
          vat_22_base: number
          vat_amount: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          dealer_id: string
          detrazione_amount?: number
          detrazione_id?: string | null
          id?: string
          lead_id?: string | null
          markup_amount?: number
          measurement_id?: string | null
          notes?: string | null
          posa_amount?: number
          status?: string
          subtotal_net?: number
          taxable_base?: number
          title?: string
          total_gross?: number
          total_net_of_bonus?: number
          trasporto_amount?: number
          updated_at?: string
          vat_10_base?: number
          vat_22_base?: number
          vat_amount?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          dealer_id?: string
          detrazione_amount?: number
          detrazione_id?: string | null
          id?: string
          lead_id?: string | null
          markup_amount?: number
          measurement_id?: string | null
          notes?: string | null
          posa_amount?: number
          status?: string
          subtotal_net?: number
          taxable_base?: number
          title?: string
          total_gross?: number
          total_net_of_bonus?: number
          trasporto_amount?: number
          updated_at?: string
          vat_10_base?: number
          vat_22_base?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "dealer_quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "end_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_quotes_detrazione_id_fkey"
            columns: ["detrazione_id"]
            isOneToOne: false
            referencedRelation: "detrazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_quotes_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      detrazioni: {
        Row: {
          active: boolean
          cap: number | null
          id: string
          name: string
          note: string | null
          percentage: number
        }
        Insert: {
          active?: boolean
          cap?: number | null
          id?: string
          name: string
          note?: string | null
          percentage: number
        }
        Update: {
          active?: boolean
          cap?: number | null
          id?: string
          name?: string
          note?: string | null
          percentage?: number
        }
        Relationships: []
      }
      end_clients: {
        Row: {
          address: string | null
          city: string | null
          codice_sdi: string | null
          created_at: string | null
          dealer_id: string
          email: string | null
          geocoded_at: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          phone: string | null
          piva: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          codice_sdi?: string | null
          created_at?: string | null
          dealer_id: string
          email?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          piva?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          codice_sdi?: string | null
          created_at?: string | null
          dealer_id?: string
          email?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          piva?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          order_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          order_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          order_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          anno: number
          dealer_id: string
          last_number: number
        }
        Insert: {
          anno: number
          dealer_id: string
          last_number?: number
        }
        Update: {
          anno?: number
          dealer_id?: string
          last_number?: number
        }
        Relationships: []
      }
      invoices_raw: {
        Row: {
          aliquota: number
          chiave: string
          cliente: string
          created_at: string
          data: string | null
          dealer_id: string
          descrizione: string
          entry_id: string | null
          file_url: string | null
          fornitore: string
          id: string
          imponibile: number
          imposta: number
          intra_ue: boolean
          natura: string
          numero: string
          paese_fornitore: string
          piva_fornitore: string
          proposed_account: string | null
          status: string
          tipo_doc: string
          totale: number
        }
        Insert: {
          aliquota?: number
          chiave: string
          cliente?: string
          created_at?: string
          data?: string | null
          dealer_id: string
          descrizione?: string
          entry_id?: string | null
          file_url?: string | null
          fornitore?: string
          id?: string
          imponibile?: number
          imposta?: number
          intra_ue?: boolean
          natura?: string
          numero?: string
          paese_fornitore?: string
          piva_fornitore?: string
          proposed_account?: string | null
          status?: string
          tipo_doc?: string
          totale?: number
        }
        Update: {
          aliquota?: number
          chiave?: string
          cliente?: string
          created_at?: string
          data?: string | null
          dealer_id?: string
          descrizione?: string
          entry_id?: string | null
          file_url?: string | null
          fornitore?: string
          id?: string
          imponibile?: number
          imposta?: number
          intra_ue?: boolean
          natura?: string
          numero?: string
          paese_fornitore?: string
          piva_fornitore?: string
          proposed_account?: string | null
          status?: string
          tipo_doc?: string
          totale?: number
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          chiave: string
          controparte: string
          created_at: string
          data: string
          dealer_id: string
          id: string
          incompleta: boolean
          intra_ue: boolean
          measurement_id: string | null
          mov_tipo: string | null
          note: string | null
          numero: string
          origine: string | null
          source_xml_url: string | null
          stato: string
          tipo: string
        }
        Insert: {
          chiave: string
          controparte?: string
          created_at?: string
          data: string
          dealer_id: string
          id?: string
          incompleta?: boolean
          intra_ue?: boolean
          measurement_id?: string | null
          mov_tipo?: string | null
          note?: string | null
          numero?: string
          origine?: string | null
          source_xml_url?: string | null
          stato?: string
          tipo?: string
        }
        Update: {
          chiave?: string
          controparte?: string
          created_at?: string
          data?: string
          dealer_id?: string
          id?: string
          incompleta?: boolean
          intra_ue?: boolean
          measurement_id?: string | null
          mov_tipo?: string | null
          note?: string | null
          numero?: string
          origine?: string | null
          source_xml_url?: string | null
          stato?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_code: string
          avere: number
          dare: number
          descr: string
          entry_id: string
          id: string
          sort_order: number
        }
        Insert: {
          account_code: string
          avere?: number
          dare?: number
          descr?: string
          entry_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          account_code?: string
          avere?: number
          dare?: number
          descr?: string
          entry_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          created_at: string
          created_by: string | null
          dealer_id: string
          id: string
          lead_id: string
          note: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dealer_id: string
          id?: string
          lead_id: string
          note?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dealer_id?: string
          id?: string
          lead_id?: string
          note?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          city: string | null
          converted_client_id: string | null
          converted_measurement_id: string | null
          created_at: string
          dealer_id: string
          email: string | null
          estimated_value: number | null
          geocoded_at: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          next_action_at: string | null
          notes: string | null
          phone: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          converted_client_id?: string | null
          converted_measurement_id?: string | null
          created_at?: string
          dealer_id: string
          email?: string | null
          estimated_value?: number | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          converted_client_id?: string | null
          converted_measurement_id?: string | null
          created_at?: string
          dealer_id?: string
          email?: string | null
          estimated_value?: number | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "end_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_measurement_id_fkey"
            columns: ["converted_measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          accessories_config: Json | null
          amount_paid: number | null
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          color_external: string | null
          color_internal: string | null
          created_at: string | null
          delivery_notes: string | null
          depth_mm: number | null
          dispute_notes: string | null
          estimated_delivery_date: string | null
          estimated_price: number | null
          external_space_mm: number | null
          frame_type: string | null
          geocoded_at: string | null
          glass_type: string | null
          handle_type: string | null
          has_box: boolean | null
          has_dispute: boolean | null
          has_modification: boolean | null
          has_mosquito_net: boolean | null
          has_motorization: boolean | null
          has_shutter: boolean | null
          height: number | null
          height_mm: number | null
          id: string
          installation_type: string | null
          internal_space_mm: number | null
          is_level: boolean | null
          is_plumb: boolean | null
          is_square: boolean | null
          lat: number | null
          laying_type: string | null
          lng: number | null
          material: string | null
          modification_notes: string | null
          notes: string | null
          num_panels: number | null
          opening_direction: string | null
          order_group_id: string | null
          order_item_index: number | null
          order_total_items: number | null
          out_of_square_mm: number | null
          panel_type: string | null
          payment_code: string | null
          payment_method: string | null
          payment_status: string | null
          photo_urls: string[] | null
          product_id: string | null
          product_type: string | null
          remove_old: boolean | null
          status: string | null
          supplier_id: string | null
          survey_type: string | null
          updated_at: string | null
          user_id: string | null
          width: number | null
          width_mm: number | null
        }
        Insert: {
          accessories_config?: Json | null
          amount_paid?: number | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          color_external?: string | null
          color_internal?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          depth_mm?: number | null
          dispute_notes?: string | null
          estimated_delivery_date?: string | null
          estimated_price?: number | null
          external_space_mm?: number | null
          frame_type?: string | null
          geocoded_at?: string | null
          glass_type?: string | null
          handle_type?: string | null
          has_box?: boolean | null
          has_dispute?: boolean | null
          has_modification?: boolean | null
          has_mosquito_net?: boolean | null
          has_motorization?: boolean | null
          has_shutter?: boolean | null
          height?: number | null
          height_mm?: number | null
          id?: string
          installation_type?: string | null
          internal_space_mm?: number | null
          is_level?: boolean | null
          is_plumb?: boolean | null
          is_square?: boolean | null
          lat?: number | null
          laying_type?: string | null
          lng?: number | null
          material?: string | null
          modification_notes?: string | null
          notes?: string | null
          num_panels?: number | null
          opening_direction?: string | null
          order_group_id?: string | null
          order_item_index?: number | null
          order_total_items?: number | null
          out_of_square_mm?: number | null
          panel_type?: string | null
          payment_code?: string | null
          payment_method?: string | null
          payment_status?: string | null
          photo_urls?: string[] | null
          product_id?: string | null
          product_type?: string | null
          remove_old?: boolean | null
          status?: string | null
          supplier_id?: string | null
          survey_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          width?: number | null
          width_mm?: number | null
        }
        Update: {
          accessories_config?: Json | null
          amount_paid?: number | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          color_external?: string | null
          color_internal?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          depth_mm?: number | null
          dispute_notes?: string | null
          estimated_delivery_date?: string | null
          estimated_price?: number | null
          external_space_mm?: number | null
          frame_type?: string | null
          geocoded_at?: string | null
          glass_type?: string | null
          handle_type?: string | null
          has_box?: boolean | null
          has_dispute?: boolean | null
          has_modification?: boolean | null
          has_mosquito_net?: boolean | null
          has_motorization?: boolean | null
          has_shutter?: boolean | null
          height?: number | null
          height_mm?: number | null
          id?: string
          installation_type?: string | null
          internal_space_mm?: number | null
          is_level?: boolean | null
          is_plumb?: boolean | null
          is_square?: boolean | null
          lat?: number | null
          laying_type?: string | null
          lng?: number | null
          material?: string | null
          modification_notes?: string | null
          notes?: string | null
          num_panels?: number | null
          opening_direction?: string | null
          order_group_id?: string | null
          order_item_index?: number | null
          order_total_items?: number | null
          out_of_square_mm?: number | null
          panel_type?: string | null
          payment_code?: string | null
          payment_method?: string | null
          payment_status?: string | null
          photo_urls?: string[] | null
          product_id?: string | null
          product_type?: string | null
          remove_old?: boolean | null
          status?: string | null
          supplier_id?: string | null
          survey_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          width?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "end_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          created_at: string | null
          id: string
          image_position: string | null
          image_url: string | null
          link: string | null
          published: boolean | null
          social_link: string | null
          summary: string | null
          tag: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_position?: string | null
          image_url?: string | null
          link?: string | null
          published?: boolean | null
          social_link?: string | null
          summary?: string | null
          tag?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_position?: string | null
          image_url?: string | null
          link?: string | null
          published?: boolean | null
          social_link?: string | null
          summary?: string | null
          tag?: string | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operation_events: {
        Row: {
          dealer_id: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json
          occurred_at: string
          operation: string
        }
        Insert: {
          dealer_id: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json
          occurred_at?: string
          operation: string
        }
        Update: {
          dealer_id?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json
          occurred_at?: string
          operation?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          quote_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          quote_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          quote_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_number: string | null
          measurement_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number?: string | null
          measurement_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number?: string | null
          measurement_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      price_catalog: {
        Row: {
          base_price: number
          created_at: string | null
          door_model_id: string
          height_max_mm: number
          height_min_mm: number
          id: string
          width_max_mm: number
          width_min_mm: number
        }
        Insert: {
          base_price: number
          created_at?: string | null
          door_model_id: string
          height_max_mm: number
          height_min_mm: number
          id?: string
          width_max_mm: number
          width_min_mm: number
        }
        Update: {
          base_price?: number
          created_at?: string | null
          door_model_id?: string
          height_max_mm?: number
          height_min_mm?: number
          id?: string
          width_max_mm?: number
          width_min_mm?: number
        }
        Relationships: []
      }
      price_modifiers: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          door_model_id: string | null
          id: string
          label: string | null
          modifier_id: string
          modifier_type: string
        }
        Insert: {
          adjustment_type: string
          adjustment_value: number
          door_model_id?: string | null
          id?: string
          label?: string | null
          modifier_id: string
          modifier_type: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          door_model_id?: string | null
          id?: string
          label?: string | null
          modifier_id?: string
          modifier_type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accounting_enabled: boolean
          approved: boolean
          client_code: string | null
          company_name: string | null
          created_at: string | null
          dark_mode: boolean | null
          email: string | null
          full_name: string | null
          id: string
          logo_url: string | null
          org_contacts: Json | null
          phone: string | null
          supplier_logos: Json | null
          user_id: string | null
        }
        Insert: {
          accounting_enabled?: boolean
          approved?: boolean
          client_code?: string | null
          company_name?: string | null
          created_at?: string | null
          dark_mode?: boolean | null
          email?: string | null
          full_name?: string | null
          id: string
          logo_url?: string | null
          org_contacts?: Json | null
          phone?: string | null
          supplier_logos?: Json | null
          user_id?: string | null
        }
        Update: {
          accounting_enabled?: boolean
          approved?: boolean
          client_code?: string | null
          company_name?: string | null
          created_at?: string | null
          dark_mode?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          org_contacts?: Json | null
          phone?: string | null
          supplier_logos?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          id: string
          measurement_id: string | null
          price: number | null
          quote_id: string | null
        }
        Insert: {
          id?: string
          measurement_id?: string | null
          price?: number | null
          quote_id?: string | null
        }
        Update: {
          id?: string
          measurement_id?: string | null
          price?: number | null
          quote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          description: string
          id: string
          is_bene_significativo: boolean
          line_total: number
          markup: number
          product_ref: string | null
          qty: number
          quote_id: string
          sort_order: number
          unit_net_price: number
          vat_rate: number
        }
        Insert: {
          description?: string
          id?: string
          is_bene_significativo?: boolean
          line_total?: number
          markup?: number
          product_ref?: string | null
          qty?: number
          quote_id: string
          sort_order?: number
          unit_net_price?: number
          vat_rate?: number
        }
        Update: {
          description?: string
          id?: string
          is_bene_significativo?: boolean
          line_total?: number
          markup?: number
          product_ref?: string | null
          qty?: number
          quote_id?: string
          sort_order?: number
          unit_net_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "dealer_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_objectives: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          month: number | null
          period: string
          product_type: string | null
          target_amount: number | null
          target_count: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          month?: number | null
          period?: string
          product_type?: string | null
          target_amount?: number | null
          target_count?: number | null
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          month?: number | null
          period?: string
          product_type?: string | null
          target_amount?: number | null
          target_count?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      signatures: {
        Row: {
          id: string
          order_id: string | null
          signature_url: string | null
          signed_at: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          signature_url?: string | null
          signed_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          signature_url?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          measurement_id: string
          new_status: string
          note: string | null
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          measurement_id: string
          new_status: string
          note?: string | null
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          measurement_id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_history_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_catalogs: {
        Row: {
          created_at: string
          id: string
          name: string
          pdf_url: string | null
          sort_order: number
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pdf_url?: string | null
          sort_order?: number
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pdf_url?: string | null
          sort_order?: number
          supplier_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      vat_rates: {
        Row: {
          active: boolean
          id: string
          is_default: boolean
          label: string
          rate: number
        }
        Insert: {
          active?: boolean
          id?: string
          is_default?: boolean
          label: string
          rate: number
        }
        Update: {
          active?: boolean
          id?: string
          is_default?: boolean
          label?: string
          rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_account_balances: {
        Row: {
          account_code: string | null
          dealer_id: string | null
          description: string | null
          saldo: number | null
          section: string | null
          tot_avere: number | null
          tot_dare: number | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
      }
      v_status_durations: {
        Row: {
          changed_at: string | null
          dealer_id: string | null
          duration_seconds: number | null
          from_status: string | null
          measurement_id: string | null
          prev_changed_at: string | null
          to_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_user_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      v_status_median_durations: {
        Row: {
          avg_seconds: number | null
          dealer_id: string | null
          from_status: string | null
          median_seconds: number | null
          to_status: string | null
          transitions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_user_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      gen_payment_code: { Args: never; Returns: string }
      get_vat_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          iva_credito: number
          iva_debito: number
          saldo: number
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
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
