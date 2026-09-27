import { useState } from "react";
import {
  ArrowUp,
  Bot,
  Sparkles,
  UserRound,
} from "lucide-react";

import { askQuestion } from "../api";

const SUGGESTIONS = [
  "How can I raise my ATS score?",
  "Which bullet point should I rewrite first?",
  "What skills should I highlight for this role?",
];

export default function ChatPanel({
  resumeText,
  jdText,
  reportSummary,
  enabled,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(question) {
    const trimmed = question.trim();

    if (!trimmed || loading || !enabled) {
      return;
    }

    const nextHistory = [
      ...messages,
      {
        role: "user",
        content: trimmed,
      },
    ];

    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const { answer } = await askQuestion({
        resumeText,
        jdText,
        reportSummary,
        history: messages,
        question: trimmed,
      });

      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (err) {
      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content: `Sorry — ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!enabled) {
    return null;
  }

  return (
    <section className="chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">
            <Bot size={18} />
          </span>

          <div>
            <span className="section-eyebrow">AI ASSISTANT</span>
            <h2>Ask RoleLens</h2>
          </div>
        </div>

        <span className="grounded-pill">
          <Sparkles size={13} />
          Resume grounded
        </span>
      </div>

      {messages.length === 0 ? (
        <div className="chat-empty">
          <p>
            Ask anything about your match. Responses are grounded in the
            resume, job description, and generated report.
          </p>

          <div className="suggestion-grid">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-button"
                onClick={() => send(suggestion)}
              >
                {suggestion}
                <ArrowUp size={15} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-log">
          {messages.map((message, index) => (
            <div
              className={`chat-message ${message.role}`}
              key={`${message.role}-${index}`}
            >
              <span className="chat-avatar">
                {message.role === "user" ? (
                  <UserRound size={14} />
                ) : (
                  <Bot size={14} />
                )}
              </span>

              <div className="chat-bubble">{message.content}</div>
            </div>
          ))}
        </div>
      )}

      <form
        className="chat-input-row"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your resume or this role..."
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? (
            <span className="spinner small" />
          ) : (
            <ArrowUp size={17} />
          )}
        </button>
      </form>
    </section>
  );
}