# CHATAUTO

CHATAUTO is a local-first VS Code extension that exposes a controlled MCP server for an AI agent to inspect and modify the currently opened workspace.

## Phase 1

- Local MCP endpoint: `http://127.0.0.1:4317/mcp`
- Read files
- List files
- Search file paths
- Write files with confirmation enabled by default
- Run terminal commands with confirmation enabled by default
- Read VS Code diagnostics
- Workspace information
- Extension Development Host support
- VSIX packaging

The server binds only to loopback in this phase. Remote access and Firebase pairing are intentionally not included yet.

## Development

```bash
npm install
npm run compile
```

Open the project in VS Code and press **F5**. VS Code launches an Extension Development Host, which is the normal environment for testing desktop extensions.

Inside the Extension Development Host:

1. Open a project folder.
2. Open the Command Palette.
3. Run `CHATAUTO: Start MCP Server`.
4. The local MCP endpoint will be shown in a notification.
5. Run `CHATAUTO: Show Status` to verify the server state.
6. Run `CHATAUTO: Stop MCP Server` when finished.

## Tests

```bash
npm test
```

The integration tests launch a separate VS Code instance and verify that the extension activates, contributes its commands, and can start a local HTTP MCP endpoint.

## Package locally

```bash
npx vsce package --no-dependencies
```

This creates a `.vsix` package in the project root. It can be installed locally through VS Code's **Extensions: Install from VSIX...** command or the `code --install-extension` CLI.

## Security boundary

CHATAUTO has the same underlying operating-system permissions available to VS Code extensions. Therefore this first version deliberately keeps the MCP listener on `127.0.0.1` and requires an explicit confirmation for file writes and terminal commands by default.

Remote access, authentication, device pairing, and broader permission controls belong to the next phase.
