import { BaseAgent } from './agent';
import { McpServer } from '../mcp/mcpServer';

export class OptimizationAgent extends BaseAgent {
  constructor(mcpServer: McpServer) {
    super('OptimizationAgent', 'Task Optimizer', mcpServer);
  }

  public async execute(input: { rawTasks: string }): Promise<any> {
    this.logAction('Execute', `Starting task optimization for: "${input.rawTasks.substring(0, 50)}..."`);
    
    if (!input.rawTasks || input.rawTasks.trim().length === 0) {
      throw new Error('Task Optimizer: rawTasks input is empty.');
    }

    const result = await this.callTool('optimize_tasks', { tasks: input.rawTasks });
    
    this.logAction('Complete', `Task optimization completed. Found ${result.tasks.length} optimized blocks.`);
    return result;
  }
}
