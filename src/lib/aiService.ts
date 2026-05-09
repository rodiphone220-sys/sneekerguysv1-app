export type AIModelProvider = 'groq' | 'ollama' | 'gemini';

export interface AIConfig {
  provider: AIModelProvider;
  model: string;
  systemPrompt: string;
}

export const AI_PROVIDERS = {
  groq: {
    name: 'Groq (Llama)',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-8192'],
    defaultModel: 'llama-3.3-70b-versatile'
  },
  ollama: {
    name: 'Ollama (Local)',
    models: ['llama3.2:3b-instruct-q4_K_M', 'mistral:latest', 'llama3:latest'],
    defaultModel: 'llama3.2:3b-instruct-q4_K_M'
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash'
  }
} as const;

class AIService {
  private groqApiKey: string | null = null;
  private currentProvider: AIModelProvider = 'groq';
  private currentModel: string = AI_PROVIDERS.groq.defaultModel;

  constructor() {
    this.initGroq();
  }

  private initGroq() {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (apiKey) {
      this.groqApiKey = apiKey as string;
      console.log('[AI] Groq API key configured (using direct fetch)');
    } else {
      console.warn('[AI] No GROQ_API_KEY found');
    }
  }

  setProvider(provider: AIModelProvider, model?: string) {
    this.currentProvider = provider;
    this.currentModel = model || AI_PROVIDERS[provider].defaultModel;
  }

  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[], systemPrompt?: string): Promise<string> {
    const allMessages = [
      { role: 'system' as const, content: systemPrompt || 'You are a helpful assistant.' },
      ...messages
    ];

    try {
      switch (this.currentProvider) {
        case 'groq':
          return await this.chatWithGroq(allMessages);
        case 'ollama':
          return await this.chatWithOllama(allMessages);
        case 'gemini':
          return await this.chatWithGemini(allMessages);
        default:
          return await this.chatWithGroq(allMessages);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('AI Service Error:', error);

      if (errorMsg.includes('not initialized') || errorMsg.includes('not configured') || errorMsg.includes('API key')) {
        return this.fallbackChat(allMessages);
      }
      
      return this.fallbackChat(allMessages);
    }
  }

  private async chatWithGroq(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    if (!this.groqApiKey) {
      throw new Error('Groq client not initialized');
    }

    console.log('[AI] Groq messages:', JSON.stringify(messages));

    const formattedMessages = messages.map(m => {
      let role: string = 'user';
      if (m.role === 'system') role = 'system';
      else if (m.role === 'assistant') role = 'assistant';
      else if (m.role === 'user') role = 'user';
      
      return {
        role,
        content: String(m.content || '')
      };
    });

    console.log('[AI] Groq formatted:', JSON.stringify(formattedMessages));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.groqApiKey}`
      },
      body: JSON.stringify({
        model: this.currentModel,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    return data.choices?.[0]?.message?.content || 'No response from AI';
  }

  private async chatWithOllama(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
    console.log('[AI] Calling Ollama at:', baseUrl);
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.currentModel,
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || 'No response from AI';
  }

  private async chatWithGemini(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: this.currentModel });
    
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const result = await model.generateContent(prompt);
    return result.response.text() || 'No response from AI';
  }

  private async fallbackChat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    console.log('[AI] Primary provider failed, trying fallback...');
    
    const triedProviders = new Set([this.currentProvider]);
    
    for (const provider of ['ollama', 'gemini'] as AIModelProvider[]) {
      if (triedProviders.has(provider)) continue;
      
      try {
        this.setProvider(provider);
        triedProviders.add(provider);
        
        if (provider === 'ollama') {
          return await this.chatWithOllama(messages);
        } else if (provider === 'gemini') {
          return await this.chatWithGemini(messages);
        }
      } catch (e) {
        console.error(`[AI] ${provider} fallback failed:`, e);
      }
    }

    return 'Lo siento, todos los servicios de IA están temporalmente indisponibles. Por favor, verifica las claves API o el servicio de Ollama e intenta más tarde.';
  }

  getStatus() {
    return {
      provider: this.currentProvider,
      model: this.currentModel,
      providerName: AI_PROVIDERS[this.currentProvider].name,
      available: !!this.groqApiKey
    };
  }
}

export const aiService = new AIService();