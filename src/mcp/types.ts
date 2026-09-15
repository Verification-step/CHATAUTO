export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

export interface ServerHandle {
  port: number;
  close: () => Promise<void>;
}
