import React, { useState, useRef, useEffect } from "react";

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function groupSourcesByDocument(sources) {
  const groups = new Map();

  sources.forEach((source) => {
    const docName = source.docName || source.docId || "Unknown Document";
    const docId = source.docId ?? source.id ?? docName;
    const chunkIndex =
      source.chunkIndex != null ? source.chunkIndex : source.id;
    const groupKey = `${docName}::${docId}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        docName,
        docId,
        chunkIndices: [],
      });
    }

    const group = groups.get(groupKey);
    if (chunkIndex != null && !group.chunkIndices.includes(chunkIndex)) {
      group.chunkIndices.push(chunkIndex);
    }
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    chunkIndices: group.chunkIndices.sort((a, b) => a - b),
  }));
}

function SourcesLine({ sources, onSourceClick }) {
  const groups = groupSourcesByDocument(sources || []);

  if (groups.length === 0) return null;

  return (
    <div className={`assistant-sources`}>
      <span className="sources-line-label">Sources:</span>
      {groups.map((group, idx) => (
        <span className="source-group" key={`${group.docId}-${group.docName}`}>
          <button
            type="button"
            className="source-link"
            onClick={() => {
              if (typeof onSourceClick === "function") {
                onSourceClick({ id: group.docId, name: group.docName });
              } else {
                console.log("Open document preview for:", group.docName);
              }
            }}
          >
            {group.docName}
          </button>
          <span className="source-chunks">
            (Chunks: {group.chunkIndices.join(", ")})
          </span>
          {idx < groups.length - 1 && (
            <span className="source-separator">; </span>
          )}
        </span>
      ))}
    </div>
  );
}

function MessageContent({ content }) {
  return <div className="message-text">{content}</div>;
}

export function MessageBubble({ message, isStreaming, isLast, onSourceClick }) {
  const showCursor = isStreaming && isLast;
  const isAssistant = message.role === "assistant";
  const isClarify = message.type === "clarify";
  const isUploadConfirmation =
    message.role === "system" &&
    typeof message.content === "string" &&
    /^Uploaded ".+" — split into \d+ chunks and indexed\.?$/.test(
      message.content,
    );
  const label = isAssistant
    ? "Agent"
    : message.role === "system"
      ? "System"
      : "You";
  const avatar = isAssistant ? "🤖" : message.role === "system" ? "⚙️" : "👤";

  const isErrorMessage = message.isError === true;

  return (
    <div
      className={`bubble ${message.role} ${isErrorMessage ? "error" : ""} ${
        isUploadConfirmation ? "upload-pill" : ""
      } ${isClarify ? "clarify-card" : ""} animate-slide-up`}
    >
      <div className="message-meta">
        <div className="message-avatar">{avatar}</div>
        <div className="message-meta-text">
          <div className="message-label">{label}</div>
          {message.createdAt && (
            <div className="message-time">{timeAgo(message.createdAt)}</div>
          )}
        </div>
        {isClarify && (
          <span className="clarify-badge">Clarifying Question</span>
        )}
      </div>
      <div className="message-body">
        {isErrorMessage ? (
          <div className="message-error">{message.content}</div>
        ) : isAssistant ? (
          <MessageContent content={message.content} />
        ) : (
          message.content
        )}
        {showCursor && <span className="streaming-cursor">█</span>}
      </div>
      {isAssistant && message.sources && message.sources.length > 0 && (
        <SourcesLine sources={message.sources} onSourceClick={onSourceClick} />
      )}
    </div>
  );
}
