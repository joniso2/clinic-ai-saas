'use client';

import { FormEvent, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';

export function ChatAgent() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(event);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            AI Assistant
          </p>
          <p className="text-xs text-slate-400">
            Ask questions about leads, workflows, and operations.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm"
      >
        {messages.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Start a conversation to get assistance with managing leads,
            understanding the dashboard, or preparing prompts for your clinic AI
            agent.
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'flex justify-end'
                : 'flex justify-start'
            }
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                message.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {error && (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            There was an issue talking to the AI service. Please try again.
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-slate-200 bg-slate-50 px-3 py-2"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask the assistant to summarize leads, suggest follow-ups, or craft outreach messages..."
            rows={1}
            className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 focus:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

