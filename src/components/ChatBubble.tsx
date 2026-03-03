'use client';

interface ChatBubbleProps {
  message: string;
  isUser?: boolean;
}

export function ChatBubble({ message, isUser = false }: ChatBubbleProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} fade-in`}>
      <div
        className={`max-w-[85%] ${
          isUser ? 'chat-bubble-user' : 'chat-bubble-ai'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
}
