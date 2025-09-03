export interface ToolResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
  error?: {
    message: string;
    code?: number;
  };
  isError?: boolean;
}

export interface MCPResponse {
  jsonrpc: string;
  id: number | string;
  result?: ToolResult;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}