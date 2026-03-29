function handleKeyPress(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

function setPrompt(text) {
    const input = document.getElementById("user-input");
    input.value = text;
    input.focus();
}

let selectedImages = {};

function toggleImageSelection(url, checkbox, label, cid, lc) {
    if (checkbox.checked) {
        selectedImages[url] = { url, label, cid, lc };
    } else {
        delete selectedImages[url];
    }
    updateBulkDownloadButton();
}

function updateBulkDownloadButton() {
    let btn = document.getElementById("bulk-download-btn");
    const count = Object.keys(selectedImages).length;
    if (count > 0) {
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "bulk-download-btn";
            btn.onclick = downloadSelectedImages;
            document.querySelector(".app-wrapper").appendChild(btn);
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
}

async function downloadSelectedImages() {
    const btn = document.getElementById("bulk-download-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = "Preparing ZIPs...";
    btn.disabled = true;

    const allSelections = Object.values(selectedImages);
    console.log("Downloading files with metadata:", allSelections);

    // Group by circuit_id + legal_code
    const grouped = {};
    allSelections.forEach(item => {
        const key = `${item.cid}_${item.lc}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    try {
        for (const key of Object.keys(grouped)) {
            const files = grouped[key];
            console.log(`Processing group ${key}:`, files);

            const res = await fetch(`/api/method/nexapp.api.download_multi_images`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Frappe-CSRF-Token": window.csrf_token
                },
                body: `files=${encodeURIComponent(JSON.stringify(files))}`
            });

            const text = await res.text();
            console.log(`Raw response for ${key}:`, text);

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
                document.body.appendChild(link); // Required for some browsers
                link.click();
                document.body.removeChild(link);

                // Add a small delay between downloads to ensure browser handles them
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                const errorMsg = data.message?.message || data._server_messages || "Unknown server error";
                alert(`Error creating ZIP for ${key}: ` + errorMsg);
            }
        }

        // Clear selection after all successful downloads
        selectedImages = {};
        document.querySelectorAll(".image-checkbox").forEach(cb => cb.checked = false);
        updateBulkDownloadButton();

    } catch (err) {
        console.error("Download error:", err);
        alert("Download error: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function clearChat() {
    const chat = document.getElementById("chat-box");
    chat.innerHTML = `
        <div class="msg bot">
            <div class="bubble">✨ Conversation cleared. How can I help you today?</div>
        </div>
    `;
}

function sendMessage() {
    const input = document.getElementById("user-input");
    const chat = document.getElementById("chat-box");
    const question = input.value.trim();

    if (!question) return;

    // Add User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerHTML = `<div class="bubble">${question}</div>`;
    chat.appendChild(userMsg);
    input.value = "";
    scrollToBottom();

    // Add Typing Indicator
    const typingId = "typing-" + Date.now();
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

    fetch(`/api/method/nexapp.api.ai_installation_query?question=${encodeURIComponent(question)}`, {
        credentials: "include"
    })
        .then(res => res.json())
        .then(data => {
            document.getElementById(typingId)?.remove();
            const msg = data.message;

            const botMsg = document.createElement('div');
            botMsg.className = 'msg bot';

            let html = `<div class="bubble">`;
            html += `<div class="reply-text">${msg.ai_reply.replace(/\n/g, '<br>')}</div>`;

            if (msg.images && msg.images.length) {
                // Group images by circuit_id
                const grouped = {};
                msg.images.forEach(item => {
                    const cid = item.circuit_id || "Unknown";
                    if (!grouped[cid]) grouped[cid] = [];
                    grouped[cid].push(item);
                });

                Object.keys(grouped).forEach(cid => {
                    const images = grouped[cid];
                    const legal_code = images[0].legal_code || "NA";

                    html += `
                        <div class="circuit-group">
                            <div class="circuit-header">
                                <span class="header-label">Circuit:</span>
                                <span class="header-value">${cid} (${legal_code})</span>
                            </div>
                            <div class="image-list">
                    `;

                    images.forEach(item => {
                        const originalExt = item.image.split('.').pop();
                        const label = item.label || "Attachment";
                        const cid = item.circuit_id || "Unknown";
                        const lc = (item.legal_code && item.legal_code !== "NA") ? item.legal_code : "";

                        // Construct pretty filename: Label_CID_LC.ext
                        let fileName = `${label}_${cid}`;
                        if (lc) fileName += `_${lc}`;
                        fileName = fileName.replace(/\s+/g, '_') + "." + originalExt;

                        const isPdf = item.image.toLowerCase().endsWith(".pdf");

                        const mediaHtml = isPdf
                            ? `<div class="pdf-stamp-preview">
                                 <iframe src="${item.image}#toolbar=0&navpanes=0&scrollbar=0&view=FitH" 
                                         class="pdf-stamp-iframe"
                                         scrolling="no"
                                         loading="lazy">
                                 </iframe>
                                 <div class="pdf-stamp-overlay"></div>
                                 <div class="pdf-badge">PDF</div>
                               </div>`
                            : `<img src="${item.image}" class="zoom-image" alt="${item.label}" />`;

                        html += `
                            <div class="image-card ${isPdf ? 'pdf-card' : ''}">
                                <input type="checkbox" class="image-checkbox" 
                                       onclick="event.stopPropagation(); toggleImageSelection('${item.image}', this, '${item.label}', '${item.circuit_id}', '${item.legal_code}')">
                                <div class="image-inner" onclick="showFullPreview('${item.image}', '${label}', '${fileName}')">
                                    <div class="image-wrapper">
                                        ${mediaHtml}
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
        })
        .catch(err => {
            document.getElementById(typingId)?.remove();
            const errorMsg = document.createElement('div');
            errorMsg.className = 'msg bot';
            errorMsg.innerHTML = `<div class="bubble" style="color:#ff4757">⚠️ Sorry, I encountered an error. Please try again.</div>`;
            chat.appendChild(errorMsg);
            console.error(err);
            scrollToBottom();
        });
}

function scrollToBottom() {
    const chat = document.getElementById("chat-box");
    chat.scrollTop = chat.scrollHeight;
}

/* =====================================
   🔥 STABLE PERSISTENT PREVIEW LOGIC
   ===================================== */

const overlay = document.getElementById('full-preview-container');
const previewImg = document.getElementById("preview-img-large");
const previewPdf = document.getElementById("preview-pdf-large");
const previewLabel = document.getElementById("preview-label");
const previewDownload = document.getElementById("preview-download");

function showFullPreview(src, label, fileName) {
    const isPdf = src.toLowerCase().endsWith(".pdf");

    if (isPdf) {
        previewImg.style.display = "none";
        previewPdf.style.display = "block";
        previewPdf.src = src;
    } else {
        previewImg.style.display = "block";
        previewPdf.style.display = "none";
        previewImg.src = src;
    }

    previewLabel.innerText = label || "Installation Attachment";
    previewDownload.href = src;
    previewDownload.setAttribute("download", fileName || "attachment");

    // Show overlay
    document.getElementById("full-preview-container").classList.add("active");
}

function closePreview() {
    document.getElementById("full-preview-container").classList.remove("active");
    // Clear srcs to stop loading
    previewImg.src = "";
    previewPdf.src = "";
}

// Close when clicking ON the overlay (the background)
overlay.onclick = (e) => {
    if (e.target === overlay) {
        closePreview();
    }
};

// Initial Greeting
window.onload = () => {
    const chat = document.getElementById("chat-box");
    chat.innerHTML = `
        <div class="msg bot">
            <div class="bubble">👋 Hello! I'm your Customer Support AI. Ask me about Circuit IDs. Click on image stamps for a massive preview. Click outside to close. Download filenames now include the Image Type, Circuit ID & Legal Code!</div>
        </div>
    `;
};