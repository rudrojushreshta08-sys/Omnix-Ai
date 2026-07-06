import { exec } from 'child_process';
import { promisify } from 'util';
import { SecurityEngine, CommandAudit } from './security';

const execAsync = promisify(exec);

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, string>;
  handler: (args: any) => Promise<any>;
}

export interface ToolLog {
  timestamp: string;
  toolName: string;
  args: any;
  status: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  result?: any;
  error?: string;
  securityAudit?: CommandAudit;
}

export class McpServer {
  private tools: Map<string, McpTool> = new Map();
  public logs: ToolLog[] = [];

  constructor() {
    this.registerTools();
  }

  /**
   * Registers all MCP tools
   */
  private registerTools() {
    // 1. Task Optimization Tool
    this.register({
      name: 'optimize_tasks',
      description: 'Refines and structures a list of tasks. Estimates durations and priorities.',
      inputSchema: { tasks: 'string' },
      handler: async (args: { tasks: string }) => {
        const rawTasks = args.tasks.split('\n').filter(t => t.trim().length > 0);
        const optimized = rawTasks.map((task, index) => {
          const cleanTask = SecurityEngine.sanitizeInput(task);
          // Simple rule-based optimizer
          let duration = '45 mins';
          let priority = 'Medium';
          const lower = cleanTask.toLowerCase();

          if (lower.includes('exam') || lower.includes('quiz') || lower.includes('test') || lower.includes('build')) {
            priority = 'High';
            duration = '90 mins';
          } else if (lower.includes('review') || lower.includes('read') || lower.includes('summary')) {
            duration = '30 mins';
          } else if (lower.includes('break') || lower.includes('rest') || lower.includes('coffee')) {
            priority = 'Low';
            duration = '15 mins';
          }

          return {
            id: `task-${index + 1}`,
            original: task,
            title: cleanTask,
            priority,
            duration,
            status: 'Pending',
            recommendation: `Optimized study slot allocated. Keep focus timer on.`
          };
        });

        return {
          summary: `Successfully optimized ${optimized.length} tasks and estimated study block requirements.`,
          tasks: optimized
        };
      }
    });

    // 2. Exam/Study Deck Tool
    this.register({
      name: 'generate_study_deck',
      description: 'Generates Summaries and Active Recall Flashcards for learning concepts.',
      inputSchema: { topic: 'string' },
      handler: async (args: { topic: string }) => {
        const topic = SecurityEngine.sanitizeInput(args.topic);
        
        // Let's generate a smart response depending on the topic
        const mockStudyDecks: Record<string, { summary: string; cards: Array<{ q: string; a: string }> }> = {
          'machine learning': {
            summary: 'Machine Learning (ML) focuses on algorithms that allow computers to learn from data. Key components include supervised learning (labelled data), unsupervised learning (unlabelled patterns), and reinforcement learning (reward-based).',
            cards: [
              { q: 'What is the main difference between Supervised and Unsupervised learning?', a: 'Supervised learning uses labelled input-output pairs for training, while Unsupervised learning finds hidden patterns in unlabelled data.' },
              { q: 'What is Overfitting in Machine Learning?', a: 'Overfitting occurs when a model learns noise in the training data too well, resulting in poor generalization on unseen test data.' },
              { q: 'What is the role of the Activation Function in Neural Networks?', a: 'It introduces non-linearity, allowing the network to learn complex patterns and decision boundaries.' }
            ]
          },
          'react': {
            summary: 'React is a popular component-based JavaScript library for building user interfaces. It uses a virtual DOM to optimize rendering and implements unidirectional data flow (props down, events up). State and Hooks manage component lifecycles.',
            cards: [
              { q: 'What is the Virtual DOM in React?', a: 'A lightweight in-memory representation of the real DOM. React updates the virtual DOM first, diffs it, and updates only the changed parts of the real DOM.' },
              { q: 'What is the purpose of useEffect Hook?', a: 'It allows performing side effects in functional components, such as data fetching, subscriptions, and manually changing the DOM.' },
              { q: 'Explain the difference between Props and State.', a: 'Props are configuration values passed into a component from its parent (immutable), whereas State is data managed internally within the component (mutable).' }
            ]
          }
        };

        const cleanedTopic = topic.toLowerCase().trim();
        const foundDeck = Object.keys(mockStudyDecks).find(key => cleanedTopic.includes(key));
        const deck = foundDeck ? mockStudyDecks[foundDeck] : {
          summary: `Study guide for ${topic}: Covers fundamental concepts, architecture, syntax, and application best practices. Detailed analysis of standard methodologies.`,
          cards: [
            { q: `What is the core definition of ${topic}?`, a: `It refers to the systematic study and application of principles underlying ${topic} to solve practical problems.` },
            { q: `What are two main challenges when implementing ${topic}?`, a: `1. Initial complexity and learning curve. 2. Scaling issues and edge-case handling under production loads.` },
            { q: `Name one key best practice associated with ${topic}.`, a: `Consistent modular design and continuous iteration based on validation testing.` }
          ]
        };

        return {
          topic,
          summary: deck.summary,
          flashcards: deck.cards
        };
      }
    });

    // 3. Life Scheduler Tool
    this.register({
      name: 'schedule_calendar',
      description: 'Creates a daily timeline block of study and work schedules.',
      inputSchema: { planDays: 'string', studyBlocks: 'string' },
      handler: async (args: { planDays: string; studyBlocks: string }) => {
        const days = parseInt(args.planDays) || 1;
        const blocksRaw = SecurityEngine.sanitizeInput(args.studyBlocks);
        const blocks = blocksRaw.split(',').map(b => b.trim()).filter(b => b.length > 0);

        const events: any[] = [];
        const baseDate = new Date();
        
        for (let day = 0; day < days; day++) {
          const dateStr = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          let currentHour = 9; // Start at 9:00 AM
          
          blocks.forEach((block, idx) => {
            // Study slot
            events.push({
              id: `evt-${day}-${idx}-study`,
              title: `Study Session: ${block}`,
              start: `${dateStr}T${currentHour.toString().padStart(2, '0')}:00:00`,
              end: `${dateStr}T${(currentHour + 2).toString().padStart(2, '0')}:00:00`,
              type: 'Study',
              color: '#3b82f6' // Blue
            });
            currentHour += 2;

            // Rest slot
            events.push({
              id: `evt-${day}-${idx}-break`,
              title: `Rest & Refresh Break`,
              start: `${dateStr}T${currentHour.toString().padStart(2, '0')}:00:00`,
              end: `${dateStr}T${currentHour.toString().padStart(2, '0')}:30:00`,
              type: 'Break',
              color: '#10b981' // Green
            });
            currentHour += 0.5;
          });

          // Add final review slot
          events.push({
            id: `evt-${day}-review`,
            title: `Planner Review & Wrap-up`,
            start: `${dateStr}T${currentHour.toString().padStart(2, '0')}:00:00`,
            end: `${dateStr}T${(currentHour + 1).toString().padStart(2, '0')}:00:00`,
            type: 'Review',
            color: '#8b5cf6' // Purple
          });
        }

        return {
          totalEvents: events.length,
          events
        };
      }
    });

    // 4. Safe Shell Command Execution Tool
    this.register({
      name: 'execute_safe_command',
      description: 'Executes approved local CLI instructions (git, npm run build, node -v, echo) within sandbox boundaries.',
      inputSchema: { command: 'string' },
      handler: async (args: { command: string }) => {
        const rawCmd = args.command;
        
        // Perform security check
        const audit = SecurityEngine.validateCommand(rawCmd);
        
        if (!audit.allowed) {
          throw new Error(`Security Violation: ${audit.reason}`);
        }

        // Run the command using Node child_process
        try {
          // Specify CWD to user workspace desktop directory
          const cwdPath = 'C:\\Users\\rudro\\OneDrive\\Desktop\\capstone omnix';
          const { stdout, stderr } = await execAsync(audit.sanitizedCommand!, { cwd: cwdPath, timeout: 5000 });
          return {
            command: audit.sanitizedCommand,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            status: 'success'
          };
        } catch (error: any) {
          return {
            command: audit.sanitizedCommand,
            error: error.message || 'Execution error occurred',
            stdout: error.stdout?.trim() || '',
            stderr: error.stderr?.trim() || '',
            status: 'failed'
          };
        }
      }
    });
  }

  /**
   * Helper to register tools
   */
  private register(tool: McpTool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Public list of tools
   */
  public listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
  }

  /**
   * Triggers a tool call by checking schemas and executing the handler
   */
  public async callTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    const timestamp = new Date().toISOString();

    if (!tool) {
      const errorMsg = `Tool '${name}' not found.`;
      this.logs.push({ timestamp, toolName: name, args, status: 'FAILED', error: errorMsg });
      throw new Error(errorMsg);
    }

    // Security Check 1: Schema Types Check
    for (const [key, type] of Object.entries(tool.inputSchema)) {
      if (!(key in args)) {
        const errorMsg = `Missing argument '${key}' for tool '${name}'`;
        this.logs.push({ timestamp, toolName: name, args, status: 'FAILED', error: errorMsg });
        throw new Error(errorMsg);
      }
      if (typeof args[key] !== type) {
        const errorMsg = `Argument '${key}' should be of type '${type}', got '${typeof args[key]}'`;
        this.logs.push({ timestamp, toolName: name, args, status: 'FAILED', error: errorMsg });
        throw new Error(errorMsg);
      }
    }

    // Security Check 2: Special command check for execute_safe_command
    let commandAudit: CommandAudit | undefined;
    if (name === 'execute_safe_command') {
      commandAudit = SecurityEngine.validateCommand(args.command);
      if (!commandAudit.allowed) {
        this.logs.push({
          timestamp,
          toolName: name,
          args,
          status: 'BLOCKED',
          error: commandAudit.reason,
          securityAudit: commandAudit
        });
        throw new Error(`Security Exception: ${commandAudit.reason}`);
      }
    }

    try {
      const result = await tool.handler(args);
      this.logs.push({
        timestamp,
        toolName: name,
        args,
        status: 'SUCCESS',
        result,
        securityAudit: commandAudit
      });
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Execution error';
      this.logs.push({
        timestamp,
        toolName: name,
        args,
        status: 'FAILED',
        error: errorMsg,
        securityAudit: commandAudit
      });
      throw err;
    }
  }
}
