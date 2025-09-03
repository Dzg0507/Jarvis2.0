import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { getDynamicJarvisContext, callTool } from '../chat/mcp-client.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { sanitizeInput } from '../middleware/validation.js';

export interface ChatRequest {
  prompt: string;
  persona?: string;
}

export interface ChatResponse {
  response: string;
  toolUsed?: string;
}

export class ChatService {
  private chat: ChatSession | null = null;
  private dynamicToolsContext: string | null = null;
  private currentPersonaPrompt: string | null = null;
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.ai.apiKey) {
      throw new Error("API_KEY environment variable not set");
    }
    this.genAI = new GoogleGenerativeAI(config.ai.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.ai.modelName as string });
    this.initializeToolContext();
  }

  private async initializeToolContext() {
    try {
      this.dynamicToolsContext = await getDynamicJarvisContext();
      logger.info('Chat service tool context loaded');
    } catch (error) {
      logger.error('Failed to load tool context', error as Error);
    }
  }

  private getSystemPrompt(persona?: string): string {
    // Persona is now the PRIMARY system instruction
    if (!persona) {
      persona = "You are a helpful AI assistant.";
    }

    // Build persona-first system prompt
    const personaSystemPrompt = `${persona}

CRITICAL BEHAVIORAL INSTRUCTIONS:
- Maintain your persona's personality, tone, and communication style consistently
- Never break character or revert to generic assistant responses
- Use your persona's specific vocabulary, expressions, and response patterns
- If you don't know something, respond in character with your persona's typical reaction

AVAILABLE TOOLS:
${this.dynamicToolsContext || ''}

When using tools, maintain your persona while providing the JSON format:
{
  "tool": "tool_name",
  "parameters": { "param1": "value1" }
}

Remember: Your persona defines WHO you are, not just HOW you help.`;

    return personaSystemPrompt;
  }

  async processChat(request: ChatRequest): Promise<ChatResponse> {
    const sanitizedPrompt = sanitizeInput(request.prompt);
    
    return withRetry(async () => {
      try {
        // Always reinitialize if persona changed - personas are fundamental
        if (!this.chat || (request.persona && request.persona !== this.currentPersonaPrompt)) {
          const systemPrompt = this.getSystemPrompt(request.persona);
          
          this.chat = this.model.startChat({
            history: [
              { role: "user", parts: [{ text: "Initialize with your persona." }] },
              { role: "model", parts: [{ text: this.getPersonaInitResponse(request.persona) }] }
            ],
            generationConfig: {
              maxOutputTokens: 8192,
              temperature: 0.7, // Higher temperature for more personality
              topP: 0.9,
              topK: 40
            }
          });
          
          this.currentPersonaPrompt = request.persona || null;
          logger.info('Persona-driven chat session initialized', { 
            hasPersona: !!request.persona,
            personaLength: request.persona?.length 
          });
        }

        // Send message to chat
        if (!this.chat) {
          throw new Error('Chat session not initialized');
        }
        const result = await this.chat!.sendMessage(sanitizedPrompt);
        let response = result.response.text();

        // Handle tool calls while maintaining persona
        let toolUsed: string | undefined;
        try {
          const toolCall = JSON.parse(response);
          if (toolCall.tool && toolCall.parameters) {
            logger.info('Tool call detected', { tool: toolCall.tool });
            const toolResult = await callTool(toolCall.tool, toolCall.parameters);
            
            const followUpResult = await this.chat.sendMessage(
              `Tool result: ${JSON.stringify(toolResult)}. Please respond in character with your persona.`
            );
            response = followUpResult.response.text();
            toolUsed = toolCall.tool;
          }
        } catch (e) {
          // Not a tool call, continue with regular response
        }

        return { response, toolUsed };
      } catch (error) {
        logger.error('Chat processing failed', error as Error);
        throw error;
      }
    }, { maxRetries: config.ai.maxRetries });
  }

  updatePersona(newPersona: string): void {
    this.currentPersonaPrompt = newPersona;
    this.chat = null; // Force recreation on next message
    logger.info('Persona updated');
  }

  clearSession(): void {
    this.chat = null;
    this.currentPersonaPrompt = null;
    logger.info('Chat session cleared');
  }

  private getPersonaInitResponse(persona?: string): string {
    if (!persona || persona.includes("helpful AI assistant")) {
      return "Hello! I'm ready to assist you.";
    }
    
    // Generate a persona-appropriate initialization response
    if (persona.toLowerCase().includes("pirate")) {
      return "Ahoy there, matey! Captain's ready for adventure!";
    } else if (persona.toLowerCase().includes("scientist")) {
      return "Fascinating! My neural networks are fully operational and ready for scientific inquiry.";
    } else if (persona.toLowerCase().includes("detective")) {
      return "The case is afoot. What mystery shall we solve today?";
    }
    
    return "I'm fully initialized and ready to engage in character.";
  }
}
