import { GoogleGenAI } from '@google/genai';
import { ProjectStore, ProjectData } from './projectStore.js';
import { DiffSuggestion } from './types.js';

export class GeminiService {
  private static getClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Gemini API key is required. Please set GEMINI_API_KEY in backend .env or enter it in the app settings.");
    }
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Socratic Sounding Board Dialogue:
   * Acts as an intellectually rigorous non-fiction editor and thinking partner.
   */
  static async chatSoundingBoard(
    userMessage: string,
    apiKey?: string
  ): Promise<{
    reply: string;
    extracted_concepts: Array<{ title: string; type: 'theory' | 'practice' | 'axiom' | 'question'; description: string }>;
    proposed_structure_updates?: Array<{ action: 'add' | 'modify' | 'reorder'; node: any }>;
  }> {
    const ai = this.getClient(apiKey);
    const project = ProjectStore.get();

    const systemPrompt = `You are an elite, intellectually rigorous non-fiction developmental editor and thinking partner.
The user is authoring an original self-development / non-fiction book grounded in pure theory and practice.
There is NO predefined or rigid cookie-cutter structure. You and the author are co-developing the book's architecture collaboratively.

Project Context:
- Current Book Title: "${project.book_title}"
- Core Author Thesis: "${project.author_thesis || 'Under development'}"
- Current Structure Tree:
${JSON.stringify(project.structure_tree, null, 2)}
- Concept Vault:
${JSON.stringify(project.concept_vault, null, 2)}
- Author Style DNA:
${project.style_guidelines.join('\n')}

Your Role:
1. Actively listen to the author's thoughts, observations, and raw voice dictation.
2. Probe for intellectual depth: ask about the underlying theoretical mechanisms, psychological/biological principles, or edge cases.
3. Help translate high-level theory into rigorous, concrete practice (protocols, diagnostic drills, implementation habits).
4. Actively suggest emergent organizational models that fit their specific ideas.
5. In your response, provide your conversational thinking dialogue, AND extract any new concepts or structural improvements in structured format.

Always respond in valid JSON with this schema:
{
  "reply": "Your conversational response as an insightful thinking partner...",
  "extracted_concepts": [
    {
      "title": "Name of concept",
      "type": "theory" | "practice" | "axiom" | "question",
      "description": "Crisp summary of the theory or protocol"
    }
  ],
  "proposed_structure_updates": [
    {
      "action": "add" | "modify" | "reorder",
      "node": {
        "id": "unique_id",
        "title": "Title",
        "type": "part" | "section" | "concept" | "practice",
        "summary": "Brief summary",
        "order": 1
      }
    }
  ]
}`;

    const model = 'gemini-2.0-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '{}';
    try {
      const parsed = JSON.parse(responseText);
      // Auto-update concept vault if new concepts extracted
      if (parsed.extracted_concepts && Array.isArray(parsed.extracted_concepts)) {
        ProjectStore.update(data => {
          for (const item of parsed.extracted_concepts) {
            if (item.type === 'theory') {
              data.concept_vault.theories.push({ id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, name: item.title, description: item.description });
            } else if (item.type === 'practice') {
              data.concept_vault.practices.push({ id: `pr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, name: item.title, protocol: item.description });
            } else if (item.type === 'axiom') {
              data.concept_vault.axioms.push({ id: `ax_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, statement: item.description, context: item.title });
            }
          }
        });
      }
      return parsed;
    } catch (e) {
      return {
        reply: responseText,
        extracted_concepts: []
      };
    }
  }

  /**
   * Transcribe Voice Audio using Gemini 2.0 Flash Multimodal Audio:
   */
  static async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    apiKey?: string
  ): Promise<string> {
    const ai = this.getClient(apiKey);
    const base64Audio = audioBuffer.toString('base64');

    const prompt = `Transcribe this spoken dictation verbatim.
Clean up obvious stuttering, repeated words, and verbal fillers (such as "um", "uh", "like") while strictly preserving the author's original words, cadence, phrasing, and technical terminology. Do not summarize or editorialize.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: base64Audio
              }
            },
            { text: prompt }
          ]
        }
      ]
    });

    return response.text || '';
  }

  /**
   * Diff Suggestion Engine:
   * Polishes selected text or integrates voice commands while returning structured diff tokens.
   */
  static async generateDiff(
    originalText: string,
    voiceInstruction: string,
    fullSectionContext?: string,
    apiKey?: string
  ): Promise<DiffSuggestion> {
    const ai = this.getClient(apiKey);
    const project = ProjectStore.get();

    const systemPrompt = `You are an expert non-fiction prose editor.
You are assisting an author with their manuscript.
The author has selected a passage of text and given a verbal revision instruction.

Author Style Guidelines:
${project.style_guidelines.join('\n')}

Recent Rejected Suggestions & Reasons:
${project.rejected_edits.slice(-5).map(r => `- Rejected: "${r.proposed_text}" | Reason: "${r.reason}"`).join('\n')}

Instructions:
1. Revise the passage strictly following the author's instruction and authentic style.
2. Preserve the author's unique voice and precision. Do not dumb down theory or add generic filler.
3. Compute the exact word/phrase level diff between the original text and your revision.
4. Return valid JSON only with:
{
  "original_text": "...",
  "revised_text": "...",
  "explanation": "Brief 1-sentence rationale for the revision",
  "diff_tokens": [
    { "type": "equal", "value": "text that remained identical " },
    { "type": "delete", "value": "text that was removed " },
    { "type": "insert", "value": "text that was inserted " }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Full Section Context:
"""${fullSectionContext || originalText}"""

Selected Passage to Edit:
"""${originalText}"""

Author's Voice Instruction:
"${voiceInstruction}"`
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      id: `diff_${Date.now()}`,
      original_text: originalText,
      revised_text: parsed.revised_text || originalText,
      explanation: parsed.explanation || '',
      diff_tokens: parsed.diff_tokens || [{ type: 'equal', value: originalText }]
    };
  }
}
