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
