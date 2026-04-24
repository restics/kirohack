/**
 * src/backend/llm/LLMAdapter.ts
 *
 * Thin adapter interface for LLM providers. The Analysis Layer calls the LLM
 * exclusively through this interface, keeping it decoupled from any specific
 * provider (OpenAI, Anthropic, etc.).
 *
 * Requirements: 3.1, 3.4
 */

/**
 * Minimal contract that every LLM adapter must satisfy.
 * The caller passes a fully-constructed prompt string and receives the raw
 * text content of the model's response.
 */
export interface LLMAdapter {
  /**
   * Send `prompt` to the underlying LLM and return the model's text response.
   *
   * @param prompt - The fully-constructed prompt to send to the model.
   * @returns The raw text content of the model's response.
   * @throws An error with a descriptive message if the API call fails.
   */
  complete(prompt: string): Promise<string>;
}
