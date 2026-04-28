'use client';

import { useState } from 'react';
import { sendChatMessage } from '@/lib/api';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Ask me about KPI trends, faults, or engine health.' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);
    setInput('');
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const response = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to get response.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-root">
      {isOpen && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <strong>Dashboard Assistant</strong>
            <button onClick={() => setIsOpen(false)}>Close</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && <div className="chatbot-bubble assistant">Thinking...</div>}
          </div>
          {error && <div className="chatbot-error">{error}</div>}
          <div className="chatbot-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about faults, availability, RUL..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
      {!isOpen && (
        <button className="chatbot-fab" onClick={() => setIsOpen(true)}>
          Chat
        </button>
      )}
    </div>
  );
}
