import * as http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import * as vscode from 'vscode';
import { WorkspaceService } from '../services/workspace';
import { TerminalService } from '../services/terminal';
import { confirmFileWrite, confirmTerminalCommand } from '../security/permissions';
import { ServerHandle } from './types';

function text(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function createServer(workspace: WorkspaceService, terminal: TerminalService) {
  const server = new McpServer({ name: 'CHATAUTO', version: '0.1.0' });

  server.tool(
    'workspace_info',
    'Return information about the currently opened VS Code workspace.',
    {},
    async () => text(JSON.stringify({ root: workspace.getRoot(), name: vscode.workspace.name ?? null }, null, 2))
  );

  server.tool(
    'read_file',
    'Read a UTF-8 text file inside the opened workspace.',
    { path: z.string().min(1) },
    async ({ path }) => text(await workspace.readFile(path))
  );

  server.tool(
    'list_files',
    'List workspace files recursively, excluding node_modules, .git and build output.',
    { path: z.string().optional() },
    async ({ path }) => text(JSON.stringify(await workspace.listFiles(path ?? '.'), null, 2))
  );

  server.tool(
    'search_files',
    'Find workspace file paths containing a search string.',
    { query: z.string().min(1) },
    async ({ query }) => text(JSON.stringify(await workspace.search(query), null, 2))
  );

  server.tool(
    'write_file',
    'Write UTF-8 text to a file inside the workspace. User confirmation is required by default.',
    { path: z.string().min(1), content: z.string() },
    async ({ path, content }) => {
      if (!(await confirmFileWrite(path))) return text('Operation cancelled by the user.');
      await workspace.writeFile(path, content);
      return text(`Wrote ${path}`);
    }
  );

  server.tool(
    'run_terminal',
    'Run a terminal command in the workspace. User confirmation is required by default.',
    { command: z.string().min(1), timeoutMs: z.number().int().min(1000).max(300000).optional() },
    async ({ command, timeoutMs }) => {
      if (!(await confirmTerminalCommand(command))) return text('Operation cancelled by the user.');
      try {
        const result = await terminal.run(command, workspace.getRoot(), timeoutMs ?? 120000);
        return text(JSON.stringify(result, null, 2));
      } catch (error) {
        const e = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number };
        return text(JSON.stringify({ stdout: e.stdout ?? '', stderr: e.stderr ?? e.message, exitCode: typeof e.code === 'number' ? e.code : 1 }, null, 2));
      }
    }
  );

  server.tool(
    'diagnostics',
    'Return current VS Code diagnostics for the workspace or a specific file.',
    { path: z.string().optional() },
    async ({ path }) => {
      const target = path ? vscode.Uri.file(workspace.resolve(path)) : undefined;
      const items = vscode.languages.getDiagnostics(target).flatMap(([uri, diagnostics]) =>
        diagnostics.map((d) => ({
          file: vscode.workspace.asRelativePath(uri),
          severity: vscode.DiagnosticSeverity[d.severity],
          message: d.message,
          line: d.range.start.line + 1,
          column: d.range.start.character + 1
        }))
      );
      return text(JSON.stringify(items, null, 2));
    }
  );

  return server;
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  return JSON.parse(raw);
}

export async function startMcpServer(workspace: WorkspaceService, terminal: TerminalService, port: number): Promise<ServerHandle> {
  const server = createServer(workspace, terminal);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    if (req.url !== '/mcp') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.end('Method not allowed');
      return;
    }
    try {
      const body = await readBody(req);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      console.error('[CHATAUTO] MCP request failed', error);
      if (!res.headersSent) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid MCP request' }));
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    httpServer.once('error', onError);
    httpServer.listen(port, '127.0.0.1', () => {
      httpServer.off('error', onError);
      resolve();
    });
  });

  return {
    port,
    close: async () => {
      await server.close();
      await new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
    }
  };
}
