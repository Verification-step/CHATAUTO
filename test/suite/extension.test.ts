import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';

describe('CHATAUTO extension', () => {
  it('is installed and exposes its commands', async () => {
    const extension = vscode.extensions.getExtension('verification-step.chatauto');
    assert.ok(extension, 'CHATAUTO extension should be discoverable');
    if (!extension.isActive) await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('chatauto.startServer'));
    assert.ok(commands.includes('chatauto.stopServer'));
    assert.ok(commands.includes('chatauto.status'));
  });

  it('can start and stop its local server', async () => {
    await vscode.workspace.getConfiguration('chatauto').update('port', 4318, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand('chatauto.startServer');

    const response = await fetch('http://127.0.0.1:4318/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} })
    });

    assert.ok(response.status < 500, `MCP endpoint returned ${response.status}`);
    await vscode.commands.executeCommand('chatauto.stopServer');
  });
});
