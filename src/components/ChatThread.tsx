"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";
import {
  parseSuggestionMarkers,
  stripSuggestionMarkers,
  suggestionKey,
  type SuggestionMarker,
} from "@/lib/suggestions";

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
  useEffect(() => {
    onSuggestionRef.current = onSuggestion;
  });

  // Markers already handed to the parent, so a marker that appears in both the
  // live stream and the history refreshed straight after it only surfaces once.
  const emittedKeys = useRef<Set<string>>(new Set());

  function emitSuggestions(text: string) {
    const markers = parseSuggestionMarkers(text, (body) =>
      console.warn(`[story-maker] ignored an unparseable suggestion marker: [[suggest:${body}]]`)
    );
    for (const marker of markers) {
      const key = suggestionKey(marker);
      if (emittedKeys.current.has(key)) continue;
      emittedKeys.current.add(key);
      onSuggestionRef.current?.(marker);
    }
  }

  useEffect(() => {
    emittedKeys.current = new Set();
    fetch(messagesUrl)
      .then((r) => r.json())
      .then((rows: ChatMessageRow[]) => {
        setMessages(rows);
        // Suggestions live in the message text, so history carries the ones
        // raised before this mount — without this they are lost on reload.
        for (const row of rows) emitSuggestions(row.content);
      });
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
    emitSuggestions(text);
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

  const bubble = (role: "user" | "assistant") =>
    role === "user" ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg";

  return (
    <div className="flex h-full min-h-0 flex-col text-sm">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && !isSending && (
          <p className="pt-4 text-muted">Talk the chapter through here — who is in it, what happens, how it should feel. Then generate.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[88%]">
              <span className={`mb-0.5 block text-[10px] uppercase tracking-widest text-muted ${m.role === "user" ? "text-right" : ""}`}>
                {m.role === "user" ? "You" : "Co-writer"}
              </span>
              <span className={`block whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed ${bubble(m.role)}`}>
                {stripSuggestionMarkers(m.content)}
              </span>
              {m.incomplete && <div className="mt-1 text-xs text-danger">Incomplete response</div>}
            </div>
          </div>
        ))}
        {streamingText !== null && (
          <div className="flex justify-start">
            <div className="max-w-[88%]">
              <span className="mb-0.5 block text-[10px] uppercase tracking-widest text-muted">Co-writer</span>
              <span className={`block whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed ${bubble("assistant")}`}>
                {stripSuggestionMarkers(streamingText)}
              </span>
            </div>
          </div>
        )}
        {isSending && streamingText === null && (
          <div className="flex justify-start">
            <span className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-muted">
              <Loader2 size={13} className="animate-spin" /> Thinking...
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="my-2 flex items-center justify-between gap-2 rounded-lg border border-danger/40 px-3 py-2 text-danger">
          <span>{error}</span>
          <button onClick={retry} className="flex shrink-0 items-center gap-1 underline">
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      )}
      {!error && lastMessage?.incomplete && (
        <button onClick={retry} className="my-2 flex items-center gap-1 self-start text-accent underline">
          <RotateCcw size={12} /> Retry last response
        </button>
      )}

      <div className="flex gap-2 border-t border-line pt-3">
        <input
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 outline-none placeholder:text-muted focus:border-accent disabled:opacity-50"
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
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg disabled:opacity-50"
        >
          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send
        </button>
      </div>
    </div>
  );
}
