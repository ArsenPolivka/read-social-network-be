import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaService {
  private ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

  // 1. Generate Embeddings (for Ingestion)
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'all-minilm', // Must run: ollama pull all-minilm
          prompt: text,
        }),
      });
      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Embedding failed. Is Ollama running?', error);
      throw new InternalServerErrorException('Ollama connection failed');
    }
  }

  // 2. Chat Completion (for RAG)
  async chat(prompt: string, contextOrSystemPrompt: string): Promise<any> {
    const response = await fetch(`${this.ollamaHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3', 
        messages: [
          { 
            role: 'system', 
            content: contextOrSystemPrompt // This now holds our "You are an expert..." prompt
          },
          { role: 'user', content: prompt }
        ],
        stream: false, 
      }),
    });
    const data = await response.json();
    return data.message.content;
  }
}