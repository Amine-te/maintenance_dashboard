'use client';

import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, ChatMessage } from '@/lib/api';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I am your Predictive Maintenance Assistant. I have full access to your fleet data, KPIs, and predictive models. How can I help you today?' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);
    setInput('');
    setIsLoading(true);
    
    const newUserMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    try {
      // Send current message + previous history (excluding the first welcome message if preferred)
      const response = await sendChatMessage(text, messages);
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
        <div className="chatbot-panel premium">
          <div className="chatbot-header">
            <div className="header-info">
              <div className="status-indicator active"></div>
              <strong>Maintenance AI</strong>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="chatbot-messages" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-bubble ${msg.role}`}>
                <div className="bubble-content">{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-bubble assistant loading">
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            {error && <div className="chatbot-error-alert">{error}</div>}
          </div>
          <div className="chatbot-input-container">
            <div className="chatbot-input-wrapper">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about engine 12 health or fleet KPIs..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
              />
              <button className="send-btn" onClick={handleSend} disabled={isLoading || !input.trim()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {!isOpen && (
        <button className="chatbot-fab-premium" onClick={() => setIsOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          AI Assistant
        </button>
      )}
    </div>
  );
}
