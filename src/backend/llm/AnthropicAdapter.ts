/**
 * src/backend/llm/AnthropicAdapter.ts
 *
 * Anthropic implementation of the LLMAdapter interface.
 * Uses the Messages API with an explicit JSON-only system prompt and an
 * assistant prefill of `{` to steer the model toward valid JSON output.
 *
 * Requirements: 3.1
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LLMAdapter } from './LLMAdapter.js';

export interface AnthropicAdapterConfig {
  /**
   * Anthropic API key. Falls back to the ANTHROPIC_API_KEY environment
   * variable when not provided.
   */
  apiKey?: string;
  /**
   * Model to use. Defaults to 'claude-3-5-haiku-20241022' (cost-effective).
   */
  model?: string;
}

/**
 * LLMAdapter implementation backed by the Anthropic Messages API.
 *
 * Because Anthropic does not have a native JSON mode, the system prompt
 * explicitly instructs the model to return only valid JSON, and an assistant
 * prefill message starting with `{` is used to force JSON output.
 *
 * @example
 * ```typescript
 * const adapter = new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY });
 * const result = await adapter.complete('Analyze this event...');
 * ```
 */
export class AnthropicAdapter implements LLMAdapter {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: AnthropicAdapterConfig = {}) {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;

    this.client = new Anthropic({ apiKey });
    this.model = config.model ?? 'claude-3-5-haiku-20241022';
  }

  /**
   * Send `prompt` to the Anthropic Messages API and return the model's
   * response content.
   *
   * The system message instructs the model to return valid JSON only.
   * An assistant prefill of `{` is included to steer the model toward
   * producing a JSON object from the very first token.
   *
   * @param prompt - The user-facing prompt to send to the model.
   * @returns The raw JSON string returned by the model (prefill `{` prepended).
   * @throws An error with a descriptive message if the API call fails or the
   *         response contains no text content.
   */
  async complete(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system:
          'You are an economic analyst. Return ONLY a valid JSON object — no markdown, no prose, no code fences. Your entire response must be parseable by JSON.parse(). Do not include any text before or after the JSON object.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
          {
            // Assistant prefill: forces the model to continue from `{`,
            // ensuring the response begins as a JSON object.
            role: 'assistant',
            content: '{',
          },
        ],
      });

      const firstBlock = response.content[0];

      if (firstBlock == null || firstBlock.type !== 'text') {
        throw new Error(
          'Anthropic API returned an empty response: no text content in the first content block.',
        );
      }

      // The prefill `{` is not included in the response content, so we
      // prepend it to reconstruct the full JSON object.
      return '{' + firstBlock.text;
    } catch (error) {
      // Re-throw errors that we already constructed above.
      if (error instanceof Error && error.message.startsWith('Anthropic API')) {
        throw error;
      }

      // Wrap unexpected errors (network failures, rate limits, etc.) with a
      // descriptive message so callers can surface them meaningfully.
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Anthropic API call failed: ${message}`);
    }
  }
}
