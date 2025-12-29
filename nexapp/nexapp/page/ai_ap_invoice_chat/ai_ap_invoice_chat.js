frappe.pages['ai-ap-invoice-chat'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: ' ', // Empty title - we'll add the logo manually
    single_column: true
  });

  // Remove default page header and any Frappe padding
  $('.page-head').remove();
  
  // Remove any default Frappe padding from the page body
  $(page.body).css({
    'padding': '0',
    'margin': '0'
  });

  // -------------------- CSS --------------------
  const css = `
  * { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; 
  }

  :root {
    --primary: #E65100;
    --primary-dark: #BF360C;
    --primary-light: #FF9800;
    --primary-bg: #FFF3E0;
    --secondary: #FFB74D;
    --accent: #FF5722;
    --bg: #ffffff;
    --surface: #f8f9fa;
    --panel: #ffffff;
    --text: #1a1a1a;
    --text-secondary: #5D4037;
    --text-muted: #8D6E63;
    --user-bg: #FFF3E0;
    --bot-bg: #f8f9fa;
    --sidebar-bg: #FFF8E1;
    --sidebar-border: #FFE0B2;
    --shadow: 0 2px 8px rgba(230, 81, 0, 0.08);
    --shadow-hover: 0 4px 12px rgba(230, 81, 0, 0.12);
    --link: #E65100;
    --link-hover: #BF360C;
    --gradient: linear-gradient(135deg, #E65100 0%, #FF9800 100%);
  }
  
  /* COMPLETELY RESET ALL SPACING AROUND LOGO */
  .custom-header {
    padding: 0 !important;
    margin: 0 !important;
    height: 160px !important;
    min-height: 100px !important;
    display: flex !important;
    align-items: center !important;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    position: relative;
    overflow: hidden;
  }

  .custom-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--gradient);
    z-index: 1;
  }

  .logo-container {
    display: flex;
    align-items: center;
    padding: 0 !important;
    margin: 0 !important;
    height: 160px !important;
    width: 100%;
    justify-content: left;
    background: linear-gradient(to bottom, rgba(255, 248, 225, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
  }

  .logo-container img {
    height: 180px !important;
    width: auto !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
  }

  /* Remove any spacing from the main container */
  .gpt-root {
    min-height: calc(100vh - 160px) !important;
    background: var(--bg);
    border-radius: 0;
    overflow: hidden;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* ---------- MAIN LAYOUT CONTAINER ---------- */
  .main-container {
    display: flex;
    min-height: calc(100vh - 160px) !important;
    background: var(--bg);
    margin: 0 !important;
    padding: 0 !important;
  }

  /* ---------- SIDEBAR (LEFT PANEL) ---------- */
  .sidebar {
    width: 300px;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .task-panel {
    background: #ffffff;
    border-radius: 12px;
    padding: 16px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    flex: 1;
    border: 1px solid #FFE0B2;
  }

  .task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 16px;
    font-weight: 700;
    color: var(--primary-dark);
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #FFE0B2;
  }

  .refresh-btn {
    background: var(--primary);
    border: none;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: white;
    transition: all 0.2s ease;
    font-size: 16px;
    box-shadow: 0 2px 4px rgba(230, 81, 0, 0.2);
  }

  .refresh-btn:hover {
    background: var(--primary-dark);
    transform: rotate(90deg) scale(1.05);
    box-shadow: 0 4px 8px rgba(230, 81, 0, 0.3);
  }

  .task-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow: auto;
    flex: 1;
  }

  .task-item {
    margin: 8px 0;
    line-height: 1.2;
  }

  .task-link {
    text-decoration: none;
    color: var(--text-secondary);
    display: inline-block;
    padding: 12px 16px;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    border: 1px solid transparent;
    width: 100%;
    font-weight: 500;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .task-link:hover {
    color: var(--primary-dark);
    background: var(--primary-bg);
    border-color: var(--primary-light);
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
  }

  /* ---------- CONTENT AREA (RIGHT SIDE) ---------- */
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px;
    background: linear-gradient(to bottom, #ffffff 0%, #fafafa 100%);
  }

  /* ---------- HOME SCREEN ---------- */
  .gpt-home {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 32px;
  }

  /* ---------- CHAT SCREEN ---------- */
  .gpt-chat {
    display: none;
    flex-direction: column;
    flex: 1;
    height: 100%;
  }

  /* Main title */
  .gpt-title {
    font-size: 32px;
    font-weight: 300;
    color: var(--text);
    text-align: center;
    line-height: 1.3;
    margin-bottom: 8px;
    background: var(--gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .gpt-title.hidden {
    display: none;
  }

  /* Search/Input area */
  .gpt-search {
    width: min(800px, 90%);
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--panel);
    border-radius: 20px;
    padding: 12px 16px;
    box-shadow: var(--shadow);
    transition: all 0.2s ease;
    border: 1px solid #FFE0B2;
  }

  .gpt-search:focus-within {
    box-shadow: var(--shadow-hover);
    border-color: var(--primary);
  }

  .plus-btn {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--text-muted);
    background: transparent;
    cursor: pointer;
    user-select: none;
    font-size: 24px;
    font-weight: 300;
    transition: all 0.2s ease;
  }

  .plus-btn:hover {
    background: var(--primary-bg);
    color: var(--primary);
  }

  .home-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    min-height: 24px;
    background: transparent;
    color: var(--text);
  }

  .home-input::placeholder {
    color: var(--text-muted);
  }

  .send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    display: grid;
    place-items: center;
    cursor: pointer;
    background: var(--primary);
    color: #fff;
    opacity: 0;
    pointer-events: none;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(230, 81, 0, 0.2);
  }

  .send-btn.active {
    opacity: 1;
    pointer-events: auto;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(230, 81, 0, 0.3);
  }

  .send-btn:disabled {
    opacity: 0.4 !important;
    pointer-events: none !important;
    cursor: not-allowed !important;
  }

  .send-btn svg {
    width: 16px;
    height: 16px;
  }

  /* ---------- ITEM LIST BUTTON (Like DeepSeek) ---------- */
  .item-list-btn-container {
    width: min(800px, 90%);
    margin: 12px auto 0 auto;
    display: flex;
    justify-content: left;
  }

  .item-list-btn {
    background: transparent;
    border: 1px solid #d1d5db;
    border-radius: 16px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .item-list-btn:hover {
    background: var(--primary-bg);
    border-color: var(--primary-light);
    color: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(230, 81, 0, 0.1);
  }

  .item-list-btn:active {
    transform: translateY(0);
  }

  .item-list-icon {
    font-size: 16px;
  }

  /* ---------- FILE ATTACHMENT PREVIEW AREA ---------- */
  .attachment-preview-area {
    width: min(800px, 90%);
    margin: 0 auto 16px auto;
    display: none;
  }

  .attachment-preview-area.show {
    display: block;
  }

  .attachment-preview {
    background: var(--primary-bg);
    border: 1px dashed var(--primary-light);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
  }

  .file-preview-item {
    background: white;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #FFE0B2;
    box-shadow: var(--shadow);
    max-width: 200px;
    position: relative;
  }

  .file-preview-item.image-preview {
    padding: 8px;
  }

  .file-preview-image {
    max-width: 180px;
    max-height: 120px;
    border-radius: 6px;
    display: block;
  }

  .file-preview-info {
    margin-top: 8px;
  }

  .file-preview-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .file-preview-size {
    font-size: 11px;
    color: var(--text-muted);
  }

  .file-preview-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    border: none;
    font-size: 12px;
    cursor: pointer;
    display: grid;
    place-items: center;
    opacity: 0;
    transition: all 0.2s ease;
  }

  .file-preview-item:hover .file-preview-remove {
    opacity: 1;
  }

  .file-preview-remove:hover {
    background: var(--primary-dark);
    transform: scale(1.1);
  }

  /* ---------- FILE ATTACHMENT MODAL ---------- */
  .file-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  .file-modal {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid #FFE0B2;
    overflow: hidden;
    max-width: 900px;
    width: 90vw;
    max-height: 80vh;
    height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .file-modal-header {
    background: var(--gradient);
    padding: 20px 24px;
    color: white;
    flex-shrink: 0;
  }

  .file-modal-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .file-modal-subtitle {
    font-size: 14px;
    opacity: 0.9;
    margin: 0;
  }

  .file-modal-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .file-sidebar {
    width: 250px;
    background: var(--sidebar-bg);
    border-right: 1px solid #FFE0B2;
    padding: 16px;
    overflow-y: auto;
  }

  .file-main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .file-search-container {
    padding: 16px 24px;
    background: var(--primary-bg);
    border-bottom: 1px solid #FFE0B2;
    flex-shrink: 0;
  }

  .file-search {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #FFE0B2;
    border-radius: 12px;
    font-size: 14px;
    background: white;
    color: var(--text);
    transition: all 0.2s ease;
  }

  .file-search:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(230, 81, 0, 0.1);
  }

  .file-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .file-table {
    width: 100%;
    border-collapse: collapse;
  }

  .file-table th {
    background: var(--sidebar-bg);
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--primary-dark);
    font-size: 13px;
    border-bottom: 2px solid #FFE0B2;
    position: sticky;
    top: 0;
  }

  .file-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .file-table tr {
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .file-table tr:hover {
    background: var(--primary-bg);
  }

  .file-table tr.selected {
    background: rgba(230, 81, 0, 0.1);
    border-left: 3px solid var(--primary);
  }

  .file-name {
    font-weight: 600;
    color: var(--primary-dark);
  }

  .file-location {
    color: var(--text-secondary);
  }

  .file-size {
    color: var(--text-muted);
  }

  .file-type {
    color: var(--primary);
    font-weight: 500;
  }

  .file-modal-footer {
    padding: 16px 24px;
    background: var(--surface);
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .selected-file-count {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .file-modal-actions {
    display: flex;
    gap: 8px;
  }

  .file-modal-btn {
    padding: 8px 16px;
    border: 1px solid #FFE0B2;
    border-radius: 8px;
    background: white;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .file-modal-btn:hover {
    background: var(--primary-bg);
    color: var(--primary-dark);
  }

  .file-modal-btn.primary {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .file-modal-btn.primary:hover {
    background: var(--primary-dark);
  }

  .no-files {
    padding: 40px 24px;
    text-align: center;
    color: var(--text-muted);
  }

  .no-files-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .sidebar-section {
    margin-bottom: 20px;
  }

  .sidebar-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-dark);
    margin-bottom: 8px;
    padding-left: 8px;
  }

  .sidebar-item {
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .sidebar-item:hover {
    background: var(--primary-bg);
    color: var(--primary-dark);
  }

  .sidebar-item.active {
    background: var(--primary);
    color: white;
  }

  /* ---------- CUSTOM MODAL OVERLAY ---------- */
  .custom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  /* ---------- BEAUTIFUL ITEM LIST POPUP ---------- */
  .item-list-popup {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid #FFE0B2;
    overflow: hidden;
    max-width: 800px;
    width: 90vw;
    max-height: 70vh !important;
    height: 70vh !important;
    display: flex;
    flex-direction: column;
  }

  .item-list-header {
    background: var(--gradient);
    padding: 20px 24px;
    color: white;
    flex-shrink: 0;
  }

  .item-list-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .item-list-subtitle {
    font-size: 14px;
    opacity: 0.9;
    margin: 0;
  }

  .item-list-search-container {
    padding: 16px 24px;
    background: var(--primary-bg);
    border-bottom: 1px solid #FFE0B2;
    flex-shrink: 0;
  }

  .item-list-search {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #FFE0B2;
    border-radius: 12px;
    font-size: 14px;
    background: white;
    color: var(--text);
    transition: all 0.2s ease;
  }

  .item-list-search:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(230, 81, 0, 0.1);
  }

  .item-list-search::placeholder {
    color: var(--text-muted);
  }

  .item-list-content {
    max-height: 45vh !important;
    height: 45vh !important;
    overflow-y: auto;
    padding: 0;
    flex: 1;
  }

  .item-list-table {
    width: 100%;
    border-collapse: collapse;
  }

  .item-list-table th {
    background: var(--sidebar-bg);
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--primary-dark);
    font-size: 13px;
    border-bottom: 2px solid #FFE0B2;
    position: sticky;
    top: 0;
  }

  .item-list-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .item-list-table tr {
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .item-list-table tr:hover {
    background: var(--primary-bg);
  }

  .item-list-table tr.selected {
    background: rgba(230, 81, 0, 0.1);
    border-left: 3px solid var(--primary);
  }

  .item-code {
    font-weight: 600;
    color: var(--primary-dark);
  }

  .item-name {
    color: var(--text);
  }

  .item-list-footer {
    padding: 16px 24px;
    background: var(--surface);
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .selected-count {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .item-list-actions {
    display: flex;
    gap: 8px;
  }

  .item-list-action-btn {
    padding: 8px 16px;
    border: 1px solid #FFE0B2;
    border-radius: 8px;
    background: white;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .item-list-action-btn:hover {
    background: var(--primary-bg);
    color: var(--primary-dark);
  }

  .item-list-action-btn.primary {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .item-list-action-btn.primary:hover {
    background: var(--primary-dark);
  }

  .no-items {
    padding: 40px 24px;
    text-align: center;
    color: var(--text-muted);
  }

  .no-items-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  /* ---------- COLLAPSIBLE INSTRUCTION PANEL ---------- */
  .instruction-panel {
    background: var(--primary-bg);
    border: 1px solid var(--primary-light);
    border-radius: 12px;
    padding: 0;
    margin: 16px 0;
    animation: fadeIn 0.3s ease;
    box-shadow: var(--shadow);
    overflow: hidden;
    width: min(800px, 90%);
  }

  .instruction-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--primary-light);
    border-bottom: 1px solid var(--primary);
    cursor: pointer;
  }

  .instruction-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--primary-dark);
    font-size: 16px;
    font-weight: 600;
  }

  .instruction-title:before {
    content: "📋";
    font-size: 18px;
  }

  .instruction-actions {
    display: flex;
    gap: 8px;
  }

  .instruction-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    display: grid;
    place-items: center;
    cursor: pointer;
    background: rgba(255,255,255,0.7);
    color: var(--primary-dark);
    transition: all 0.2s ease;
    font-size: 14px;
    font-weight: bold;
  }

  .instruction-btn:hover {
    background: rgba(255,255,255,0.9);
    transform: scale(1.1);
  }

  .instruction-content {
    padding: 20px;
    color: var(--text-secondary);
  }

  .instruction-content.collapsed {
    display: none;
  }

  .instruction-panel ul {
    margin: 16px 0;
    padding-left: 20px;
  }

  .instruction-panel li {
    margin: 10px 0;
    line-height: 1.5;
    padding-left: 8px;
  }

  .instruction-panel li:before {
    content: "•";
    color: var(--primary);
    font-weight: bold;
    display: inline-block;
    width: 1em;
    margin-left: -1em;
  }

  .instruction-panel em {
    color: var(--primary-dark);
    font-style: italic;
    display: block;
    margin-top: 16px;
    padding: 12px 16px;
    background: rgba(255, 152, 0, 0.1);
    border-radius: 8px;
    border-left: 4px solid var(--primary);
  }

  /* ---------- CHAT AREA (FIXED LAYOUT) ---------- */
  .chat-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    background: var(--bg);
  }

  /* Thread area - scrollable messages */
  .thread {
    flex: 1;
    padding: 0 0 24px 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow-y: auto;
    overflow-x: hidden;
    max-height: calc(100vh - 280px);
  }

  .msg {
    position: relative;
    max-width: 85%;
    color: var(--text);
    border-radius: 18px;
    padding: 16px 20px;
    line-height: 1.5;
    font-size: 15px;
    word-wrap: break-word;
    animation: fadeIn 0.3s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .msg.user {
    align-self: flex-end;
    background: var(--user-bg);
    border-bottom-right-radius: 6px;
    border: 1px solid #FFE0B2;
  }

  .msg.bot {
    align-self: flex-start;
    background: var(--bot-bg);
    border-bottom-left-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .msg .time { display: none !important; }

  /* ---------- MESSAGE WITH FILE ATTACHMENTS ---------- */
  .msg-with-files {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .file-attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .file-attachment-item {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 243, 224, 0.7);
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 13px;
    border: 1px solid #FFE0B2;
    max-width: 200px;
  }

  .file-attachment-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .file-attachment-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-secondary);
    font-weight: 500;
  }

  /* ---------- MESSAGE FOOTER ACTIONS ---------- */
  .msg-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .msg:hover .msg-footer {
    opacity: 1;
  }

  .icon-btn {
    border: none;
    background: rgba(255,255,255,0.8);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    color: var(--primary);
  }

  .icon-btn:hover {
    background: var(--primary-bg);
    transform: scale(1.1);
  }

  .icon-btn svg {
    width: 14px;
    height: 14px;
    color: var(--primary);
  }

  /* ---------- TYPING INDICATOR ---------- */
  .typing {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary);
    animation: bounce 1.4s infinite ease-in-out;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }
  .dot:nth-child(3) { animation-delay: 0s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }

  /* ---------- COMPOSER (FIXED AT BOTTOM) ---------- */
  .composer {
    background: var(--bg);
    padding: 20px 0 0 0;
    border-top: 1px solid rgba(0,0,0,0.08);
    flex-shrink: 0;
  }

  .composer-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    background: var(--panel);
    border-radius: 20px;
    padding: 12px 16px;
    box-shadow: var(--shadow);
    border: 1px solid #FFE0B2;
    width: min(800px, 90%);
    margin: 0 auto;
  }

  .chat-input {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    min-height: 24px;
    max-height: 120px;
    font-size: 15px;
    background: transparent;
    color: var(--text);
    line-height: 1.5;
  }

  .chat-input::placeholder {
    color: var(--text-muted);
  }

  /* ---------- ATTACHMENT PREVIEW ---------- */
  .attachment-msg {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .attachment-msg a {
    color: var(--primary);
    font-weight: 500;
    text-decoration: none;
  }

  .attachment-msg a:hover {
    text-decoration: underline;
  }

  /* ---------- CODE BLOCKS ---------- */
  pre {
    background: rgba(230, 81, 0, 0.05);
    border-radius: 8px;
    padding: 12px;
    overflow-x: auto;
    margin: 8px 0;
    font-size: 14px;
    border-left: 3px solid var(--primary);
  }

  code {
    background: rgba(230, 81, 0, 0.05);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 14px;
    font-family: 'Monaco', 'Menlo', monospace;
    color: var(--primary-dark);
  }

  pre code {
    background: none;
    padding: 0;
  }

  /* ---------- SCROLLBAR ---------- */
  .thread::-webkit-scrollbar {
    width: 6px;
  }

  .thread::-webkit-scrollbar-track {
    background: transparent;
  }

  .thread::-webkit-scrollbar-thumb {
    background: rgba(230, 81, 0, 0.2);
    border-radius: 3px;
  }

  .thread::-webkit-scrollbar-thumb:hover {
    background: rgba(230, 81, 0, 0.4);
  }

  .item-list-content::-webkit-scrollbar {
    width: 6px;
  }

  .item-list-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .item-list-content::-webkit-scrollbar-thumb {
    background: rgba(230, 81, 0, 0.2);
    border-radius: 3px;
  }

  .item-list-content::-webkit-scrollbar-thumb:hover {
    background: rgba(230, 81, 0, 0.4);
  }

  /* Responsive: stack on small screens */
  @media (max-width: 992px) {
    .custom-header {
      height: 100px !important;
      min-height: 100px !important;
    }
    
    .logo-container {
      height: 100px !important;
    }
    
    .logo-container img {
      height: 80px !important;
    }
    
    .main-container { 
      flex-direction: column; 
      min-height: calc(100vh - 100px) !important;
    }
    
    .gpt-root {
      min-height: calc(100vh - 100px) !important;
    }
    
    .sidebar { 
      width: 100%; 
      height: auto; 
    }
    
    .task-panel { 
      min-height: auto; 
    }
    
    .thread { 
      max-height: calc(100vh - 320px); 
    }

    .item-list-popup {
      max-height: 80vh !important;
      height: 80vh !important;
    }

    .item-list-content {
      max-height: 55vh !important;
      height: 55vh !important;
    }

    .file-modal {
      max-width: 95vw;
      width: 95vw;
    }

    .file-sidebar {
      width: 200px;
    }

    .file-preview-item {
      max-width: 150px;
    }

    .file-preview-image {
      max-width: 130px;
      max-height: 100px;
    }
  }

  /* OVERRIDE ANY FRAPPE DEFAULT PADDING */
  .layout-main-section {
    padding: 0 !important;
    margin: 0 !important;
  }

  .page-container {
    padding: 0 !important;
    margin: 0 !important;
  }

  .page-content {
    padding: 0 !important;
    margin: 0 !important;
  }
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);

  // -------------------- DOM STRUCTURE --------------------
  
  // First, clear any existing content and reset page body
  $(page.body).empty().css({
    'padding': '0',
    'margin': '0',
    'overflow': 'hidden'
  });

  const root = $(`<div class="gpt-root"></div>`).appendTo(page.body);

  // Create custom header for logo - positioned to the left
  const $customHeader = $(`
    <div class="custom-header">
      <div class="logo-container">
        <img src="/assets/nexapp/images/ai automation_transparent-c.png">
      </div>
    </div>
  `);

  // Insert custom header as the first element
  $(page.body).prepend($customHeader);

  const mainContainer = $(`
    <div class="main-container">
      <!-- LEFT SIDEBAR -->
      <aside class="sidebar">
        <div class="task-panel">
          <div class="task-header">
            <span id="task-header">Department: —</span>
            <button class="refresh-btn" title="Refresh & Reset">↻</button>
          </div>
          <ul class="task-list" id="task-list"></ul>
        </div>
      </aside>

      <!-- RIGHT CONTENT AREA -->
      <div class="content-area">
        <!-- HOME SCREEN -->
        <div class="gpt-home" id="home">
          <div class="gpt-title" id="gpt-title">How can I help you today?</div>
          <!-- Instruction panel will be dynamically added here -->
          <div class="gpt-search">
            <div id="home-plus" class="plus-btn">+</div>
            <input id="home-input" class="home-input" placeholder="Message AI Automation - We Automate What You Do Daily" />
            <button id="home-send" class="send-btn">
              <svg viewBox="0 0 24 24" fill="none"><path d="M6 12l12-6-6 12-1-5-5-1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          
          <!-- ITEM LIST BUTTON FOR HOME SCREEN -->
          <div class="item-list-btn-container">
            <button class="item-list-btn" id="home-item-list-btn">
              <span class="item-list-icon">💡</span>
              <span>Item List</span>
            </button>
          </div>
        </div>

        <!-- CHAT SCREEN -->
        <div class="gpt-chat" id="chat">
          <div class="chat-area">
            <div id="thread" class="thread"></div>
            
            <!-- ATTACHMENT PREVIEW AREA -->
            <div class="attachment-preview-area" id="attachment-preview-area">
              <div class="attachment-preview" id="attachment-preview"></div>
            </div>
            
            <!-- Instruction panel will be dynamically added here in chat -->
            <div class="composer">
              <div class="composer-row">
                <div id="chat-plus" class="plus-btn">+</div>
                <textarea id="input" class="chat-input" rows="1" placeholder="Message AI Assistant..."></textarea>
                <button id="send" class="send-btn">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M6 12l12-6-6 12-1-5-5-1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              
              <!-- ITEM LIST BUTTON FOR CHAT SCREEN -->
              <div class="item-list-btn-container">
                <button class="item-list-btn" id="chat-item-list-btn">
                  <span class="item-list-icon">📋</span>
                  <span>Item List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  root.append(mainContainer);

  // -------------------- File Attachment Functionality --------------------

  let selectedItems = [];
  let currentItems = [];
  let currentModal = null;
  let selectedFiles = [];
  let currentFiles = [];
  let attachedFiles = [];

  // Function to handle item list button click
  function handleItemListButtonClick() {
    selectedItems = [];
    showItemListPopup();
  }

  // Function to show beautiful item list popup using custom modal
  function showItemListPopup() {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Item",
        fields: ["item_code", "item_name"],
        limit_page_length: 100
      },
      callback: function(r) {
        if (r.message) {
          currentItems = r.message;
          openItemListModal(currentItems);
        }
      }
    });
  }

  // Function to open item list modal (completely custom, no Frappe dialog)
  function openItemListModal(items) {
    // Close any existing modal first
    closeItemListModal();

    // Create modal overlay
    currentModal = $(`
      <div class="custom-modal-overlay">
        <div class="item-list-popup">
          <div class="item-list-header">
            <div class="item-list-title">
              <span>💡</span>
              Select Items
            </div>
            <div class="item-list-subtitle">Choose data to include in your message</div>
          </div>
          
          <div class="item-list-search-container">
            <input type="text" class="item-list-search" placeholder="Search records by name or code..." id="item-search-input">
          </div>
          
          <div class="item-list-content" id="item-list-content">
            ${renderItemList(items)}
          </div>
          
          <div class="item-list-footer">
            <div class="selected-count" id="selected-count">0 items selected</div>
            <div class="item-list-actions">
              <button class="item-list-action-btn" id="clear-selection-btn">Clear</button>
              <button class="item-list-action-btn primary" id="add-to-input-btn">Add to Input</button>
              <button class="item-list-action-btn" id="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `);

    // Add modal to body
    $('body').append(currentModal);

    // Add event handlers
    $('#item-search-input').on('input', function() {
      const searchTerm = $(this).val().toLowerCase();
      const filteredItems = currentItems.filter(item => 
        (item.item_name && item.item_name.toLowerCase().includes(searchTerm)) ||
        (item.item_code && item.item_code.toLowerCase().includes(searchTerm))
      );
      $('#item-list-content').html(renderItemList(filteredItems));
      attachItemClickHandlers();
    });

    $('#clear-selection-btn').on('click', function() {
      selectedItems = [];
      $('.item-list-table tr').removeClass('selected');
      updateSelectedCount();
    });

    $('#add-to-input-btn').on('click', function() {
      addSelectedItemsToInput();
      closeItemListModal();
    });

    $('#cancel-btn').on('click', function() {
      closeItemListModal();
    });

    // Close modal when clicking outside
    currentModal.on('click', function(e) {
      if (e.target === this) {
        closeItemListModal();
      }
    });

    // Close modal with Escape key
    $(document).on('keydown.itemListModal', function(e) {
      if (e.key === 'Escape') {
        closeItemListModal();
      }
    });

    attachItemClickHandlers();
    updateSelectedCount();
    
    // Focus search input
    setTimeout(() => $('#item-search-input').focus(), 100);
  }

  // Function to close modal
  function closeItemListModal() {
    if (currentModal) {
      currentModal.remove();
      currentModal = null;
    }
    $(document).off('keydown.itemListModal');
  }

  // Function to render item list table (only 2 columns)
  function renderItemList(items) {
    if (items.length === 0) {
      return `
        <div class="no-items">
          <div class="no-items-icon">💡</div>
          <div>No items found</div>
        </div>
      `;
    }

    let tableHTML = `
      <table class="item-list-table">
        <thead>
          <tr>
            <th style="width: 40%">Item Code</th>
            <th style="width: 60%">Item Name</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach(item => {
      const isSelected = selectedItems.some(selected => selected.item_code === item.item_code);
      tableHTML += `
        <tr data-item-code="${item.item_code}" class="${isSelected ? 'selected' : ''}">
          <td>
            <div class="item-code">${item.item_code || ''}</div>
          </td>
          <td>
            <div class="item-name">${item.item_name || ''}</div>
          </td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    return tableHTML;
  }

  // Function to attach click handlers to items
  function attachItemClickHandlers() {
    $('.item-list-table tr').off('click').on('click', function() {
      const itemCode = $(this).data('item-code');
      const item = currentItems.find(item => item.item_code === itemCode);
      
      if (item) {
        const index = selectedItems.findIndex(selected => selected.item_code === itemCode);
        
        if (index > -1) {
          // Remove from selection
          selectedItems.splice(index, 1);
          $(this).removeClass('selected');
        } else {
          // Add to selection
          selectedItems.push(item);
          $(this).addClass('selected');
        }
        
        updateSelectedCount();
      }
    });
  }

  // Function to update selected count
  function updateSelectedCount() {
    const count = selectedItems.length;
    $('#selected-count').text(`${count} item${count !== 1 ? 's' : ''} selected`);
  }

  // Function to add selected items to input
  function addSelectedItemsToInput() {
    if (selectedItems.length > 0) {
      const itemText = selectedItems.map(item => 
        `${item.item_code} - ${item.item_name}`
      ).join(', ');
      
      // Get current input value and append items
      let currentInput = '';
      if ($('#home').is(':visible')) {
        currentInput = $('#home-input').val().trim();
        if (currentInput) {
          $('#home-input').val(currentInput + ', ' + itemText);
        } else {
          $('#home-input').val(itemText);
        }
        $('#home-input').trigger('input').focus();
      } else {
        currentInput = $('#input').val().trim();
        if (currentInput) {
          $('#input').val(currentInput + ', ' + itemText);
        } else {
          $('#input').val(itemText);
        }
        $('#input').trigger('input').focus();
      }
      
      frappe.show_alert({ 
        message: `Added ${selectedItems.length} item(s) to input`, 
        indicator: 'green' 
      });
    }
  }

  // -------------------- File Attachment Modal --------------------

  function showFileAttachmentModal() {
    // Sample file data - in real implementation, you would fetch this from server
    const sampleFiles = [
      { name: "Screenshot from 2025-11-01.png", location: "Pictures/Screenshots", size: "213.4 kB", type: "Image", time: "22:38" },
      { name: "Screenshot from 2025-11-02.png", location: "Pictures/Screenshots", size: "213.1 kB", type: "Image", time: "22:31" },
      { name: "Screenshot from 2025-11-03.png", location: "Pictures/Screenshots", size: "206.2 kB", type: "Image", time: "22:31" },
      { name: "invoice.pdf", location: "Documents", size: "1.2 MB", type: "PDF", time: "21:15" },
      { name: "receipt.jpg", location: "Downloads", size: "456.7 kB", type: "Image", time: "20:45" },
      { name: "contract.docx", location: "Documents", size: "345.8 kB", type: "Document", time: "19:30" }
    ];

    currentFiles = sampleFiles;
    selectedFiles = [];
    openFileModal(sampleFiles);
  }

  function openFileModal(files) {
    closeFileModal();

    currentModal = $(`
      <div class="file-modal-overlay">
        <div class="file-modal">
          <div class="file-modal-header">
            <div class="file-modal-title">
              <span>📁</span>
              Open File
            </div>
            <div class="file-modal-subtitle">Select files to attach to your message</div>
          </div>
          
          <div class="file-modal-content">
            <div class="file-sidebar">
              <div class="sidebar-section">
                <div class="sidebar-title">Places</div>
                <div class="sidebar-item active" data-location="all">Recent</div>
                <div class="sidebar-item" data-location="home">Home</div>
                <div class="sidebar-item" data-location="desktop">Desktop</div>
                <div class="sidebar-item" data-location="documents">Documents</div>
                <div class="sidebar-item" data-location="downloads">Downloads</div>
                <div class="sidebar-item" data-location="pictures">Pictures</div>
              </div>
              
              <div class="sidebar-section">
                <div class="sidebar-title">File Type</div>
                <div class="sidebar-item" data-type="all">All Files</div>
                <div class="sidebar-item" data-type="image">Images</div>
                <div class="sidebar-item" data-type="pdf">PDFs</div>
                <div class="sidebar-item" data-type="document">Documents</div>
              </div>
            </div>
            
            <div class="file-main-content">
              <div class="file-search-container">
                <input type="text" class="file-search" placeholder="Search files..." id="file-search-input">
              </div>
              
              <div class="file-list-container" id="file-list-container">
                ${renderFileList(files)}
              </div>
            </div>
          </div>
          
          <div class="file-modal-footer">
            <div class="selected-file-count" id="selected-file-count">0 files selected</div>
            <div class="file-modal-actions">
              <button class="file-modal-btn" id="file-cancel-btn">Cancel</button>
              <button class="file-modal-btn primary" id="file-insert-btn">Insert</button>
            </div>
          </div>
        </div>
      </div>
    `);

    $('body').append(currentModal);

    // Add event handlers
    $('#file-search-input').on('input', function() {
      const searchTerm = $(this).val().toLowerCase();
      const filteredFiles = currentFiles.filter(file => 
        file.name.toLowerCase().includes(searchTerm) ||
        file.location.toLowerCase().includes(searchTerm)
      );
      $('#file-list-container').html(renderFileList(filteredFiles));
      attachFileClickHandlers();
    });

    $('.sidebar-item').on('click', function() {
      $('.sidebar-item').removeClass('active');
      $(this).addClass('active');
      
      const location = $(this).data('location');
      const type = $(this).data('type');
      
      let filteredFiles = currentFiles;
      
      if (location && location !== 'all') {
        filteredFiles = filteredFiles.filter(file => 
          file.location.toLowerCase().includes(location)
        );
      }
      
      if (type && type !== 'all') {
        filteredFiles = filteredFiles.filter(file => 
          file.type.toLowerCase().includes(type)
        );
      }
      
      $('#file-list-container').html(renderFileList(filteredFiles));
      attachFileClickHandlers();
    });

    $('#file-cancel-btn').on('click', function() {
      closeFileModal();
    });

    $('#file-insert-btn').on('click', function() {
      attachSelectedFiles();
      closeFileModal();
    });

    // Close modal when clicking outside
    currentModal.on('click', function(e) {
      if (e.target === this) {
        closeFileModal();
      }
    });

    // Close modal with Escape key
    $(document).on('keydown.fileModal', function(e) {
      if (e.key === 'Escape') {
        closeFileModal();
      }
    });

    attachFileClickHandlers();
    updateSelectedFileCount();
    
    // Focus search input
    setTimeout(() => $('#file-search-input').focus(), 100);
  }

  function closeFileModal() {
    if (currentModal) {
      currentModal.remove();
      currentModal = null;
    }
    $(document).off('keydown.fileModal');
  }

  function renderFileList(files) {
    if (files.length === 0) {
      return `
        <div class="no-files">
          <div class="no-files-icon">📁</div>
          <div>No files found</div>
        </div>
      `;
    }

    let tableHTML = `
      <table class="file-table">
        <thead>
          <tr>
            <th style="width: 40%">Name</th>
            <th style="width: 25%">Location</th>
            <th style="width: 15%">Size</th>
            <th style="width: 10%">Type</th>
            <th style="width: 10%">Time</th>
          </tr>
        </thead>
        <tbody>
    `;

    files.forEach((file, index) => {
      const isSelected = selectedFiles.some(selected => selected.name === file.name);
      tableHTML += `
        <tr data-file-index="${index}" class="${isSelected ? 'selected' : ''}">
          <td>
            <div class="file-name">${file.name}</div>
          </td>
          <td>
            <div class="file-location">${file.location}</div>
          </td>
          <td>
            <div class="file-size">${file.size}</div>
          </td>
          <td>
            <div class="file-type">${file.type}</div>
          </td>
          <td>
            <div class="file-time">${file.time}</div>
          </td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    return tableHTML;
  }

  function attachFileClickHandlers() {
    $('.file-table tr').off('click').on('click', function() {
      const fileIndex = $(this).data('file-index');
      const file = currentFiles[fileIndex];
      
      if (file) {
        const index = selectedFiles.findIndex(selected => selected.name === file.name);
        
        if (index > -1) {
          // Remove from selection
          selectedFiles.splice(index, 1);
          $(this).removeClass('selected');
        } else {
          // Add to selection
          selectedFiles.push(file);
          $(this).addClass('selected');
        }
        
        updateSelectedFileCount();
      }
    });
  }

  function updateSelectedFileCount() {
    const count = selectedFiles.length;
    $('#selected-file-count').text(`${count} file${count !== 1 ? 's' : ''} selected`);
  }

  function attachSelectedFiles() {
    if (selectedFiles.length > 0) {
      // Add files to attached files array
      attachedFiles = [...attachedFiles, ...selectedFiles];
      
      // Update preview area
      updateAttachmentPreview();
      
      frappe.show_alert({ 
        message: `Attached ${selectedFiles.length} file(s)`, 
        indicator: 'green' 
      });
    }
  }

  function updateAttachmentPreview() {
    const $previewArea = $('#attachment-preview-area');
    const $previewContainer = $('#attachment-preview');
    
    if (attachedFiles.length === 0) {
      $previewArea.removeClass('show');
      return;
    }
    
    $previewArea.addClass('show');
    $previewContainer.empty();
    
    attachedFiles.forEach((file, index) => {
      const isImage = file.type === 'Image';
      
      const filePreview = `
        <div class="file-preview-item ${isImage ? 'image-preview' : ''}" data-file-index="${index}">
          ${isImage ? `
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='120' viewBox='0 0 180 120'%3E%3Crect width='180' height='120' fill='%23FFF3E0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%23E65100'%3E${encodeURIComponent(file.name)}%3C/text%3E%3C/svg%3E" 
                 alt="${file.name}" class="file-preview-image">
          ` : `
            <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">📄</div>
          `}
          <div class="file-preview-info">
            <div class="file-preview-name">${file.name}</div>
            <div class="file-preview-size">${file.size}</div>
          </div>
          <button class="file-preview-remove" title="Remove file">×</button>
        </div>
      `;
      
      $previewContainer.append(filePreview);
    });
    
    // Add remove handlers
    $('.file-preview-remove').on('click', function() {
      const $previewItem = $(this).closest('.file-preview-item');
      const fileIndex = $previewItem.data('file-index');
      
      // Remove from attached files
      attachedFiles.splice(fileIndex, 1);
      
      // Update preview
      updateAttachmentPreview();
    });
  }

  // Event listeners for item list buttons
  $('#home-item-list-btn, #chat-item-list-btn').on('click', handleItemListButtonClick);

  // -------------------- Data helpers --------------------
  // Static task list per department. You can expand later.
  function getTasksForDepartment(dept) {
    // Default (Accounts) – your confirmed list
    const accountsTasks = [
      "Creating a Purchase Invoice from Supplier PDF",
      "Creating a Payment Entry from Invoice",
      "Vendor Ledger Summary",
      "Generate Supplier Outstanding Report",
      "Release Purchase Order"
    ];

    // Map known departments if you want custom lists later
    const map = {
      "Accounts": accountsTasks,
      // "Sales": [...],
      // "Operations": [...],
    };

    return map[dept] || accountsTasks;
  }

  function renderTasks(dept, company) {
    // Remove company name from display - only show department
    const headerText = `Department: ${dept || '—'}`;
    $('#task-header').text(headerText);

    const tasks = getTasksForDepartment(dept);

    // Render tasks for home page
    const $homeList = $('#task-list').empty();
    tasks.forEach((t) => {
      const $li = $('<li class="task-item"></li>');
      const $a = $(`<a class="task-link" href="javascript:void(0)">${t}</a>`);
      $a.on('click', () => {
        // Update input field with selected task - FIXED
        const selectedTask = t;
        $('#home-input').val(selectedTask).trigger('input').focus();
        
        // Auto-switch to chat if we're on home screen
        if ($('#home').is(':visible')) {
          if (selectedTask === "Creating a Purchase Invoice from Supplier PDF") {
            showPurchaseInvoiceInstructions('home');
          } else {
            hideInstructions('home');
          }
        } else {
          // We're in chat, update chat input
          $('#input').val(selectedTask).trigger('input').focus();
          if (selectedTask === "Creating a Purchase Invoice from Supplier PDF") {
            showPurchaseInvoiceInstructions('chat');
          } else {
            hideInstructions('chat');
          }
        }
      });
      $li.append($a);
      $homeList.append($li);
    });
  }

  // Function to show purchase invoice instructions
  function showPurchaseInvoiceInstructions(context) {
    const panelId = 'instruction-panel-' + (context === 'home' ? 'home' : 'chat');
    
    // Remove any existing instruction panel
    $('#' + panelId).remove();

    const instructions = `
      <div class="instruction-panel" id="${panelId}">
        <div class="instruction-header">
          <div class="instruction-title">Instructions for Creating Purchase Invoice</div>
          <div class="instruction-actions">
            <button class="instruction-btn minimize-btn" title="Minimize">−</button>
            <button class="instruction-btn close-btn" title="Close">×</button>
          </div>
        </div>
        <div class="instruction-content">
          <ul>
            <li>Attach the supplier Invoice using the '+' button</li>
            <li>AI will extract the details from the supplier's invoice and show them on the screen for your confirmation</li>
            <li>Once you confirm, it will automatically create the purchase invoice</li>
            <li>Please specify the Item code/name in your message</li>
          </ul>
          <em>You can now attach the supplier invoice and provide item details.</em>
        </div>
      </div>
    `;

    if (context === 'home') {
      // Hide the greeting title
      $('#gpt-title').addClass('hidden');
      
      // Add instruction panel above the search box
      $('.gpt-search').before(instructions);
    } else if (context === 'chat') {
      // Add instruction panel above the composer (between messages and input)
      $('.composer').before(instructions);
    }

    // Add event handlers for the new panel
    $('#' + panelId + ' .minimize-btn').on('click', function(e) {
      e.stopPropagation();
      const $content = $(this).closest('.instruction-panel').find('.instruction-content');
      $content.toggleClass('collapsed');
      $(this).text($content.hasClass('collapsed') ? '+' : '−');
    });

    $('#' + panelId + ' .close-btn').on('click', function(e) {
      e.stopPropagation();
      $(this).closest('.instruction-panel').remove();
      
      // Show greeting title again if we're on home screen
      if (context === 'home') {
        $('#gpt-title').removeClass('hidden');
      }
    });

    // Click header to toggle collapse
    $('#' + panelId + ' .instruction-header').on('click', function() {
      const $content = $(this).closest('.instruction-panel').find('.instruction-content');
      const $minimizeBtn = $(this).find('.minimize-btn');
      $content.toggleClass('collapsed');
      $minimizeBtn.text($content.hasClass('collapsed') ? '+' : '−');
    });
  }

  // Function to hide instructions and show greeting
  function hideInstructions(context) {
    const panelId = 'instruction-panel-' + (context === 'home' ? 'home' : 'chat');
    $('#' + panelId).remove();
    
    if (context === 'home') {
      $('#gpt-title').removeClass('hidden');
    }
  }

  // Function to reset everything
  function resetEverything() {
    // Clear all messages
    $('#thread').empty();
    
    // Clear input fields
    $('#home-input').val('').trigger('input');
    $('#input').val('').trigger('input');
    
    // Remove all instruction panels
    $('.instruction-panel').remove();
    
    // Reset attached files
    attachedFiles = [];
    updateAttachmentPreview();
    
    // Reset to home screen
    $('#chat').hide();
    $('#home').show();
    $('#gpt-title').removeClass('hidden');
    
    // Reset busy state
    isBusy = false;
    pendingQuestion = "";
    
    // Reset send buttons
    $send.removeClass('active').prop('disabled', false);
    $homeSend.removeClass('active').prop('disabled', false);
    
    // Focus on home input
    setTimeout(() => $('#home-input').focus(), 50);
    
    // Show success message
    frappe.show_alert({ message: 'Chat reset successfully!', indicator: 'green' });
  }

  // ✅ Personalized greeting + Department/Company fetch
  Promise.all([
    frappe.db.get_value('User', frappe.session.user, 'first_name'),
    frappe.db.get_value('Employee', { user_id: frappe.session.user }, ['department', 'company'])
  ]).then(([userRes, empRes]) => {
    const firstName = (userRes?.message?.first_name || '').trim();
    if (firstName) {
      $('#gpt-title').text(`${firstName}, how can I help you today?`);
    }

    const dept = empRes?.message?.department || '';
    const comp = empRes?.message?.company || '';
    renderTasks(dept, comp);
  }).catch(() => {
    renderTasks('', '');
  });

  // -------------------- Logic --------------------
  const $thread = $('#thread');
  const $input = $('#input');
  const $send = $('#send');
  const $homeInput = $('#home-input');
  const $homeSend = $('#home-send');

  // Busy lock: user can type; send/enter disabled while true
  let isBusy = false;
  let pendingQuestion = "";

  // Markdown rendering (simple + code blocks + lists + emphasis)
  const md = (t = '') =>
    t.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(^|\n)\* (.+)/g, (m, p1, p2) => `${p1}<ul><li>${p2}</li></ul>`)
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\n/g, '<br/>');

  // Convert HTML to plain text (for copy/email fallback)
  const html_to_text = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  };

  // Add message bubble with image attachment support - UPDATED FUNCTION
  const addMsg = (html, who = 'bot', raw = '', show_actions = false, meta = {}) => {
    const id = 'm_' + Math.random().toString(36).slice(2);
    
    // Check if we have attached files to include in user message
    let fileAttachmentsHTML = '';
    if (who === 'user' && attachedFiles.length > 0) {
      fileAttachmentsHTML = `
        <div class="file-attachments">
          ${attachedFiles.map(file => `
            <div class="file-attachment-item">
              <span class="file-attachment-icon">${file.type === 'Image' ? '🖼️' : '📄'}</span>
              <span class="file-attachment-name">${file.name}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      // Clear attached files after including them in message
      attachedFiles = [];
      updateAttachmentPreview();
    }
    
    const messageContent = fileAttachmentsHTML ? 
      `<div class="msg-with-files">${html}${fileAttachmentsHTML}</div>` : html;
    
    const $msg = $(`<div id="${id}" class="msg ${who}">${messageContent}</div>`);

    // Footer actions only for bot when data is fetched
    if (who === 'bot' && show_actions) {
      const $footer = $('<div class="msg-footer"></div>');

      // Copy icon
      const $copy = $(`<div class="icon-btn" title="Copy">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="9" y="9" width="10" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
          <rect x="5" y="3" width="10" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>`).on('click', async () => {
        try {
          const txt = raw || html_to_text(html);
          await navigator.clipboard.writeText(txt);
          frappe.show_alert({ message: 'Copied!', indicator: 'green' });
        } catch (_) {
          frappe.show_alert({ message: 'Copy failed', indicator: 'red' });
        }
      });

      // Email icon
      const $email = $(`<div class="icon-btn" title="Email me this answer">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M22 8l-10 6L2 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>`).on('click', () => {
        const answer_text  = raw || html_to_text(html);
        const question_text = meta.question || '';
        frappe.call({
          method: "nexapp.api.email_ai_response",
          args: { question: question_text, body: answer_text },
          callback: function (r) {
            if (r && r.message && r.message.status === "ok") {
              frappe.show_alert({ message: '✅ Email sent successfully to your registered email.', indicator: 'green' });
            } else {
              frappe.show_alert({ message: '❌ Email failed – ' + ((r && r.message && r.message.msg) || 'Unknown error'), indicator: 'red' });
            }
          },
          error: function () {
            frappe.show_alert({ message: '❌ Email sending failed due to server error.', indicator: 'red' });
          }
        });
      });

      $footer.append($copy).append($email);
      $msg.append($footer);
    }

    $thread.append($msg);
    $thread[0].scrollTop = $thread[0].scrollHeight;
    return id;
  };

  // Typing indicator (no actions while pending)
  const addTyping = () => {
    const id = addMsg(`<div class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`, 'bot', '', false);
    return { id, remove: () => $('#' + id).remove() };
  };

  const goToChat = () => {
    // Hide instructions and show greeting when switching to chat
    hideInstructions('home');
    $('#home').hide();
    $('#chat').show();
    setTimeout(() => $input.focus(), 50);
  };

  // Busy: allow typing but disable send buttons and block Enter submit
  const setBusy = (busy) => {
    isBusy = busy;
    $send.prop('disabled', busy).removeClass('active');
    $homeSend.prop('disabled', busy).removeClass('active');
  };

  // Enhanced file attachment with file browser modal
  function chooseAndPreviewFile() {
    if (isBusy) return; // do nothing while busy
    showFileAttachmentModal();
  }

  // Connect the plus button to file attachment modal
  $('#home-plus, #chat-plus').on('click', chooseAndPreviewFile);

  // Refresh button event
  $('.refresh-btn').on('click', resetEverything);

  // Send from home bar - UPDATED
  function sendFromHome() {
    if (isBusy) return;
    const text = $homeInput.val().trim();
    if (!text && attachedFiles.length === 0) return;
    pendingQuestion = text;
    goToChat();
    addMsg(md(text), 'user', text, false);
    $homeInput.val('');
    
    // Show instructions in chat if it's the purchase invoice task
    if (text === "Creating a Purchase Invoice from Supplier PDF") {
      showPurchaseInvoiceInstructions('chat');
    }
    
    askAI(text);
  }

  // Send from chat composer - UPDATED
  function sendFromChat() {
    if (isBusy) return;
    const text = $input.val().trim();
    if (!text && attachedFiles.length === 0) return;
    pendingQuestion = text;
    addMsg(md(text), 'user', text, false);
    $input.val('').trigger('input');
    
    // Show instructions if it's the purchase invoice task
    if (text === "Creating a Purchase Invoice from Supplier PDF") {
      showPurchaseInvoiceInstructions('chat');
    }
    
    askAI(text);
  }

  // Input behaviors: resize + button states (respect busy)
  $homeInput.on('input', function () {
    if (!isBusy && (this.value.trim() || attachedFiles.length > 0)) $homeSend.addClass('active'); 
    else $homeSend.removeClass('active');
  });

  $homeInput.on('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isBusy) sendFromHome();
    }
  });

  $('#home-send').on('click', sendFromHome);

  $input.on('input', function () {
    this.style.height = '24px';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    if (!isBusy && (this.value.trim() || attachedFiles.length > 0)) $send.addClass('active'); 
    else $send.removeClass('active');
  });

  $input.on('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isBusy) sendFromChat();
    }
  });

  $('#send').on('click', sendFromChat);

  // Call backend AI (n8n)
  function askAI(message) {
    setBusy(true);
    const typing = addTyping();

    frappe.call({
      method: "nexapp.api.chat_with_n8n",
      args: { message: message },
      callback: function (r) {
        typing.remove();
        const answer = r.message || 'No response';
        // Now add bot message WITH footer actions
        addMsg(md(answer), 'bot', answer, true, { question: pendingQuestion });
        setBusy(false);
        // refresh send buttons state
        if ($input.val().trim() || attachedFiles.length > 0) $send.addClass('active');
        if ($homeInput.val().trim() || attachedFiles.length > 0) $homeSend.addClass('active');
      },
      error: function () {
        typing.remove();
        addMsg("⚠️ Error connecting to AI", 'bot', '', false);
        setBusy(false);
      }
    });
  }

  setTimeout(() => $('#home-input').focus(), 50);
};