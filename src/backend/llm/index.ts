/**
 * src/backend/llm/index.ts
 *
 * Public API for the LLM adapter module.
 * Re-exports the adapter interface and all concrete implementations.
 */

export type { LLMAdapter } from './LLMAdapter.js';
export { OpenAIAdapter } from './OpenAIAdapter.js';
export type { OpenAIAdapterConfig } from './OpenAIAdapter.js';
export { AnthropicAdapter } from './AnthropicAdapter.js';
export type { AnthropicAdapterConfig } from './AnthropicAdapter.js';
