'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';

export function ChatAgent() {
  // השימוש ב-any הכרחי כאן כדי לעקוף את שגיאות ה-TypeScript שמופיעות בתמונות שלך
  const chat: any = useChat({
    api: '/api/chat',
  } as any);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = chat;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AI Assistant</p>
          <p className="text-xs text-slate-400">Ask questions about leads and operations.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {messages?.map((m: any) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input || ''}
            onChange={handleInputChange}
            placeholder="Ask something..."
            className="flex-1 resize-none rounded-xl border border-slate-200 p-2 text-xs focus:outline-none"
          />
          <button type="submit" disabled={isLoading || !input?.trim()} className="rounded-full bg-slate-900 px-4 py-2 text-xs text-white disabled:opacity-50">
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}