export class JarvisError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'JarvisError';
  }
}

export class ToolExecutionError extends JarvisError {
  constructor(toolName: string, originalError: Error) {
    super(
      `Tool '${toolName}' execution failed: ${originalError.message}`,
      'TOOL_EXECUTION_ERROR',
      500,
      { toolName, originalError: originalError.message }
    );
  }
}

export class MCPConnectionError extends JarvisError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_CONNECTION_ERROR', 503, details);
  }
}

export class ValidationError extends JarvisError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR', 400, { field });
  }
}

export class ConfigurationError extends JarvisError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
  }
}