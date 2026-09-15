import * as vscode from 'vscode';

export async function confirmFileWrite(relativePath: string): Promise<boolean> {
  const setting = vscode.workspace.getConfiguration('chatauto').get<boolean>('confirmFileWrites', true);
  if (!setting) return true;
  const choice = await vscode.window.showWarningMessage(
    `CHATAUTO wants to write ${relativePath}`,
    { modal: true },
    'Allow',
    'Cancel'
  );
  return choice === 'Allow';
}

export async function confirmTerminalCommand(command: string): Promise<boolean> {
  const setting = vscode.workspace.getConfiguration('chatauto').get<boolean>('confirmTerminalCommands', true);
  if (!setting) return true;
  const preview = command.length > 180 ? `${command.slice(0, 180)}…` : command;
  const choice = await vscode.window.showWarningMessage(
    `CHATAUTO wants to run:\n\n${preview}`,
    { modal: true },
    'Run',
    'Cancel'
  );
  return choice === 'Run';
}
