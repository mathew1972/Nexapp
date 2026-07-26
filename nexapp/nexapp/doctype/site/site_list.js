frappe.listview_settings['Site'] = frappe.listview_settings['Site'] || {};

frappe.listview_settings['Site'].onload = function(listview) {
    if (frappe.session.user !== 'Administrator') {
        return;
    }

    let btn = listview.page.add_inner_button(__('Bulk Update Existing Sites'), function() {
        show_bulk_site_update_modal(listview);
    });

    if (btn && btn.length) {
        btn.html(`
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6px;">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Bulk Update Existing Sites
        `);
        btn.addClass('btn-brand-purple');
    }
    
    if (!$('#bfm-global-styles').length) {
        $('<style id="bfm-global-styles">').html(`
            .btn-brand-purple {
                background: #695A97 !important; color: #fff !important; border: none !important;
                border-radius: 8px !important; padding: 7px 18px !important; font-weight: 600 !important;
                font-size: 13px !important; box-shadow: 0 2px 6px rgba(105, 90, 151, 0.3) !important;
                transition: all 0.2s ease !important; letter-spacing: 0.2px !important;
            }
            .btn-brand-purple:hover {
                background: #574a80 !important; box-shadow: 0 4px 12px rgba(105, 90, 151, 0.4) !important;
                transform: translateY(-1px) !important;
            }
            .bfm-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
                z-index: 9999; display: flex; align-items: center; justify-content: center;
                animation: bfm-fade-in 0.2s ease-out forwards;
            }
            .bfm-dialog {
                background: #fff; width: 600px; max-width: 90%; border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; flex-direction: column;
                overflow: hidden; transform: scale(0.95); opacity: 0;
                animation: bfm-slide-up 0.3s ease-out forwards;
            }
            .bfm-header {
                padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-start;
                background: #f8fafc; border-bottom: 1px solid #e2e8f0;
            }
            .bfm-header-left { display: flex; gap: 16px; align-items: center; }
            .bfm-header-icon {
                width: 44px; height: 44px; border-radius: 10px; background: #eff6ff;
                color: #3b82f6; display: flex; align-items: center; justify-content: center;
            }
            .bfm-title { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
            .bfm-subtitle { margin: 4px 0 0; font-size: 13px; color: #64748b; }
            .bfm-close {
                background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;
                border-radius: 6px; transition: all 0.2s;
            }
            .bfm-close:hover { background: #e2e8f0; color: #334155; }
            .bfm-body { padding: 24px; flex-grow: 1; overflow-y: auto; }
            .bfm-dropzone {
                border: 2px dashed #cbd5e1; border-radius: 10px; padding: 40px 20px;
                text-align: center; cursor: pointer; background: #f8fafc; transition: all 0.2s;
            }
            .bfm-dropzone:hover, .bfm-dropzone.dragover {
                border-color: #3b82f6; background: #eff6ff;
            }
            .bfm-link { color: #3b82f6; font-weight: 600; text-decoration: underline; }
            .bfm-preview-area {
                display: none; flex-direction: column; gap: 16px; align-items: center;
                justify-content: center; height: 100%; min-height: 200px;
            }
            .bfm-file-chip {
                display: flex; align-items: center; gap: 12px; background: #f1f5f9;
                padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 100%;
            }
            .bfm-file-name {
                font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;
            }
            .bfm-file-remove {
                background: none; border: none; color: #ef4444; cursor: pointer;
                padding: 4px; border-radius: 4px; transition: 0.2s;
            }
            .bfm-file-remove:hover { background: #fee2e2; }
            .bfm-message-box {
                width: 100%; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.5;
            }
            .msg-loading { background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; text-align: center; }
            .msg-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
            .msg-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; text-align: center; }
            .bfm-footer {
                padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc;
                display: flex; justify-content: flex-end; gap: 12px;
            }
            .bfm-btn-primary {
                background: #695A97 !important; color: #fff !important; border: none !important;
                padding: 8px 20px !important; border-radius: 6px !important; font-weight: 600 !important;
                display: flex; align-items: center; gap: 8px; transition: 0.2s !important;
            }
            .bfm-btn-primary:hover:not(:disabled) { background: #574a80 !important; }
            .bfm-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
            @keyframes bfm-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes bfm-slide-up { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            .bfm-spin { animation: bfm-spin 1s linear infinite; }
            @keyframes bfm-spin { 100% { transform: rotate(360deg); } }
        `).appendTo('head');
    }
};

function show_bulk_site_update_modal(listview) {
    if ($('#bulk-site-update-modal').length > 0) {
        $('#bulk-site-update-modal').remove();
    }

    const modal_html = `
        <div id="bulk-site-update-modal" class="bfm-overlay">
            <div class="bfm-dialog" style="height: 520px;">
                <div class="bfm-header">
                    <div class="bfm-header-left">
                        <div class="bfm-header-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div>
                            <h2 class="bfm-title">Bulk Update Existing Sites</h2>
                            <p class="bfm-subtitle">Upload a spreadsheet using exact field Labels as column headers.</p>
                        </div>
                    </div>
                    <button class="bfm-close" onclick="$('#bulk-site-update-modal').remove()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="bfm-body">
                    <div class="bfm-dropzone" id="site-upload-area" onclick="document.getElementById('site-file-input').click()">
                        <input type="file" id="site-file-input" style="display: none;" accept=".csv, .xlsx, .xls">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                            <div class="bfm-dropzone-icon" style="margin: 0;">
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="1.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                            </div>
                            <div style="text-align: left;">
                                <p class="bfm-dropzone-title" style="font-size: 16px;">Drag & drop or paste (Ctrl+V) your file here, or <span class="bfm-link">browse</span></p>
                                <p class="bfm-dropzone-hint">Supports CSV, XLSX, XLS. Column names must match field Labels exactly. 'name' is mandatory.</p>
                            </div>
                        </div>
                    </div>
                    <div id="upload-preview-area" class="bfm-preview-area">
                        <div class="bfm-file-chip">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            <span id="selected-file-name" class="bfm-file-name"></span>
                            <button class="bfm-file-remove" id="btn-remove-file" title="Remove file"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                        <div id="site-upload-message" class="bfm-message-box"></div>
                    </div>
                </div>
                <div class="bfm-footer">
                    <button class="btn bfm-btn-primary" id="btn-process-upload" disabled>
                        <svg class="bfm-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        <svg class="bfm-btn-spinner" style="display: none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        <span class="bfm-btn-text">Process & Update Sites</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modal_html);

    let selected_file = null;
    const fileInput = document.getElementById('site-file-input');

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileSelect(e.target.files[0]);
    });

    const dropzone = document.getElementById('site-upload-area');
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    });

    const pasteHandler = (e) => {
        if ($('#bulk-site-update-modal').length > 0 && e.clipboardData && e.clipboardData.files.length) {
            handleFileSelect(e.clipboardData.files[0]);
        }
    };
    document.addEventListener('paste', pasteHandler);

    $('#btn-remove-file').on('click', function(e) {
        e.preventDefault();
        selected_file = null;
        $('#upload-preview-area').hide();
        $('#site-upload-area').show();
        let msg_div = $('#site-upload-message');
        msg_div.removeClass('msg-error msg-success msg-loading').html('');
        $('#btn-process-upload').prop('disabled', true);
        fileInput.value = '';
    });
    
    // Clean up paste handler when modal is closed
    $('.bfm-close').on('click', function() {
        document.removeEventListener('paste', pasteHandler);
    });

    function handleFileSelect(file) {
        selected_file = file;
        $('#selected-file-name').text(file.name);
        $('#upload-preview-area').css('display', 'flex');
        $('#site-upload-area').hide();

        let msg_div = $('#site-upload-message');
        let process_btn = $('#btn-process-upload');

        msg_div.removeClass('msg-error msg-success').addClass('msg-loading').html(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 120px; gap: 12px;">
                <svg class="bfm-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <span>Analyzing file and checking data...</span>
            </div>
        `);
        process_btn.prop('disabled', true);

        let file_reader = new FileReader();
        file_reader.onload = function(e) {
            let file_data = e.target.result.split(',')[1];
            setTimeout(() => {
                frappe.call({
                    method: 'nexapp.api.process_bulk_site_update',
                    args: { file_name: file.name, file_data: file_data, validate_only: 1 },
                    callback: function(r) {
                        if (!r.exc) {
                            let result = r.message || {};
                            if (result.status === "error") {
                                let err_html = `<strong>⚠ Found errors in validation:</strong><ul>`;
                                result.errors.forEach(err => { err_html += `<li>${err}</li>`; });
                                err_html += "</ul>";
                                msg_div.removeClass('msg-loading msg-success').addClass('msg-error').html(err_html);
                            } else if (result.status === "success") {
                                msg_div.removeClass('msg-loading msg-error').addClass('msg-success')
                                    .html(`<strong>✓ File is valid</strong><br><span>${result.total_rows || 0} record(s) ready to be updated.</span>`);
                                process_btn.prop('disabled', false);
                            }
                        } else {
                            msg_div.removeClass('msg-loading msg-success').addClass('msg-error').html("Error reading file.");
                        }
                    }
                });
            }, 100);
        };
        file_reader.readAsDataURL(file);
    }

    $('#btn-process-upload').on('click', function() {
        if (!selected_file) return;

        let btn = $(this);
        btn.prop('disabled', true);
        btn.find('.bfm-btn-icon').hide();
        btn.find('.bfm-btn-spinner').show();
        btn.find('.bfm-btn-text').text('Updating...');
        
        let msg_div = $('#site-upload-message');
        msg_div.removeClass('msg-error msg-success').addClass('msg-loading').html(`<strong>Processing Records...</strong>`);

        let file_reader = new FileReader();
        file_reader.onload = function(e) {
            let file_data = e.target.result.split(',')[1];
            frappe.call({
                method: 'nexapp.api.process_bulk_site_update',
                args: { file_name: selected_file.name, file_data: file_data, validate_only: 0 },
                callback: function(r) {
                    if (!r.exc) {
                        let result = r.message || {};
                        if (result.status === "error") {
                            let err_html = "<strong>⚠ Error updating records:</strong><ul>";
                            result.errors.forEach(err => { err_html += `<li>${err}</li>`; });
                            err_html += "</ul>";
                            msg_div.removeClass('msg-loading msg-success').addClass('msg-error').html(err_html);
                            btn.prop('disabled', false);
                            btn.find('.bfm-btn-spinner').hide();
                            btn.find('.bfm-btn-icon').show();
                            btn.find('.bfm-btn-text').text('Retry');
                        } else if (result.status === "success") {
                            let success_msg = result.success_count
                                ? `${result.success_count} Site record(s) updated successfully.`
                                : (result.message || `${result.total_rows} records validated.`);
                            msg_div.removeClass('msg-loading msg-error').addClass('msg-success')
                                .html(`<strong>✓ Success!</strong><br><span>${success_msg}</span>`);
                            btn.hide();
                            setTimeout(() => $('#bulk-site-update-modal').remove(), 3500);
                        }
                        listview.refresh();
                    }
                }
            });
        };
        file_reader.readAsDataURL(selected_file);
    });
}
