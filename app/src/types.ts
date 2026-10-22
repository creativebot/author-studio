export interface StructureNode {
  id: string;
  title: string;
  type: 'concept' | 'part' | 'section' | 'practice' | 'note';
  order: number;
  content: string;
  summary?: string;
  children?: StructureNode[];
}

export interface ConceptItem {
  id: string;
  name?: string;
  statement?: string;
  description?: string;
  protocol?: string;
  context?: string;
}

export interface ProjectData {
  book_title: string;
  author_thesis: string;
  style_guidelines: string[];
  structure_tree: StructureNode[];
  concept_vault: {
    theories: ConceptItem[];
    practices: ConceptItem[];
    axioms: ConceptItem[];
    open_questions: Array<{ id: string; question: string; status: 'open' | 'resolved' }>;
  };
  sounding_board_history: Array<{
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: string;
    extracted_concepts?: Array<{
      title: string;
      type: 'theory' | 'practice' | 'axiom' | 'question';
      description: string;
    }>;
  }>;
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
