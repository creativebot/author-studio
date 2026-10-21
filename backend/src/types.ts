export type FeatureContext =
  | 'sounding_board_chat'
  | 'voice_dictation'
  | 'diff_review'
  | 'structure_evolution'
  | 'general_system';

export interface DebugSnapshot {
  snapshot_id: string;
  timestamp: string;
  feature_context: FeatureContext;
  user_notes?: string;
  state: {
    active_section_id?: string | null;
    active_section_title?: string | null;
    active_text?: string | null;
    selection_range?: {
      start: number;
      end: number;
      selected_text: string;
    } | null;
    structure_tree?: StructureNode[];
    concept_vault?: Record<string, any>;
    pending_diff?: DiffSuggestion | null;
    recent_rejected_edits?: RejectedEditFeedback[];
  };
  llm_telemetry?: {
    model: string;
    system_instruction?: string;
    prompt_payload?: any;
    raw_response?: string;
    parsed_response?: any;
    latency_ms: number;
    error?: string | null;
  };
  audio_telemetry?: {
    duration_seconds?: number;
    mime_type?: string;
    bytes_size?: number;
    transcription_result?: string | null;
    error?: string | null;
  };
  client_info?: {
    platform: 'android' | 'web' | 'ios';
    version: string;
    screen: string;
  };
}

export interface StructureNode {
  id: string;
  title: string;
  type: 'concept' | 'part' | 'section' | 'practice' | 'note';
  order: number;
  content: string;
  summary?: string;
  children?: StructureNode[];
}

export interface RejectedEditFeedback {
  id: string;
  timestamp: string;
  original_text: string;
  proposed_text: string;
  reason: string;
}

export interface DiffSuggestion {
  id: string;
  original_text: string;
  revised_text: string;
  explanation: string;
  diff_tokens: Array<{
    type: 'equal' | 'insert' | 'delete';
    value: string;
  }>;
}

export interface SocraticMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  extracted_concepts?: Array<{
    title: string;
    type: 'theory' | 'practice' | 'axiom' | 'question';
    description: string;
  }>;
}
