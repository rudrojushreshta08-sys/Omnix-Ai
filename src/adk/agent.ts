import { McpServer } from '../mcp/mcpServer';

export interface AgentLog {
  timestamp: string;
  agentName: string;
  action: string;
  details: string;
}

export abstract class BaseAgent {
  public name: string;
  public role: string;
  protected mcpServer: McpServer;
  public logs: AgentLog[] = [];

  constructor(name: string, role: string, mcpServer: McpServer) {
    this.name = name;
    this.role = role;
    this.mcpServer = mcpServer;
  }

  /**
   * Appends an agent-specific execution log
   */
  protected logAction(action: string, details: string) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      agentName: this.name,
      action,
      details
    });
  }

  /**
   * Helper to execute a tool via the MCP server
   */
  protected async callTool(toolName: string, args: any): Promise<any> {
    this.logAction('MCP Call', `Invoking tool '${toolName}' with arguments: ${JSON.stringify(args)}`);
    try {
      const result = await this.mcpServer.callTool(toolName, args);
      this.logAction('MCP Success', `Tool '${toolName}' successfully responded.`);
      return result;
    } catch (err: any) {
      this.logAction('MCP Error', `Tool '${toolName}' failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Core run function that each agent implements
   */
  public abstract execute(input: any): Promise<any>;
}
