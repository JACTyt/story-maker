"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";
import { parseSuggestionMarkers, type SuggestionMarker } from "@/lib/suggestions";

export type ChatMessageRow = { id: number; role: "user" | "assistant"; content: string; incomplete: boolean };

export function ChatThread({
  storyId,
  chapterId,
  onSuggestion,
}: {
  storyId: string;
  chapterId: string;
  onSuggestion?: (block: SuggestionMarker) => void;
}) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesUrl = `/api/stories/${storyId}/chapters/${chapterId}/messages`;
  const onSuggestionRef = useRef(onSuggestion);
  onSuggestionRef.current = onSuggestion;

  useEffect(() => {
    fetch(messagesUrl)
      .then((r) => r.json())
      .then(setMessages);
  }, [messagesUrl]);

  async function consumeStream(res: Response) {
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      setStreamingText(text);
    }
    setStreamingText(null);
    const refreshed = await fetch(messagesUrl).then((r) => r.json());
    setMessages(refreshed);
    parseSuggestions(text);
  }

  function parseSuggestions(text: string) {
    for (const marker of parseSuggestionMarkers(text)) {
      onSuggestionRef.current?.(marker);
    }
  }

  async function send() {
    if (!draft.trim() || isSending) return;
    const content = draft;
    setDraft("");
    setError(null);
    setIsSending(true);
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content, incomplete: false }]);
    try {
      const res = await fetch(messagesUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Request failed");
      await consumeStream(res);
    } catch {
      setError("Couldn't reach the AI provider. Your message was saved — you can retry.");
    } finally {
      setIsSending(false);
    }
  }

  async function retry() {
    if (isSending) return;
    setError(null);
    setIsSending(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error("Retry failed");
      await consumeStream(res);
    } catch {
      setError("Retry failed again. Check your provider settings.");
    } finally {
      setIsSending(false);
    }
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex h-full min-h-0 flex-col font-mono text-sm">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%]">
              <span
                className={`mb-1 block text-[10px] uppercase tracking-widest ${
                  m.role === "user" ? "text-right text-fountain" : "text-ink-faint"
                }`}
              >
                {m.role === "user" ? "You" : "Co-writer"}
              </span>
              <span
                className={`block rounded-sm px-3 py-2 leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-fountain-wash text-paper" : "bg-ink-wash text-paper/90"
                }`}
              >
                {m.content}
              </span>
              {m.incomplete && <div className="mt-1 text-xs text-carbon">Incomplete response</div>}
            </div>
          </div>
        ))}
        {streamingText !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-ink-faint">Co-writer</span>
              <span className="block rounded-sm bg-ink-wash px-3 py-2 leading-relaxed whitespace-pre-wrap text-paper/90">
                {streamingText}
              </span>
            </div>
          </div>
        )}
        {isSending && streamingText === null && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-ink-faint">Co-writer</span>
              <span className="flex items-center gap-2 rounded-sm bg-ink-wash px-3 py-2 text-paper/60">
                <Loader2 size={13} className="animate-spin" /> Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="my-2 flex items-center justify-between rounded-sm border border-carbon bg-carbon-wash px-3 py-2 text-carbon">
          <span>{error}</span>
          <button onClick={retry} className="flex items-center gap-1 underline hover:text-paper">
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      )}
      {!error && lastMessage?.incomplete && (
        <button onClick={retry} className="my-2 flex items-center gap-1 self-start text-fountain underline hover:text-paper">
          <RotateCcw size={12} /> Retry last response
        </button>
      )}

      <div className="flex gap-2 border-t border-ink-line pt-3">
        <input
          className="flex-1 rounded-sm border border-ink-line bg-ink-wash px-3 py-2 text-paper placeholder:text-ink-faint focus:border-fountain focus:outline-none disabled:opacity-50"
          placeholder="Write to your co-writer..."
          value={draft}
          disabled={isSending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          onClick={send}
          disabled={isSending}
          className="flex items-center gap-1.5 rounded-sm bg-paper px-4 py-2 uppercase tracking-wide text-ink hover:bg-paper-dim disabled:opacity-50"
        >
          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send
        </button>
      </div>
    </div>
  );
}
