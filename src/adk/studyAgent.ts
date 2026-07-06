import { BaseAgent } from './agent';
import { McpServer } from '../mcp/mcpServer';

export class StudyAgent extends BaseAgent {
  constructor(mcpServer: McpServer) {
    super('StudyAgent', 'Exam/Study Material Creator', mcpServer);
  }

  public async execute(input: { topic: string }): Promise<any> {
    this.logAction('Execute', `Generating study materials for topic: "${input.topic}"`);
    
    if (!input.topic || input.topic.trim().length === 0) {
      throw new Error('Study Agent: topic input is empty.');
    }

    const result = await this.callTool('generate_study_deck', { topic: input.topic });
    
    this.logAction('Complete', `Generated study decks for ${input.topic} containing ${result.flashcards.length} cards.`);
    return result;
  }
}
