/**
 * src/backend/llm/OpenAIAdapter.ts
 *
 * OpenAI implementation of the LLMAdapter interface.
 * Uses the chat completions API with JSON mode enabled so the model is
 * constrained to return a valid JSON object on every call.
 *
 * Requirements: 3.1, 3.4
 */

import OpenAI from 'openai';
import type { LLMAdapter } from './LLMAdapter.js';

export interface OpenAIAdapterConfig {
  /**
   * OpenAI API key. Falls back to the OPENAI_API_KEY environment variable
   * when not provided.
   */
  apiKey?: string;
  /**
   * Chat model to use. Defaults to 'gpt-4o-mini'.
   */
  model?: string;
}

/**
 * LLMAdapter implementation backed by the OpenAI chat completions API.
 *
 * JSON mode is always enabled (`response_format: { type: 'json_object' }`),
 * which guarantees the model returns a parseable JSON string.
 *
 * @example
 * ```typescript
 * const adapter = new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY });
 * const result = await adapter.complete('Analyze this event...');
 * ```
 */
export class OpenAIAdapter implements LLMAdapter {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAIAdapterConfig = {}) {
    const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;

    this.client = new OpenAI({ apiKey });
    this.model = config.model ?? 'gpt-4o-mini';
  }

  /**
   * Send `prompt` to the OpenAI chat completions endpoint and return the
   * model's response content.
   *
   * The system message instructs the model to return valid JSON only.
   * JSON mode (`response_format: { type: 'json_object' }`) is enabled to
   * enforce this at the API level.
   *
   * @param prompt - The user-facing prompt to send to the model.
   * @returns The raw JSON string returned by the model.
   * @throws An error with a descriptive message if the API call fails or the
   *         response contains no content.
   */
  async complete(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an economic analyst. Return ONLY a valid JSON object — no markdown, no prose, no code fences. Your entire response must be parseable by JSON.parse().',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;

      if (content == null) {
        throw new Error(
          'OpenAI API returned an empty response: no content in the first choice message.',
        );
      }

      return content;
    } catch (error) {
      // Re-throw errors that we already constructed above.
      if (error instanceof Error && error.message.startsWith('OpenAI API')) {
        throw error;
      }

      // Wrap unexpected errors (network failures, rate limits, etc.) with a
      // descriptive message so callers can surface them meaningfully.
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI API call failed: ${message}`);
    }
  }
}
