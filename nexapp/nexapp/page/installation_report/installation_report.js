frappe.pages['installation-report'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: '',
		single_column: true
	});

	// Hide the standard page header to remove blank space
	$(wrapper).find('.page-head').hide();
	$(wrapper).find('.layout-main-section').css('padding-top', '0');
	$(wrapper).find('.page-body').css('padding-top', '0');

	// For restricted external users, entirely hide the Workspace Sidebar and expand main layout
	if (frappe.user_roles.includes("Installation Report Viewer") && !frappe.user_roles.includes("System Manager")) {
		$('<style>').prop('type', 'text/css').html(`
			.layout-side-section { display: none !important; }
			.layout-main-section-wrapper { margin-left: 0 !important; }
		`).appendTo('head');
	}

	// Append custom CSS
	const style = document.createElement('style');
	style.innerHTML = `
  * { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; 
  }

  :root {
    --primary: #2563eb;
    --primary-dark: #1d4ed8;
    --primary-light: #60a5fa;
    --primary-bg: #eff6ff;
    --bg: #ffffff;
    --surface: #f8f9fa;
    --panel: #ffffff;
    --text: #111827;
    --text-secondary: #4b5563;
    --text-muted: #9ca3af;
    --user-bg: #f3f4f6;
    --bot-bg: #ffffff;
    --sidebar-bg: #ffffff;
    --sidebar-border: #e5e7eb;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --gradient: linear-gradient(135deg, #111827 0%, #374151 100%);
  }

  /* Remove any spacing from the main container */
  .gpt-root {
    height: calc(100vh - 60px) !important;
    background: var(--bg);
    border-radius: 0;
    overflow: hidden;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* ---------- MAIN LAYOUT CONTAINER ---------- */
  .main-container {
    display: flex;
    height: calc(100vh - 60px) !important;
    background: var(--bg);
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden;
  }

  /* ---------- SIDEBAR (LEFT PANEL) ---------- */
  .sidebar {
    width: 280px;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    height: 100%;
    box-sizing: border-box;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    height: 48px;
  }

  .logo-container-small {
    height: 90px;
  }

  .logo-container-small img {
    height: 100%;
    width: auto;
    object-fit: contain;
  }

  .hamburger-btn {
    background: transparent;
    border: none;
    font-size: 20px;
    color: var(--text-secondary);
    cursor: pointer;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }
  .hamburger-btn:hover {
    background: var(--surface);
  }

  .new-chat-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 16px;
    background: var(--primary);
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 24px;
  }
  .new-chat-btn:hover {
    background: var(--primary-dark);
  }

  .sidebar-section-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 12px;
    padding-left: 8px;
  }

  .task-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .task-item {
    margin: 0;
  }

  .task-link {
    text-decoration: none;
    color: var(--text-secondary);
    display: block;
    padding: 10px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100%;
    font-weight: 500;
    font-size: 13px;
    background: transparent;
    border: none;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .task-link:hover {
    background: var(--surface);
    color: var(--text);
  }

  .task-link.active {
    background: var(--primary-bg);
    color: var(--primary-dark);
    font-weight: 600;
  }

  .sidebar-footer {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid var(--sidebar-border);
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    background: #d97706; /* Amber color from screenshot */
    color: white;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
  }

  .user-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  /* ---------- CONTENT AREA (RIGHT SIDE) ---------- */
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
    background: var(--bg);
    overflow: hidden;
    position: relative;
  }

  /* ---------- HOME SCREEN ---------- */
  .gpt-home {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 32px;
    padding: 24px;
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
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    text-align: center;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  .gpt-title.hidden {
    display: none;
  }

  /* ---------- SEARCH INPUT ---------- */
  .gpt-search {
    width: min(800px, 90%);
    position: relative;
    display: flex;
    align-items: center;
    background: var(--panel);
    border-radius: 24px;
    padding: 4px 8px;
    box-shadow: var(--shadow);
    border: 1px solid var(--sidebar-border);
    transition: all 0.3s ease;
  }

  .gpt-search:focus-within {
    box-shadow: var(--shadow-hover);
    border-color: var(--primary-light);
  }

  .plus-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    display: grid;
    place-items: center;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .plus-btn:hover {
    background: var(--surface);
    color: var(--text);
  }

  .home-input {
    flex: 1;
    border: none;
    outline: none;
    padding: 12px 16px;
    font-size: 15px;
    background: transparent;
    color: var(--text);
  }

  .home-input::placeholder {
    color: var(--text-muted);
  }

  .send-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--text-muted);
    color: white;
    border: none;
    display: grid;
    place-items: center;
    cursor: not-allowed;
    transition: all 0.2s ease;
    opacity: 0.5;
  }

  .send-btn.active {
    background: var(--text);
    cursor: pointer;
    opacity: 1;
  }

  .send-btn svg {
    width: 24px;
    height: 24px;
  }

  .send-btn.active:hover {
    background: black;
  }

  /* ---------- CHAT AREA (FIXED LAYOUT) ---------- */
  .chat-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    background: var(--bg);
    overflow: hidden;
  }

  /* Thread area - scrollable messages */
  .thread {
    flex: 1;
    padding: 40px 10% 24px 10%;
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .msg {
    position: relative;
    max-width: 80%;
    color: var(--text);
    border-radius: 18px;
    padding: 16px 20px;
    line-height: 1.5;
    font-size: 15px;
    word-wrap: break-word;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .msg.user {
    align-self: flex-end;
    background: var(--user-bg);
    border-bottom-right-radius: 4px;
    border: 1px solid var(--sidebar-border);
  }

  .msg.bot {
    align-self: flex-start;
    background: transparent;
    padding: 0;
  }

  .msg .time { display: none !important; }

  /* ---------- COMPOSER (FIXED AT BOTTOM) ---------- */
  .composer {
    background: transparent;
    padding: 20px 10% 30px 10%;
    flex-shrink: 0;
  }

  .composer-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--panel);
    border-radius: 24px;
    padding: 8px 12px;
    box-shadow: var(--shadow);
    border: 1px solid var(--sidebar-border);
    margin: 0 auto;
    transition: all 0.3s ease;
  }
  
  .composer-row:focus-within {
    box-shadow: var(--shadow-hover);
    border-color: var(--primary-light);
  }

  .chat-input {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    height: 24px;
    max-height: 120px;
    font-size: 15px;
    background: transparent;
    color: var(--text);
    line-height: 1.5;
    padding: 0;
  }

  .chat-input::placeholder {
    color: #8e8ea0;
  }
  
  .chat-disclaimer {
    text-align: center;
    font-size: 11px;
    color: #555555;
    font-weight: 500;
    margin-top: 8px;
  }

  /* Image specific CSS */
  .circuit-group {
    margin-top: 15px;
    background: #fff;
    border: 1px solid #eaeaea;
    border-radius: 16px;
    overflow: hidden;
  }
  .circuit-header {
    background: #f8f9fa;
    padding: 10px 15px;
    border-bottom: 1px solid #eaeaea;
    font-weight: 600;
    font-size: 13px;
    color: #444;
  }
  .image-list {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    padding: 15px;
  }
  .image-card {
    position: relative;
    width: 110px;
    height: 145px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #eee;
    cursor: pointer;
    transition: all 0.2s;
    background: #fff;
    display: flex;
    flex-direction: column;
  }
  .image-card:hover {
    border-color: #3b5998;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  .card-top-bar {
    height: 25px;
    width: 100%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 6px;
    box-sizing: border-box;
    border-bottom: 2px solid #3b5998;
  }
  .image-checkbox {
    width: 15px;
    height: 15px;
    cursor: pointer;
    accent-color: #3b5998;
    transform: scale(1.1);
    margin: 0;
  }
  .image-inner {
    width: 100%;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafafa;
    overflow: hidden;
  }
  .zoom-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .select-all-btn {
    border-radius: 20px;
    font-size: 12px;
    padding: 4px 12px;
    font-weight: 600;
    border: 1px solid #3b5998;
    color: #3b5998;
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
  }
  .select-all-btn:hover {
    background: #f1f4f9;
  }
  .select-all-btn.active {
    background: #3b5998;
    color: #fff;
  }

  #bulk-download-btn {
    position: absolute;
    bottom: 100px;
    right: 30px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 20px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 9999;
  }
  #bulk-download-btn:hover {
    background: #000;
  }
  #bulk-download-btn:disabled {
    background: #9baec8;
    cursor: not-allowed;
  }
  
  .full-preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
  }
  .full-preview-overlay.active {
    display: flex;
  }
  .preview-window {
    background: #fff;
    width: 90vw;
    height: 90vh;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  }
  .preview-close-btn {
    position: absolute;
    top: 15px;
    right: 15px;
    background: rgba(255,255,255,0.9);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    color: #333;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  .preview-close-btn:hover {
    background: #fff;
    color: #ff4757;
  }
  .preview-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    color: #333;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    transition: all 0.2s;
  }
  .preview-nav-btn:hover {
    background: #fff;
    color: #3b5998;
  }
  .preview-nav-btn.prev-btn { left: 15px; }
  .preview-nav-btn.next-btn { right: 15px; }
  .preview-nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .preview-body {
    flex: 1;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  #preview-img-large {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .preview-footer {
    padding: 15px 20px;
    background: #fff;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .preview-info {
    font-weight: 500;
    color: #333;
  }
  .preview-download-btn {
    display: flex;
    align-items: center;
    background: #f1f3f5;
    color: #333;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }
  .preview-download-btn:hover {
    background: #e9ecef;
    text-decoration: none;
  }
  .typing {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
  }
  .typing .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #999;
    animation: typing 1.4s infinite both;
  }
  .typing .dot:nth-child(1) { animation-delay: -0.32s; }
  .typing .dot:nth-child(2) { animation-delay: -0.16s; }
  @keyframes typing {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;
	document.head.appendChild(style);

	
	
	$(page.main).html(`
		<div class="main-container">
		<!-- LEFT SIDEBAR -->
		<aside class="sidebar">

            <button class="new-chat-btn" id="clear-chat-btn" title="Refresh Page">
                Prompt
            </button>
			
			<ul class="task-list" id="task-list">
			</ul>

            <div class="sidebar-footer">
                <div class="user-profile">
                    <div class="user-avatar" id="user-avatar">U</div>
                    <div class="user-name" id="user-name">User</div>
                </div>
            </div>
		</aside>

		<!-- RIGHT CONTENT AREA -->
		<div class="content-area">
			<div class="gpt-home" id="home" style="display: flex;">
				<div class="gpt-title" id="gpt-title">How can I help you today?</div>
				<div class="gpt-search">
					<div class="plus-btn" style="visibility: hidden;">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
					<input id="home-input" class="home-input" placeholder="Select the required prompt from the list...." autocomplete="off" />
					<button id="home-send" class="send-btn" disabled>
						<svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M15.192 8.906a1.143 1.143 0 0 1 1.616 0l5.143 5.143a1.143 1.143 0 0 1-1.616 1.616l-3.192-3.192v9.813a1.143 1.143 0 0 1-2.286 0V12.473l-3.192 3.192a1.143 1.143 0 1 1-1.616-1.616z" clip-rule="evenodd"></path></svg>
					</button>
				</div>
			</div>
			<!-- CHAT SCREEN -->
			<div class="gpt-chat" id="chat" style="display: none;">
			<div class="chat-area">
				<div id="chat-box" class="thread">
				<!-- Welcome message will be added here -->
				</div>
				<div class="composer">
				<div class="composer-row">
					<div id="chat-plus" class="plus-btn" style="visibility: hidden;">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
					<input id="user-input" class="chat-input" placeholder="Select the required prompt from the list...." autocomplete="off" />
					<button id="send-btn" class="send-btn active" disabled>
					    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M15.192 8.906a1.143 1.143 0 0 1 1.616 0l5.143 5.143a1.143 1.143 0 0 1-1.616 1.616l-3.192-3.192v9.813a1.143 1.143 0 0 1-2.286 0V12.473l-3.192 3.192a1.143 1.143 0 1 1-1.616-1.616z" clip-rule="evenodd"></path></svg>
					</button>
				</div>
				<div class="chat-disclaimer">
					Information and downloaded files are restricted to authorized business use only.
				</div>
				</div>
			</div>
			</div>
		</div>
		</div>

		<!-- Stable Full Preview Lightbox -->
		<div id="full-preview-container" class="full-preview-overlay">
			<div id="preview-window" class="preview-window">
				<button class="preview-close-btn" id="preview-close-btn" title="Close Preview">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
						stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
				<button class="preview-nav-btn prev-btn" id="preview-prev-btn" title="Previous Image" style="display: none;">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
				</button>
				<button class="preview-nav-btn next-btn" id="preview-next-btn" title="Next Image" style="display: none;">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</button>
				<div class="preview-body">
					<img id="preview-img-large" src="" alt="Full View">
					<iframe id="preview-pdf-large" src=""
						style="display:none; width:100%; height:100%; border:none;"></iframe>
				</div>
				<div id="preview-footer" class="preview-footer">
					<div class="preview-info">
						<span id="preview-label"></span>
					</div>
					<a id="preview-download" href="#" download class="preview-download-btn">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="2" style="margin-right:8px">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="7 10 12 15 17 10"></polyline>
							<line x1="12" y1="15" x2="12" y2="3"></line>
						</svg>
						Download Full Image
					</a>
				</div>
			</div>
		</div>
	`);



	// Logic from customer-ai-support.js
	let selectedImages = {};

	const updateBulkDownloadButton = () => {
		let btn = document.getElementById("bulk-download-btn");
		const count = Object.keys(selectedImages).length;
		if (count > 0) {
			if (!btn) {
				btn = document.createElement("button");
				btn.id = "bulk-download-btn";
				btn.onclick = downloadSelectedImages;
				const contentArea = document.querySelector(".content-area");
				if (contentArea) contentArea.appendChild(btn);
				else document.body.appendChild(btn);
			}
			btn.innerHTML = `
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="7 10 12 15 17 10"></polyline>
					<line x1="12" y1="15" x2="12" y2="3"></line>
				</svg>
				Download Selected (${count})
			`;
			btn.style.display = "flex";
		} else if (btn) {
			btn.style.display = "none";
		}
	};

	window.toggleImageSelection = function(url, checkbox, label, cid, lc) {
		if (checkbox.checked) {
			selectedImages[url] = { url, label, cid, lc };
		} else {
			delete selectedImages[url];
		}
		updateBulkDownloadButton();

		const group = checkbox.closest('.circuit-group');
		if (group) {
			const btn = group.querySelector('.select-all-btn');
			const allCheckboxes = group.querySelectorAll('.image-checkbox');
			const allChecked = Array.from(allCheckboxes).length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
			if (btn) {
				if (allChecked) {
					btn.innerText = "Deselect All";
					btn.classList.add("active");
				} else {
					btn.innerText = "Select All";
					btn.classList.remove("active");
				}
			}
		}
	};

	window.selectAllInGroup = function(btn) {
		const group = btn.closest('.circuit-group');
		const checkboxes = group.querySelectorAll('.image-checkbox');
		const isSelecting = btn.innerText.trim() === "Select All";
		
		checkboxes.forEach(cb => {
			if (isSelecting && !cb.checked) {
				cb.click();
			} else if (!isSelecting && cb.checked) {
				cb.click();
			}
		});
	};

	const downloadSelectedImages = async () => {
		const btn = document.getElementById("bulk-download-btn");
		const originalText = btn.innerHTML;
		btn.innerHTML = "Preparing ZIPs...";
		btn.disabled = true;

		const allSelections = Object.values(selectedImages);
		
		const grouped = {};
		allSelections.forEach(item => {
			const key = `${item.cid}_${item.lc}`;
			if (!grouped[key]) grouped[key] = [];
			grouped[key].push(item);
		});

		try {
			for (const key of Object.keys(grouped)) {
				const files = grouped[key];
				const res = await fetch(`/api/method/nexapp.api.download_multi_images`, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"X-Frappe-CSRF-Token": frappe.csrf_token
					},
					body: `files=${encodeURIComponent(JSON.stringify(files))}`
				});

				const text = await res.text();
				let data;
				try {
					data = JSON.parse(text);
				} catch (e) {
					throw new Error(`Invalid JSON response for ${key}: ` + text.substring(0, 100));
				}

				if (data.message && data.message.status === "success") {
					const link = document.createElement("a");
					link.href = data.message.url;
					link.download = data.message.filename || `report_${key}.zip`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					await new Promise(resolve => setTimeout(resolve, 500));
				} else {
					const errorMsg = data.message?.message || data._server_messages || "Unknown server error";
					frappe.msgprint(`Error creating ZIP for ${key}: ` + errorMsg);
				}
			}

			selectedImages = {};
			wrapper.querySelectorAll(".image-checkbox").forEach(cb => cb.checked = false);
			wrapper.querySelectorAll(".select-all-btn").forEach(btn => {
				btn.innerText = "Select All";
				btn.classList.remove("active");
			});
			updateBulkDownloadButton();

			appendBotMessage("✅ Installation photograph downloaded successfully. The filename includes the Circuit ID and Legal Code.");

		} catch (err) {
			console.error("Download error:", err);
			frappe.msgprint("Download error: " + err.message);
		} finally {
			btn.innerHTML = originalText;
			btn.disabled = false;
		}
	};

	const appendBotMessage = (text) => {
		const chat = wrapper.querySelector("#chat-box");
		const botMsg = document.createElement('div');
		botMsg.className = 'msg bot';
		
		const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		
		botMsg.innerHTML = `<div class="bubble"><div class="reply-text">${formattedText}</div></div>`;
		chat.appendChild(botMsg);
		scrollToBottom();
		const input = wrapper.querySelector("#user-input");
		if (input) setTimeout(() => input.focus(), 10);
	};

	let chatState = 'IDLE';
	let dateSearchData = {};

	const clearChat = () => {
		const chat = wrapper.querySelector("#chat-box");
		chatState = 'IDLE';
		dateSearchData = {};
		
		frappe.db.get_value('User', frappe.session.user, 'first_name')
			.then(r => {
				let firstName = r.message.first_name || frappe.session.user_fullname.split(' ')[0] || 'there';
				wrapper.querySelector("#gpt-title").innerText = `${firstName}, how can I help you today?`;
				
				// Update user profile in sidebar
				const fullName = frappe.session.user_fullname || 'User';
				const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
				const userNameEl = wrapper.querySelector("#user-name");
				const userAvatarEl = wrapper.querySelector("#user-avatar");
				if (userNameEl) userNameEl.innerText = fullName;
				if (userAvatarEl) userAvatarEl.innerText = initials;
				
				// Reset views
				wrapper.querySelector("#home").style.display = "flex";
				wrapper.querySelector("#chat").style.display = "none";
				
				// Clear inputs
				const homeInput = wrapper.querySelector("#home-input");
				homeInput.value = "";
				wrapper.querySelector("#home-send").disabled = true;
				wrapper.querySelector("#home-send").classList.remove("active");
				
				const chatInput = wrapper.querySelector("#user-input");
				chatInput.value = "";
				wrapper.querySelector("#send-btn").disabled = true;
				wrapper.querySelector("#send-btn").classList.remove("active");
				
				// Clear chat history
				chat.innerHTML = "";
				
				// Reset sidebar active states
				wrapper.querySelectorAll('.task-link').forEach(link => {
					link.classList.remove('active');
				});
				
				homeInput.focus();
			});
	};

	window.setChatState = function(state, label) {
		chatState = state;
		const input = wrapper.querySelector("#user-input");
		const sendBtn = wrapper.querySelector("#send-btn");
		input.disabled = false;
		sendBtn.disabled = false;
		
		// Set active class on sidebar items
		wrapper.querySelectorAll('.task-link').forEach(link => {
			if (link.getAttribute('data-state') === state) {
				link.classList.add('active');
			} else {
				link.classList.remove('active');
			}
		});
		
		if (state === 'DIRECT_SEARCH') {
			appendBotMessage(`You selected **${label}**.`);
			appendBotMessage("Need installation photographs? Enter a **Circuit ID** or **Legal Code**, and I'll retrieve the related images for you.");
			input.placeholder = "Enter a Circuit ID or Legal Code...";
			input.value = "";
			input.focus();
		} else if (state === 'DATE_SEARCH_CUSTOMER') {
			appendBotMessage(`You selected **${label}**.`);
			appendBotMessage("👤 Please provide the Customer Name.");
			input.placeholder = "Enter Customer Name...";
			input.value = "";
			input.focus();
		} else if (state === 'SALES_ORDER_SEARCH') {
			appendBotMessage(`You selected **${label}**.`);
			appendBotMessage("🧾 Please provide the **Sales Order** or **Sales Invoice** Number.");
			input.placeholder = "Enter Sales Order / Invoice No...";
			input.value = "";
			input.focus();
		} else if (state === 'INVOICE_DOWNLOAD_SEARCH') {
			appendBotMessage(`You selected **${label}**.`);
			appendBotMessage("🧾 Please provide the **Sales Invoice** number(s). You can enter multiple invoices separated by **comma** or **space**.");
			input.placeholder = "Enter Sales Invoice No (e.g. INV-26-03767, INV-26-03768)...";
			input.value = "";
			input.focus();
		}
	};

	const scrollToBottom = () => {
		const chat = wrapper.querySelector("#chat-box");
		chat.scrollTop = chat.scrollHeight;
	};

	let currentPreviewGroup = [];
	let currentPreviewIndex = -1;

	window.showFullPreview = function(element, src, label, fileName) {
		const isPdf = src.toLowerCase().endsWith(".pdf") || src.includes("download_pdf") || src.includes("download_inline_pdf");
		const previewImg = wrapper.querySelector("#preview-img-large");
		const previewPdf = wrapper.querySelector("#preview-pdf-large");
		
		if (isPdf) {
			previewImg.style.display = "none";
			previewPdf.style.display = "block";
			previewPdf.src = src;
		} else {
			previewImg.style.display = "block";
			previewPdf.style.display = "none";
			previewImg.src = src;
		}

		wrapper.querySelector("#preview-label").innerText = label || "Installation Attachment";
		wrapper.querySelector("#preview-download").href = src;
		wrapper.querySelector("#preview-download").setAttribute("download", fileName || "attachment");
		wrapper.querySelector("#full-preview-container").classList.add("active");

		if (element) {
			const groupList = element.closest('.image-list');
			if (groupList) {
				currentPreviewGroup = Array.from(groupList.querySelectorAll('.image-inner'));
				currentPreviewIndex = currentPreviewGroup.indexOf(element);
				
				const prevBtn = wrapper.querySelector("#preview-prev-btn");
				const nextBtn = wrapper.querySelector("#preview-next-btn");
				
				if (currentPreviewGroup.length > 1) {
					prevBtn.style.display = "flex";
					nextBtn.style.display = "flex";
					
					prevBtn.disabled = currentPreviewIndex <= 0;
					nextBtn.disabled = currentPreviewIndex >= currentPreviewGroup.length - 1;
				} else {
					prevBtn.style.display = "none";
					nextBtn.style.display = "none";
				}
			}
		} else {
			wrapper.querySelector("#preview-prev-btn").style.display = "none";
			wrapper.querySelector("#preview-next-btn").style.display = "none";
		}
	};

	const closePreview = () => {
		wrapper.querySelector("#full-preview-container").classList.remove("active");
		wrapper.querySelector("#preview-img-large").src = "";
		wrapper.querySelector("#preview-pdf-large").src = "";
	};

	let typingId = null;
	const showTyping = () => {
		const chat = wrapper.querySelector("#chat-box");
		typingId = "typing-" + Date.now();
		const typingMsg = document.createElement('div');
		typingMsg.className = 'msg bot';
		typingMsg.id = typingId;
		typingMsg.innerHTML = `
			<div class="bubble typing">
				<div class="dot"></div>
				<div class="dot"></div>
				<div class="dot"></div>
			</div>
		`;
		chat.appendChild(typingMsg);
		scrollToBottom();
	};

	const hideTyping = () => {
		if (typingId) {
			const el = wrapper.querySelector("#" + typingId);
			if (el) el.remove();
			typingId = null;
		}
	};

	const renderBotResponse = (msg) => {
		const chat = wrapper.querySelector("#chat-box");
		const botMsg = document.createElement('div');
		botMsg.className = 'msg bot';

		let html = `<div class="bubble">`;
		
		if (msg.status === "error") {
			html += `<div class="reply-text">⚠️ Sorry, I encountered an error: ${msg.message}</div></div>`;
			botMsg.innerHTML = html;
			chat.appendChild(botMsg);
			scrollToBottom();
			return;
		}

		let formattedReply = (msg.ai_reply || "No reply").replace(/\n/g, '<br>');
		formattedReply = formattedReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		html += `<div class="reply-text">${formattedReply}</div>`;

		if (msg.images && msg.images.length) {
			const grouped = {};
			msg.images.forEach(item => {
				const cid = item.circuit_id || "Unknown";
				if (!grouped[cid]) grouped[cid] = [];
				grouped[cid].push(item);
			});

			Object.keys(grouped).forEach(cid => {
				const images = grouped[cid];
				const legal_code = images[0].legal_code || "NA";
				const site_name = images[0].site_name || "";
				const customer = images[0].customer || "";
				const delivery_date = images[0].delivery_date || "";

				let headerValue = `Circuit Id: ${cid}`;
				if (legal_code && legal_code !== "NA") {
					headerValue += ` | Legal Code: ${legal_code}`;
				}
				if (site_name) {
					headerValue += `<br><span style="font-weight: normal; font-size: 11px;">Site: ${site_name} | Customer: ${customer} | Delivery: ${delivery_date}</span>`;
				}

				html += `
					<div class="circuit-group">
						<div class="circuit-header" style="display: flex; justify-content: space-between; align-items: center;">
							<span class="header-value">${headerValue}</span>
							<button class="select-all-btn" onclick="window.selectAllInGroup(this)">Select All</button>
						</div>
						<div class="image-list">
				`;

				images.forEach(item => {
					const originalExt = item.image.split('.').pop();
					const label = item.label || "Attachment";
					const lc = (item.legal_code && item.legal_code !== "NA") ? item.legal_code : "";

					let fileName = `${label}_${cid}`;
					if (lc) fileName += `_${lc}`;
					fileName = fileName.replace(/\s+/g, '_') + "." + originalExt;

					const isPdf = item.image.toLowerCase().endsWith(".pdf") || item.image.includes("download_pdf") || item.image.includes("download_inline_pdf");

					const mediaHtml = isPdf
						? `<div class="pdf-stamp-preview" style="position: relative; width: 100%; height: 100%;">
							 <iframe src="${item.image}#toolbar=0&navpanes=0&scrollbar=0&view=FitH" 
									 class="pdf-stamp-iframe"
									 style="pointer-events: none; width: 100%; height: 100%; border: none;"
									 scrolling="no"
									 loading="lazy">
							 </iframe>
							 <div class="pdf-stamp-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;"></div>
							 <div class="pdf-badge" style="position: absolute; top: 5px; right: 5px; background: red; color: white; padding: 2px 5px; font-size: 10px; border-radius: 3px; font-weight: bold; z-index: 11;">PDF</div>
						   </div>`
						: `<img src="${item.image}" class="zoom-image" alt="${item.label}" />`;

					html += `
						<div class="image-card ${isPdf ? 'pdf-card' : ''}">
							<div class="card-top-bar">
								<input type="checkbox" class="image-checkbox" 
									   onclick="event.stopPropagation(); window.toggleImageSelection('${item.image}', this, '${item.label}', '${item.circuit_id}', '${item.legal_code}')">
							</div>
							<div class="image-inner" onclick="window.showFullPreview(this, '${item.image}', '${label}', '${fileName}')">
								<div class="image-wrapper" style="width:100%;height:100%;">
									${mediaHtml}
								</div>
							</div>
							<div style="padding: 5px 8px; background: #f8f9fa; text-align: center; border-top: 1px solid #eaeaea;" title="${label}">
								<div style="font-size: 11px; font-weight: 600; color: #4b5563; white-space: normal; line-height: 1.2; word-break: break-word;">
									${label}
								</div>
							</div>
						</div>
					`;
				});

				html += `
						</div>
					</div>
				`;
			});
		}

		html += `</div>`;
		botMsg.innerHTML = html;
		chat.appendChild(botMsg);
		scrollToBottom();
		setTimeout(() => wrapper.querySelector("#user-input")?.focus(), 10);
	};

	const executeDirectSearch = (question) => {
		showTyping();
		fetch(`/api/method/nexapp.api.ai_installation_query?question=${encodeURIComponent(question)}`, {
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token }
		})
		.then(res => res.json())
		.then(data => {
			hideTyping();
			renderBotResponse(data.message);
		})
		.catch(err => {
			hideTyping();
			appendBotMessage("⚠️ Sorry, I encountered an error. Please try again.");
			console.error(err);
		});
	};

	const executeSalesOrderSearch = (invoiceNo) => {
		showTyping();
		fetch(`/api/method/nexapp.api.ai_sales_invoice_installation_query?invoice_no=${encodeURIComponent(invoiceNo)}`, {
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token }
		})
		.then(res => res.json())
		.then(data => {
			hideTyping();
			renderBotResponse(data.message);
			chatState = 'IDLE';
			wrapper.querySelector("#user-input").placeholder = "Select the required prompt from the list....";
		})
		.catch(err => {
			hideTyping();
			appendBotMessage("⚠️ Sorry, I encountered an error. Please try again.");
			console.error(err);
		});
	};

	const executeInvoiceDownloadSearch = (invoiceInput) => {
		// Parse multiple invoice numbers separated by comma or space
		const invoiceNos = invoiceInput.split(/[,\s]+/).map(s => s.trim()).filter(s => s.length > 0);
		
		if (invoiceNos.length === 0) {
			appendBotMessage("⚠️ Please enter at least one Sales Invoice number.");
			return;
		}
		
		showTyping();
		
		const results = [];
		let completed = 0;
		
		invoiceNos.forEach((invoiceNo) => {
			fetch(`/api/method/nexapp.api.ai_invoice_download_query?invoice_no=${encodeURIComponent(invoiceNo)}`, {
				headers: { "X-Frappe-CSRF-Token": frappe.csrf_token }
			})
			.then(res => res.json())
			.then(data => {
				results.push({ invoiceNo, data: data.message });
				completed++;
				if (completed === invoiceNos.length) {
					hideTyping();
					renderInvoiceDownloadResponse(results);
				}
			})
			.catch(err => {
				results.push({ invoiceNo, data: { status: 'error', message: err.message } });
				completed++;
				if (completed === invoiceNos.length) {
					hideTyping();
					renderInvoiceDownloadResponse(results);
				}
			});
		});
	};

	const renderInvoiceDownloadResponse = (results) => {
		const chat = wrapper.querySelector("#chat-box");
		const botMsg = document.createElement('div');
		botMsg.className = 'msg bot';
		
		let html = `<div class="bubble">`;
		
		const successResults = results.filter(r => r.data && r.data.status === 'success' && r.data.print_url);
		const failedResults = results.filter(r => !r.data || r.data.status !== 'success' || !r.data.print_url);
		
		if (failedResults.length > 0) {
			const failedNos = failedResults.map(r => `**${r.invoiceNo}**`).join(', ');
			html += `<div class="reply-text">⚠️ Could not find or access: ${failedNos}</div>`;
		}
		
		if (successResults.length > 0) {
			html += `<div class="reply-text">✅ Found **${successResults.length}** Sales Invoice(s). Click to open:</div>`;
			
			html += `<div class="image-list" style="gap: 12px; margin-top: 10px;">`;
			successResults.forEach(r => {
				html += `
					<div class="image-card" style="cursor: pointer;" onclick="window.open('${r.data.print_url}', '_blank')">
						<div class="card-top-bar" style="visibility: hidden;">
							<input type="checkbox" class="image-checkbox" disabled>
						</div>
						<div class="image-inner" style="pointer-events: none;">
							<div class="image-wrapper" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8f9fa;">
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="1.5" style="margin-bottom:8px;">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
									<polyline points="14 2 14 8 20 8"></polyline>
									<line x1="16" y1="13" x2="8" y2="13"></line>
									<line x1="16" y1="17" x2="8" y2="17"></line>
									<polyline points="10 9 9 9 8 9"></polyline>
								</svg>
								<span style="font-size:11px;font-weight:600;color:#333;">${r.invoiceNo}</span>
								<span style="font-size:9px;color:#888;margin-top:2px;">Click to Open</span>
							</div>
						</div>
					</div>
				`;
			});
			html += `</div>`;
		}
		
		html += `</div>`;
		botMsg.innerHTML = html;
		chat.appendChild(botMsg);
		scrollToBottom();
		
		// Keep the state active so user can enter more invoices
		const input = wrapper.querySelector("#user-input");
		input.placeholder = "Enter more Invoice No(s) or select a different prompt...";
		setTimeout(() => input.focus(), 10);
	};

	const validateAndProceedCustomer = (customerName) => {
		showTyping();
		const filtersStr = encodeURIComponent(JSON.stringify({ name: ["like", `%${customerName}%`] }));
		const fieldsStr = encodeURIComponent(JSON.stringify(["name"]));
		fetch(`/api/method/frappe.client.get_list?doctype=Customer&filters=${filtersStr}&fields=${fieldsStr}&limit_page_length=1`, {
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token }
		})
		.then(res => {
			if (!res.ok) throw new Error("Permission Denied");
			return res.json();
		})
		.then(data => {
			hideTyping();
			if (data.message && data.message.length > 0) {
				dateSearchData.pending_customer = data.message[0].name;
				chatState = 'DATE_SEARCH_CUSTOMER_CONFIRM';
				appendBotMessage(`💡 Did you mean **${data.message[0].name}**? (Yes / No)`);
				wrapper.querySelector("#user-input").placeholder = "Type Yes or No...";
			} else {
				appendBotMessage(`😔 You do not have the right to view this customer, or **${customerName}** does not exist.\n\nPlease try again with a valid customer.`);
			}
		})
		.catch(err => {
			hideTyping();
			appendBotMessage(`😔 You do not have the right to view this customer, or **${customerName}** does not exist.\n\nPlease try again with a valid customer.`);
		});
	};

	const validateAndProceedCircuit = (circuitId) => {
		showTyping();
		const filtersStr = encodeURIComponent(JSON.stringify({ name: ["like", `%${circuitId}%`], customer: dateSearchData.customer }));
		const fieldsStr = encodeURIComponent(JSON.stringify(["name"]));
		fetch(`/api/method/frappe.client.get_list?doctype=Site&filters=${filtersStr}&fields=${fieldsStr}&limit_page_length=1`, {
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token }
		})
		.then(res => {
			if (!res.ok) throw new Error("Permission Denied");
			return res.json();
		})
		.then(data => {
			hideTyping();
			if (data.message && data.message.length > 0) {
				dateSearchData.circuit_id = data.message[0].name;
				chatState = 'DATE_SEARCH_FROM_DATE';
				appendBotMessage(`📅 Noted. Please provide the **From Date** (YYYY-MM-DD or DD-MM-YYYY).`);
				wrapper.querySelector("#user-input").placeholder = "Enter From Date...";
			} else {
				appendBotMessage(`😔 No feasible circuits were found matching "**${circuitId}**", or you don't have permission.\n\nWould you like to try again?`);
			}
		})
		.catch(err => {
			hideTyping();
			appendBotMessage(`😔 No feasible circuits were found matching "**${circuitId}**", or you don't have permission.\n\nWould you like to try again?`);
		});
	};

	const executeDateSearch = () => {
		showTyping();
		const qs = `customer=${encodeURIComponent(dateSearchData.customer)}&circuit_id=${encodeURIComponent(dateSearchData.circuit_id || "")}&from_date=${encodeURIComponent(dateSearchData.from_date || "")}&to_date=${encodeURIComponent(dateSearchData.to_date || "")}&exact_dates=${encodeURIComponent(dateSearchData.exact_dates || "")}&is_range=${dateSearchData.is_range}`;
		fetch(`/api/method/nexapp.api.ai_installation_date_query?${qs}`, {
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token }
		})
		.then(res => res.json())
		.then(data => {
			hideTyping();
			renderBotResponse(data.message);
			const input = wrapper.querySelector("#user-input");
			
			if (data.message && data.message.status === "error") {
				// Revert state to dates so they can try again
				chatState = 'DATE_SEARCH_DATES';
				input.placeholder = "Enter Date or Date Range...";
			} else {
				chatState = 'IDLE';
				input.placeholder = "Select the required prompt from the list....";
			}
		})
		.catch(err => {
			hideTyping();
			appendBotMessage("⚠️ Sorry, I encountered an error. Please try again.");
			console.error(err);
		});
	};

	const sendMessage = () => {
		const input = wrapper.querySelector("#user-input");
		const chat = wrapper.querySelector("#chat-box");
		const question = input.value.trim();

		if (!question) return;

		if (question.toLowerCase() === "clear") {
			input.value = "";
			clearChat();
			return;
		}

		// Show user message
		const userMsg = document.createElement('div');
		userMsg.className = 'msg user';
		userMsg.innerHTML = `<div class="bubble">${question}</div>`;
		chat.appendChild(userMsg);
		input.value = "";
		wrapper.querySelector("#send-btn").disabled = true;
		wrapper.querySelector("#send-btn").classList.remove("active");
		scrollToBottom();
		input.focus();

		// Remove hardcoded prompt matches; now handled by processInputText or fallbacks
		
		if (chatState === 'DIRECT_SEARCH') {
			executeDirectSearch(question);
		} else if (chatState === 'SALES_ORDER_SEARCH') {
			executeSalesOrderSearch(question);
		} else if (chatState === 'INVOICE_DOWNLOAD_SEARCH') {
			executeInvoiceDownloadSearch(question);
		} else if (chatState === 'DATE_SEARCH_CUSTOMER') {
			validateAndProceedCustomer(question);
		} else if (chatState === 'DATE_SEARCH_CUSTOMER_CONFIRM') {
			if (question.toLowerCase() === 'yes' || question.toLowerCase() === 'y') {
				dateSearchData.customer = dateSearchData.pending_customer;
				dateSearchData.circuit_id = "";
				chatState = 'DATE_SEARCH_DATES';
				appendBotMessage(`📅 Enter a Circuit Delivery Date or Date Range (From Date - To Date) to view installation photographs.`);
				input.placeholder = "Enter Date or Date Range...";
			} else {
				chatState = 'DATE_SEARCH_CUSTOMER';
				appendBotMessage("Let's try again. Please provide the Customer Name.");
				input.placeholder = "Enter Customer Name...";
			}
		} else if (chatState === 'DATE_SEARCH_CIRCUIT') {
			validateAndProceedCircuit(question);
		} else if (chatState === 'DATE_SEARCH_DATES') {
			let is_range = false;
			let dates = question.trim();
			
			if (question.includes(' - ')) {
				let parts = question.split(' - ');
				dateSearchData.from_date = parts[0].trim();
				dateSearchData.to_date = parts[1].trim();
				is_range = true;
			} else if (question.toLowerCase().includes(' to ')) {
				let parts = question.toLowerCase().split(' to ');
				dateSearchData.from_date = parts[0].trim();
				dateSearchData.to_date = parts[1].trim();
				is_range = true;
			} else {
				dateSearchData.exact_dates = dates;
				is_range = false;
			}
			
			dateSearchData.is_range = is_range;
			chatState = 'DATE_SEARCH_FINAL_CONFIRM';
			
			let confirmMsg = is_range ? 
				`Are you sure you want to pull installation photographs between **${dateSearchData.from_date}** and **${dateSearchData.to_date}** for customer **${dateSearchData.customer}**? (Yes / No)` :
				`Are you sure you want to pull installation photographs for dates **${dates}** for customer **${dateSearchData.customer}**? (Yes / No)`;
				
			appendBotMessage(confirmMsg);
			input.placeholder = "Type Yes or No...";
		} else if (chatState === 'DATE_SEARCH_FINAL_CONFIRM') {
			if (question.toLowerCase() === 'yes' || question.toLowerCase() === 'y') {
				executeDateSearch();
			} else {
				chatState = 'DATE_SEARCH_DATES';
				appendBotMessage("📅 Let's try again. Enter a Circuit Delivery Date or Date Range (From Date - To Date).");
				input.placeholder = "Enter Date or Date Range...";
			}
		} else if (chatState === 'IDLE') {
			appendBotMessage("Please select the required prompt from the left list.");
		}
	};

	// Event Listeners
	wrapper.querySelector("#clear-chat-btn").addEventListener("click", clearChat);
	wrapper.querySelector("#preview-close-btn").addEventListener("click", closePreview);
	wrapper.querySelector("#preview-download").addEventListener("click", () => {
		appendBotMessage("✅ Installation photograph downloaded successfully. The filename includes the Circuit ID and Legal Code.");
	});
	
	wrapper.querySelector("#preview-prev-btn").addEventListener("click", (e) => {
		e.stopPropagation();
		if (currentPreviewIndex > 0) {
			currentPreviewGroup[currentPreviewIndex - 1].click();
		}
	});

	wrapper.querySelector("#preview-next-btn").addEventListener("click", (e) => {
		e.stopPropagation();
		if (currentPreviewIndex >= 0 && currentPreviewIndex < currentPreviewGroup.length - 1) {
			currentPreviewGroup[currentPreviewIndex + 1].click();
		}
	});
	
	const overlay = wrapper.querySelector("#full-preview-container");
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) closePreview();
	});

	const userInput = wrapper.querySelector("#user-input");
	userInput.addEventListener("keypress", (e) => {
		if (e.key === 'Enter') sendMessage();
	});
	
	// Input validation to toggle send button state
	userInput.addEventListener("input", (e) => {
		const sendBtn = wrapper.querySelector("#send-btn");
		if (e.target.value.trim() && chatState !== 'IDLE') {
			sendBtn.disabled = false;
			sendBtn.classList.add("active");
		} else {
			sendBtn.disabled = true;
			sendBtn.classList.remove("active");
		}
	});

	// Handle prompt selection (moved inside loadPrompts)
	const attachPromptListeners = () => {
		wrapper.querySelectorAll(".prompt-item").forEach(item => {
			item.addEventListener("click", (e) => {
				e.preventDefault();
				const label = e.target.getAttribute("title") || e.target.innerText;
				
				if (wrapper.querySelector("#home").style.display !== "none") {
					const homeInput = wrapper.querySelector("#home-input");
					homeInput.value = label;
					setTimeout(() => homeInput.focus(), 10);
					const homeSend = wrapper.querySelector("#home-send");
					homeSend.disabled = false;
					homeSend.classList.add("active");
				} else {
					const chatInput = wrapper.querySelector("#user-input");
					chatInput.value = label;
					setTimeout(() => chatInput.focus(), 10);
					const chatSend = wrapper.querySelector("#send-btn");
					chatSend.disabled = false;
					chatSend.classList.add("active");
				}
			});
		});
	};

	const processInputText = (text) => {
		// Switch view
		if (wrapper.querySelector("#home").style.display !== "none") {
			wrapper.querySelector("#home").style.display = "none";
			wrapper.querySelector("#chat").style.display = "flex";
		}
		
		const input = wrapper.querySelector("#user-input");
		input.value = text;
		wrapper.querySelector("#send-btn").disabled = false;
		wrapper.querySelector("#send-btn").classList.add("active");
		
		// Map text to state if it matches a prompt EXACTLY (by title or innerText)
		if (chatState === 'IDLE') {
			let matchedState = false;
			wrapper.querySelectorAll(".prompt-item").forEach(item => {
				const label = item.getAttribute("title") || item.innerText;
				if (label === text || item.innerText === text) {
					chatState = item.getAttribute("data-state");
					matchedState = true;
				}
			});
			
			if (matchedState) {
				const chat = wrapper.querySelector("#chat-box");
				const userMsg = document.createElement('div');
				userMsg.className = 'msg user';
				userMsg.innerHTML = `<div class="bubble">${text}</div>`;
				chat.appendChild(userMsg);
				
				input.value = "";
				wrapper.querySelector("#send-btn").disabled = true;
				wrapper.querySelector("#send-btn").classList.remove("active");
				scrollToBottom();
				
				if (chatState === 'DIRECT_SEARCH') {
					appendBotMessage("Please provide the Circuit ID or Legal Code to search for Installation Photographs.");
				} else if (chatState === 'SALES_ORDER_SEARCH') {
					appendBotMessage("Please provide the Sales Invoice number to search for Installation Photographs.");
				} else if (chatState === 'INVOICE_DOWNLOAD_SEARCH') {
					appendBotMessage("Please provide the Sales Invoice number to download.");
				} else if (chatState === 'DATE_SEARCH_CUSTOMER') {
					appendBotMessage("Please provide the Customer Name.");
				}
				
				setTimeout(() => input.focus(), 50);
				return;
			}
		}
		
		sendMessage();
	};

	// Event listeners for HOME input
	const homeInput = wrapper.querySelector("#home-input");
	homeInput.addEventListener("keypress", (e) => {
		if (e.key === 'Enter' && homeInput.value.trim()) processInputText(homeInput.value.trim());
	});
	homeInput.addEventListener("input", (e) => {
		const btn = wrapper.querySelector("#home-send");
		if (e.target.value.trim()) {
			btn.disabled = false;
			btn.classList.add("active");
		} else {
			btn.disabled = true;
			btn.classList.remove("active");
		}
	});
	wrapper.querySelector("#home-send").addEventListener("click", () => {
		if (homeInput.value.trim()) processInputText(homeInput.value.trim());
	});

	wrapper.querySelector("#send-btn").addEventListener("click", sendMessage);

	// Fetch dynamic prompts
	const loadPrompts = () => {
		fetch('/api/method/nexapp.api.get_user_allowed_prompts', {
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token }
		})
		.then(res => res.json())
		.then(data => {
			if (data.message) {
				const taskList = wrapper.querySelector("#task-list");
				taskList.innerHTML = "";
				data.message.forEach(p => {
					taskList.innerHTML += `
						<li class="task-item">
							<a class="task-link prompt-item" data-state="${p.data_state}" title="${p.full_prompt}">
								${p.short_prompt}
							</a>
						</li>
					`;
				});
				attachPromptListeners();
			}
		})
		.catch(err => console.error("Error loading prompts:", err));
	};

	// Init
	clearChat();
	loadPrompts();
};