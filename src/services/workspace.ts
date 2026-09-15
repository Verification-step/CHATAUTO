import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

export class WorkspaceService {
  getRoot(): string {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) throw new Error('No VS Code workspace folder is open.');
    return path.resolve(root);
  }

  resolve(relativePath: string): string {
    const root = this.getRoot();
    const target = path.resolve(root, relativePath);
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Path is outside the opened workspace.');
    }
    return target;
  }

  async readFile(relativePath: string): Promise<string> {
    return fs.readFile(this.resolve(relativePath), 'utf8');
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    const target = this.resolve(relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
  }

  async listFiles(relativeDir = '.'): Promise<string[]> {
    const dir = this.resolve(relativeDir);
    const results: string[] = [];
    const walk = async (current: string) => {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out') continue;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) await walk(full);
        else results.push(path.relative(this.getRoot(), full));
      }
    };
    await walk(dir);
    return results.sort();
  }

  async search(pattern: string): Promise<string[]> {
    const files = await this.listFiles();
    const query = pattern.toLowerCase();
    return files.filter((file) => file.toLowerCase().includes(query)).slice(0, 200);
  }
}
