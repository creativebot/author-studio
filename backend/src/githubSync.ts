import { ProjectData } from './projectStore.js';

const GITHUB_REPO = process.env.GITHUB_REPO || 'creativebot/author-studio';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

export class GitHubSyncService {
  private static getToken(): string {
    return process.env.GITHUB_TOKEN || '';
  }

  /**
   * Fetch file from GitHub repository
   */
  static async getFile(filePath: string): Promise<{ content: string; sha: string } | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Author-Studio-Sync'
        }
      });

      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub get file failed: ${res.statusText}`);

      const data: any = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { content, sha: data.sha };
    } catch (err: any) {
      console.warn(`[GitHubSync] Could not read ${filePath}:`, err.message);
      return null;
    }
  }

  /**
   * Commit / Update file in GitHub repository
   */
  static async saveFile(filePath: string, content: string, commitMessage: string): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      // Check if file already exists to get its SHA
      const existing = await this.getFile(filePath);
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

      const payload: any = {
        message: commitMessage,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch: GITHUB_BRANCH
      };

      if (existing) {
        payload.sha = existing.sha;
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Author-Studio-Sync'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error(`[GitHubSync] Failed to commit ${filePath}:`, errorBody);
        return false;
      }

      console.log(`[GitHubSync] Successfully committed ${filePath} to GitHub (${GITHUB_BRANCH})`);
      return true;
    } catch (err: any) {
      console.error(`[GitHubSync] Commit error for ${filePath}:`, err.message);
      return false;
    }
  }

  /**
   * Sync complete project state to GitHub:
   * 1. manuscript/project_data.json
   * 2. manuscript/outline.md (human readable)
   * 3. manuscript/concept_vault.md (human readable)
   */
  static async syncProjectToGitHub(project: ProjectData): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    try {
      // 1. JSON state
      await this.saveFile(
        'manuscript/project_data.json',
        JSON.stringify(project, null, 2),
        `Auto-sync: update manuscript state [${new Date().toISOString()}]`
      );

      // 2. Human-readable Markdown Outline & Drafts
      let outlineMd = `# ${project.book_title}\n\n`;
      outlineMd += `> **Core Thesis:** ${project.author_thesis || 'Under development'}\n\n`;
      outlineMd += `## Structure & Sections\n\n`;

      for (const node of project.structure_tree) {
        outlineMd += `### ${node.title} (${node.type.toUpperCase()})\n`;
        if (node.summary) outlineMd += `*${node.summary}*\n\n`;
        if (node.content) outlineMd += `${node.content}\n\n`;
        outlineMd += `---\n\n`;
      }

      await this.saveFile(
        'manuscript/outline.md',
        outlineMd,
        `Auto-sync: update human-readable outline [${new Date().toISOString()}]`
      );

      // 3. Concept Vault Markdown
      let vaultMd = `# Concept Vault: Theories, Protocols & Axioms\n\n`;

      vaultMd += `## Theories & Models\n`;
      for (const th of project.concept_vault.theories) {
        vaultMd += `### ${th.name}\n${th.description}\n\n`;
      }

      vaultMd += `## Applied Protocols & Drills\n`;
      for (const pr of project.concept_vault.practices) {
        vaultMd += `### ${pr.name}\n${pr.protocol}\n\n`;
      }

      vaultMd += `## Core Axioms\n`;
      for (const ax of project.concept_vault.axioms) {
        vaultMd += `* **${ax.context || 'Axiom'}:** ${ax.statement}\n`;
      }

      await this.saveFile(
        'manuscript/concept_vault.md',
        vaultMd,
        `Auto-sync: update concept vault [${new Date().toISOString()}]`
      );
    } catch (err: any) {
      console.error('[GitHubSync] Project sync error:', err.message);
    }
  }

  /**
   * Pull latest project data from GitHub on server startup
   */
  static async loadProjectFromGitHub(): Promise<ProjectData | null> {
    const file = await this.getFile('manuscript/project_data.json');
    if (!file) return null;
    try {
      return JSON.parse(file.content) as ProjectData;
    } catch (err: any) {
      console.error('[GitHubSync] Failed to parse project_data.json from GitHub:', err);
      return null;
    }
  }
}
