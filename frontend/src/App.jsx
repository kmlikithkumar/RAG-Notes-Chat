import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import { MessageBubble } from "./MessageBubble";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";

// Allow configuring the backend API base via Vite env var `VITE_API_BASE_URL`.
// Defaults to the local backend used in development.
const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) || "http://127.0.0.1:5050/api";

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

function formatExactDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes) {
  if (bytes === 0 || bytes == null) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

function HighlightedText({ text, highlight }) {
  if (!highlight) return <>{text}</>;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedHighlight})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark
            key={i}
            className="search-match"
            aria-hidden
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function App() {
  const [token, setToken] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [theme, setTheme] = useState("light");
  const [userName, setUserName] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [storageInfo, setStorageInfo] = useState({
    totalBytes: 0,
    limitBytes: 100 * 1024 * 1024,
  });

  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(
    () => "session-" + Math.random().toString(36).slice(2),
  );
  const [editingDocId, setEditingDocId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editOriginalName, setEditOriginalName] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [chatFilters, setChatFilters] = useState({ docIds: [], tags: [] });
  const [docSort, setDocSort] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef(null);

  const [thinkingText, setThinkingText] = useState("Agent is thinking...");
  const [activeTab, setActiveTab] = useState("chat");

  const navItems = [
    { key: "chat", label: "Chat", icon: "💬" },
    { key: "documents", label: "Documents", icon: "📄" },
    { key: "tags", label: "Tags", icon: "🏷️" },
    { key: "analytics", label: "Analytics", icon: "📊" },
    { key: "settings", label: "Settings", icon: "⚙️" },
  ];

  useEffect(() => {
    if (!thinking) {
      setThinkingText("Agent is thinking...");
      return;
    }
    const timer1 = setTimeout(
      () => setThinkingText("Searching your documents..."),
      2000,
    );
    const timer2 = setTimeout(
      () => setThinkingText("Drafting an answer..."),
      4500,
    );
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [thinking]);

  const placeholders = [
    "Ask anything about your documents...",
    "Summarize this document...",
    "Explain chapter 4...",
    "What are the key takeaways?",
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (isInputFocused || input.trim()) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isInputFocused, input, placeholders.length]);

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents];
    if (docSort === "newest")
      sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    else if (docSort === "oldest")
      sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    else if (docSort === "name")
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [documents, docSort]);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token]);

  // Decode JWT token to display a friendly user name / email in the sidebar
  useEffect(() => {
    if (!token) {
      setUserName(null);
      setUserEmail(null);
      return;
    }
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const email = payload && (payload.userId || payload.email || payload.sub);
        setUserEmail(email || null);
        if (payload && payload.name) setUserName(payload.name);
        else if (email) setUserName(email.split("@")[0]);
      }
    } catch (e) {
      // ignore decode errors
      setUserName(null);
      setUserEmail(null);
    }
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (previewDoc) setPreviewDoc(null);
        if (searchResults) {
          setSearchResults(null);
          setSearchQuery("");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewDoc, searchResults]);

  useEffect(() => {
    if (previewDoc?.data && previewDoc?.query) {
      const timer = setTimeout(() => {
        const mark = document.querySelector(".search-match");
        if (mark) {
          mark.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [previewDoc]);

  async function handleAuth({ email, password, name, rememberMe }) {
    const endpoint = isLoginMode ? "/auth/login" : "/auth/signup";
    const body = isLoginMode
      ? { email, password }
      : { email, password, name };
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Invalid email or password",
        };
      }
      if (!data.token) {
        return {
          success: false,
          error: "Authentication response did not include a token.",
        };
      }
      setToken(data.token);
      // Remember-me handling can be extended here to persist a longer-lived
      // token/cookie once a real server-side auth flow is implemented.
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Auth failed" };
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setToken(null);
        return;
      }
      const data = await res.json();
      setDocuments(data.documents || []);
      setStorageInfo(data.storage || {
        totalBytes: 0,
        limitBytes: 100 * 1024 * 1024,
      });
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  }

  async function handleDeleteDoc(id, name) {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");

      setDocuments((docs) => docs.filter((d) => d.id !== id));

      const chunkCount = data.deletedChunkCount || 0;
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Deleted "${name}" and its ${chunkCount} chunks.`,
        },
      ]);
    } catch (err) {
      alert(err.message);
    }
  }

  function startEdit(doc) {
    if (isSavingEdit) return;
    setEditingDocId(doc.id);
    setEditName(doc.name);
    setEditOriginalName(doc.name);
    setEditTags(doc.tags ? doc.tags.join(", ") : "");
  }

  async function saveEdit(id) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === editOriginalName) {
      setEditingDocId(null);
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed, tags: editTags }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Rename failed");
      }
      const newTagsArray = editTags
        ? editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      setDocuments((docs) =>
        docs.map((d) =>
          d.id === id ? { ...d, name: trimmed, tags: newTagsArray } : d,
        ),
      );
      setEditingDocId(null);
    } catch (err) {
      setEditName(editOriginalName);
      setEditingDocId(null);
      alert(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handlePreview(doc, queryToHighlight = null) {
    setIsPreviewLoading(true);
    setPreviewDoc({ doc, data: null, query: queryToHighlight });
    try {
      const isFull = queryToHighlight ? true : false;
      const res = await fetch(
        `${API_BASE}/documents/${doc.id}/preview${isFull ? "?full=true" : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch preview");
      const data = await res.json();
      setPreviewDoc({ doc, data, query: queryToHighlight });
    } catch (err) {
      alert(err.message);
      setPreviewDoc(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleFullPreview() {
    if (!previewDoc) return;
    setIsPreviewLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/documents/${previewDoc.doc.id}/preview?full=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch full text");
      const data = await res.json();
      setPreviewDoc({ doc: previewDoc.doc, data });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function uploadSingleFile(file) {
    return new Promise((resolve) => {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(false);
      setIsIndexing(false);

      const formData = new FormData();
      formData.append("file", file);
      if (uploadTags.trim()) {
        formData.append("tags", uploadTags);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/upload`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100,
          );
          setUploadProgress(percentComplete);
          if (percentComplete === 100) {
            setIsIndexing(true);
          }
        }
      };

      xhr.onload = () => {
        setUploading(false);
        setIsIndexing(false);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `Uploaded "${data.name}" — split into ${data.chunkCount} chunks and indexed.`,
              },
            ]);
            fetchDocuments();
          } catch (err) {
            setUploadError(true);
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `Upload failed for ${file.name}: Invalid server response`,
              },
            ]);
          }
        } else {
          setUploadError(true);
          let errorMsg = "Upload failed";
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.error) errorMsg = data.error;
          } catch (e) {}
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `Upload failed for ${file.name}: ${errorMsg}`,
            },
          ]);
        }
        resolve();
      };

      xhr.onerror = () => {
        setUploading(false);
        setIsIndexing(false);
        setUploadError(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `Upload failed for ${file.name}: Network Error`,
          },
        ]);
        resolve();
      };

      xhr.send(formData);
    });
  }

  async function processFiles(files) {
    for (const file of files) {
      const validExts = [".txt", ".md", ".pdf"];
      const isValid = validExts.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );
      if (!isValid) {
        setUploading(true);
        setUploadProgress(100);
        setUploadError(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `Upload failed: "${file.name}" has an unsupported format. Only .txt, .md, .pdf are supported.`,
          },
        ]);
        await new Promise((r) => setTimeout(r, 2000));
        setUploading(false);
        setUploadError(false);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploading(true);
        setUploadProgress(100);
        setUploadError(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `Upload failed: "${file.name}" (${formatBytes(file.size)}) exceeds the 10 MB limit.`,
          },
        ]);
        await new Promise((r) => setTimeout(r, 2000));
        setUploading(false);
        setUploadError(false);
        continue;
      }

      await uploadSingleFile(file);
    }
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2000);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileUpload(e) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  }

  const handleSearch = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_BASE}/search?q=${encodeURIComponent(query.trim())}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.status === 401) {
          setToken(null);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    },
    [token],
  );

  function handleSearchInput(value) {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimerRef.current = setTimeout(() => handleSearch(value), 300);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          sessionId,
          filters: chatFilters,
        }),
      });

      if (res.status === 401) {
        setToken(null);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Chat failed");
      }

      setThinking(false);
      setIsStreaming(true);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", type: "answer", sources: [] },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split("\n\n");
          buffer = messages.pop(); // keep incomplete message

          for (const msg of messages) {
            if (!msg.trim()) continue;
            const lines = msg.split("\n");
            let eventType = "message";
            let eventData = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.substring(7);
              else if (line.startsWith("data: ")) eventData = line.substring(6);
            }

            try {
              setMessages((prev) => {
                const newArr = [...prev];
                const lastIdx = newArr.length - 1;
                const lastMsg = { ...newArr[lastIdx] };

                if (eventType === "sources") {
                  lastMsg.sources = JSON.parse(eventData);
                } else if (eventType === "decision") {
                  lastMsg.type = eventData;
                } else if (eventType === "text") {
                  // Debug: log raw eventData before parsing
                  if (import.meta.env.VITE_DEBUG_SSE === '1') {
                    try { console.log('[SSE CLIENT DEBUG] raw data:', eventData); } catch (e) {}
                  }
                  lastMsg.content += JSON.parse(eventData);
                } else if (eventType === "error") {
                  // Surface streaming errors as a distinct system error message
                  // instead of appending into the assistant's text body.
                  const errObj = JSON.parse(eventData);
                  // push a new system error entry
                  newArr.push({
                    role: "system",
                    content: `Error: ${errObj.error}`,
                    isError: true,
                    createdAt: Date.now(),
                  });
                }

                newArr[lastIdx] = lastMsg;
                return newArr;
              });
            } catch (e) {
              console.error("Failed to parse event data:", eventData, e);
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const newArr = [...prev];
        const lastIdx = newArr.length - 1;
        if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
          const lastMsg = { ...newArr[lastIdx] };
          lastMsg.content += `\n\n[Response interrupted: ${err.message}]`;
          newArr[lastIdx] = lastMsg;
          return newArr;
        } else {
          return [
            ...prev,
            { role: "system", content: `Error: ${err.message}` },
          ];
        }
      });
      setThinking(false);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleLogout() {
    setToken(null);
    setDocuments([]);
    setMessages([]);
  }

  if (!token) {
    return (
      <div className="app" data-theme={theme}>
        {isLoginMode ? (
          <LoginPage
            isLoginMode={isLoginMode}
            setIsLoginMode={setIsLoginMode}
            onSubmit={handleAuth}
          />
        ) : (
          <SignupPage
            isLoginMode={isLoginMode}
            setIsLoginMode={setIsLoginMode}
            onSubmit={handleAuth}
          />
        )}
      </div>
    );
  }

  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags || [])));
  const liveTotalBytes = documents.reduce((sum, doc) => sum + (doc.sizeBytes || 0), 0);
  const liveLimitBytes = storageInfo.limitBytes || (100 * 1024 * 1024);
  const storageUsedRatio = liveLimitBytes ? Math.min(1, liveTotalBytes / liveLimitBytes) : 0;
  const percent = liveLimitBytes ? Math.max(0, Math.min(100, (liveTotalBytes / liveLimitBytes) * 100)) : 0;
  const storageProgressStyle = {
    width: `${percent}%`,
    background: storageUsedRatio >= 0.95
      ? "var(--color-error)"
      : storageUsedRatio >= 0.8
      ? "var(--color-warning)"
      : "linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-end))",
  };

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const renderDocumentList = () => (
          <div className="sidebar-doc-list">
            <div className="sidebar-doc-list-header">
              <h2>Documents ({documents.length})</h2>
              {documents.length > 1 && (
                <select
                  value={docSort}
                  onChange={(e) => setDocSort(e.target.value)}
                  className="doc-sort-select"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
              )}
            </div>
            {documents.length === 0 && (
              <p className="empty">No documents yet</p>
            )}
            {sortedDocuments.map((doc) => {
              const fileType = doc.name.split(".").pop().toUpperCase();
              const typeClass =
                fileType === "PDF"
                  ? "pdf"
                  : fileType === "MD"
                    ? "md"
                    : fileType === "TXT"
                      ? "txt"
                      : "other";
              const metadata = [
                doc.chunkCount != null
                  ? `${doc.chunkCount} chunk${doc.chunkCount !== 1 ? "s" : ""}`
                  : null,
                doc.sizeBytes != null ? formatBytes(doc.sizeBytes) : null,
                doc.createdAt ? timeAgo(doc.createdAt) : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <div key={doc.id} className="doc-item animate-slide-up">
                  {editingDocId === doc.id ? (
                    <div className="doc-edit-row">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEdit(doc.id);
                          }
                          if (e.key === "Escape") {
                            setEditName(editOriginalName);
                            setEditingDocId(null);
                          }
                        }}
                        onBlur={() => {
                          if (!isSavingEdit) saveEdit(doc.id);
                        }}
                        disabled={isSavingEdit}
                        autoFocus
                        maxLength={200}
                        className="doc-edit-input"
                      />
                      {isSavingEdit && (
                        <span className="doc-edit-saving">Saving…</span>
                      )}
                    </div>
                  ) : (
                    <div className="doc-card">
                      <div className="doc-card-main">
                        <span className={`doc-type-badge ${typeClass}`}>
                          {fileType}
                        </span>
                        <div className="doc-card-info">
                          <button
                            type="button"
                            className="doc-card-title"
                            onClick={() => handlePreview(doc)}
                            title={doc.name}
                          >
                            {doc.name}
                          </button>
                          <div className="doc-card-meta">
                            {metadata || "No metadata available"}
                          </div>
                        </div>
                      </div>

                      <div className="doc-menu">
                        <button
                          type="button"
                          className="doc-menu-button"
                          aria-label="Document actions"
                        >
                          ⋮
                        </button>
                        <div className="doc-menu-content">
                          <button
                            type="button"
                            className="doc-menu-item"
                            onClick={() => startEdit(doc)}
                          >
                            Rename / Edit tags
                          </button>
                          <button
                            type="button"
                            className="doc-menu-item doc-menu-item-danger"
                            onClick={() => handleDeleteDoc(doc.id, doc.name)}
                          >
                            Delete document
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="doc-tag-row">
                      {doc.tags.map((t) => `#${t}`).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
  );

  return (
    <div className="app" data-theme={theme}>
      {/* Preview Modal */}
      {previewDoc && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewDoc(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#21252d",
              border: "1px solid #333844",
              borderRadius: "8px",
              width: "80%",
              maxWidth: "800px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #333844",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px", color: "white" }}>
                Preview: {previewDoc.doc.name}
              </h2>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8b93a1",
                  cursor: "pointer",
                  fontSize: "24px",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                padding: "16px",
                overflowY: "auto",
                flex: 1,
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#e6e6e6",
              }}
            >
              {isPreviewLoading && !previewDoc.data ? (
                <div>
                  <div className="skeleton-bar" style={{ width: "100%" }}></div>
                  <div className="skeleton-bar" style={{ width: "90%" }}></div>
                  <div className="skeleton-bar" style={{ width: "95%" }}></div>
                  <div className="skeleton-bar" style={{ width: "85%" }}></div>
                  <div className="skeleton-bar" style={{ width: "40%" }}></div>
                </div>
              ) : previewDoc.data ? (
                <>
                  {previewDoc.data.fileType === "pdf" && (
                    <div
                      style={{
                        backgroundColor: "rgba(255, 193, 7, 0.1)",
                        border: "1px solid #ffc107",
                        color: "#ffc107",
                        padding: "12px",
                        borderRadius: "4px",
                        marginBottom: "16px",
                        fontSize: "13px",
                      }}
                    >
                      <strong>Note:</strong> This is the raw text extracted from
                      the PDF, not the visual layout.
                    </div>
                  )}
                  <div
                    style={{
                      marginBottom: "16px",
                      fontSize: "12px",
                      color: "#8b93a1",
                    }}
                  >
                    {previewDoc.data.totalWords} words •{" "}
                    {previewDoc.data.totalCharacters} characters
                  </div>
                  <div
                    style={{
                      background: "#1c2028",
                      padding: "16px",
                      borderRadius: "4px",
                      border: "1px solid #333844",
                    }}
                  >
                    <HighlightedText
                      text={previewDoc.data.text}
                      highlight={previewDoc.query}
                    />
                  </div>

                  {previewDoc.data.isExcerpt && (
                    <div style={{ marginTop: "20px", textAlign: "center" }}>
                      <button
                        onClick={handleFullPreview}
                        disabled={isPreviewLoading}
                        style={{
                          padding: "8px 16px",
                          background: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        {isPreviewLoading
                          ? "Loading full document..."
                          : "Show full document"}
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <aside
        className="sidebar"
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        style={{ position: "relative" }}
      >
        {isDragging && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(102, 179, 255, 0.1)",
              border: "2px dashed #66b3ff",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "inherit",
            }}
          >
            <h3 style={{ color: "#66b3ff", pointerEvents: "none" }}>
              Drop files to upload
            </h3>
          </div>
        )}

        <div className="sidebar-top">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">U</div>
            <div className="sidebar-user-details">
              <div>
                <div className="sidebar-user-name">{userName || "User"}</div>
                <div className="sidebar-user-email">{userEmail || "user@example.com"}</div>
              </div>
              <div className="sidebar-user-status">
                <span className="status-dot"></span>
                <span>Agent Connected</span>
              </div>
            </div>
            <span className="sidebar-user-chevron">⌄</span>
          </div>

          <div className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`sidebar-nav-item ${activeTab === item.key ? "active" : ""}`}
                onClick={() => setActiveTab(item.key)}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-actions">
            <label
              className={`upload-btn ${uploadError ? "error" : ""}`}
              style={{ margin: 0 }}
            >
              {uploadSuccess ? (
                <>
                  <svg
                    className="icon-scale-in"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    color="var(--color-success)"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span
                    style={{ color: "var(--color-success)", fontWeight: "600" }}
                  >
                    Uploaded!
                  </span>
                </>
              ) : uploading ? (
                <>
                  <svg
                    className="icon-spin"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <span>
                    {isIndexing
                      ? "Indexing..."
                      : `Uploading ${uploadProgress}%`}
                  </span>
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Upload document</span>
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,.pdf,.md"
                onChange={handleFileUpload}
                disabled={uploading}
                multiple
                hidden
              />
            </label>

            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              className="upload-tags-input"
            />

            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="sidebar-search-input"
              />
              <span className="shortcut-hint">⌘K</span>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                  }}
                  className="search-clear"
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {activeTab === "chat" && renderDocumentList()}
        </div>

        <div className="sidebar-footer">
          <div
            style={{
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              marginBottom: "8px",
            }}
          >
            Storage Used
          </div>
          <div className="storage-bar">
            <div className="storage-progress" style={storageProgressStyle} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              marginTop: "6px",
            }}
          >
            <span>{formatBytes(liveTotalBytes)} used</span>
            <span>{formatBytes(liveLimitBytes)}</span>
          </div>
        </div>
      </aside>

      <main className="chat">
        <div className="chat-header">
          <div className="chat-header-left">
            <span style={{ fontSize: "18px", marginRight: "8px" }}>
              {navItems.find((item) => item.key === activeTab)?.icon}
            </span>
            <span style={{ fontWeight: "600" }}>
              {navItems.find((item) => item.key === activeTab)?.label}
            </span>
          </div>
        </div>


        {activeTab === "chat" && (
          <>
        <div className="stats-toolbar">
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-card-icon stat-icon-docs">📄</div>
              <div>
                <div className="stat-card-label">Documents</div>
                <div className="stat-card-value">{documents.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon stat-icon-chunks">🧩</div>
              <div>
                <div className="stat-card-label">Total Chunks</div>
                <div className="stat-card-value">
                  {documents
                    .reduce((sum, doc) => sum + (doc.chunkCount || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon stat-icon-questions">💬</div>
              <div>
                <div className="stat-card-label">Questions</div>
                <div className="stat-card-value">
                  {messages.filter((m) => m.role === "user").length}
                </div>
              </div>
            </div>
          </div>

          <div className="stats-toolbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() =>
                setTheme((prev) => (prev === "light" ? "dark" : "light"))
              }
              title="Toggle theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div
              className="empty-state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                textAlign: "center",
                padding: "0 20px",
                color: "var(--color-text-primary)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "var(--color-text-primary)",
                }}
              >
                Welcome to RAG Notes Chat
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--color-text-secondary)",
                  marginBottom: "32px",
                  maxWidth: "400px",
                  lineHeight: "1.5",
                }}
              >
                Upload PDFs, Markdown, or Text files, then ask anything about
                them.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  justifyContent: "center",
                  maxWidth: "500px",
                  marginBottom: "32px",
                }}
              >
                {[
                  "Summarize this document",
                  "Explain chapter 4",
                  "List key algorithms",
                  "Create interview questions",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="suggestion-chip"
                    onClick={() => {
                      setInput(suggestion);
                      setIsInputFocused(true);
                    }}
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {documents.length === 0 && (
                <label
                  className="upload-btn"
                  style={{
                    margin: 0,
                    padding: "10px 20px",
                    borderRadius: "24px",
                    fontSize: "15px",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Upload your first document</span>
                  <input
                    type="file"
                    accept=".txt,.pdf,.md"
                    onChange={handleFileUpload}
                    multiple
                    hidden
                  />
                </label>
              )}
            </div>
          )}
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <MessageBubble
                key={i}
                message={m}
                isStreaming={isStreaming}
                isLast={isLast}
                onSourceClick={(doc) => {
                  if (doc?.id) {
                    handlePreview({ id: doc.id, name: doc.name || doc.id });
                  } else {
                    console.log("Open document preview for:", doc);
                  }
                }}
              />
            );
          })}
          {thinking && (
            <div className="bubble assistant animate-slide-up">
              <div
                className="bubble-content typing"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div style={{ display: "flex" }}>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {thinkingText}
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="filter-bar">
          <span
            style={{ fontSize: "12px", color: "#8b93a1", marginRight: "10px" }}
          >
            Search in:
          </span>

          <select
            onChange={(e) => {
              const val = e.target.value;
              if (!val) return;
              if (val === "all") setChatFilters({ docIds: [], tags: [] });
              else if (val.startsWith("tag:"))
                setChatFilters({ docIds: [], tags: [val.slice(4)] });
              else if (val.startsWith("doc:"))
                setChatFilters({ docIds: [val.slice(4)], tags: [] });
              e.target.value = ""; // reset dropdown visually
            }}
            style={{
              padding: "4px",
              borderRadius: "4px",
              background: "#1c2028",
              color: "white",
              border: "1px solid #333844",
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Select filter...
            </option>
            <option value="all">All Documents</option>
            {documents.length > 0 && (
              <optgroup label="Documents">
                {documents.map((d) => (
                  <option key={d.id} value={`doc:${d.id}`}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            )}
            {allTags.length > 0 && (
              <optgroup label="Tags">
                {allTags.map((t) => (
                  <option key={t} value={`tag:${t}`}>
                    #{t}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <div
            className="active-filters"
            style={{ display: "flex", gap: "8px", marginLeft: "12px" }}
          >
            {chatFilters.docIds.map((id) => {
              const d = documents.find((doc) => doc.id === id);
              return (
                <span
                  key={id}
                  className="filter-chip"
                  onClick={() =>
                    setChatFilters((p) => ({
                      ...p,
                      docIds: p.docIds.filter((x) => x !== id),
                    }))
                  }
                >
                  y {d?.name || id} ✕
                </span>
              );
            })}
            {chatFilters.tags.map((t) => (
              <span
                key={t}
                className="filter-chip"
                onClick={() =>
                  setChatFilters((p) => ({
                    ...p,
                    tags: p.tags.filter((x) => x !== t),
                  }))
                }
              >
                #{t} ✕
              </span>
            ))}
          </div>
        </div>

        <div className="chat-input">
          <div className="chat-input-wrapper">
            <label className="chat-input-action" title="Attach file">
              <span className="chat-input-icon">📎</span>
              <input
                type="file"
                multiple
                hidden
                accept=".txt,.pdf,.md"
                onChange={handleFileUpload}
              />
            </label>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Ask anything about your documents..."
              rows={1}
              style={{ overflowY: "auto", maxHeight: "120px" }}
            />
            {/* 
              <button className="chat-input-action" title="Voice Input">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              </button>
            */}
            <button
              className="chat-input-send"
              onClick={handleSend}
              disabled={thinking || !input.trim()}
              title="Send"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: "translate(1px, 1px)" }}
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
     
          </>
        )}
        {activeTab === "documents" && (
          <div className="full-width-doc-view" style={{ padding: "40px", width: "100%", maxWidth: "800px", margin: "0 auto", overflowY: "auto" }}>
            <h1 style={{ marginBottom: "24px", color: "var(--color-text-primary)", fontSize: "24px" }}>Documents</h1>
            {renderDocumentList()}
          </div>
        )}
        {(activeTab === "tags" || activeTab === "analytics" || activeTab === "settings") && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", flex: 1, color: "var(--color-text-secondary)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏗️</div>
            <h2 style={{ color: "var(--color-text-primary)", marginBottom: "8px", fontSize: "24px" }}>Coming Soon</h2>
            <p>The {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} feature is currently under development.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;




