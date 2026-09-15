import * as vscode from 'vscode';
import { startMcpServer } from './mcp/server';
import { ServerHandle } from './mcp/types';
import { WorkspaceService } from './services/workspace';
import { TerminalService } from './services/terminal';

let serverHandle: ServerHandle | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const workspace = new WorkspaceService();
  const terminal = new TerminalService();

  const start = vscode.commands.registerCommand('chatauto.startServer', async () => {
    if (serverHandle) {
      vscode.window.showInformationMessage(`CHATAUTO is already running on http://127.0.0.1:${serverHandle.port}/mcp`);
      return;
    }

    try {
      const port = vscode.workspace.getConfiguration('chatauto').get<number>('port', 4317);
      serverHandle = await startMcpServer(workspace, terminal, port);
      vscode.window.showInformationMessage(`CHATAUTO MCP server running on http://127.0.0.1:${port}/mcp`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`CHATAUTO failed to start: ${message}`);
    }
  });

  const stop = vscode.commands.registerCommand('chatauto.stopServer', async () => {
    if (!serverHandle) {
      vscode.window.showInformationMessage('CHATAUTO is not running.');
      return;
    }
    await serverHandle.close();
    serverHandle = undefined;
    vscode.window.showInformationMessage('CHATAUTO MCP server stopped.');
  });

  const status = vscode.commands.registerCommand('chatauto.status', () => {
    if (serverHandle) {
      vscode.window.showInformationMessage(`CHATAUTO is running at http://127.0.0.1:${serverHandle.port}/mcp`);
    } else {
      vscode.window.showInformationMessage('CHATAUTO is stopped.');
    }
  });

  context.subscriptions.push(start, stop, status);
}

export async function deactivate(): Promise<void> {
  if (serverHandle) {
    await serverHandle.close();
    serverHandle = undefined;
  }
}
