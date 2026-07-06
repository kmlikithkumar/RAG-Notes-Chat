import sys

with open('c:/Users/admin/Downloads/rag-notes-chat/rag-app/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract lines 1061 to 1185 (0-indexed 1061 to 1185)
doc_list_lines = lines[1061:1185]

# Add 'const renderDocumentList = () => (' before line 728
# Line 729 is '  return ('
# We will insert it at line 728

insertion = ['  const renderDocumentList = () => (\n'] + doc_list_lines + ['  );\n\n']

# Replace the original doc list in the sidebar with a conditional
# We replace lines 1061 to 1185 with '          {activeTab === "chat" && renderDocumentList()}\n'
lines[1061:1185] = ['          {activeTab === "chat" && renderDocumentList()}\n']

# Now we need to modify the main chat panel (lines 1216 to 1591)
# Actually, the lines shifted because we inserted insertion (124 lines + 2) and removed 124 lines, 
# so the total length increased by 2.
# Let's find the main panel by string search.

content = "".join(lines)

# Insert the function
return_idx = content.find('  return (\n    <div className="app" data-theme={theme}>')
content = content[:return_idx] + "".join(insertion) + content[return_idx:]

main_panel_start = content.find('<main className="chat">')
main_panel_end = content.find('</main>', main_panel_start) + 7

original_main = content[main_panel_start:main_panel_end]

# We need to wrap the contents of <main> based on activeTab.
# The original_main looks like:
# <main className="chat">
#   <div className="chat-header">...</div>
#   <div className="stats-toolbar">...</div>
#   <div className="chat-messages">...</div>
#   <div className="chat-input">...</div>
# </main>

# Let's split after chat-header
chat_header_end = original_main.find('</div>\n\n', original_main.find('<div className="chat-header">')) + 8

header = original_main[:chat_header_end]
rest = original_main[chat_header_end:-8] # exclude </main>

new_main = header + '''
        {activeTab === "chat" && (
          <>
''' + rest + '''
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
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>??</div>
            <h2 style={{ color: "var(--color-text-primary)", marginBottom: "8px", fontSize: "24px" }}>Coming Soon</h2>
            <p>The {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} feature is currently under development.</p>
          </div>
        )}
      </main>'''

content = content[:main_panel_start] + new_main + content[main_panel_end:]

with open('c:/Users/admin/Downloads/rag-notes-chat/rag-app/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
