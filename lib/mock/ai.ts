// Mock AI responses for demo mode
import { Memory, MemoryType } from '@/types';
import { memories, generateId } from './store';

// Detect if user wants to save a memory
function detectMemoryIntent(message: string): { shouldSave: boolean; type: MemoryType; content: string } | null {
  const lowerMessage = message.toLowerCase();
  
  // Explicit remember commands
  if (lowerMessage.includes('remember that') || lowerMessage.includes('remember:')) {
    const content = message.replace(/remember that|remember:/gi, '').trim();
    return { shouldSave: true, type: 'fact', content };
  }
  
  // Preference detection
  if (lowerMessage.includes('i prefer') || lowerMessage.includes('i like') || lowerMessage.includes('i love')) {
    return { shouldSave: true, type: 'preference', content: message };
  }
  
  // Person detection
  if (lowerMessage.match(/my (friend|colleague|boss|partner|wife|husband|mom|dad|brother|sister)/)) {
    return { shouldSave: true, type: 'person', content: message };
  }
  
  // Decision detection
  if (lowerMessage.includes('i decided') || lowerMessage.includes("i've decided") || lowerMessage.includes('we decided')) {
    return { shouldSave: true, type: 'decision', content: message };
  }
  
  return null;
}

// Find relevant memories
function findRelevantMemories(message: string): Memory[] {
  const lowerMessage = message.toLowerCase();
  return memories.filter(m => {
    const words = lowerMessage.split(/\s+/);
    return words.some(word => word.length > 3 && m.content.toLowerCase().includes(word));
  }).slice(0, 3);
}

// Generate mock response
export async function* generateMockResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[]
): AsyncGenerator<{ type: string; content?: string; memory?: Memory }> {
  // Simulate thinking delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Check for memory save intent
  const memoryIntent = detectMemoryIntent(userMessage);
  
  // Find relevant memories
  const relevantMemories = findRelevantMemories(userMessage);
  
  // Build response
  let response = '';
  
  // Memory acknowledgment
  if (memoryIntent) {
    const newMemory: Memory = {
      id: generateId(),
      user_id: 'demo-user-123',
      type: memoryIntent.type,
      content: memoryIntent.content,
      metadata: { source: 'conversation' },
      embedding_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memories.push(newMemory);
    
    response = `Got it! I'll remember that. ✨\n\n`;
    
    // Yield memory saved event
    yield { type: 'memory_saved', memory: newMemory };
  }
  
  // Reference memories if relevant
  if (relevantMemories.length > 0 && !memoryIntent) {
    const memRef = relevantMemories[0];
    response += `Based on what I remember (${memRef.type}: "${memRef.content.slice(0, 50)}..."), `;
  }
  
  // Generate contextual response based on message type
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    response += "Hello! Great to chat with you. How can I help you today?";
  } else if (lowerMessage.includes('how are you')) {
    response += "I'm doing great, thanks for asking! I'm here and ready to help you with whatever you need. What's on your mind?";
  } else if (lowerMessage.includes('what can you do')) {
    response += "I can help you with lots of things! Here are some examples:\n\n• **Remember things** - Just say \"remember that...\" and I'll store it\n• **Answer questions** - Ask me anything\n• **Have conversations** - I maintain context throughout our chat\n• **Recall memories** - I'll reference things you've told me when relevant\n\nTry telling me something to remember!";
  } else if (lowerMessage.includes('what do you remember')) {
    if (memories.length === 0) {
      response += "I don't have any memories stored yet! Try telling me something to remember, like \"Remember that I prefer morning meetings.\"";
    } else {
      response += "Here's what I remember about you:\n\n";
      memories.slice(0, 5).forEach(m => {
        response += `• **${m.type}**: ${m.content}\n`;
      });
    }
  } else if (lowerMessage.includes('thank')) {
    response += "You're welcome! Is there anything else I can help you with?";
  } else if (memoryIntent) {
    response += "Is there anything else you'd like me to remember or help you with?";
  } else {
    // Generic helpful response
    const responses = [
      "That's interesting! Tell me more about that.",
      "I understand. How can I help you with this?",
      "Thanks for sharing that with me. Would you like me to remember anything specific about this?",
      "Got it! Feel free to ask me anything or tell me things you'd like me to remember.",
      "I'm here to help! What would you like to explore further?",
    ];
    response += responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Stream the response character by character (simulating AI)
  for (const char of response) {
    yield { type: 'content', content: char };
    // Small delay between characters for streaming effect
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

export { memories };
