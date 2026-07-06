import { BaseAgent } from './agent';
import { McpServer } from '../mcp/mcpServer';

export class SchedulerAgent extends BaseAgent {
  constructor(mcpServer: McpServer) {
    super('SchedulerAgent', 'Life Calendar Coordinator', mcpServer);
  }

  public async execute(input: { planDays: string; studyBlocks: string }): Promise<any> {
    this.logAction('Execute', `Scheduling calendar over ${input.planDays} days for blocks: [${input.studyBlocks}]`);
    
    if (!input.studyBlocks) {
      throw new Error('Scheduler Agent: studyBlocks input is empty.');
    }

    const result = await this.callTool('schedule_calendar', {
      planDays: input.planDays || '1',
      studyBlocks: input.studyBlocks
    });

    this.logAction('Complete', `Schedules finalized. Populated ${result.totalEvents} calendar blocks.`);
    return result;
  }
}
