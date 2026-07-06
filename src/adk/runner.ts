import { McpServer } from '../mcp/mcpServer';
import { OptimizationAgent } from './optimizationAgent';
import { StudyAgent } from './studyAgent';
import { SchedulerAgent } from './schedulerAgent';
import { PlannerAgent } from './plannerAgent';

export class MultiAgentRunner {
  public mcpServer: McpServer;
  public optimizer: OptimizationAgent;
  public studyAgent: StudyAgent;
  public scheduler: SchedulerAgent;
  public planner: PlannerAgent;

  constructor() {
    this.mcpServer = new McpServer();
    this.optimizer = new OptimizationAgent(this.mcpServer);
    this.studyAgent = new StudyAgent(this.mcpServer);
    this.scheduler = new SchedulerAgent(this.mcpServer);
    this.planner = new PlannerAgent(
      this.mcpServer,
      this.optimizer,
      this.studyAgent,
      this.scheduler
    );
  }

  /**
   * Triggers the full system workflow based on user prompt
   */
  public async runSystem(prompt: string) {
    const result = await this.planner.execute(prompt);
    return {
      success: true,
      result,
      agentLogs: this.getAllAgentLogs(),
      mcpLogs: this.mcpServer.logs
    };
  }

  /**
   * Gathers and sorts logs from all agents chronologically
   */
  public getAllAgentLogs() {
    const all = [
      ...this.planner.logs,
      ...this.optimizer.logs,
      ...this.studyAgent.logs,
      ...this.scheduler.logs
    ];
    return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Resets execution logs for a clean demo run
   */
  public clearLogs() {
    this.planner.logs = [];
    this.optimizer.logs = [];
    this.studyAgent.logs = [];
    this.scheduler.logs = [];
    this.mcpServer.logs = [];
  }
}
