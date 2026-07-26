frappe.listview_settings['Feasibility'] = {
    onload: function(listview) {
        let btn = listview.page.add_inner_button(__('Bulk Feasibility Upload'), function() {
            show_bulk_upload_modal(listview);
        });

        // Style the button immediately without timeout
        if (btn && btn.length) {
            btn.html(`
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Bulk Feasibility Upload
            `);
            btn.addClass('btn-brand-purple');
        }
        
        // Inject persistent CSS styles globally so they apply instantly
        if (!$('#bfm-global-styles').length) {
            $('<style id="bfm-global-styles">').html(`
                .btn-brand-purple {
                    background: #695A97 !important;
                    color: #fff !important;
                    border: none !important;
                    border-radius: 8px !important;
                    padding: 7px 18px !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                    box-shadow: 0 2px 6px rgba(105, 90, 151, 0.3) !important;
                    transition: all 0.2s ease !important;
                    letter-spacing: 0.2px !important;
                }
                .btn-brand-purple:hover {
                    background: #574a80 !important;
                    box-shadow: 0 4px 12px rgba(105, 90, 151, 0.4) !important;
                    transform: translateY(-1px) !important;
                }
            `).appendTo('head');
        }
    },
    add_fields: ["due_date", "sla_status", "remaining_days", "feasibility_status"],
    get_indicator: function(doc) {
        let sla = doc.sla_status;
        if (sla === 'Within TAT') {
            return [__(sla), 'green', 'sla_status,=,Within TAT'];
        } else if (sla === 'Near Due') {
            return [__(sla), 'orange', 'sla_status,=,Near Due'];
        } else if (sla === 'Overdue') {
            return [__(sla), 'red', 'sla_status,=,Overdue'];
        } else if (sla === 'Paused') {
            return [__(sla), 'blue', 'sla_status,=,Paused'];
        } else if (sla === 'Completed') {
            return [__(sla), 'gray', 'sla_status,=,Completed'];
        } else {
            return [__(doc.feasibility_status), 'gray', 'feasibility_status,=,' + doc.feasibility_status];
        }
    },
    formatters: {
        sla_status(val) {
            let color_map = {
                'Within TAT': 'green',
                'Near Due': 'orange',
                'Overdue': 'red',
                'Paused': 'blue',
                'Completed': 'gray'
            };
            let color = color_map[val] || 'gray';
            return `<span class="indicator-pill ${color}">${__(val)}</span>`;
        }
    }
};

function show_bulk_upload_modal(listview) {
    if ($('#bulk-feasibility-modal').length > 0) {
        $('#bulk-feasibility-modal').remove();
    }

    const modal_html = `
        <div id="bulk-feasibility-modal" class="bfm-overlay">
            <div class="bfm-dialog">
                <!-- Header -->
                <div class="bfm-header">
                    <div class="bfm-header-left">
                        <div class="bfm-header-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                        </div>
                        <div>
                            <h2 class="bfm-title">Upload Bulk Feasibility</h2>
                            <p class="bfm-subtitle">Upload spreadsheet data to create multiple Feasibility records at once.</p>
                        </div>
                    </div>
                    <button class="bfm-close" onclick="$('#bulk-feasibility-modal').remove()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <!-- Divider -->
                <div class="bfm-divider"></div>

                <!-- Body -->
                <div class="bfm-body">
                    <!-- Upload Drop Zone -->
                    <div class="bfm-dropzone" id="feasibility-upload-area" onclick="document.getElementById('feasibility-file-input').click()">
                        <input type="file" id="feasibility-file-input" style="display: none;" accept=".csv, .xlsx, .xls">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                            <div class="bfm-dropzone-icon" style="margin: 0;">
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                                    <path d="M12 12v9"/>
                                    <path d="m16 16-4-4-4 4"/>
                                </svg>
                            </div>
                            <div style="text-align: left;">
                                <p class="bfm-dropzone-title" style="font-size: 16px;">Drag & drop or paste (Ctrl+V) your file here, or <span class="bfm-link">browse</span></p>
                                <p class="bfm-dropzone-hint">Supports CSV, XLSX, XLS</p>
                            </div>
                        </div>
                    </div>

                    <!-- Template Download + Help Icon -->
                    <div class="bfm-template-bar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span style="flex-grow: 1;">Need the template? <a href="#" id="download-feasibility-template" class="bfm-link">Download Feasibility Template</a></span>
                        <div class="bfm-help-wrap" id="bfm-help-wrap">
                            <button class="bfm-help-btn" id="bfm-help-toggle" title="Upload Guide">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                <span>Guide</span>
                            </button>
                            <div class="bfm-popover" id="bfm-popover">
                                <div class="bfm-popover-arrow"></div>
                                <div class="bfm-popover-header">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#695A97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                    <span>Upload Guide</span>
                                </div>
                                <ul class="bfm-popover-list">
                                    <li><span class="bfm-pop-dot" style="background:#ef4444;"></span><div><strong style="color:#ef4444;">Red columns</strong> are mandatory.</div></li>
                                    <li><span class="bfm-pop-dot" style="background:#695A97;"></span><div><strong>Address:</strong> Enter street only. System auto-fills <em>City, District, Territory, State</em> via <strong>Pincode</strong> or <strong>Lat/Lng</strong>.</div></li>
                                    <li><span class="bfm-pop-dot" style="background:#2490EF;"></span><div><strong>Date Format:</strong> DD-MM-YYYY</div></li>
                                    <li><span class="bfm-pop-dot" style="background:#22c55e;"></span><div><strong>Central Spoke:</strong> Auto-checks &amp; updates if found; otherwise creates a new contact.</div></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Preview Area (hidden by default) -->
                    <div id="upload-preview-area" class="bfm-preview-area">
                        <div class="bfm-file-chip">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            <span id="selected-file-name" class="bfm-file-name"></span>
                            <button class="bfm-file-remove" id="btn-remove-file" title="Remove file">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div id="feasibility-upload-message" class="bfm-message-box"></div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="bfm-footer">
                    <button class="btn bfm-btn-primary" id="btn-process-upload" disabled>
                        <svg class="bfm-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <svg class="bfm-btn-spinner" style="display: none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        <span class="bfm-btn-text">Process & Create Records</span>
                    </button>
                </div>
            </div>
        </div>
        <style>
            /* ---- Overlay ---- */
            .bfm-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.45);
                display: flex; align-items: center; justify-content: center;
                z-index: 1050;
                backdrop-filter: blur(4px);
                animation: bfmFadeIn 0.2s ease;
            }
            @keyframes bfmFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes bfmSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes bfmSpin { 100% { transform: rotate(360deg); } }
            @keyframes bfmPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(0.95); } }
            .bfm-spin { animation: bfmSpin 1s linear infinite; }
            .bfm-big-spinner svg { animation: bfmSpin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; filter: drop-shadow(0 4px 6px rgba(36, 144, 239, 0.2)); }
            .bfm-big-spinner-container { animation: bfmPulse 2s ease-in-out infinite; }

            /* ---- Dialog ---- */
            .bfm-dialog {
                background: #fff;
                width: 850px;
                height: 560px;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
                display: flex; flex-direction: column;
                animation: bfmSlideUp 0.25s ease;
                overflow: hidden;
            }

            /* ---- Header ---- */
            .bfm-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 20px 28px;
                flex-shrink: 0;
            }
            .bfm-header-left {
                display: flex; align-items: center; gap: 14px;
            }
            .bfm-header-icon {
                width: 42px; height: 42px;
                background: linear-gradient(135deg, #EBF5FF, #D6EBFF);
                border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                color: #2490EF;
                flex-shrink: 0;
            }
            .bfm-title {
                font-size: 18px; font-weight: 700; color: #1f2937;
                margin: 0; line-height: 1.3;
            }
            .bfm-subtitle {
                font-size: 13px; color: #6b7280; margin: 2px 0 0 0; line-height: 1.3;
            }
            .bfm-close {
                background: none; border: none; cursor: pointer;
                color: #9ca3af; padding: 6px; border-radius: 6px;
                transition: all 0.15s;
            }
            .bfm-close:hover { background: #f3f4f6; color: #374151; }
            .bfm-divider { height: 1px; background: #e5e7eb; flex-shrink: 0; }

            /* ---- Body ---- */
            .bfm-body {
                flex-grow: 1; overflow-y: auto;
                padding: 24px 28px;
                display: flex; flex-direction: column;
            }

            /* ---- Dropzone ---- */
            .bfm-dropzone {
                border: 2px dashed #d1d5db;
                border-radius: 10px;
                padding: 24px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: #fafbfc;
                flex-shrink: 0;
            }
            .bfm-dropzone:hover, .bfm-dropzone.dragover {
                border-color: #2490EF;
                background: #f0f7ff;
            }
            .bfm-dropzone-icon { margin-bottom: 12px; }
            .bfm-dropzone-title {
                font-size: 15px; font-weight: 500; color: #374151; margin: 0 0 6px;
            }
            .bfm-dropzone-hint {
                font-size: 12px; color: #9ca3af; margin: 0;
            }
            .bfm-link { color: #2490EF; cursor: pointer; text-decoration: none; font-weight: 500; }
            .bfm-link:hover { text-decoration: underline; }

            /* ---- Template Bar & Help Popover ---- */
            .bfm-template-bar {
                display: flex; align-items: center; gap: 8px;
                padding: 12px 16px; margin-top: 16px;
                background: #f8fafc;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                font-size: 13px; color: #4b5563;
                flex-shrink: 0;
            }
            .bfm-help-wrap {
                position: relative;
            }
            .bfm-help-btn {
                display: flex; align-items: center; gap: 5px;
                background: linear-gradient(135deg, #695A97, #7c6cad);
                color: #fff; border: none;
                padding: 5px 12px; border-radius: 20px;
                font-size: 12px; font-weight: 600;
                cursor: pointer;
                transition: all 0.25s ease;
                box-shadow: 0 2px 8px rgba(105, 90, 151, 0.25);
                letter-spacing: 0.3px;
            }
            .bfm-help-btn:hover {
                background: linear-gradient(135deg, #574a80, #695A97);
                box-shadow: 0 4px 14px rgba(105, 90, 151, 0.4);
                transform: translateY(-1px);
            }
            .bfm-help-btn.active {
                background: linear-gradient(135deg, #574a80, #4a3d6e);
                box-shadow: 0 1px 4px rgba(105, 90, 151, 0.3);
                transform: translateY(0);
            }
            .bfm-popover {
                position: absolute;
                right: 0; top: calc(100% + 12px);
                width: 360px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(105, 90, 151, 0.15);
                border-radius: 14px;
                box-shadow: 0 12px 40px rgba(105, 90, 151, 0.18), 0 0 0 1px rgba(255,255,255,0.8) inset;
                padding: 0;
                z-index: 9999;
                opacity: 0;
                transform: translateY(-8px) scale(0.96);
                pointer-events: none;
                transition: opacity 0.25s ease, transform 0.25s ease;
            }
            .bfm-popover.visible {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }
            .bfm-popover-arrow {
                position: absolute;
                top: -6px; right: 18px;
                width: 12px; height: 12px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid rgba(105, 90, 151, 0.15);
                border-bottom: none; border-right: none;
                transform: rotate(45deg);
            }
            .bfm-popover-header {
                display: flex; align-items: center; gap: 8px;
                padding: 14px 18px 10px;
                font-size: 13px; font-weight: 700;
                color: #695A97;
                border-bottom: 1px solid rgba(105, 90, 151, 0.08);
                letter-spacing: 0.3px;
            }
            .bfm-popover-list {
                list-style: none;
                margin: 0; padding: 12px 18px 16px;
                font-size: 12.5px; color: #4b5563;
                line-height: 1.7;
            }
            .bfm-popover-list li {
                display: flex; align-items: flex-start; gap: 8px;
                margin-bottom: 8px;
            }
            .bfm-popover-list li:last-child { margin-bottom: 0; }
            .bfm-pop-dot {
                flex-shrink: 0;
                width: 6px; height: 6px;
                border-radius: 50%;
                margin-top: 7px;
            }

            /* ---- Preview Area ---- */
            .bfm-preview-area {
                display: none; flex-direction: column;
                flex-grow: 1; overflow: hidden;
                gap: 14px;
            }
            .bfm-file-chip {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 14px;
                background: #f0f7ff;
                border: 1px solid #d6ebff;
                border-radius: 8px;
                flex-shrink: 0;
            }
            .bfm-file-name {
                font-size: 14px; font-weight: 500; color: #1e40af;
                flex-grow: 1; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
            }
            .bfm-file-remove {
                background: none; border: none; cursor: pointer; color: #9ca3af;
                padding: 4px; border-radius: 4px; transition: all 0.15s; flex-shrink: 0;
            }
            .bfm-file-remove:hover { background: #fee2e2; color: #dc2626; }

            /* ---- Message Box ---- */
            .bfm-message-box {
                display: none;
                flex-grow: 1;
                overflow-y: auto;
                padding: 14px 16px;
                border-radius: 8px;
                font-size: 13px;
                line-height: 1.6;
                border: 1px solid transparent;
            }
            .bfm-message-box.msg-error {
                display: block;
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                color: #991b1b; border-color: #fecaca;
            }
            .bfm-message-box.msg-success {
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%);
                color: #166534; border-color: #bbf7d0;
            }
            .bfm-message-box.msg-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%);
                color: #475569; border-color: #e2e8f0;
            }
            .bfm-message-box ul { padding-left: 18px; margin: 6px 0 0; }
            .bfm-message-box li { margin-bottom: 4px; }

            /* ---- Footer ---- */
            .bfm-footer {
                display: flex; align-items: center; justify-content: flex-end; gap: 10px;
                padding: 16px 28px;
                border-top: 1px solid #e5e7eb;
                flex-shrink: 0;
                background: #fafbfc;
            }
            .bfm-btn-secondary {
                background: #fff; border: 1px solid #d1d5db; color: #374151;
                padding: 9px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
                cursor: pointer; transition: all 0.15s;
            }
            .bfm-btn-secondary:hover { background: #f9fafb; border-color: #9ca3af; }
            .bfm-btn-primary {
                background: #2490EF; border: none; color: #fff;
                padding: 9px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
                cursor: pointer; transition: all 0.15s;
                display: flex; align-items: center; gap: 8px;
            }
            .bfm-btn-primary:hover { background: #1a7fd4; }
            .bfm-btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
            .bfm-btn-spinner { animation: bfmSpin 1s linear infinite; }
        </style>
    `;

    $('body').append(modal_html);

    let selected_file = null;

    // Handle Drag & Drop
    const uploadArea = document.getElementById('feasibility-upload-area');
    const fileInput = document.getElementById('feasibility-file-input');

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    // Handle Click Upload
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Handle Paste (Ctrl+V)
    const pasteHandler = (e) => {
        if ($('#bulk-feasibility-modal').length > 0 && e.clipboardData && e.clipboardData.files.length) {
            let file = e.clipboardData.files[0];
            if (file.name.match(/\.(csv|xlsx|xls)$/i) || file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv')) {
                e.preventDefault();
                if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
                    file = new File([file], file.name + ".xlsx", { type: file.type });
                }
                handleFileSelect(file);
            }
        }
    };
    window.addEventListener('paste', pasteHandler);

    // Clean up paste listener when modal closes
    $('#bulk-feasibility-modal').on('click', '.bfm-close, .bfm-btn-secondary', () => {
        window.removeEventListener('paste', pasteHandler);
    });

    // Handle Guide popover toggle
    $('#bfm-help-toggle').on('click', function(e) {
        e.stopPropagation();
        let pop = $('#bfm-popover');
        let btn = $(this);
        if (pop.hasClass('visible')) {
            pop.removeClass('visible');
            btn.removeClass('active');
        } else {
            pop.addClass('visible');
            btn.addClass('active');
        }
    });
    // Close popover on click outside
    $(document).on('click.bfm-popover', function(e) {
        if (!$(e.target).closest('#bfm-help-wrap').length) {
            $('#bfm-popover').removeClass('visible');
            $('#bfm-help-toggle').removeClass('active');
        }
    });

    // Handle Remove File — go back to dropzone
    $('#btn-remove-file').on('click', function(e) {
        e.preventDefault();
        selected_file = null;
        $('#upload-preview-area').css('display', 'none');
        $('#feasibility-upload-area').show();
        $('.bfm-template-bar').show();

        let msg_div = $('#feasibility-upload-message');
        msg_div.removeClass('msg-error msg-success msg-loading').html('');
        $('#btn-process-upload').prop('disabled', true);
        // Reset file input so the same file can be re-selected
        fileInput.value = '';
        $('#btn-process-upload .bfm-btn-spinner').hide();
        $('#btn-process-upload .bfm-btn-icon').show();
        $('#btn-process-upload .bfm-btn-text').text('Process & Create Records');
    });

    function handleFileSelect(file) {
        selected_file = file;
        $('#selected-file-name').text(file.name);
        $('#upload-preview-area').css('display', 'flex');
        $('#feasibility-upload-area').hide();
        $('.bfm-template-bar').hide();


        let msg_div = $('#feasibility-upload-message');
        let process_btn = $('#btn-process-upload');

        msg_div.removeClass('msg-error msg-success').addClass('msg-loading').html(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 120px; gap: 12px;">
                <svg class="bfm-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <span>Analyzing file and checking data...</span>
            </div>
        `);
        process_btn.prop('disabled', true);
        process_btn.find('.bfm-btn-icon').show();
        process_btn.find('.bfm-btn-spinner').hide();
        process_btn.find('.bfm-btn-text').text('Process & Create Records');

        let file_reader = new FileReader();
        file_reader.onload = function(e) {
            let file_data = e.target.result.split(',')[1];
            setTimeout(() => {
                frappe.call({
                    method: 'nexapp.api.process_bulk_feasibility',
                    args: { file_name: file.name, file_data: file_data, validate_only: 1 },
                    callback: function(r) {
                        if (!r.exc) {
                            let result = r.message || {};
                            if (result.status === "error") {
                                let err_html = `<strong>⚠ Found ${result.total_rows || 0} row(s) — validation failed:</strong><ul>`;
                                result.errors.forEach(err => { err_html += `<li>${err}</li>`; });
                                err_html += "</ul>";
                                msg_div.removeClass('msg-loading msg-success').addClass('msg-error').html(err_html);
                                process_btn.prop('disabled', true);
                            } else if (result.status === "success") {
                                msg_div.removeClass('msg-loading msg-error').addClass('msg-success')
                                    .html(`
                                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%; gap: 16px;">
                                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.15;">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                <polyline points="22 4 12 14.01 9 11.01"/>
                                            </svg>
                                            <div>
                                                <strong style="font-size: 16px;">✓ File is valid</strong><br>
                                                <span style="font-size: 13px; opacity: 0.8;">${result.total_rows || 0} record(s) ready to be created.</span>
                                            </div>
                                        </div>
                                    `);
                                process_btn.prop('disabled', false);
                            }
                        } else {
                            msg_div.removeClass('msg-loading msg-success').addClass('msg-error').html("Error reading file.");
                        }
                    }
                });
            }, 100); // Small delay to allow UI to render spinner
        };
        file_reader.readAsDataURL(file);
    }

    // Handle Template Download
    $('#download-feasibility-template').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.open('/api/method/nexapp.api.download_feasibility_template');
    });

    // Handle Processing
    $('#btn-process-upload').on('click', function() {
        if (!selected_file) return;

        let btn = $(this);
        btn.prop('disabled', true);
        btn.find('.bfm-btn-icon').hide();
        btn.find('.bfm-btn-spinner').show();
        btn.find('.bfm-btn-text').text('Processing...');
        
        let msg_div = $('#feasibility-upload-message');
        
        // Hide file chip to give maximum space to the big loader
        $('.bfm-file-chip').slideUp(200);
        
        msg_div.removeClass('msg-error msg-success').addClass('msg-loading').html(`
            <div class="bfm-big-spinner-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; gap: 24px;">
                <div class="bfm-big-spinner" style="background: #f0f7ff; padding: 20px; border-radius: 50%; box-shadow: inset 0 0 0 1px #d6ebff, 0 10px 25px rgba(36, 144, 239, 0.15);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2490EF" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </div>
                <div style="text-align: center;">
                    <h3 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1e293b;">Processing Records...</h3>
                    <p style="margin: 0; font-size: 14px; color: #64748b;">Please wait a moment while your data is being created.</p>
                </div>
            </div>
        `);

        let file_reader = new FileReader();
        file_reader.onload = function(e) {
            let file_data = e.target.result.split(',')[1];

            setTimeout(() => {
                frappe.call({
                    method: 'nexapp.api.process_bulk_feasibility',
                    args: { file_name: selected_file.name, file_data: file_data, validate_only: 0 },
                    callback: function(r) {
                    if (!r.exc) {
                        let result = r.message || {};

                        if (result.status === "error") {
                            let err_html = "<strong>⚠ Error processing upload:</strong><ul>";
                            result.errors.forEach(err => { err_html += `<li>${err}</li>`; });
                            err_html += "</ul>";
                            if (result.success_count > 0) {
                                err_html = `<strong>✓ Created ${result.success_count} record(s).</strong><br><br>` + err_html;
                            }
                            $('.bfm-file-chip').slideDown(200);
                            msg_div.removeClass('msg-loading msg-success').addClass('msg-error').html(err_html);
                            
                            btn.prop('disabled', false);
                            btn.find('.bfm-btn-spinner').hide();
                            btn.find('.bfm-btn-icon').show();
                            btn.find('.bfm-btn-text').text('Retry');
                        } else if (result.status === "success") {
                            msg_div.removeClass('msg-loading msg-error').addClass('msg-success')
                                .html(`
                                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%; gap: 16px;">
                                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.15;">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                            <polyline points="22 4 12 14.01 9 11.01"/>
                                        </svg>
                                        <div>
                                            <strong style="font-size: 18px; color: #166534;">✓ Success!</strong><br>
                                            <span style="font-size: 14px; opacity: 0.8; margin-top: 4px; display: inline-block;">${result.success_count} Feasibility record(s) created.</span>
                                        </div>
                                    </div>
                                `);
                            btn.hide();
                            setTimeout(() => {
                                $('#bulk-feasibility-modal').remove();
                                window.removeEventListener('paste', pasteHandler);
                            }, 2000);
                        }

                        listview.refresh();
                    } else {
                        $('.bfm-file-chip').slideDown(200);
                        msg_div.removeClass('msg-loading msg-success').addClass('msg-error')
                            .html("An unexpected server error occurred.");
                        
                        btn.prop('disabled', false);
                        btn.find('.bfm-btn-spinner').hide();
                        btn.find('.bfm-btn-icon').show();
                        btn.find('.bfm-btn-text').text('Process & Create Records');
                    }
                }
            });
            }, 50); // Small delay to allow UI to render spinner
        };
        file_reader.readAsDataURL(selected_file);
    });
}

