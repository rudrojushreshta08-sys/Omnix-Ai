import { BaseAgent } from './agent';
import { McpServer } from '../mcp/mcpServer';
import { OptimizationAgent } from './optimizationAgent';
import { StudyAgent } from './studyAgent';
import { SchedulerAgent } from './schedulerAgent';

export interface PlanDecomposition {
  topic: string;
  days: string;
  rawTasksToOptimize: string;
  cliCommand?: string;
}

export class PlannerAgent extends BaseAgent {
  private optimizer: OptimizationAgent;
  private studyAgent: StudyAgent;
  private scheduler: SchedulerAgent;

  constructor(
    mcpServer: McpServer,
    optimizer: OptimizationAgent,
    studyAgent: StudyAgent,
    scheduler: SchedulerAgent
  ) {
    super('PlannerAgent', 'System Orchestrator & Planner', mcpServer);
    this.optimizer = optimizer;
    this.studyAgent = studyAgent;
    this.scheduler = scheduler;
  }

  /**
   * Simple NLP parser to decompose the user's high-level request
   */
  private decomposeRequest(prompt: string): PlanDecomposition {
    const lower = prompt.toLowerCase();
    
    // Extract Topic
    let topic = 'General Study';
    if (lower.includes('machine learning') || lower.includes('ml')) {
      topic = 'Machine Learning';
    } else if (lower.includes('react') || lower.includes('frontend')) {
      topic = 'React';
    } else {
      // Find what follows "about" or "for"
      const match = prompt.match(/(?:about|for|study)\s+([a-zA-Z0-9\s_-]{3,20})/i);
      if (match && match[1]) {
        topic = match[1].trim();
      }
    }

    // Extract Days
    let days = '3';
    const dayMatch = prompt.match(/(\d+)\s*-?\s*day/i);
    if (dayMatch && dayMatch[1]) {
      days = dayMatch[1];
    }

    // Extract raw tasks based on topic
    let rawTasksToOptimize = `Read introductory article on ${topic}\nReview core syntax and basic architectural pillars\nBuild minor test workspace project\nSolve active recall flashcards\nTake self-assessment review test`;

    // Extract shell/CLI command requests
    let cliCommand: string | undefined;
    if (lower.includes('run') || lower.includes('execute') || lower.includes('check')) {
      if (lower.includes('git status')) {
        cliCommand = 'git status';
      } else if (lower.includes('node version') || lower.includes('node -v')) {
        cliCommand = 'node -v';
      } else if (lower.includes('npm version') || lower.includes('npm -v')) {
        cliCommand = 'npm -v';
      } else if (lower.includes('echo')) {
        const echoMatch = prompt.match(/echo\s+([a-zA-Z0-9\s_.,!?-]+)/i);
        cliCommand = echoMatch ? echoMatch[0] : 'echo Omnix AI is fully secure';
      } else {
        cliCommand = 'git status'; // Default safe command for demo
      }
    }

    return {
      topic,
      days,
      rawTasksToOptimize,
      cliCommand
    };
  }

  public async execute(prompt: string): Promise<any> {
    this.logAction('Plan Decompose', `Analyzing request: "${prompt}"`);
    
    // 1. Decompose the request
    const decomp = this.decomposeRequest(prompt);
    this.logAction('Plan Decompose', `Decomposed request. Topic: "${decomp.topic}", Schedule Days: ${decomp.days}, CLI: "${decomp.cliCommand || 'none'}"`);

    // 2. Call Task Optimization Agent
    const optimizationResult = await this.optimizer.execute({ rawTasks: decomp.rawTasksToOptimize });
    const optimizedTasksList = optimizationResult.tasks;

    // 3. Call Exam/Study Agent
    const studyResult = await this.studyAgent.execute({ topic: decomp.topic });

    // 4. Call Life Scheduler Agent
    // Get comma separated list of tasks to slot
    const studyBlocks = optimizedTasksList.slice(0, 3).map((t: any) => t.title).join(', ');
    const schedulerResult = await this.scheduler.execute({
      planDays: decomp.days,
      studyBlocks
    });

    // 5. Optionally run CLI commands via Sandbox if requested
    let cliResult: any = null;
    if (decomp.cliCommand) {
      this.logAction('CLI Skill Trigger', `Attempting sandboxed execution: "${decomp.cliCommand}"`);
      try {
        cliResult = await this.callTool('execute_safe_command', { command: decomp.cliCommand });
      } catch (err: any) {
        cliResult = {
          command: decomp.cliCommand,
          error: err.message,
          status: 'failed'
        };
      }
    }

    this.logAction('Plan Complete', 'Multi-Agent orchestration successfully finished.');

    return {
      prompt,
      decomposition: decomp,
      optimization: {
        summary: optimizationResult.summary,
        tasks: optimizedTasksList
      },
      study: studyResult,
      scheduler: schedulerResult,
      cliExecution: cliResult
    };
  }
}
