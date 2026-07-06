import React, { useState, useRef, useEffect } from "react";

function CitationChip({ sourceId, source }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const scorePercent = source.score ? Math.round(source.score * 100) : 0;

  return (
    <span
      className="citation-container"
      style={{ position: "relative", display: "inline-block" }}
      ref={popoverRef}
    >
      <sup
        className="citation-chip"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          cursor: "pointer",
          color: "var(--color-primary)",
          background: "var(--color-surface)",
          padding: "2px 4px",
          borderRadius: "4px",
          margin: "0 2px",
          fontSize: "0.8em",
          border: "1px solid var(--color-border)",
        }}
        title={`Source [${sourceId}]`}
      >
        [{sourceId}]
      </sup>
      <div
        className="citation-popover-wrapper"
        style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition:
            "grid-template-rows 200ms ease-out, opacity 200ms ease-out",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          zIndex: 100,
          marginBottom: "8px",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            className="citation-popover"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              padding: "12px",
              width: "280px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              color: "var(--color-text-primary)",
              fontSize: "13px",
              lineHeight: "1.4",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "8px",
                color: "var(--color-primary)",
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📄</span> {source.docName || `Document ${source.docId}`}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                color: "var(--color-text-secondary)",
                fontSize: "12px",
              }}
            >
              <span>Chunk #{source.chunkIndex}</span>
              {scorePercent > 0 && <span>{scorePercent}% match</span>}
            </div>
            <div
              style={{
                fontStyle: "italic",
                marginBottom: "12px",
                color: "var(--color-text-primary)",
                maxHeight: "100px",
                overflowY: "auto",
              }}
            >
              "{source.excerpt}"
            </div>
            <button
              className="citation-open-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false); /* TODO: wire to document preview */
              }}
              style={{
                width: "100%",
                padding: "6px",
                background: "var(--color-primary)",
                color: "var(--color-text-primary)",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                transition: "transform 150ms ease, background 150ms ease",
              }}
            >
              Open Source
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "none",
                border: "none",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                padding: "2px",
                fontSize: "16px",
              }}
            >
              &times;
            </button>
          </div>
        </div>
      </div>
    </span>
  );
}

function MessageContent({ content, sources }) {
  if (!sources || sources.length === 0) return <>{content}</>;

  const parts = content.split(/\[(\d+)\]/);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const sourceId = parseInt(part, 10);
          const source = sources.find((s) => s.id === sourceId);
          if (source) {
            return <CitationChip key={i} sourceId={sourceId} source={source} />;
          }
          return <span key={i}>[{part}]</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function AssistantMessage({ message, isStreaming, isLast }) {
  const showCursor = isStreaming && isLast;
  const isClarify = message.type === "clarify";

  return (
    <div
      className={`bubble assistant ${isClarify ? "clarify-card" : ""} animate-slide-up`}
    >
      <div className="assistant-header">
        <span className="assistant-icon">🤖</span>
        <span className="assistant-label">Agent</span>
        {isClarify && (
          <span className="clarify-badge">Clarifying Question</span>
        )}
      </div>
      <div className="assistant-body">
        <MessageContent content={message.content} sources={message.sources} />
        {showCursor && <span className="streaming-cursor">█</span>}
      </div>
      {message.sources && message.sources.length > 0 && (
        <div className="assistant-sources">
          <div className="sources-title">Sources</div>
          {message.sources.map((s, i) => (
            <div key={i} className="source-row">
              <span className="source-chip">[{s.id}]</span>
              <span className="source-doc-name">
                {s.docName || `Doc ${s.docId}`}
              </span>
              <span className="source-excerpt">"{s.excerpt}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
