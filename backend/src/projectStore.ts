import fs from 'fs';
import path from 'path';
import { StructureNode, RejectedEditFeedback, SocraticMessage } from './types.js';

const DATA_FILE = path.resolve(process.cwd(), 'author_studio_data.json');

export interface ProjectData {
  book_title: string;
  author_thesis: string;
  style_guidelines: string[];
  rejected_edits: RejectedEditFeedback[];
  structure_tree: StructureNode[];
  concept_vault: {
    theories: Array<{ id: string; name: string; description: string; source_note?: string }>;
    practices: Array<{ id: string; name: string; protocol: string; target_outcome?: string }>;
    axioms: Array<{ id: string; statement: string; context?: string }>;
    open_questions: Array<{ id: string; question: string; status: 'open' | 'resolved' }>;
  };
  sounding_board_history: SocraticMessage[];
}

const DEFAULT_DATA: ProjectData = {
  book_title: "Untitled Non-Fiction Work",
  author_thesis: "",
  style_guidelines: [
    "Retain the author's authentic cadence and logical progression.",
    "Prioritize clarity, directness, and intellectual rigor.",
    "Never replace nuanced conceptual arguments with generic self-help clichés."
  ],
  rejected_edits: [],
  structure_tree: [
    {
      id: "node_foundation",
      title: "Core Foundation & First Principles",
      type: "part",
      order: 1,
      content: "",
      summary: "Underlying theoretical principles and cognitive models.",
      children: []
    },
    {
      id: "node_practice",
      title: "Applied Protocols & Drills",
      type: "part",
      order: 2,
      content: "",
      summary: "Actionable execution, behavioral exercises, and diagnostic loops.",
      children: []
    }
  ],
  concept_vault: {
    theories: [],
    practices: [],
    axioms: [],
    open_questions: []
  },
  sounding_board_history: []
};

export class ProjectStore {
  private static data: ProjectData | null = null;

  static load(): ProjectData {
    if (this.data) return this.data;

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        return this.data!;
      } catch (err) {
        console.error('[ProjectStore] Failed to load data file, using defaults:', err);
      }
    }

    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
    return this.data!;
  }

  static save(): void {
    if (!this.data) return;
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ProjectStore] Failed to save data file:', err);
    }
  }

  static get(): ProjectData {
    return this.load();
  }

  static update(updater: (data: ProjectData) => void): ProjectData {
    const current = this.load();
    updater(current);
    this.save();
    return current;
  }

  static addRejectedEdit(feedback: Omit<RejectedEditFeedback, 'id' | 'timestamp'>): RejectedEditFeedback {
    const newFeedback: RejectedEditFeedback = {
      id: `rej_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...feedback
    };
    this.update(data => {
      data.rejected_edits.push(newFeedback);
      if (feedback.reason && feedback.reason.trim().length > 0) {
        data.style_guidelines.push(`Avoid: ${feedback.reason.trim()}`);
      }
    });
    return newFeedback;
  }
}
