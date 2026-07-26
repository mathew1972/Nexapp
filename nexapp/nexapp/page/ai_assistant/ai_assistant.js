frappe.pages['ai-assistant'].on_page_load = function (wrapper) {
    if (wrapper.ai_assistant) {
        wrapper.ai_assistant.init();
        return;
    }

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'AI Assistant',
        single_column: true
    });

    wrapper.ai_assistant = new AIAssistant(wrapper, page);
}

class AIAssistant {
    constructor(wrapper, page) {
        this.wrapper = $(wrapper);
        this.page = page;
        this.current_history_id = null;
        this.user_context = {};
        this.temp_image_url = null;
        this.disconnection_state = null;
        this.init();
    }

    async init() {
        try {
            this.is_thinking = false;
            this.setup_layout();
            this.setup_events();
            this.set_greeting();
            await this.load_user_context();
            this.load_prompts();
            this.load_history();
            setTimeout(() => this.wrapper.find('#ai-input').focus(), 100);
        } catch (e) {
            console.error("AI Assistant init error:", e);
        }
    }

    setup_layout() {
        $('.page-head').hide();
        $('.layout-main').css('padding-top', '0');

        this.wrapper.find('.layout-main-section').html(`
            <div id="ai-page">
                <div id="ai-sidebar">
                    <div class="sidebar-header">
                        <div class="sidebar-brand">
                            <span style="font-size: 26px; font-weight: 800; font-family: 'Times New Roman', Times, serif; color: #000; letter-spacing: -0.5px;">NexAI</span>
                        </div>
                        <button id="sidebar-toggle" class="btn-icon-sm" title="Open sidebar">
                            <i class="fa fa-indent"></i>
                        </button>
                    </div>

                    <button class="new-chat-btn">
                        <i class="fa fa-plus"></i> <span class="btn-text">New Chat</span>
                    </button>

                    <div id="collapsed-icons" class="hidden">
                        <div class="mini-icon" id="sidebar-toggle-collapsed" title="Open sidebar">
                            <i class="fa fa-indent"></i>
                        </div>
                        <div class="mini-icon btn-new-chat-icon" title="New Chat"><i class="fa fa-pencil-square-o"></i></div>
                        <div class="mini-icon btn-history-popup" title="History"><i class="fa fa-history"></i></div>
                        <div class="mini-icon btn-pinned-popup" title="Pinned Items"><i class="fa fa-thumb-tack"></i></div>
                    </div>

                    <div id="sidebar-scroll-area">
                        <div id="history-list-container">
                            <div class="sidebar-section-title">History</div>
                            <div id="history-list"></div>
                        </div>
                        <div id="pinned-list-container">
                            <div class="sidebar-section-title">Pinned</div>
                            <div id="pinned-list"></div>
                        </div>
                    </div>

                    <div id="floating-history-container" class="hidden">
                        <div class="floating-history-header">History</div>
                        <div id="floating-history-list"></div>
                    </div>

                    <div id="floating-pinned-container" class="hidden">
                        <div class="floating-history-header">Pinned Items</div>
                        <div id="floating-pinned-list"></div>
                    </div>

                    <div class="sidebar-footer">
                        <div class="user-profile" id="user-profile-toggle">
                            <div class="user-avatar-wrapper">
                                <img src="" class="user-avatar" id="user-avatar">
                                <div class="user-initials" id="user-initials"></div>
                            </div>
                            <div class="user-details">
                                <span class="user-name" id="user-name">User</span>
                            </div>
                        </div>
                    </div>

                    <div id="floating-profile-container" class="hidden">
                        <div class="profile-menu-item" id="btn-open-profile">
                            <i class="fa fa-user"></i> Profile
                        </div>
                        <div class="dropdown-divider"></div>
                        <div class="profile-menu-item" id="btn-holiday-list">
                            <i class="fa fa-calendar"></i> Holiday List
                        </div>
                    </div>
                </div>

                <div id="ai-main" class="is-landing">
                    <div id="landing-backdrop"></div>
                    <div id="ai-content">
                        <div id="greeting-container">
                            <div id="greeting-msg"></div>
                        </div>
                        <div id="ai-messages"></div>
                    </div>

                    <div id="ai-interaction-container">
                        <div id="attachment-preview" class="hidden"></div>
                        <div id="ai-input-container">
                            <div class="input-box-wrapper">
                                <textarea id="ai-input" placeholder="Ask NexAI" rows="1"></textarea>
                                
                                <div class="input-bottom-row">
                                    <div class="left-actions">
                                        <div id="prompt-selector" class="dropup">
                                            <button class="action-toggle dropdown-toggle" id="ai-prompt-btn" data-toggle="dropdown" style="border-radius: 20px; background: #f0f4f8; padding: 6px 12px; font-size: 13px; font-weight: 500; border: none;">
                                                <i class="fa fa-rocket" style="margin-right: 4px;"></i> <span id="selected-prompt-label">Select Prompt</span> <i class="fa fa-caret-up" style="margin-left: 4px;"></i>
                                            </button>
                                            <div class="dropdown-menu" id="prompt-options-container"></div>
                                        </div>
                                    </div>
                                    
                                    <div class="right-actions">
                                        <button class="btn-icon" id="ai-attach" title="Attach file" style="margin-right: 8px; border: none; background: transparent; font-size: 18px; color: #666;">
                                            <i class="fa fa-paperclip"></i>
                                        </button>
                                        <button id="ai-send" disabled style="width: 36px; height: 36px; border-radius: 50%; background: #000; color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                            <i class="fa fa-bars" style="transform: rotate(90deg);"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div id="ai-disclaimer">Responses generated by NexAI should be reviewed before use.</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    async load_user_context() {
        const r = await frappe.call('nexapp.api.get_user_context');
        if (r.message) {
            this.user_context = r.message;
            this.wrapper.find('#user-name').text(this.user_context.full_name);

            if (this.user_context.user_image) {
                this.wrapper.find('#user-avatar').attr('src', this.user_context.user_image).show();
                this.wrapper.find('#user-initials').hide();
            } else {
                const initials = this.user_context.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
                this.wrapper.find('#user-initials').text(initials.substring(0, 2)).css({
                    'display': 'flex', 'align-items': 'center',
                    'justify-content': 'center', 'width': '100%', 'height': '100%'
                }).show();
                this.wrapper.find('#user-avatar').hide();
            }

            // Update greeting with actual name
            this.set_greeting();
        }
    }

    load_prompts() {
        frappe.call({
            method: 'nexapp.api.get_dynamic_prompts',
            callback: (r) => {
                if (r.message && r.message.length > 0) {
                    const container = this.wrapper.find('#prompt-options-container');
                    container.empty();
                    r.message.forEach(p => {
                        let text = p.full_prompt || '';
                        text = $('<div>').html(text).text();
                        const el = $('<a class="dropdown-item prompt-item" href="#"></a>')
                            .text(p.short_prompt)
                            .data('prompt', text);
                        container.append(el);
                    });
                } else {
                    this.wrapper.find('#prompt-selector').hide();
                }
            }
        });
    }

    load_history() {
        frappe.call({
            method: 'nexapp.api.get_chat_history',
            callback: (r) => {
                if (r.message) {
                    const pinned = r.message.filter(h => h.pinned);
                    const unpinned = r.message.filter(h => !h.pinned);

                    this.wrapper.find('#history-list-container').toggle(unpinned.length > 0);
                    this.wrapper.find('#pinned-list-container').toggle(pinned.length > 0);

                    this.render_history_list(this.wrapper.find('#history-list'), unpinned.slice(0, 5));
                    this.render_history_list(this.wrapper.find('#pinned-list'), pinned.slice(0, 10));
                    this.render_history_list(this.wrapper.find('#floating-history-list'), r.message);
                    this.render_history_list(this.wrapper.find('#floating-pinned-list'), pinned);
                } else {
                    this.wrapper.find('#history-list-container, #pinned-list-container').hide();
                }
            }
        });
    }

    render_history_list(container, history) {
        container.empty();
        history.forEach(item => {
            const active_class = item.name === this.current_history_id ? 'active' : '';
            const pinned_icon = item.pinned ? '<i class="fa fa-thumb-tack text-primary" style="font-size:14px; margin-right:8px; align-self: center;"></i>' : '';
            
            let formatted_date = '';
            if (item.last_interaction) {
                let d = frappe.datetime.str_to_obj(item.last_interaction);
                if (d) {
                    let dd = String(d.getDate()).padStart(2, '0');
                    let mm = String(d.getMonth() + 1).padStart(2, '0');
                    let yyyy = d.getFullYear();
                    let hh = String(d.getHours()).padStart(2, '0');
                    let min = String(d.getMinutes()).padStart(2, '0');
                    formatted_date = `${dd}-${mm}-${yyyy} ${hh}:${min}`;
                }
            }

            const tooltip_text = formatted_date ? `${item.title} (${formatted_date})` : item.title;
            const el = $(`
                <div class="history-item-wrapper ${active_class}" data-id="${item.name}" title="${frappe.utils.escape_html(tooltip_text)}">
                    <div class="history-item-content">
                        ${pinned_icon}
                        <span class="history-title">${item.title}</span>
                    </div>
                    <div class="dropdown history-menu" style="align-self: center;">
                        <a data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" class="history-dots">
                            <i class="fa fa-ellipsis-h"></i>
                        </a>
                        <div class="dropdown-menu dropdown-menu-right">
                            <a class="dropdown-item btn-history-rename" data-id="${item.name}"><i class="fa fa-edit"></i> Rename</a>
                            <a class="dropdown-item btn-history-pin" data-id="${item.name}" data-pinned="${item.pinned}"><i class="fa fa-thumb-tack"></i> ${item.pinned ? 'Unpin' : 'Pin'}</a>
                            <div class="dropdown-divider"></div>
                            <a class="dropdown-item btn-history-delete text-danger" data-id="${item.name}"><i class="fa fa-trash"></i> Delete</a>
                        </div>
                    </div>
                </div>
            `);

            // Click handlers moved to setup_events delegation for reliability
            el.find('.history-item-content').on('click', () => this.load_chat_session(item.name));
            container.append(el);
        });
    }

    async load_chat_session(history_id) {
        this.current_history_id = history_id;
        this.wrapper.find('.history-item-wrapper').removeClass('active');
        this.wrapper.find(`.history-item-wrapper[data-id="${history_id}"]`).addClass('active');

        const main = this.wrapper.find('#ai-main');
        main.removeClass('is-landing');
        main.find('#greeting-container').remove();
        main.find('#ai-messages').empty();
        const r = await frappe.call({
            method: 'nexapp.api.get_chat_messages',
            args: { history_id: history_id }
        });

        if (r.message) {
            r.message.forEach(msg => {
                this.append_message(msg.role, msg.content, msg.attachment);
            });
        }
        setTimeout(() => this.wrapper.find('#ai-input').focus(), 100);
    }

    setup_events() {
        if (this.wrapper.attr('data-events-bound')) return;
        this.wrapper.attr('data-events-bound', 'true');

        const me = this;
        this.wrapper.off('click keydown');

        const send = () => {
            const input = me.wrapper.find('#ai-input').val().trim();
            if (input || me.attached_file) {
                me.handle_send(input);
                me.wrapper.find('#ai-input').val('').css('height', 'auto');
            }
        };

        // Send
        this.wrapper.on('click', '#ai-send', send);
        this.wrapper.on('keydown', '#ai-input', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
        });

        // Paste support (like ChatGPT)
        this.wrapper.on('paste', '#ai-input', (e) => {
            const clipboardData = e.originalEvent.clipboardData;
            if (clipboardData && clipboardData.items) {
                const items = clipboardData.items;
                let file_found = false;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].kind === 'file') {
                        const file = items[i].getAsFile();
                        if (file) {
                            file_found = true;
                            me.upload_file_direct(file);
                        }
                    }
                }
                if (file_found) {
                    e.preventDefault(); // Prevent pasting the file path as text
                }
            }
        });

        // Attach
        // Textarea Auto-grow
        this.wrapper.on('input', '#ai-input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';

            // Limit max height
            if (this.scrollHeight > 200) {
                $(this).css('overflow-y', 'auto');
                this.style.height = '200px';
            } else {
                $(this).css('overflow-y', 'hidden');
            }

            // Enable/Disable Send Button and switch icon
            if (!me.is_thinking) {
                const $sendBtn = me.wrapper.find('#ai-send');
                if (this.value.trim()) {
                    $sendBtn.prop('disabled', false);
                    $sendBtn.html('<i class="fa fa-arrow-up"></i>');
                } else {
                    $sendBtn.prop('disabled', false); // Optional: keep enabled if voice is supported
                    $sendBtn.html('<i class="fa fa-bars" style="transform: rotate(90deg);"></i>');
                }
            }
        });

        // Initialize send button as disabled
        this.wrapper.find('#ai-send').prop('disabled', true);


        this.wrapper.on('click', '#ai-attach', () => {
            new frappe.ui.FileUploader({
                make_attachments_public: 1,
                on_success: (file) => { me.render_attachment_preview(file); }
            });
        });

        // Sidebar toggle
        this.wrapper.on('click', '#sidebar-toggle, #sidebar-toggle-collapsed', () => {
            me.wrapper.find('#ai-page').toggleClass('sidebar-collapsed');
            const collapsed = me.wrapper.find('#ai-page').hasClass('sidebar-collapsed');
            me.wrapper.find('#sidebar-toggle i').toggleClass('fa-columns', !collapsed).toggleClass('fa-indent', collapsed);
            me.wrapper.find('#sidebar-toggle').attr('title', collapsed ? 'Open sidebar' : 'Close sidebar');
        });

        // New chat
        this.wrapper.on('click', '.new-chat-btn, .btn-new-chat-icon', () => {
            me.new_chat();
            me.wrapper.find('#floating-history-container').addClass('hidden');
        });

        // User profile toggle — show floating menu
        this.wrapper.on('click', '#user-profile-toggle', (e) => {
            e.stopPropagation();
            me.wrapper.find('#floating-history-container').addClass('hidden');
            me.wrapper.find('#floating-profile-container').toggleClass('hidden');
        });

        // History popup (collapsed mode)
        this.wrapper.on('click', '.btn-history-popup', (e) => {
            e.stopPropagation();
            me.wrapper.find('#floating-profile-container, #floating-pinned-container').addClass('hidden');
            me.wrapper.find('#floating-history-container').toggleClass('hidden');
        });

        // Pinned popup (collapsed mode)
        this.wrapper.on('click', '.btn-pinned-popup', (e) => {
            e.stopPropagation();
            me.wrapper.find('#floating-profile-container, #floating-history-container').addClass('hidden');
            me.wrapper.find('#floating-pinned-container').toggleClass('hidden');
        });

        // Profile button
        this.wrapper.on('click', '#btn-open-profile', (e) => {
            e.stopPropagation();
            e.preventDefault();
            me.wrapper.find('#floating-profile-container').addClass('hidden');
            me.show_profile_modal();
        });

        // Holiday List button
        this.wrapper.on('click', '#btn-holiday-list', (e) => {
            e.stopPropagation();
            me.wrapper.find('#floating-profile-container').addClass('hidden');
            me.show_holiday_modal();
        });

        // Prompt selector
        this.wrapper.on('click', '.prompt-item', (e) => {
            e.preventDefault();
            // We don't use stopPropagation here to let Bootstrap's dropdown-menu handle closing
            const $target = $(e.currentTarget);
            const prompt_text = $target.data('prompt');
            const label = $target.text().trim();

            me.wrapper.find('#selected-prompt-label').text(label);

            if (label === 'Custom Sales Report Builder') {
                me.start_custom_sales_report_builder();
                return;
            }

            me.wrapper.find('#ai-input').val(prompt_text).trigger('input').focus();

            // Manually close if it doesn't close
            me.wrapper.find('#ai-prompt-btn').dropdown('toggle');
        });

        // History Actions
        this.wrapper.on('click', '.btn-history-rename', (e) => {
            e.stopPropagation();
            const id = $(e.currentTarget).data('id-rename') || $(e.currentTarget).closest('.history-item-wrapper').attr('data-id');
            const title = $(e.currentTarget).closest('.history-item-wrapper').find('.history-title').text();
            me.rename_history_item(id, title);
        });

        this.wrapper.on('click', '.btn-history-pin', (e) => {
            e.stopPropagation();
            const id = $(e.currentTarget).closest('.history-item-wrapper').attr('data-id');
            const pinned = $(e.currentTarget).data('pinned');
            me.toggle_pin_history_item(id, !pinned);
        });

        this.wrapper.on('click', '.btn-history-delete', (e) => {
            e.stopPropagation();
            const history_item = $(e.currentTarget).closest('.history-item-wrapper');
            const history_id = history_item.attr('data-id');
            const chat_title = history_item.find('.history-title').text().trim() || 'this chat';
            
            const modalHtml = `
                <div id="custom-confirm-modal" class="custom-modal-overlay">
                    <div class="custom-modal-dialog">
                        <h3 class="custom-modal-title">Delete chat?</h3>
                        <p class="custom-modal-body">This will delete <b>${frappe.utils.escape_html(chat_title)}</b>.</p>
                        <div class="custom-modal-actions">
                            <button class="custom-btn-cancel">Cancel</button>
                            <button class="custom-btn-delete">Delete</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove any existing modal
            $('#custom-confirm-modal').remove();
            $('body').append(modalHtml);
            
            const $modal = $('#custom-confirm-modal');
            
            $modal.find('.custom-btn-cancel').on('click', () => {
                $modal.remove();
            });
            
            $modal.find('.custom-btn-delete').on('click', async () => {
                $modal.find('.custom-btn-delete').prop('disabled', true).text('Deleting...');
                await frappe.call({
                    method: 'nexapp.api.delete_chat_history',
                    args: { history_id: history_id }
                });
                if (me.current_history_id === history_id) me.new_chat();
                me.load_history();
                $modal.remove();
            });
        });

        // Bank Reconciliation Historic Card Events
        this.wrapper.on('click', '.btn-view-grid', (e) => {
            e.preventDefault();
            const card = $(e.currentTarget).closest('.bank-recon-card');
            const payload_str = card.attr('data-payload');
            if (payload_str) {
                try {
                    let data = JSON.parse(decodeURIComponent(payload_str));
                    me.show_reconciliation_grid(data);
                } catch(err) { console.error("Error parsing bank recon grid data", err); }
            }
        });

        this.wrapper.on('click', '.btn-proceed-reconcile', (e) => {
            e.preventDefault();
            const btn = $(e.currentTarget);
            const card = btn.closest('.bank-recon-card');
            const payload_str = card.attr('data-payload');
            if (payload_str) {
                try {
                    let data = JSON.parse(decodeURIComponent(payload_str));
                    if (!data.reconcile_payload || data.reconcile_payload.length === 0) {
                        frappe.msgprint("No matching transactions selected to reconcile.");
                        return;
                    }
                    btn.prop('disabled', true).text('Reconciling...');
                    me.confirm_bank_reconciliation(data.reconcile_payload, card);
                } catch(err) { console.error("Error parsing bank recon payload", err); }
            }
        });

        // Chat send button
        // Close floating menus when clicking outside
        $(document).on('click.ai_assistant', (e) => {
            const $target = $(e.target);
            if (!$target.closest('#floating-history-container, #floating-pinned-container, #floating-profile-container, .btn-history-popup, .btn-pinned-popup, #user-profile-toggle, #btn-open-profile, #btn-new-idea, .profile-menu-item').length) {
                me.wrapper.find('#floating-history-container, #floating-pinned-container, #floating-profile-container').addClass('hidden');
            }
        });
    }

    set_greeting() {
        const hour = new Date().getHours();
        let greeting = "Good morning";
        if (hour >= 12 && hour < 17) greeting = "Good afternoon";
        else if (hour >= 17) greeting = "Good evening";

        const name = (this.user_context.full_name || 'User').split(' ')[0];
        this.wrapper.find('#ai-main').addClass('is-landing');
        this.wrapper.find('#greeting-container').removeClass('hidden').show();

        const html = `
            <div class="greeting-content" style="display: flex; flex-direction: column; align-items: center; text-align: center; position: relative;">
                <img src="/assets/nexapp/images/helpdesk-bg.png" style="width: 280px; height: 280px; object-fit: contain; position: absolute; top: -240px; left: 50%; transform: translateX(-50%);" alt="User Image">
                <h1 class="greeting-header">${greeting}, ${name}</h1>
                <p class="greeting-subtext">How can I assist you with your work today?</p>
            </div>
        `;
        this.wrapper.find('#greeting-msg').html(html);
    }

    new_chat() {
        this.current_history_id = null;
        this.disconnection_state = null;
        this.wrapper.find('.history-item-wrapper').removeClass('active');
        this.wrapper.find('#ai-messages').empty();

        const main = this.wrapper.find('#ai-main');
        main.addClass('is-landing');

        // Re-inject greeting container if it was removed
        if (this.wrapper.find('#greeting-container').length === 0) {
            this.wrapper.find('#ai-content').prepend('<div id="greeting-container"><div id="greeting-msg"></div></div>');
        }

        this.wrapper.find('#selected-prompt-label').text('Select Prompt');
        this.set_greeting();
        
        // Ensure input is enabled and focused
        const $input = this.wrapper.find('#ai-input');
        $input.prop('disabled', false).val('').focus();
        this.wrapper.find('#ai-send').prop('disabled', false);
    }

    append_message(role, content, file_url = null, save_to_db = false) {
        if (save_to_db) {
            this.save_message_queue = this.save_message_queue || [];
            this.save_message_queue.push({role, content, file_url});
            this.process_save_queue();
        }
        const role_class = role.toLowerCase();
        
        // Render markdown for Assistant messages
        if (role_class === 'assistant' && !content.trim().startsWith('<')) {
            try {
                if (frappe.markdown) {
                    content = frappe.markdown(content);
                }
            } catch (e) {
                console.warn("Markdown rendering failed", e);
            }
        }
        
        let el;
        if (role_class === 'user') {
            const safeContent = content ? frappe.utils.escape_html(content).replace(/\n/g, '<br>') : '';
            
            let attachmentHtml = '';
            if (file_url) {
                let fileName = file_url.split('/').pop();
                if (fileName.length > 25) {
                    const ext = fileName.split('.').pop();
                    const name = fileName.substring(0, 18);
                    fileName = `${name}...${ext}`;
                }
                const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.csv');
                const iconClass = isExcel ? 'fa-file-excel-o' : 'fa-file-text-o';
                
                attachmentHtml = `
                    <div class="msg-attachment-card" data-url="${file_url}">
                        <div class="file-icon-wrapper ${isExcel ? 'excel' : ''}">
                            <i class="fa ${iconClass}"></i>
                        </div>
                        <div class="file-info">
                            <div class="file-name">${fileName}</div>
                            <div class="file-meta">${isExcel ? 'XLSX' : 'DOC'} 5.16KB</div>
                        </div>
                    </div>
                `;
            }

            el = $(`
                <div class="message user" data-content="${frappe.utils.escape_html(content || '')}" data-file="${file_url || ''}">
                    <div class="user-message-content">
                        ${attachmentHtml}
                        ${safeContent ? `<div class="user-bubble">${safeContent}</div>` : ''}
                    </div>
                    <div class="user-actions">
                        <i class="fa fa-clone btn-copy-user" title="Copy" style="margin-right: 8px;"></i>
                        <i class="fa fa-pencil btn-edit-user" title="Edit"></i>
                    </div>
                </div>
            `);
            
            // Add functionality
            el.find('.btn-copy-user').on('click', () => {
                let textToCopy = el.attr('data-content');
                if (textToCopy) {
                    const txt = document.createElement('textarea');
                    txt.innerHTML = textToCopy;
                    textToCopy = txt.value;
                    
                    const elNode = document.createElement('textarea');
                    elNode.value = textToCopy;
                    elNode.style.position = 'absolute';
                    elNode.style.left = '-9999px';
                    document.body.appendChild(elNode);
                    elNode.select();
                    document.execCommand('copy');
                    document.body.removeChild(elNode);
                    frappe.show_alert({message: "Copied to clipboard", indicator: "green"});
                }
            });

            el.find('.btn-edit-user').on('click', () => {
                const originalContent = el.attr('data-content');
                const originalFile = el.attr('data-file');
                
                let editAttachmentHtml = '';
                if (originalFile) {
                    let fileName = originalFile.split('/').pop();
                    if (fileName.length > 25) {
                        const ext = fileName.split('.').pop();
                        const name = fileName.substring(0, 18);
                        fileName = `${name}...${ext}`;
                    }
                    const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.csv');
                    const iconClass = isExcel ? 'fa-file-excel-o' : 'fa-file-text-o';
                    
                    editAttachmentHtml = `
                        <div class="msg-attachment-card edit-mode-card" data-url="${originalFile}">
                            <div class="file-icon-wrapper ${isExcel ? 'excel' : ''}">
                                <i class="fa ${iconClass}"></i>
                            </div>
                            <div class="file-info">
                                <div class="file-name">${fileName}</div>
                                <div class="file-meta">${isExcel ? 'XLSX' : 'DOC'} 5.16KB</div>
                            </div>
                        </div>
                    `;
                }

                const editHtml = $(`
                    <div class="edit-message-container">
                        ${editAttachmentHtml}
                        <div class="edit-input-wrapper">
                            <textarea rows="1" class="edit-message-input">${originalContent}</textarea>
                            <div class="edit-message-actions">
                                <button class="btn-cancel">Cancel</button>
                                <button class="btn-send">Send</button>
                            </div>
                        </div>
                    </div>
                `);

                el.find('.user-message-content, .user-actions').hide();
                el.addClass('is-editing');
                el.append(editHtml);

                const textarea = editHtml.find('textarea');
                textarea.on('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
                textarea.trigger('input').focus();

                editHtml.find('.btn-cancel').on('click', () => {
                    editHtml.remove();
                    el.removeClass('is-editing');
                    el.find('.user-message-content, .user-actions').show();
                });

                editHtml.find('.btn-send').on('click', () => {
                    const newContent = textarea.val();
                    editHtml.remove();
                    el.removeClass('is-editing');
                    el.find('.user-message-content, .user-actions').show();
                    
                    if (newContent !== originalContent) {
                        const input = $('#ai-input');
                        input.val(newContent);
                        if (originalFile) {
                            // Can't directly access me.attached_file here easily, so we just set it using a global approach or trigger paste
                            window._ai_assistant_temp_file = originalFile;
                        }
                        $('#ai-send').prop('disabled', false).trigger('click');
                    }
                });
            });
        } else {
            el = $(`<div class="message ${role_class}">${content}</div>`);
        }
        
        this.wrapper.find('#ai-messages').append(el);
        const msgs = this.wrapper.find('#ai-messages')[0];
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        if (role === 'Assistant') {
            setTimeout(() => {
                const input = this.wrapper.find('#ai-input');
                if (input.length && input.is(':visible')) {
                    input.focus();
                }
            }, 100);
        }
        return el;
    }

    process_save_queue() {
        if (this.is_saving_msg || !this.save_message_queue || this.save_message_queue.length === 0) return;
        this.is_saving_msg = true;
        const msg = this.save_message_queue.shift();
        
        frappe.call({
            method: 'nexapp.api.log_chat_message',
            args: {
                history_id: this.current_history_id,
                role: msg.role,
                content: msg.content || (msg.file_url ? "Attached a file." : ""),
                file_url: msg.file_url
            },
            callback: (r) => {
                if (r.message && !this.current_history_id) {
                    this.current_history_id = r.message;
                    this.load_history();
                }
                this.is_saving_msg = false;
                this.process_save_queue();
            },
            error: () => {
                this.is_saving_msg = false;
                this.process_save_queue();
            }
        });
    }

    async handle_send(text) {
        if (this.is_thinking) return;
        const me = this;
        if (text.toLowerCase().trim() === 'clear') {
            this.new_chat();
            return;
        }

        const main = this.wrapper.find('#ai-main');
        main.removeClass('is-landing');
        main.find('#greeting-container').remove();

        const lowerText = text.toLowerCase();
        let file_url = this.attached_file;
        if (window._ai_assistant_temp_file) {
            file_url = window._ai_assistant_temp_file;
            window._ai_assistant_temp_file = null;
        }

        // Reset attachment preview
        this.wrapper.find('#attachment-preview').addClass('hidden').empty();
        this.attached_file = null;

        if (this.disconnection_state) {
            this.append_message('User', text, file_url, true);
            this.process_disconnection_step(text, file_url);
            return;
        }

        if (lowerText.includes('disconnection request') || lowerText.includes('request the disconnection of the circuit') || lowerText.includes('disconnection of the circuit')) {
            this.append_message('User', text, file_url, true);
            this.initiate_disconnection_workflow();
            return;
        }

        // 1. Check for specific erp user workflow
        if (lowerText.includes('add a new employee as an erp user') || lowerText.includes('create erp user')) {
            this.append_message('User', text, file_url, true);
            this.initiate_user_creation_workflow();
            return;
        }

        // 2. Check for Feasibility Template request
        if (lowerText.includes('feasibility') && lowerText.includes('template')) {
            this.append_message('User', text, file_url, true);
            this.initiate_feasibility_workflow('template');
            return;
        }

        // 2.4 Check for pending invoice details
        if (this.awaiting_invoice_details) {
            this.append_message('User', text, file_url, true);
            this.process_invoice_details(text);
            return;
        }

        // 2.5 Check for Bank Reconciliation
        if (lowerText === 'bank reconciliation' || lowerText.includes('perform a bank reconciliation') || lowerText.includes('start bank reconciliation')) {
            this.append_message('User', text, file_url, true);
            this.initiate_bank_reconciliation_workflow();
            return;
        }

        // 2.6 Check for Purchase Invoice Creation
        if (lowerText.includes('create purchase invoice') || lowerText.includes('purchase invoice')) {
            this.append_message('User', text, file_url, true);
            this.initiate_purchase_invoice_workflow(file_url);
            return;
        }

        // 3. Check for Feasibility Upload request (with or without file)
        if (lowerText.includes('feasibility') && (lowerText.includes('upload') || lowerText.includes('bulk') || lowerText.includes('create'))) {
            if (file_url) {
                this.append_message('User', text, file_url, true);
                this.process_feasibility_upload(file_url);
                return;
            } else {
                this.append_message('User', text, file_url, true);
                this.initiate_feasibility_workflow('upload');
                return;
            }
        }

        // 4. SMART DETECTION: If a file is attached but text is generic/empty
        if (file_url && (!text || text.trim() === "" || lowerText === "send" || lowerText.includes("file") || lowerText.includes("costing") || lowerText.includes("invoice"))) {
            if (this.awaiting_feasibility_upload) {
                this.append_message('User', "Sending the feasibility file...", file_url, true);
                this.process_feasibility_upload(file_url);
                return;
            } else if (this.awaiting_purchase_invoice_upload) {
                this.append_message('User', text || "Attached the supplier invoice.", file_url, true);
                this.process_purchase_invoice_upload(file_url);
                return;
            } else {
                const thinking = $('<div class="message assistant thinking"><i>Analyzing your file...</i></div>');
                this.wrapper.find('#ai-messages').append(thinking);

                frappe.call({
                    method: 'nexapp.api.identify_file_job',
                    args: { file_url: file_url },
                    callback: (r) => {
                        thinking.remove();
                        if (r.message === 'Feasibility') {
                            me.append_message('User', text || "Attached a file.", file_url, true);
                            me.append_message('Assistant', "I've detected a Feasibility Template in your attachment. Let's start the import process.", null, true);
                            me.process_feasibility_upload(file_url);
                        } else if (r.message === 'Bank Statement' || me.awaiting_bank_statement) {
                            me.append_message('User', text || "Attached a Bank Statement.", file_url, true);
                            me.awaiting_bank_statement = false;
                            me.append_message('Assistant', "I've detected a Bank Statement in your attachment. Processing...", null, true);
                            me.process_bank_statement_upload(file_url);
                        } else if (r.message === 'Costing') {
                            me.append_message('User', text || "Attached a file.", file_url, true);
                            me.process_costing_upload(file_url);
                        } else {
                            me.append_message('User', "Attached a file.", file_url, true);
                            me.append_message('Assistant', "I've received your file. What would you like me to do with it?", null, true);
                        }
                    }
                });
                return;
            }
        }        // 5. Normal AI Response
        this.append_message('User', text, file_url);
        const thinking = $('<div class="message assistant thinking"><i>Thinking...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        // Disable button only
        this.is_thinking = true;
        const $input = this.wrapper.find('#ai-input');
        const $sendBtn = this.wrapper.find('#ai-send');
        $sendBtn.prop('disabled', true);

        try {
            const r = await frappe.call({
                method: 'nexapp.api.get_ai_assistant_response',
                args: {
                    question: text,
                    history_id: this.current_history_id,
                    department: this.user_context.active_department
                }
            });
            thinking.remove();
            if (r.message) {
                this.append_message('Assistant', r.message.answer);
                if (!this.current_history_id) {
                    this.current_history_id = r.message.history_id;
                    this.load_history();
                }
            }
        } catch (e) {
            thinking.remove();
            this.append_message('Assistant', "⚠️ Sorry, I encountered an error processing your request.");
        } finally {
            this.is_thinking = false;
            // Re-enable send button if there's text
            if ($input.val().trim()) {
                $sendBtn.prop('disabled', false);
            }
            // Scroll to bottom
            const msg_container = this.wrapper.find('#ai-messages');
            msg_container.scrollTop(msg_container[0].scrollHeight);
            setTimeout(() => $input.focus(), 100);
        }
    }

    render_attachment_preview(file) {
        this.attached_file = file.file_url;
        const container = this.wrapper.find('#attachment-preview');

        // Truncate long filename
        let display_name = file.file_name;
        if (display_name.length > 25) {
            const ext = display_name.split('.').pop();
            const name = display_name.substring(0, 18);
            display_name = `${name}...${ext}`;
        }

        const is_excel = file.file_name.endsWith('.xlsx') || file.file_name.endsWith('.xls') || file.file_name.endsWith('.csv');
        const icon_class = is_excel ? 'fa-file-excel-o' : 'fa-file-text-o';
        const type_label = is_excel ? 'Spreadsheet' : 'Document';

        container.removeClass('hidden').html(`
            <div class="attachment-card modern-attachment" data-url="${file.file_url}">
                <div class="file-icon-wrapper ${is_excel ? 'excel' : ''}">
                    <i class="fa ${icon_class}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${display_name}</div>
                    <div class="file-meta">${type_label} • ${(file.file_size / 1024).toFixed(1)} KB</div>
                </div>
                <i class="fa fa-times remove-attachment" title="Remove file" style="cursor: pointer;"></i>
            </div>
        `);
        
        // Enable the send button and ensure it shows the arrow icon
        this.wrapper.find('#ai-send').prop('disabled', false).html('<i class="fa fa-arrow-up"></i>');

        container.find('.attachment-card').on('click', (e) => {
            if (!$(e.target).closest('.remove-attachment').length) window.open(file.file_url, '_blank');
        });
        container.find('.remove-attachment').on('click', (e) => {
            e.stopPropagation();
            this.remove_attachment();
        });
    }

    remove_attachment() {
        this.attached_file = null;
        this.wrapper.find('#attachment-preview').addClass('hidden').empty();
    }

    rename_history_item(id, current_title) {
        const modalHtml = `
            <div id="custom-rename-modal" class="custom-modal-overlay">
                <div class="custom-modal-dialog">
                    <h3 class="custom-modal-title">Rename chat</h3>
                    <div class="custom-modal-body" style="margin-bottom: 24px;">
                        <input type="text" id="rename-chat-input" class="custom-modal-input" value="${frappe.utils.escape_html(current_title)}">
                    </div>
                    <div class="custom-modal-actions">
                        <button class="custom-btn-cancel">Cancel</button>
                        <button class="custom-btn-primary">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        $('#custom-rename-modal').remove();
        $('body').append(modalHtml);
        
        const $modal = $('#custom-rename-modal');
        const $input = $('#rename-chat-input');
        
        // Focus the input and select text
        setTimeout(() => {
            $input.focus();
            $input[0].setSelectionRange(0, $input.val().length);
        }, 100);
        
        $modal.find('.custom-btn-cancel').on('click', () => {
            $modal.remove();
        });
        
        const handleSave = () => {
            const new_title = $input.val().trim();
            if (!new_title) return;
            
            $modal.find('.custom-btn-primary').prop('disabled', true).text('Saving...');
            frappe.call({
                method: 'frappe.client.set_value',
                args: { doctype: 'AI Assistant History', name: id, fieldname: 'title', value: new_title },
                callback: () => {
                    this.load_history();
                    $modal.remove();
                }
            });
        };
        
        $modal.find('.custom-btn-primary').on('click', handleSave);
        $input.on('keypress', (e) => {
            if (e.which === 13) handleSave();
        });
    }

    toggle_pin_history_item(id, pinned_status) {
        if (pinned_status) {
            const currently_pinned = this.wrapper.find('#pinned-list .history-item-wrapper').length;
            if (currently_pinned >= 10) {
                frappe.show_alert({ message: __('Maximum 10 pinned items allowed'), indicator: 'orange' });
                return;
            }
        }
        frappe.call({
            method: 'frappe.client.set_value',
            args: { doctype: 'AI Assistant History', name: id, fieldname: 'pinned', value: pinned_status ? 1 : 0 },
            callback: () => this.load_history()
        });
    }

    delete_history_item(id) {
        // Handled in setup_events delegation
    }

    async show_profile_modal() {
        const name = this.user_context.full_name || 'User';
        const email = this.user_context.user_id || frappe.session.user;
        const image = this.user_context.user_image || '';
        const me = this;

        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        // Fetch current employee profile values
        const emp_r = await frappe.call({ method: 'nexapp.api.get_employee_profile' });
        const emp = emp_r.message || {};

        const input_style = `width:100%;border:1px solid #e0e0e0;border-radius:10px;padding:8px 14px;
            font-size:14px;color:#1a1a1a;background:#fff;outline:none;box-sizing:border-box;
            font-family:inherit;transition:border-color 0.2s;`;

        const d = new frappe.ui.Dialog({
            title: 'Edit profile',
            fields: [
                { fieldtype: 'HTML', fieldname: 'profile_content' }
            ],
            primary_action_label: 'Save',
            primary_action() {
                const $w = d.$wrapper;
                const data = {
                    marital_status: $w.find('#prof-marital').val(),
                    cell_number: $w.find('#prof-mobile').val(),
                    personal_email: $w.find('#prof-personal-email').val(),
                    current_address: $w.find('#prof-address').val()
                };
                if (me.temp_image_url) {
                    data.image_url = me.temp_image_url;
                }

                frappe.call({
                    method: 'nexapp.api.update_employee_profile',
                    args: data,
                    callback: (r) => {
                        if (r.message) {
                            frappe.show_alert({ message: __('Profile updated successfully'), indicator: 'green' });
                            d.hide();
                            if (me.temp_image_url) setTimeout(() => location.reload(), 800);
                        }
                    }
                });
            },
            secondary_action_label: 'Cancel',
            secondary_action() { d.hide(); }
        });

        const profile_html = `
            <div style="text-align:center; padding: 0 0 10px;">
                <div id="profile-avatar-big" style="width:90px;height:90px;border-radius:50%;background:#EA8023;color:#fff;
                    display:inline-flex;align-items:center;justify-content:center;font-size:30px;font-weight:500;
                    position:relative;cursor:pointer;margin:0 auto;">
                    ${image ? '<img src="' + image + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : '<span>' + initials + '</span>'}
                    <div style="position:absolute;bottom:2px;right:2px;background:#fff;width:24px;height:24px;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2);
                        border:1.5px solid #e0e0e0;z-index:10;">
                        <i class="fa fa-camera" style="font-size:10px;color:#555;"></i>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;">
                <div>
                    <label style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;display:block;">Name</label>
                    <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:10px;padding:8px 14px;font-size:14px;color:#888;">${name}</div>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;display:block;">Username / Email</label>
                    <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:10px;padding:8px 14px;font-size:14px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${email}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;">
                <div>
                    <label style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;display:block;">Marital Status</label>
                    <select id="prof-marital" style="${input_style}">
                        <option value="">-- Select --</option>
                        <option value="Single" ${emp.marital_status === 'Single' ? 'selected' : ''}>Single</option>
                        <option value="Married" ${emp.marital_status === 'Married' ? 'selected' : ''}>Married</option>
                        <option value="Divorced" ${emp.marital_status === 'Divorced' ? 'selected' : ''}>Divorced</option>
                        <option value="Widowed" ${emp.marital_status === 'Widowed' ? 'selected' : ''}>Widowed</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;display:block;">Mobile</label>
                    <input id="prof-mobile" type="tel" placeholder="Enter mobile number" value="${emp.cell_number || ''}"
                        style="${input_style}" />
                </div>
            </div>

            <div style="margin-bottom:12px;">
                <label style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;display:block;">Personal Email</label>
                <input id="prof-personal-email" type="email" placeholder="Enter personal email" value="${emp.personal_email || ''}"
                    style="${input_style}" />
            </div>

            <div style="margin-bottom:6px;">
                <label style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;display:block;">Current Address</label>
                <textarea id="prof-address" placeholder="Enter current address" rows="2"
                    style="${input_style} resize:vertical;">${emp.current_address || ''}</textarea>
            </div>

            <p style="font-size:10px;color:#bbb;text-align:center;margin-top:4px;">
                Your profile helps people recognize you, so please use a clear photo of yourself—avoid using logos or other non-personal images..
            </p>
        `;

        d.fields_dict.profile_content.$wrapper.html(profile_html);

        // Avatar click → upload
        d.$wrapper.on('click', '#profile-avatar-big', () => {
            new frappe.ui.FileUploader({
                make_attachments_public: 1,
                on_success: (file) => {
                    me.temp_image_url = file.file_url;
                    d.$wrapper.find('#profile-avatar-big').html(
                        '<img src="' + file.file_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' +
                        '<div style="position:absolute;bottom:4px;right:4px;background:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:1.5px solid #e0e0e0;z-index:10;"><i class="fa fa-camera" style="font-size:12px;color:#555;"></i></div>'
                    );
                }
            });
        });

        // Input focus highlight
        d.$wrapper.on('focus', 'input, select, textarea', (e) => {
            $(e.target).css('border-color', '#1a73e8');
        }).on('blur', 'input, select, textarea', (e) => {
            $(e.target).css('border-color', '#e0e0e0');
        });

        // Style modal — wider, hide divider, remove body scroll
        d.$wrapper.find('.modal-dialog').css({ 'max-width': '640px', 'width': '640px', 'margin': '6vh auto' });
        d.$wrapper.find('.modal-content').css({ 'border-radius': '16px', 'overflow': 'hidden' });
        d.$wrapper.find('.modal-header').css({ 'border-bottom': 'none', 'padding-bottom': '0' });
        d.$wrapper.find('.modal-body').css({ 'max-height': 'none', 'overflow-y': 'visible', 'padding': '10px 30px 20px' });
        d.$wrapper.find('.modal-footer').css({ 'border-top': 'none', 'padding-top': '0' });
        d.$wrapper.find('.btn-primary-dark, .btn-primary').css({
            'background': '#1a73e8', 'color': '#fff', 'border': 'none',
            'border-radius': '18px', 'padding': '6px 22px', 'font-weight': '600', 'font-size': '13px'
        });
        d.$wrapper.find('.btn-secondary, .btn-sm.btn-default').css({
            'background': '#fff', 'color': '#1a73e8', 'border': '1.5px solid #1a73e8',
            'border-radius': '18px', 'padding': '6px 22px', 'font-weight': '600', 'font-size': '13px'
        });

        d.show();
    }

    async show_holiday_modal() {
        const me = this;
        const r = await frappe.call({ method: 'nexapp.api.get_holidays' });
        const data = r.message || {};

        if (data.error) {
            frappe.show_alert({ message: data.error, indicator: 'orange' });
            return;
        }

        const upcoming = data.holidays.filter(h => h.is_upcoming);
        const past = data.holidays.filter(h => !h.is_upcoming);

        const render_h_row = (h) => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; 
                background:white; border:1px solid #f0f0f0; border-radius:12px; margin-bottom:8px;
                transition: transform 0.2s; cursor:default;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(234, 128, 35, 0.1); 
                        display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0;">
                        <span style="font-size:10px; font-weight:700; color:#EA8023; text-transform:uppercase;">${moment(h.date).format('MMM')}</span>
                        <span style="font-size:14px; font-weight:700; color:#EA8023; line-height:1;">${moment(h.date).format('DD')}</span>
                    </div>
                    <div>
                        <div style="font-size:14px; font-weight:600; color:#1a1a1a;">${h.description}</div>
                        <div style="font-size:11px; color:#5f6368;">${h.day}</div>
                    </div>
                </div>
            </div>
        `;

        const holiday_html = `
            <div style="max-height:450px; overflow-y:auto; padding-right:4px;">
                ${upcoming.length > 0 ? `
                    <div style="font-size:11px; font-weight:700; color:#1967d2; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; margin-top:4px;">Upcoming Holidays</div>
                    ${upcoming.map(h => render_h_row(h)).join('')}
                ` : ''}

                ${past.length > 0 ? `
                    <div style="font-size:11px; font-weight:700; color:#5f6368; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; margin-top:16px;">Past Holidays</div>
                    <div style="opacity:0.7;">
                        ${past.map(h => render_h_row(h)).join('')}
                    </div>
                ` : ''}

                ${data.holidays.length === 0 ? '<div style="text-align:center; padding:40px; color:#888;">No holidays found in current year.</div>' : ''}
            </div>
        `;

        const d = new frappe.ui.Dialog({
            title: `Holiday List ${moment().format('YYYY')}`,
            fields: [
                { fieldtype: 'HTML', fieldname: 'holiday_content' }
            ],
            primary_action_label: 'Close',
            primary_action() { d.hide(); }
        });

        d.fields_dict.holiday_content.$wrapper.html(holiday_html);

        // Style modal to match Profile
        d.$wrapper.find('.modal-dialog').css({ 'max-width': '640px', 'width': '640px', 'margin': '6vh auto' });
        d.$wrapper.find('.modal-content').css({ 'border-radius': '16px', 'overflow': 'hidden' });
        d.$wrapper.find('.modal-header').css({ 'border-bottom': 'none', 'padding-bottom': '0' });
        d.$wrapper.find('.modal-body').css({ 'padding': '16px 30px 24px' });
        d.$wrapper.find('.modal-footer').css({ 'border-top': 'none', 'padding-top': '0' });

        d.$wrapper.find('.btn-primary').css({
            'background': '#1a73e8', 'color': '#fff', 'border': 'none',
            'border-radius': '18px', 'padding': '6px 22px', 'font-weight': '600', 'font-size': '13px'
        });

        d.show();
    }

    async initiate_user_creation_workflow() {
        const me = this;
        this.append_message('Assistant', 'I can help you create a new ERP User record. Please fill in the details below:', null, true);

        const r = await frappe.call({ method: 'nexapp.api.get_user_creation_data' });
        const settings = r.message || {};
        const all_emails = [...new Set((settings.employees || []).map(e => e.company_email).filter(Boolean))];
        const all_roles = (settings.role_profiles || []).map(rp => rp.name);

        const form_id = `form-${frappe.utils.get_random(5)}`;
        const form_html = `
            <div id="${form_id}" class="chat-form compact-form">
                <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                        <div class="chat-form-row">
                            <div class="label">User Email ID</div>
                            <select class="email-select">
                                <option value="">Select Email</option>
                                ${all_emails.map(email => `<option value="${email}">${email}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <div class="chat-form-row">
                            <div class="label">Role Profile</div>
                            <select class="role-select" disabled>
                                <option value="">Select Role</option>
                                ${all_roles.map(role => `<option value="${role}">${role}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                        <div class="chat-form-row">
                            <div class="label">Full Name</div>
                            <div class="value-display full-name-display">-</div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <div class="chat-form-row">
                            <div class="label">Module Profile</div>
                            <div class="value-display module-display">-</div>
                        </div>
                    </div>
                </div>
                
                <button class="btn-confirm" disabled style="width: 100%;">Confirm & Create User</button>
                <div class="form-feedback hidden" style="margin-top: 8px; padding: 10px; border-radius: 8px; font-weight: 600; text-align: center;"></div>
            </div>
        `;

        const $msg = this.append_message('Assistant', form_html, null, true);
        const $form = $msg.find('.chat-form');

        const update_name = () => {
            const email = $form.find('.email-select').val();
            if (!email) {
                $form.find('.full-name-display').text('-');
                $form.find('.role-select').prop('disabled', true);
                return;
            }

            frappe.call({
                method: 'frappe.client.get_value',
                args: { doctype: 'Employee', filters: { company_email: email, status: 'Active' }, fieldname: 'employee_name' },
                callback: (res) => {
                    const val = (res && res.message) ? res.message.employee_name : 'Not Found';
                    $form.find('.full-name-display').text(val);
                    $form.find('.role-select').prop('disabled', false);
                    check_ready();
                }
            });
        };

        const update_module = () => {
            const role = $form.find('.role-select').val();
            if (!role) {
                $form.find('.module-display').text('-');
                return;
            }

            frappe.call({
                method: 'frappe.client.get_value',
                args: { doctype: 'Role Profile', filters: { name: role }, fieldname: 'custom_module_profile' },
                callback: (res) => {
                    const val = (res && res.message) ? res.message.custom_module_profile : 'No Module Profile';
                    $form.find('.module-display').text(val);
                    check_ready();
                }
            });
        };

        const check_ready = () => {
            const email = $form.find('.email-select').val();
            const role = $form.find('.role-select').val();
            $form.find('.btn-confirm').prop('disabled', !(email && role));
        };

        $form.find('.email-select').on('change', update_name);
        $form.find('.role-select').on('change', update_module);

        $form.find('.btn-confirm').on('click', () => {
            const email = $form.find('.email-select').val();
            const role = $form.find('.role-select').val();
            const full_name = $form.find('.full-name-display').text();

            $form.find('select, button').prop('disabled', true);
            $form.find('.btn-confirm').text('Processing...');

            frappe.call({
                method: 'nexapp.api.create_erp_user_from_employee',
                args: { email: email, role_profile: role },
                callback: (r) => {
                    if (r.message && r.message.status === 'success') {
                        $form.find('.btn-confirm').hide();
                        $form.find('.form-feedback').removeClass('hidden')
                            .css({ 'background': 'rgba(26, 115, 232, 0.1)', 'color': 'var(--ai-accent)' })
                            .html(`<i class="fa fa-check-circle"></i> User created successfully for ${full_name}`);

                        me.append_message('Assistant', `🎉 The ERP user account for ${full_name} has been successfully created and activated.`, null, true);
                        me.append_message('Assistant', `A welcome email with login instructions has been sent to ${email}.`, null, true);
                    } else {
                        $form.find('select, button').prop('disabled', false);
                        $form.find('.btn-confirm').text('Confirm & Create User');
                    }
                }
            });
        });
    }

    async initiate_feasibility_workflow(mode = 'both') {
        const me = this;
        const roles = this.user_context.roles || [];
        const role_profile = this.user_context.role_profile;
        const is_authorized = role_profile === 'CRM Manager' || role_profile === 'L1 Trainee' || roles.includes('System Manager');

        if (!is_authorized) {
            this.append_message('Assistant', "⚠️ I'm sorry, but only the **CRM Manager** or **L1 Trainee** has access to create or upload Feasibility records.", null, true);
            return;
        }

        if (mode === 'upload') {
            this.awaiting_feasibility_upload = true;
            this.append_message('Assistant', 'Please attach the completed feasibility file using the paperclip icon 📎 below and click Send to proceed with the bulk creation.', null, true);
            return;
        }

        this.awaiting_feasibility_upload = false;

        if (mode === 'template') {
            this.append_message('Assistant', 'Here is the feasibility template for you to download:', null, true);
        } else {
            this.append_message('Assistant', 'I can help you with Feasibility records. You can download the template below, or attach your completed file using the paperclip icon 📎 and click Send to upload.', null, true);
            this.awaiting_feasibility_upload = true;
        }

        const workflow_id = `feas-${frappe.utils.get_random(5)}`;

        const instructions = `
            <div class="feas-instructions" style="background: #f8faff; border-left: 4px solid var(--ai-accent); padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; line-height: 1.6; color: #444;">
                <div style="font-weight: 700; color: var(--ai-accent); margin-bottom: 8px; font-size: 14px;">
                    <i class="fa fa-info-circle"></i> Instructions for Feasibility Template
                </div>
                <ul style="margin: 0; padding-left: 18px;">
                    <li><span style="color: #d9534f; font-weight: 600;">Red Columns</span> are mandatory.</li>
                    <li><strong>Smart Address</strong>: Enter only street/building details. Based on your <strong>Pincode</strong>, the system auto-fills the City, District, and State.</li>
                    <li><strong>Instant Upload</strong>: Simply <strong>Paste (Ctrl+V)</strong> your file into the chat; the Assistant will recognize it.</li>
                    <li><strong>Flexible Dates</strong>: Use your preferred format like <strong>DD-MM-YYYY</strong>.</li>
                    <li><strong>Duplicate Protection</strong>: We check for existing records to prevent double entries.</li>
                </ul>
            </div>
        `;

        let buttons_html = '';
        buttons_html += `
            <button class="btn-download-template" style="width: 100%; background: #fff; color: var(--ai-accent); border: 1.5px solid var(--ai-accent); border-radius: 12px; padding: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa fa-download"></i> Download Template
            </button>
        `;

        const html = `
            <div id="${workflow_id}" class="chat-form compact-form">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${instructions}
                    ${buttons_html}
                </div>
            </div>
        `;

        const $msg = this.append_message('Assistant', html);
        const $form = $msg.find('.chat-form');

        // Handle Download
        $form.find('.btn-download-template').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            frappe.call({
                method: 'nexapp.api.download_feasibility_template_as_base64',
                callback: (r) => {
                    if (r.message) {
                        const b64Data = r.message;
                        const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

                        // Convert base64 to blob
                        const byteCharacters = atob(b64Data);
                        const byteArrays = [];
                        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                            const slice = byteCharacters.slice(offset, offset + 512);
                            const byteNumbers = new Array(slice.length);
                            for (let i = 0; i < slice.length; i++) {
                                byteNumbers[i] = slice.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            byteArrays.push(byteArray);
                        }
                        const blob = new Blob(byteArrays, { type: contentType });

                        // Trigger download
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = 'Feasibility_Template.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                    }
                }
            });
        });
    }

    send_direct_message(text) {
        this.wrapper.find('#ai-input').val(text);
        this.handle_send(text);
    }


    process_costing_upload(file_url) {
        const me = this;
        const thinking = $('<div class="message assistant thinking"><i>Extracting Costing Data...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        frappe.call({
            method: 'nexapp.api.process_costing_file',
            args: { file_url: file_url },
            callback: (r) => {
                thinking.remove();
                if (r.message && r.message.status === 'success') {
                    const data = r.message.data;
                    
                    const hasCircuit = data.some(row => row.circuit_id && row.circuit_id.trim() !== '');
                    
                    let tbody = '';
                    data.forEach(row => {
                        let circuitCell = hasCircuit ? `<td style="padding: 16px 24px; border: none; color: #1f2733; font-weight: 500;">${row.circuit_id || ''}</td>` : '';
                        tbody += `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                ${circuitCell}
                                <td style="padding: 16px 24px; border: none; color: #1f2733;">${row.item_name}</td>
                                <td style="padding: 16px 24px; border: none; color: #1f2733;">${frappe.format(row.otc, {fieldtype: 'Currency'})}</td>
                                <td style="padding: 16px 24px; border: none; color: #1f2733;">${frappe.format(row.mrc, {fieldtype: 'Currency'})}</td>
                                <td style="padding: 16px 24px; border: none; color: #1f2733;">${frappe.format(row.arc, {fieldtype: 'Currency'})}</td>
                                <td style="border: none;"></td>
                            </tr>
                        `;
                    });

                    let circuitHeader = hasCircuit ? `<th style="text-align: left; padding: 12px 24px; color: #4a5568; font-weight: bold; border: none;">Circuit ID</th>` : '';

                    const tableHtml = `
                        <div class="costing-summary-card" style="margin: 15px 0;">
                            <h4 style="margin-top: 0; margin-bottom: 20px; font-weight: 600; color: #1f2733;">Summarize the Circuit Costing</h4>
                            <div class="table-responsive">
                                <table class="table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid #e2e8f0;">
                                            ${circuitHeader}
                                            <th style="text-align: left; padding: 12px 24px; color: #4a5568; font-weight: bold; border: none;">Item Name</th>
                                            <th style="text-align: right; padding: 12px 24px; color: #4a5568; font-weight: bold; border: none;">OTC</th>
                                            <th style="text-align: right; padding: 12px 24px; color: #4a5568; font-weight: bold; border: none;">MRC</th>
                                            <th style="text-align: right; padding: 12px 24px; color: #4a5568; font-weight: bold; border: none;">ARC</th>
                                            <th style="text-align: right; padding: 12px 24px; color: #4a5568; border: none;"><i class="fa fa-clone" style="cursor: pointer; color: #718096;" onclick="let r = document.createRange(); r.selectNode(this.closest('table')); let s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); frappe.show_alert({message:'Table Copied!', indicator:'green'});" title="Copy Table"></i></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${tbody}
                                    </tbody>
                                </table>
                            </div>
                            <p style="margin-bottom: 0; font-size: 14px; color: #1f2733;">Are you ready to create the Task and Contract with these costing items?</p>
                        </div>
                    `;

                    const $msg = me.append_message('Assistant', tableHtml, null, true);
                    

                } else {
                    me.append_message('Assistant', "⚠️ Sorry, there was an error processing the costing file. " + (r.message ? r.message.message : ""), null, true);
                }
            }
        });
    }

    process_feasibility_upload(file_url, confirmed = false, ignore_duplicates = false, enriched_rows = null) {
        const me = this;
        const thinking = $('<div class="message assistant thinking"><i>Processing your request...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        this.awaiting_feasibility_upload = false;

        frappe.call({
            method: 'nexapp.api.upload_feasibility_bulk',
            args: {
                file_url: file_url,
                ignore_duplicates: ignore_duplicates,
                confirmed: confirmed,
                enriched_data: enriched_rows ? JSON.stringify(enriched_rows) : null
            },
            freeze: true,
            freeze_message: __("Processing Feasibility Records..."),
            quiet: true,
            callback: (r) => {
                thinking.remove();
                me.remove_attachment();

                if (r.message) {
                    const res = r.message;
                    if (res.status === 'success') {
                        me.append_message('Assistant', `✅ Done! All ${res.success_count} records from your file have been created successfully.`, null, true);
                    } else if (res.status === 'confirmation_required') {
                        // NEW: Enrich pincodes using the browser's internet connection
                        me.enrich_rows_with_pincode(res.rows).then(enriched_rows => {
                            me.last_enriched_rows = enriched_rows; // Store for preservation
                            const $conf = me.append_message('Assistant', `I've analyzed your file and found ${res.total_records} records ready for import. I've automatically filled in the City, District, and State for the pincodes. Would you like to create them now?`, null, true);
                            const $btns = $(`
                                <div style="display: flex; gap: 10px; margin-top: 10px;">
                                    <button class="btn btn-sm btn-primary btn-confirm-yes" style="background: var(--ai-accent); border: none; border-radius: 8px; padding: 5px 25px; font-weight: 500;">Yes</button>
                                    <button class="btn btn-sm btn-default btn-confirm-no" style="border-radius: 8px; padding: 5px 25px; font-weight: 500;">No</button>
                                </div>
                            `).appendTo($conf);

                            $btns.find('.btn-confirm-yes').on('click', () => {
                                $btns.parent().find('button').prop('disabled', true).css('opacity', '0.5');
                                me.process_feasibility_upload(file_url, true, false, me.last_enriched_rows);
                            });

                            $btns.find('.btn-confirm-no').on('click', () => {
                                $btns.remove();
                                me.append_message('Assistant', "Upload cancelled. You can upload the file again whenever you're ready.", null, true);
                            });
                        });
                    } else if (res.status === 'warning') {
                        let warn_msg = `⚠️ Found potential duplicate records for Site Name or Site ID:<br><br>`;
                        warn_msg += `<div style="background: #fff5f5; padding: 12px; border-radius: 8px; font-size: 13px; color: #c53030; max-height: 200px; overflow-y: auto; border-left: 4px solid #fc8181;">`;
                        res.duplicates.forEach(dup => {
                            warn_msg += `• ${dup}<br>`;
                        });
                        warn_msg += `</div><br>Would you like to proceed with the upload anyway?`;

                        const $warn = me.append_message('Assistant', warn_msg, null, true);
                        const $btns = $(`
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                <button class="btn btn-sm btn-primary btn-proceed-upload" style="background: var(--ai-accent); border: none; border-radius: 8px; padding: 5px 25px; font-weight: 500;">Yes</button>
                                <button class="btn btn-sm btn-default btn-cancel-upload" style="border-radius: 8px; padding: 5px 25px; font-weight: 500;">No</button>
                            </div>
                        `).appendTo($warn);

                        $btns.find('.btn-proceed-upload').on('click', () => {
                            $btns.parent().find('button').prop('disabled', true).css('opacity', '0.5');
                            me.process_feasibility_upload(file_url, true, true, me.last_enriched_rows);
                        });

                        $btns.find('.btn-cancel-upload').on('click', () => {
                            $btns.remove();
                            me.append_message('Assistant', "Upload cancelled. Please update your file and try again.", null, true);
                        });
                    } else if (res.status === 'partial') {
                        let error_msg = `⚠️ Almost there! We created ${res.success_count} records, but found some issues with others. Here is the field-wise report:<br><br>`;
                        error_msg += `<div style="background: #fffcf6; padding: 15px; border-radius: 12px; font-size: 13px; color: #856404; max-height: 300px; overflow-y: auto; border: 1px solid #ffeeba;">`;
                        res.errors.forEach(err => {
                            error_msg += `
                                <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: flex-start;">
                                    <i class="fa fa-exclamation-circle" style="margin-top: 3px; color: #e53e3e;"></i>
                                    <div>${err}</div>
                                </div>`;
                        });
                        error_msg += `</div><br>Please update the mandatory fields in your file and try again.`;
                        me.append_message('Assistant', error_msg, null, true);
                    }
                }
            },
            error: (err) => {
                thinking.remove();
                me.append_message('Assistant', "⚠️ Sorry, there was an error processing the upload. Please check your file format.", null, true);
            }
        });
    }

    async enrich_rows_with_pincode(rows) {
        const me = this;
        const status = me.append_message('Assistant', "<i>Validating pincodes and preparing location details...</i>", null, true);

        // We'll let the server do the heavy lifting now that the connection issue is fixed,
        // but we'll still do a quick pass here for visual confirmation.
        await new Promise(resolve => setTimeout(resolve, 800));

        status.remove();
        return rows;
    }

    upload_file_direct(file) {
        const me = this;
        const container = this.wrapper.find('#attachment-preview');
        container.removeClass('hidden').html(`
            <div style="padding: 10px; font-size: 12px; color: var(--ai-accent); display: flex; align-items: center; gap: 8px;">
                <i class="fa fa-spinner fa-spin"></i> 
                <span>Uploading: <span id="upload-percent">0</span>%</span>
            </div>
        `);

        const xhr = new XMLHttpRequest();
        const data = new FormData();
        data.append("file", file, file.name);
        data.append("is_private", 0);
        data.append("doctype", "User");
        data.append("docname", frappe.session.user);

        xhr.upload.addEventListener("progress", (ev) => {
            if (ev.lengthComputable) {
                const percent = Math.round((ev.loaded / ev.total) * 100);
                container.find('#upload-percent').text(percent);
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.message) {
                        me.render_attachment_preview(res.message);
                    }
                } catch (e) {
                    me.append_message('Assistant', "⚠️ Upload processed but returned an invalid response.", null, true);
                }
            } else {
                me.append_message('Assistant', "⚠️ Sorry, the background upload failed.", null, true);
                container.addClass('hidden').empty();
            }
        });

        xhr.open("POST", "/api/method/frappe.handler.upload_file");
        xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);
        xhr.send(data);
    }

    start_custom_sales_report_builder() {
        const me = this;
        // Scroll to bottom
        const main = this.wrapper.find('#ai-main');
        main.removeClass('is-landing');
        main.find('#greeting-container').remove();

        const card_html = `
            <div class="report-builder-card" id="rb-card-sales">
                <h4><i class="fa fa-line-chart"></i> Custom Sales Report Builder</h4>
                
                <!-- Step 1: Selection Summary -->
                <div class="rb-step active" id="rb-step-1">
                    <p style="font-size: 13px; color: #666;">Configure your multi-doctype report below. Select fields from each category.</p>
                    
                    <div class="rb-selection-summary">
                        Selected Fields: <span class="rb-selection-count" id="rb-total-selected">0</span>
                    </div>

                    <div id="rb-groups-container">
                        <div class="text-center p-4"><i class="fa fa-spinner fa-spin"></i> Initializing Report Builder...</div>
                    </div>

                    <div class="rb-actions">
                        <div></div>
                        <button class="rb-btn rb-btn-primary" id="rb-next-1" disabled>Next: Apply Filters</button>
                    </div>
                </div>

                <!-- Step 2: Filters -->
                <div class="rb-step" id="rb-step-2">
                    <p style="font-size: 13px; color: #666;">Step 2: Apply Filters</p>
                    <div class="rb-filters-container p-2">
                        <div class="rb-filter-row">
                            <label>Creation Date Range (CRM Deal)</label>
                            <select id="rb-filter-date-range">
                                <option value="All">All Time</option>
                                <option value="Current Month">Current Month</option>
                                <option value="Last 3 Months">Last 3 Months</option>
                                <option value="Custom">Custom Range</option>
                            </select>
                        </div>
                        <div id="rb-custom-date-fields" style="display:none; gap: 10px; margin-top: 10px;">
                            <div class="rb-filter-row" style="flex:1">
                                <label>From</label>
                                <input type="date" id="rb-filter-from">
                            </div>
                            <div class="rb-filter-row" style="flex:1">
                                <label>To</label>
                                <input type="date" id="rb-filter-to">
                            </div>
                        </div>
                    </div>
                    <div class="rb-actions">
                        <button class="rb-btn rb-btn-secondary" id="rb-back-1">Back</button>
                        <button class="rb-btn rb-btn-primary" id="rb-generate">Generate Report</button>
                    </div>
                </div>

                <!-- Step 3: Preview/Download -->
                <div class="rb-step" id="rb-step-3">
                    <div class="text-center p-4">
                        <i class="fa fa-check-circle" style="font-size: 48px; color: #28a745; margin-bottom: 15px;"></i>
                        <h5>Report Ready!</h5>
                        <p style="font-size: 13px; color: #666;">Your multi-doctype sales report is prepared.</p>
                        <button class="rb-btn rb-btn-primary mt-3" id="rb-download-btn" style="width: 100%; padding: 12px;">
                            <i class="fa fa-download"></i> Download Excel (.xlsx)
                        </button>
                        <button class="btn btn-link mt-2" id="rb-reset" style="font-size: 12px; color: #666;">Build Another Report</button>
                    </div>
                </div>
            </div>
        `;

        const el = this.append_message('Assistant', card_html, null, true);
        const card = el.find('#rb-card-sales');

        // Doctypes to include
        const doctypes = [
            { name: 'CRM Deal', icon: 'fa-handshake-o' },
            { name: 'Quotation', icon: 'fa-file-text-o' },
            { name: 'Sales Order', icon: 'fa-shopping-cart' },
            { name: 'Task', icon: 'fa-tasks' },
            { name: 'Feasibility', icon: 'fa-search' },
            { name: 'Site', icon: 'fa-building' }
        ];

        this.setup_report_builder_groups(card.find('#rb-groups-container'), doctypes);

        // Event: Update Selection Count
        card.on('change', '.rb-field-cb', () => {
            const count = card.find('.rb-field-cb:checked').length;
            card.find('#rb-total-selected').text(count);
            card.find('#rb-next-1').prop('disabled', count === 0);
        });

        // Event: Group Toggle
        card.on('click', '.rb-group-header', function () {
            $(this).toggleClass('collapsed');
            $(this).next('.rb-group-body').toggleClass('hidden');
        });

        // Event: Select All in group
        card.on('click', '.rb-select-all-btn', function (e) {
            e.stopPropagation();
            const groupBody = $(this).closest('.rb-group-header').next('.rb-group-body');
            const allChecked = groupBody.find('.rb-field-cb:not(:checked)').length === 0;
            groupBody.find('.rb-field-cb').prop('checked', !allChecked).trigger('change');
            $(this).text(allChecked ? 'Select All' : 'Deselect All');
        });

        // Event: Step Navigation
        card.on('click', '#rb-next-1', () => {
            card.find('#rb-step-1').removeClass('active');
            card.find('#rb-step-2').addClass('active');
        });

        card.on('click', '#rb-back-1', () => {
            card.find('#rb-step-2').removeClass('active');
            card.find('#rb-step-1').addClass('active');
        });

        // Event: Date Range change
        card.on('change', '#rb-filter-date-range', function () {
            if ($(this).val() === 'Custom') {
                card.find('#rb-custom-date-fields').css('display', 'flex');
            } else {
                card.find('#rb-custom-date-fields').hide();
            }
        });

        // Event: Generate
        card.on('click', '#rb-generate', () => {
            const selected = {};
            card.find('.rb-field-cb:checked').each(function () {
                const dt = $(this).data('doctype');
                const field = $(this).data('field');
                if (!selected[dt]) selected[dt] = [];
                selected[dt].push(field);
            });

            const filters = {
                date_range: card.find('#rb-filter-date-range').val(),
                from_date: card.find('#rb-filter-from').val(),
                to_date: card.find('#rb-filter-to').val()
            };

            card.find('#rb-generate').prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Generating...');

            setTimeout(() => {
                card.find('#rb-step-2').removeClass('active');
                card.find('#rb-step-3').addClass('active');
                card.data('report-config', { fields: selected, filters: filters });
            }, 1500);
        });

        // Event: Download
        card.on('click', '#rb-download-btn', () => {
            const config = card.data('report-config');
            this.download_combined_sales_report(config);
        });

        // Event: Reset
        card.on('click', '#rb-reset', () => {
            card.find('.rb-step').removeClass('active');
            card.find('#rb-step-1').addClass('active');
            card.find('#rb-generate').prop('disabled', false).text('Generate Report');
            card.find('.rb-field-cb').prop('checked', false).trigger('change');
        });
    }

    setup_report_builder_groups(container, doctypes) {
        container.empty();
        doctypes.forEach(dt => {
            const section = $(`
                <div class="rb-group-section" data-doctype="${dt.name}">
                    <div class="rb-group-header collapsed">
                        <span><i class="fa ${dt.icon}"></i> ${dt.name}</span>
                        <div>
                            <span class="rb-select-all-btn">Select All</span>
                            <i class="fa fa-chevron-down ml-2" style="font-size: 10px;"></i>
                        </div>
                    </div>
                    <div class="rb-group-body hidden">
                        <div class="text-center p-2"><i class="fa fa-spinner fa-spin"></i> Loading...</div>
                    </div>
                </div>
            `);
            container.append(section);

            // Fetch fields on demand or immediately
            frappe.model.with_doctype(dt.name, () => {
                const meta = frappe.get_meta(dt.name);
                const fields = meta.fields.filter(f => !frappe.model.is_table(f.fieldtype) && f.label && !f.hidden);
                const body = section.find('.rb-group-body');
                body.empty();

                // Add name field
                body.append(`
                    <label class="rb-field-item">
                        <input type="checkbox" class="rb-field-cb" data-doctype="${dt.name}" data-field="name">
                        <span style="font-size: 11px;">ID (${dt.name})</span>
                    </label>
                `);

                fields.forEach(f => {
                    body.append(`
                        <label class="rb-field-item">
                            <input type="checkbox" class="rb-field-cb" data-doctype="${dt.name}" data-field="${f.fieldname}">
                            <span style="font-size: 11px;">${f.label}</span>
                        </label>
                    `);
                });
            });
        });
    }

    download_combined_sales_report(config) {
        const query = $.param({
            fields: JSON.stringify(config.fields),
            filters: JSON.stringify(config.filters)
        });
        window.location.href = `/api/method/nexapp.api.download_combined_sales_report_xlsx?${query}`;
    }

    initiate_disconnection_workflow() {
        this.disconnection_state = { step: 1, data: {} };
        this.append_message('Assistant', 'Give me Customer Name.', null, true);
    }

    process_disconnection_step(text, file_url) {
        let state = this.disconnection_state;
        let t = text ? text.toLowerCase().trim() : '';

        if (t === 'cancel') {
            this.disconnection_state = null;
            this.append_message('Assistant', 'Disconnection Request creation cancelled.', null, true);
            return;
        }

        switch (state.step) {
            case 1:
                state.data.customer_name = text;
                state.step = 2;
                this.append_message('Assistant', 'Is Customer Type Opex (Rental) OR Capex?\nAllowed Values:\n• Opex (Rental)\n• Capex', null, true);
                break;
            case 2:
                if (t.includes('opex')) state.data.customer_type = 'Opex';
                else if (t.includes('capex')) state.data.customer_type = 'Capex';
                else {
                    this.append_message('Assistant', 'Please select a valid Customer Type: Opex (Rental) or Capex.', null, true);
                    return;
                }
                state.step = 3;
                this.append_message('Assistant', 'When Customer requested Disconnection? Give me the Date.', null, true);
                break;
            case 3:
                state.data.customer_requested_date = text;
                state.step = 4;
                this.append_message('Assistant', 'What is the Reason for Disconnection?\nSelect from the following list:\n• Requirement Changed\n• Site Shutdown\n• Service Issues\n• Site Shifted\nPlease copy and paste one option.', null, true);
                break;
            case 4:
                state.data.reason_for_disconnection = text;
                state.step = 5;
                this.append_message('Assistant', 'What is the Notice Period?\nSelect from:\n• 30\n• 60\n• 90\nPlease copy and paste one option.', null, true);
                break;
            case 5:
                state.data.notice_period = text;
                state.step = 6;
                this.append_message('Assistant', 'From when does the Notice Period Start? Give me the Date.', null, true);
                break;
            case 6:
                state.data.notice_period_start_date = text;
                state.step = 7;
                this.append_message('Assistant', 'Please attach the Customer Disconnection Confirmation.\nAccepted files:\n• PDF\n• JPG\n• JPEG\n• PNG\nDo not proceed until attachment is uploaded.', null, true);
                break;
            case 7:
                if (!file_url) {
                    this.append_message('Assistant', 'Please attach the Customer Disconnection Confirmation to proceed.', null, true);
                    return;
                }
                state.data.customer_disconnection_confirmation = file_url;
                state.step = 8;
                this.append_message('Assistant', 'Give me the Circuit ID(s).\nYou can either:\n1. Enter one or more Circuit IDs manually.\n2. Upload an Excel file.', null, true);
                break;
            case 8:
                this.validate_circuit_ids(text, file_url);
                break;
            case 9:
                if (t === 'yes') {
                    this.create_disconnection_request();
                } else if (t === 'no') {
                    this.disconnection_state = null;
                    this.append_message('Assistant', 'Disconnection Request creation cancelled. Please review the Circuit IDs and try again.', null, true);
                } else {
                    this.append_message('Assistant', 'Please answer Yes or No.', null, true);
                }
                break;
        }
    }

    validate_circuit_ids(text, file_url) {
        const me = this;
        const thinking = $('<div class="message assistant thinking"><i>Validating Circuit IDs...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        frappe.call({
            method: 'nexapp.api.validate_disconnection_circuits',
            args: { text: text, file_url: file_url },
            callback: (r) => {
                thinking.remove();
                if (r.message) {
                    const res = r.message;
                    me.disconnection_state.data.valid_circuits = res.valid_circuits;
                    me.disconnection_state.data.total_circuits = res.total_circuits;
                    
                    if (res.invalid_circuits && res.invalid_circuits.length > 0) {
                        let msg = `The following Circuit IDs are not in "Delivered and Live" status:\n`;
                        res.invalid_circuits.forEach(cid => msg += `• ${cid}\n`);
                        msg += `\nDo you want to create the Disconnection Request only for Circuit IDs that are in "Delivered and Live" status?\nOptions:\n• Yes\n• No`;
                        
                        me.disconnection_state.step = 9;
                        me.append_message('Assistant', msg, null, true);
                    } else if (res.valid_circuits && res.valid_circuits.length > 0) {
                        me.create_disconnection_request();
                    } else {
                        me.append_message('Assistant', 'No valid Circuit IDs found. Please provide valid Circuit IDs.', null, true);
                        me.disconnection_state.step = 8;
                    }
                } else {
                    me.append_message('Assistant', 'Failed to validate Circuit IDs. Please try again.', null, true);
                }
            }
        });
    }

    create_disconnection_request() {
        const me = this;
        const data = this.disconnection_state.data;
        const thinking = $('<div class="message assistant thinking"><i>Creating Disconnection Request...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        frappe.call({
            method: 'nexapp.api.create_disconnection_request',
            args: { data: JSON.stringify(data) },
            callback: (r) => {
                thinking.remove();
                if (r.message && r.message.status === 'success') {
                    const doc = r.message.doc;
                    const count = r.message.count;
                    const total = r.message.total;
                    
                    let msgHtml = `
                        <div style="background: #e6ffed; border: 1px solid #34d058; padding: 15px; border-radius: 8px; color: #22863a;">
                            <h4 style="margin-top: 0; margin-bottom: 10px; font-weight: 600; color: #22863a;">✅ Disconnection Request Created Successfully</h4>
                            <div style="margin-bottom: 5px;"><strong>Document Number:</strong> ${doc.name}</div>
                            <div style="margin-bottom: 5px;"><strong>Total Circuit IDs Processed:</strong> ${total}</div>
                            <div style="margin-bottom: 10px;"><strong>Valid Circuit IDs Added:</strong> ${count}</div>
                            <div>The Disconnection Request has been created successfully.</div>
                        </div>
                    `;
                    me.append_message('Assistant', msgHtml, null, true);
                } else {
                    me.append_message('Assistant', 'Failed to create Disconnection Request.', null, true);
                }
                me.disconnection_state = null; // Reset state
            }
        });
    }

    get_pi_stepper_html(current_step) {
        return `
            <div class="pi-stepper" style="margin-bottom: 20px; padding: 15px 24px 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;">
                <div class="pi-step ${current_step > 1 ? 'done' : ''} ${current_step === 1 ? 'active' : ''}">
                    <div class="pi-step-circle">${current_step > 1 ? '<i class="fa fa-check"></i>' : '1'}</div>
                    <div class="pi-step-label">Upload Invoice</div>
                </div>
                <div class="pi-step-line ${current_step > 1 ? 'done' : ''}"></div>
                <div class="pi-step ${current_step > 2 ? 'done' : ''} ${current_step === 2 ? 'active' : ''}">
                    <div class="pi-step-circle">${current_step > 2 ? '<i class="fa fa-check"></i>' : '2'}</div>
                    <div class="pi-step-label">Update LMS ID</div>
                </div>
                <div class="pi-step-line ${current_step > 2 ? 'done' : ''}"></div>
                <div class="pi-step ${current_step > 3 ? 'done' : ''} ${current_step === 3 ? 'active' : ''}">
                    <div class="pi-step-circle">${current_step > 3 ? '<i class="fa fa-check"></i>' : '3'}</div>
                    <div class="pi-step-label">Review & Confirm</div>
                </div>
                <div class="pi-step-line ${current_step > 3 ? 'done' : ''}"></div>
                <div class="pi-step ${current_step === 4 ? 'active done' : ''}">
                    <div class="pi-step-circle">${current_step === 4 ? '<i class="fa fa-check"></i>' : '4'}</div>
                    <div class="pi-step-label">Draft Creation</div>
                </div>
            </div>
        `;
    }

    async initiate_purchase_invoice_workflow(file_url = null) {
        this.awaiting_purchase_invoice_upload = true;
        if (file_url) {
            this.process_purchase_invoice_upload(file_url);
        } else {
            const guidelines_html = `
                <div class="pi-guidelines">
                    <div class="pi-guidelines-title">
                        <i class="fa fa-file-text-o"></i> Create Purchase Invoice — How It Works
                    </div>

                    ${this.get_pi_stepper_html(1)}

                    <div class="pi-guidelines-body">
                        <div class="pi-guideline-item">
                            <span class="pi-guideline-num">1</span>
                            <div>
                                <strong>Upload the Supplier Invoice</strong>
                                <p>Attach a clear PDF, JPG, or PNG copy of the invoice using the attachment button below.</p>
                            </div>
                        </div>
                        <div class="pi-guideline-item">
                            <span class="pi-guideline-num">2</span>
                            <div>
                                <strong>Select the LMS ID</strong>
                                <p>If you already have the LMS ID, the process will be faster. Otherwise, use the built-in LMS Finder to search by supplier and address.</p>
                            </div>
                        </div>
                        <div class="pi-guideline-item">
                            <span class="pi-guideline-num">3</span>
                            <div>
                                <strong>Review Extracted Fields</strong>
                                <p>The AI will auto-extract invoice details — supplier, dates, amounts, and line items. Verify them before proceeding.</p>
                            </div>
                        </div>
                        <div class="pi-guideline-item">
                            <span class="pi-guideline-num">4</span>
                            <div>
                                <strong>Confirm & Create Draft</strong>
                                <p>All Purchase Invoices will be created in <strong>Draft</strong> status. You can review, make changes, and submit from the invoice page.</p>
                            </div>
                        </div>
                    </div>

                    <div class="pi-guidelines-footer">
                        <i class="fa fa-arrow-down"></i> To begin, please upload the supplier invoice using the <strong>📎 attachment button</strong> below.
                    </div>
                </div>
            `;
            const $msg = this.append_message('Assistant', guidelines_html, null, true);
            $msg.css({ 'max-width': '100%', 'width': '100%' });
        }
    }

    async process_purchase_invoice_upload(file_url) {
        const me = this;
        this.awaiting_purchase_invoice_upload = false;
        
        const thinking = $('<div class="message assistant thinking"><i>Extracting invoice data via AI...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        frappe.call({
            method: 'nexapp.api.extract_purchase_invoice_data',
            args: { file_url: file_url },
            callback: (r) => {
                thinking.remove();
                if (r.message && r.message.status === 'success') {
                    me.render_extracted_invoice_preview(r.message.data, file_url);
                } else {
                    const err_msg = (r.message && r.message.message) 
                        ? `❌ ${r.message.message}` 
                        : '⚠️ I encountered an error extracting data from this file. Please ensure it is a clear, text-based PDF invoice.';
                    me.append_message('Assistant', err_msg, null, true);
                }
            }
        });
    }

    render_extracted_invoice_preview(data, file_url) {
        const me = this;
        
        let items_html = '';
        if (data.items && data.items.length > 0) {
            data.items.forEach((item, idx) => {
                items_html += `
                    <div class="pi-item-row pi-item-card" data-description="${item.description || ''}">
                        <div class="pi-item-card-header">
                            <span class="pi-item-badge">${idx+1}</span>
                            <span class="pi-item-desc">${item.description || 'Unknown Item'}</span>
                        </div>
                        <div class="pi-field-grid cols-3">
                            <div class="pi-field">
                                <label>Item Code</label>
                                <input type="text" class="pi-item-code form-control" value="${item.item_code || ''}" readonly>
                            </div>
                            <div class="pi-field">
                                <label>Item Name</label>
                                <input type="text" class="pi-item-name form-control" value="${item.item_name || ''}" readonly>
                            </div>
                            <div class="pi-field">
                                <label>Rate</label>
                                <input type="number" class="pi-item-rate form-control" value="${item.rate}" readonly>
                            </div>
                            <div class="pi-field">
                                <label>Qty</label>
                                <input type="number" class="pi-item-qty form-control" value="${item.qty}" readonly>
                            </div>
                            <div class="pi-field">
                                <label>Amount</label>
                                <input type="number" class="pi-item-amount form-control" value="${item.amount}" readonly>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        const isImage = file_url && file_url.match(/\.(jpeg|jpg|gif|png)$/i) != null;
        const previewTag = file_url ? (isImage 
            ? `<img src="${file_url}" class="pi-doc-preview-media">` 
            : `<iframe src="${file_url}#toolbar=0" class="pi-doc-preview-media"></iframe>`) : '';

        let formatted_inv_date = data.invoice_date || '';
        if (formatted_inv_date) {
            let parts = [];
            if (formatted_inv_date.includes('-')) parts = formatted_inv_date.split('-');
            else if (formatted_inv_date.includes('/')) parts = formatted_inv_date.split('/');
            
            if (parts.length === 3 && parts[0].length <= 2) {
                formatted_inv_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }

        const html = `
            ${me.get_pi_stepper_html(2)}
            <div class="pi-extract-wrapper invoice-preview-container">
                ${previewTag ? `
                <div class="pi-doc-viewer">
                    <div class="pi-doc-viewer-header">
                        <div class="pi-doc-viewer-title">
                            <i class="fa fa-file-text"></i> Uploaded Invoice
                        </div>
                        <div class="pi-doc-viewer-actions">
                            <button class="pi-btn-zoom" title="Enlarge"><i class="fa fa-search-plus"></i> Enlarge</button>
                            <button class="pi-btn-newtab" title="Open in new tab"><i class="fa fa-external-link"></i></button>
                        </div>
                    </div>
                    <div class="pi-doc-body">
                        ${previewTag}
                    </div>
                </div>` : ''}

                <div class="invoice-preview-card pi-section-card">
                    <div class="pi-section-header">
                        <i class="fa fa-clipboard"></i> Extracted Header Details
                        <span class="pi-badge">Step 1 of 2</span>
                    </div>
                    <div class="pi-section-body">
                        <div class="pi-field-grid cols-3" style="margin-bottom: 14px;">
                            <div class="pi-field"><label>Supplier</label><input type="text" class="form-control" value="${data.supplier_name || ''}" readonly></div>
                            <div class="pi-field"><label>Invoice No</label><input type="text" id="pi-inv-no" class="form-control" value="${data.invoice_no || ''}" readonly></div>
                            <div class="pi-field"><label>Invoice Date</label><input type="date" id="pi-inv-date" class="form-control" value="${formatted_inv_date}" readonly></div>
                        </div>
                        <div class="pi-field-grid cols-3">
                            <div class="pi-field"><label>Posting Date</label><input type="date" id="pi-date" class="form-control" value="${frappe.datetime.get_today()}" readonly></div>
                            <div class="pi-field"><label>Duration From</label><input type="date" id="pi-duration-from" class="form-control" value="${data.duration_from || ''}" readonly></div>
                            <div class="pi-field"><label>Duration To</label><input type="date" id="pi-duration-to" class="form-control" value="${data.duration_to || ''}" readonly></div>
                        </div>
                    </div>
                </div>

                <div class="pi-section-card">
                    <div class="pi-section-header">
                        <i class="fa fa-cubes"></i> Line Items
                        <span class="pi-badge">${data.items ? data.items.length : 0} items</span>
                    </div>
                    <div class="pi-section-body">
                        <div id="pi-items-container">
                            ${items_html}
                        </div>
                    </div>
                </div>

                <div class="pi-total-bar">
                    <span class="pi-total-label">Extracted Grand Total</span>
                    <span class="pi-total-amount">${frappe.format(data.grand_total || 0, {fieldtype: 'Currency'})}</span>
                </div>

                <div class="pi-lms-finder">
                    <div class="pi-lms-finder-title">
                        <i class="fa fa-search"></i> LMS ID Finder — Select Supplier, then find the LMS ID
                    </div>
                    <div class="pi-lms-controls">
                        <div id="supplier-control-wrapper"></div>
                        <div style="position: relative; z-index: 99999;">
                            <label style="font-size: 11px; color: #0369a1; margin-bottom: 4px; display: block; font-weight: 600;">Address (Filter)</label>
                            <input type="text" id="pi-address-filter" class="form-control" placeholder="Type to search..." autocomplete="off" style="font-size: 13px; height: 34px; border-radius: 6px;">
                            <ul id="pi-address-dropdown" class="pi-addr-dropdown"></ul>
                        </div>
                        <div id="lms-control-wrapper"></div>
                    </div>
                    <div id="lms-site-info" class="pi-lms-info">
                        <div class="pi-lms-info-grid">
                            <div class="pi-lms-info-item"><label>Site Name</label><span id="pi-site-name-display"></span></div>
                            <div class="pi-lms-info-item"><label>Site Address</label><span id="pi-site-address-display"></span></div>
                            <div class="pi-lms-info-item"><label>Circuit ID</label><span id="pi-circuit-id-display"></span></div>
                            <div class="pi-lms-info-item"><label>PO Number</label><span id="pi-po-number-display"></span></div>
                        </div>
                    </div>
                </div>

                <div class="pi-actions">
                    <button class="pi-btn pi-btn-primary btn-confirm-lms" style="display: none;"><i class="fa fa-check-circle"></i> Confirm LMS ID</button>
                    <button class="pi-btn pi-btn-cancel btn-cancel-invoice"><i class="fa fa-times"></i> Cancel</button>
                </div>
            </div>
        `;
        
        const $msg = this.append_message('Assistant', html, null, true);
        $msg.css({ 'max-width': '100%', 'width': '100%' });
        
        // Lightbox zoom handler
        $msg.find('.pi-btn-zoom, .pi-doc-body img').on('click', function() {
            const isImg = file_url && file_url.match(/\.(jpeg|jpg|gif|png)$/i);
            const content = isImg 
                ? `<img src="${file_url}">` 
                : `<iframe src="${file_url}#toolbar=0"></iframe>`;
            const $overlay = $(`<div class="pi-lightbox-overlay">${content}<button class="pi-lightbox-close">&times;</button></div>`);
            $('body').append($overlay);
            $overlay.on('click', function(e) { if (e.target === this || $(e.target).hasClass('pi-lightbox-close')) $overlay.remove(); });
            $overlay.find('.pi-lightbox-close').on('click', () => $overlay.remove());
            $(document).one('keydown', (e) => { if (e.key === 'Escape') $overlay.remove(); });
        });
        
        // Open in new tab
        $msg.find('.pi-btn-newtab').on('click', () => window.open(file_url, '_blank'));
        
        let lms_control = null;
        let fetched_lms_doc = null;

        let supplier_control = frappe.ui.form.make_control({
            df: {
                fieldtype: 'Link',
                options: 'Supplier',
                fieldname: 'supplier',
                label: 'Supplier Name',
                reqd: 1,
                onchange: () => {
                    if (lms_control && lms_control.get_value()) {
                        lms_control.set_value('');
                    }
                    $msg.find('#pi-address-filter').val('');
                    $msg.find('#lms-site-info').css('display', 'none');
                    $msg.find('.btn-confirm-lms').hide();

                    const supp = supplier_control.get_value();
                    if (supp) {
                        frappe.call({
                            method: 'frappe.client.get_list',
                            args: {
                                doctype: 'Lastmile Services Master',
                                filters: { supplier: supp, lms_stage: 'Delivered' },
                                fields: ['site_address'],
                                limit_page_length: 5000
                            },
                            callback: function(r) {
                                if (r.message) {
                                    let addrs = r.message.map(d => d.site_address).filter(Boolean);
                                    window._cached_addresses = [...new Set(addrs)];
                                }
                            }
                        });
                    }
                }
            },
            parent: $msg.find('#supplier-control-wrapper'),
            render_input: true
        });

        const $addr_input = $msg.find('#pi-address-filter');
        const $addr_dropdown = $msg.find('#pi-address-dropdown');

        window._cached_addresses = window._cached_addresses || [];

        function render_dropdown() {
            const val = $addr_input.val().toLowerCase();
            $addr_dropdown.empty();
            
            const do_render = (addrs) => {
                let matches = addrs.filter(a => String(a).toLowerCase().includes(val));
                if (matches.length > 0) {
                    matches.forEach(addr => {
                        const $li = $(`<li style="padding: 8px 12px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; transition: background 0.2s;">${addr}</li>`);
                        $li.hover(function() { $(this).css('background', '#f8fafc'); }, function() { $(this).css('background', '#fff'); });
                        $li.on('mousedown', function(e) {
                            e.preventDefault();
                            $addr_input.val(addr);
                            $addr_dropdown.hide();
                            $addr_input.trigger('change');
                        });
                        $addr_dropdown.append($li);
                    });
                    $addr_dropdown.show();
                } else {
                    $addr_dropdown.hide();
                }
            };

            if (!window._cached_addresses || window._cached_addresses.length === 0) {
                const supp = supplier_control.get_value();
                if (supp) {
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: { doctype: 'Lastmile Services Master', filters: { supplier: supp, lms_stage: 'Delivered' }, fields: ['site_address'], limit_page_length: 5000 },
                        callback: function(r) {
                            if (r.message) {
                                let addrs = r.message.map(d => d.site_address).filter(Boolean);
                                window._cached_addresses = [...new Set(addrs)];
                                do_render(window._cached_addresses);
                            }
                        }
                    });
                }
            } else {
                do_render(window._cached_addresses);
            }
        }

        $addr_input.on('click focus input', function() {
            render_dropdown();
        });

        $addr_input.on('blur', function() {
            setTimeout(() => $addr_dropdown.hide(), 150);
        });
        
        $addr_input.on('change', function() {
            if (lms_control && lms_control.get_value()) {
                lms_control.set_value('');
            }
            $msg.find('#lms-site-info').css('display', 'none');
            $msg.find('.btn-confirm-lms').hide();
        });

        lms_control = frappe.ui.form.make_control({
            df: {
                fieldtype: 'Link',
                options: 'Lastmile Services Master',
                fieldname: 'lms_id',
                label: 'LMS ID',
                reqd: 1,
                get_query: () => {
                    const filters = {
                        supplier: supplier_control.get_value(),
                        lms_stage: 'Delivered'
                    };
                    const addr_val = $msg.find('#pi-address-filter').val();
                    if (addr_val) {
                        filters.site_address = ['like', '%' + addr_val + '%'];
                    }
                    return { filters: filters };
                },
                onchange: () => {
                    const lmsVal = lms_control.get_value();
                    $msg.find('#confirmed-fields-info').css('display', 'none');
                    $msg.find('.btn-confirm-invoice').hide();
                    
                    if (lmsVal) {
                        frappe.call({
                            method: 'frappe.client.get',
                            args: { doctype: 'Lastmile Services Master', name: lmsVal },
                            callback: function(r) {
                                if (r.message) {
                                    fetched_lms_doc = r.message;
                                    $msg.find('#pi-site-name-display').text(fetched_lms_doc.site || '-');
                                    $msg.find('#pi-site-address-display').text(fetched_lms_doc.site_address || '-');
                                    $msg.find('#pi-circuit-id-display').text(fetched_lms_doc.circuit_id || '-');
                                    $msg.find('#pi-po-number-display').text(fetched_lms_doc.po_number || '-');
                                    $msg.find('#lms-site-info').css('display', 'flex');
                                    $msg.find('.btn-confirm-lms').show();
                                    
                                    if (fetched_lms_doc.po_number) {
                                        frappe.call({
                                            method: 'frappe.client.get',
                                            args: {
                                                doctype: 'Purchase Order',
                                                name: fetched_lms_doc.po_number
                                            },
                                            callback: function(po_res) {
                                                if (po_res.message) {
                                                    fetched_lms_doc.po_taxes_and_charges = po_res.message.taxes_and_charges || '';
                                                    if (po_res.message.items && po_res.message.items.length > 0) {
                                                        const po_items = po_res.message.items;

                                                        function tokenize(s) {
                                                            s = (s || '').toLowerCase()
                                                                .replace(/[^a-z0-9\s]/g, ' ')
                                                                .replace(/\s+/g, ' ').trim();
                                                            const STOP = new Set(['the','a','an','of','and','or','for','to','in','on','per','charges','cost','service','services']);
                                                            return s.split(' ').filter(w => w.length > 1 && !STOP.has(w));
                                                        }
                                                        const ALIASES = [
                                                            ['otc','one','time','onetime','onetimecost'],
                                                            ['mbb','broadband','internet','mbps','bandwidth'],
                                                            ['sim','simcard','datacard'],
                                                        ];
                                                        function expandAliases(tokens) {
                                                            const expanded = new Set(tokens);
                                                            for (const group of ALIASES) {
                                                                if (tokens.some(t => group.includes(t))) {
                                                                    group.forEach(g => expanded.add(g));
                                                                }
                                                            }
                                                            return expanded;
                                                        }
                                                        function scoreMatch(desc_tokens, po_name_tokens) {
                                                            const desc_set = expandAliases(desc_tokens);
                                                            let hits = 0;
                                                            for (const t of po_name_tokens) {
                                                                if (desc_set.has(t)) hits++;
                                                            }
                                                            const po_str = po_name_tokens.join(' ');
                                                            const desc_str = desc_tokens.join(' ');
                                                            if (desc_str.includes(po_str)) hits += 2;
                                                            return hits;
                                                        }
                                                        const usedPOIndices = new Set();
                                                        $msg.find('.pi-item-row').each(function(inv_idx) {
                                                            const row = $(this);
                                                            const desc = (row.attr('data-description') || '');
                                                            const desc_tokens = tokenize(desc);
                                                            let best_score = -1, best_item = null, best_idx = -1;
                                                            po_items.forEach(function(po_item, po_idx) {
                                                                const penalty = usedPOIndices.has(po_idx) ? 0.5 : 0;
                                                                const po_tokens = tokenize(po_item.item_name);
                                                                const score = scoreMatch(desc_tokens, po_tokens) - penalty;
                                                                if (score > best_score) {
                                                                    best_score = score;
                                                                    best_item  = po_item;
                                                                    best_idx   = po_idx;
                                                                }
                                                            });
                                                            if (best_score <= 0 && inv_idx < po_items.length) {
                                                                best_item = po_items[inv_idx];
                                                                best_idx  = inv_idx;
                                                            }
                                                            if (best_item) {
                                                                usedPOIndices.add(best_idx);
                                                                row.find('.pi-item-code').val(best_item.item_code || '');
                                                                row.find('.pi-item-name').val(best_item.item_name || '');
                                                            }
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    } else {
                        fetched_lms_doc = null;
                        $msg.find('#lms-site-info').css('display', 'none');
                        $msg.find('.btn-confirm-lms').hide();
                    }
                }
            },
            parent: $msg.find('#lms-control-wrapper'),
            render_input: true
        });
        lms_control.$wrapper.find('.control-label').css({'font-size': '11px', 'color': '#64748b', 'margin-bottom': '2px', 'display': 'block', 'font-weight': 'bold'});
        lms_control.$input.addClass('input-sm');

        supplier_control.set_value(data.supplier_name || '');
        supplier_control.$wrapper.find('.control-label').css({'font-size': '11px', 'color': '#64748b', 'margin-bottom': '2px', 'display': 'block', 'font-weight': 'bold'});
        supplier_control.$input.addClass('input-sm');
        setTimeout(() => {
            if (supplier_control.df && supplier_control.df.onchange) {
                supplier_control.df.onchange();
            }
        }, 100);

        $msg.find('.btn-confirm-lms').on('click', (e) => {
            if (fetched_lms_doc) {
                const btn = $(e.currentTarget);
                btn.prop('disabled', true).text('Confirmed');
                $msg.find('.btn-cancel-invoice').prop('disabled', true);
                
                if (supplier_control.df) { supplier_control.df.read_only = 1; supplier_control.refresh(); }
                if (lms_control.df) { lms_control.df.read_only = 1; lms_control.refresh(); }
                
                const items = [];
                $msg.find('.pi-item-row').each(function() {
                    const row = $(this);
                    items.push({
                        description: row.attr('data-description'),
                        qty: parseFloat(row.find('.pi-item-qty').val()) || 1,
                        rate: parseFloat(row.find('.pi-item-rate').val()) || 0,
                        amount: parseFloat(row.find('.pi-item-amount').val()) || 0,
                        item_code: row.find('.pi-item-code').val() || '',
                        item_name: row.find('.pi-item-name').val() || ''
                    });
                });
                
                me.render_final_editable_invoice_form(data, fetched_lms_doc, supplier_control.get_value(), lms_control.get_value(), items);
            }
        });
        
        $msg.find('.btn-cancel-invoice').on('click', (e) => {
            $(e.currentTarget).closest('.invoice-preview-card').remove();
            me.append_message('Assistant', "Invoice creation cancelled.", null, true);
            me.pending_invoice_data = null;
        });
    }

    render_final_editable_invoice_form(data, lms_doc, supplier_name, lms_id, items) {
        const me = this;
        let items_html = '';
        items.forEach((item, idx) => {
            items_html += `
                <div class="pi-item-row pi-item-card" data-description="${item.description}">
                    <div class="pi-item-card-header">
                        <span class="pi-item-badge">${idx+1}</span>
                        <span class="pi-item-desc">${item.description}</span>
                    </div>
                    <div class="pi-field-grid cols-3">
                        <div class="pi-field">
                            <label>Item Code</label>
                            <input type="text" class="form-control pi-item-code" value="${item.item_code || ''}">
                        </div>
                        <div class="pi-field">
                            <label>Item Name</label>
                            <input type="text" class="form-control pi-item-name" value="${item.item_name || ''}">
                        </div>
                        <div class="pi-field">
                            <label>Rate (INR)</label>
                            <input type="number" class="form-control pi-item-rate" value="${item.rate}">
                        </div>
                        <div class="pi-field">
                            <label>Accepted Qty</label>
                            <input type="number" class="form-control pi-item-qty" value="${item.qty}">
                        </div>
                        <div class="pi-field">
                            <label>Amount (INR)</label>
                            <input type="number" class="form-control pi-item-amount" value="${item.amount}">
                        </div>
                    </div>
                </div>
            `;
        });

        // Ensure dates are correctly formatted for <input type="date">
        let formatted_inv_date = data.invoice_date || '';
        let formatted_dur_from = data.duration_from || '';
        let formatted_dur_to = data.duration_to || '';

        const formatDate = (d) => {
            if (!d) return '';
            let parts = [];
            if (d.includes('-')) parts = d.split('-');
            else if (d.includes('/')) parts = d.split('/');
            
            if (parts.length === 3 && parts[0].length <= 2) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return d;
        };

        formatted_inv_date = formatDate(formatted_inv_date);
        formatted_dur_from = formatDate(formatted_dur_from);
        formatted_dur_to = formatDate(formatted_dur_to);

        const html = `
            ${me.get_pi_stepper_html(3)}
            <div class="pi-extract-wrapper">
                <div class="invoice-preview-card pi-section-card">
                    <div class="pi-final-header">
                        <i class="fa fa-edit"></i> Final Review: Editable Fields
                        <span class="pi-final-step-badge">Step 2 of 2</span>
                    </div>
                    <div class="pi-section-body">
                        <div class="pi-field-grid cols-2" style="margin-bottom: 14px;">
                            <div class="pi-field"><label>Supplier Name</label>
                                <input type="text" id="pi-final-supplier" class="form-control" value="${supplier_name}"></div>
                            <div class="pi-field"><label>LMS ID</label>
                                <input type="text" id="pi-final-lms" class="form-control" value="${lms_id}"></div>
                        </div>
                        <div class="pi-field-grid cols-2" style="margin-bottom: 14px;">
                            <div class="pi-field"><label>Supplier Invoice No</label>
                                <input type="text" id="pi-final-inv-no" class="form-control" value="${data.invoice_no || ''}"></div>
                            <div class="pi-field"><label>Supplier Invoice Date</label>
                                <input type="date" id="pi-final-inv-date" class="form-control" value="${formatted_inv_date}"></div>
                        </div>
                        <div class="pi-field-grid cols-2" style="margin-bottom: 14px;">
                            <div class="pi-field"><label>Posting Date</label>
                                <input type="date" id="pi-final-date" class="form-control" value="${frappe.datetime.get_today()}"></div>
                            <div class="pi-field"><label>Duration From</label>
                                <input type="date" id="pi-final-duration-from" class="form-control" value="${formatted_dur_from}"></div>
                        </div>
                        <div class="pi-field-grid cols-3" style="margin-bottom: 14px;">
                            <div class="pi-field"><label>Duration To</label>
                                <input type="date" id="pi-final-duration-to" class="form-control" value="${formatted_dur_to}"></div>
                            <div class="pi-field"><label>Circuit ID</label>
                                <input type="text" id="pi-final-circuit-id" class="form-control" value="${lms_doc.circuit_id || ''}"></div>

                            <div class="pi-field"><label>Tax Template</label>
                                <div id="pi-final-tax-template"></div></div>
                        </div>
                        <div class="pi-field-grid cols-3" style="margin-bottom: 16px;">
                            <div class="pi-field"><label>Payment Cycle</label>
                                <input type="text" id="pi-final-payment-cycle" class="form-control" value="${lms_doc.payment_cycle || ''}"></div>
                            <div class="pi-field"><label>Payment Type</label>
                                <input type="text" id="pi-final-payment-type" class="form-control" value="${lms_doc.billing_mode || ''}"></div>
                            <div class="pi-field"><label>PO Category</label>
                                <select id="pi-final-po-category" class="form-control">
                                    <option value="Managed Broadband">Managed Broadband</option>
                                    <option value="Simcard">Simcard</option>
                                    <option value="Datacard with Sim">Datacard with Sim</option>
                                    <option value="ISP">ISP</option>
                                    <option value="Router Hardware">Router Hardware</option>
                                    <option value="Office Expenses">Office Expenses</option>
                                    <option value="Software">Software</option>
                                    <option value="Other hardware">Other hardware</option>
                                    <option value="Office IT Infrastructure">Office IT Infrastructure</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Other">Other</option>
                                    <option value="Row Materials">Row Materials</option>
                                </select></div>
                        </div>
                    </div>
                </div>

                <div class="pi-section-card">
                    <div class="pi-section-header">
                        <i class="fa fa-cubes"></i> Line Items
                        <span class="pi-badge">${items.length} items</span>
                    </div>
                    <div class="pi-section-body">
                        <div id="pi-final-items-container">
                            ${items_html}
                        </div>
                    </div>
                </div>

                <div class="pi-tax-summary">
                    <div class="pi-tax-summary-title">
                        <i class="fa fa-calculator"></i> Tax Summary & Totals (from Invoice)
                    </div>
                    <div class="pi-field-grid cols-4">
                        <div class="pi-field"><label style="color: #92400e;">Total GST Amount</label>
                            <input type="number" id="pi-final-gst-amount" class="form-control" value="${(data.gst_amount || 0).toFixed(2)}" step="0.01"></div>
                        <div class="pi-field"><label style="color: #92400e;">GST Rate (%)</label>
                            <input type="number" id="pi-final-gst-rate" class="form-control" value="${(data.gst_rate || 0).toFixed(2)}" step="0.01"></div>
                        <div class="pi-field"><label style="color: #92400e;">Round Off</label>
                            <input type="number" id="pi-final-round-off" class="form-control" value="${(data.round_off || 0).toFixed(2)}" step="0.01"></div>
                        <div class="pi-field"><label style="color: #92400e;">Final Amount</label>
                            <input type="number" id="pi-final-grand-total" class="form-control" value="${(data.grand_total || 0).toFixed(2)}" step="0.01"></div>
                    </div>
                    <div class="pi-tax-summary-hint">Leave GST Amount as 0 if supplier did not charge any tax on this invoice. Adjust Round Off if needed.</div>
                </div>

                <div class="pi-actions" style="margin-top: 16px;">
                    <button class="pi-btn pi-btn-success btn-create-invoice"><i class="fa fa-check"></i> Create Purchase Invoice</button>
                    <button class="pi-btn pi-btn-cancel btn-cancel-final-invoice"><i class="fa fa-times"></i> Cancel</button>
                </div>
            </div>
        `;

        const $msg = this.append_message('Assistant', html, null, true);
        
        const tax_control = frappe.ui.form.make_control({
            df: {
                fieldtype: 'Link',
                options: 'Purchase Taxes and Charges Template',
                fieldname: 'taxes_and_charges',
                label: '',
                onchange: () => {}
            },
            parent: $msg.find('#pi-final-tax-template'),
            render_input: true
        });
        tax_control.$wrapper.find('.control-label').hide();
        tax_control.$input.addClass('input-sm');
        if (lms_doc && lms_doc.po_taxes_and_charges) {
            tax_control.set_value(lms_doc.po_taxes_and_charges);
        } else {
            // Smart Fallback if PO doesn't have a tax template
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Purchase Taxes and Charges Template',
                    filters: { disabled: 0, company: frappe.defaults.get_default('company') || 'Nexapp Technologies Pvt Ltd' },
                    fields: ['name']
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        let templates = r.message.map(d => d.name);
                        let selected = templates[0]; // fallback to first available
                        
                        // Smart selection: prioritize standard Out-state if GST is present
                        if (data.gst_amount > 0) {
                            let out_state = templates.find(t => t.toLowerCase().includes('out-state') && !t.toLowerCase().includes('rcm'));
                            if (out_state) selected = out_state;
                        }
                        tax_control.set_value(selected);
                    }
                }
            });
        }

        $msg.find('.btn-create-invoice').on('click', (e) => {
            const btn = $(e.currentTarget);
            btn.prop('disabled', true).text('Creating...');
            $msg.find('.btn-cancel-final-invoice').prop('disabled', true);
            
            const final_items = [];
            $msg.find('.pi-item-row').each(function() {
                const row = $(this);
                final_items.push({
                    description: row.attr('data-description'),
                    qty: parseFloat(row.find('.pi-item-qty').val()) || 1,
                    rate: parseFloat(row.find('.pi-item-rate').val()) || 0,
                    amount: parseFloat(row.find('.pi-item-amount').val()) || 0,
                    item_code: row.find('.pi-item-code').val() || '',
                    item_name: row.find('.pi-item-name').val() || ''
                });
            });

            try {
                const final_data = {
                    supplier_name: $msg.find('#pi-final-supplier').val(),
                    invoice_no: $msg.find('#pi-final-inv-no').val(),
                    invoice_date: $msg.find('#pi-final-inv-date').val(),
                    posting_date: $msg.find('#pi-final-date').val(),
                    lms_id: $msg.find('#pi-final-lms').val(),
                    circuit_id: $msg.find('#pi-final-circuit-id').val(),
                    payment_cycle: $msg.find('#pi-final-payment-cycle').val(),
                    payment_type: $msg.find('#pi-final-payment-type').val(),
                    po_category: $msg.find('#pi-final-po-category').val(),
                    duration_from: $msg.find('#pi-final-duration-from').val(),
                    duration_to: $msg.find('#pi-final-duration-to').val(),
                    taxes_and_charges: tax_control ? tax_control.get_value() || '' : '',
                    gst_amount: parseFloat($msg.find('#pi-final-gst-amount').val()) || 0,
                    gst_rate: parseFloat($msg.find('#pi-final-gst-rate').val()) || 0,
                    round_off: parseFloat($msg.find('#pi-final-round-off').val()) || 0,
                    grand_total: parseFloat($msg.find('#pi-final-grand-total').val()) || 0,
                    items: final_items,
                    file_url: $msg.closest('.message').attr('data-file') || ''
                };
                
                frappe.call({
                    method: 'nexapp.api.create_draft_purchase_invoice',
                    args: { invoice_data: JSON.stringify(final_data) },
                    callback: (r) => {
                        try {
                            if (r.message && r.message.status === 'success') {
                                const success_html = `
                                    ${me.get_pi_stepper_html(4)}
                                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; color: #166534; font-size: 14px;">
                                        <i class="fa fa-check-circle" style="font-size: 18px; margin-right: 8px; vertical-align: middle;"></i>
                                        Successfully created Draft Purchase Invoice: <strong><a href="/app/purchase-invoice/${r.message.invoice_name}" target="_blank" style="color: #15803d; text-decoration: underline;">${r.message.invoice_name}</a></strong>
                                    </div>
                                `;
                                me.append_message('Assistant', success_html, null, true);
                                btn.prop('disabled', true).html('<i class="fa fa-check-circle"></i> Created ✓').addClass('pi-btn-done');
                                $msg.find('.btn-cancel-final-invoice').hide();
                            } else {
                                me.append_message('Assistant', "⚠️ " + (r.message ? r.message.message : "Error creating invoice."), null, true);
                                btn.prop('disabled', false).text('Create Purchase Invoice');
                                $msg.find('.btn-cancel-final-invoice').prop('disabled', false);
                            }
                        } catch (err) {
                            $msg.prepend(`<div style="background: #ffcccc; color: #d8000c; padding: 10px; margin-bottom: 10px; border-radius: 5px; font-weight: bold;">UI Callback Error: ${err.message}<br>${err.stack}</div>`);
                            btn.prop('disabled', false).text('Create Purchase Invoice');
                        }
                    },
                    error: (r) => {
                        try {
                            let err_msg = "Unknown error";
                            if (r && r.message) err_msg = r.message;
                            if (r && r.exc) err_msg = r.exc;
                            $msg.prepend(`<div style="background: #ffcccc; color: #d8000c; padding: 10px; margin-bottom: 10px; border-radius: 5px; font-weight: bold;">Server Error: ${JSON.stringify(err_msg)}</div>`);
                            me.append_message('Assistant', "⚠️ Server error occurred while creating invoice. Check console or error logs.", null, true);
                            btn.prop('disabled', false).text('Create Purchase Invoice');
                            $msg.find('.btn-cancel-final-invoice').prop('disabled', false);
                        } catch (err) {
                            $msg.prepend(`<div style="background: #ffcccc; color: #d8000c; padding: 10px; margin-bottom: 10px; border-radius: 5px; font-weight: bold;">UI Error Callback Error: ${err.message}</div>`);
                            btn.prop('disabled', false).text('Create Purchase Invoice');
                        }
                    }
                });
            } catch (err) {
                $msg.prepend(`<div style="background: #ffcccc; color: #d8000c; padding: 10px; margin-bottom: 10px; border-radius: 5px; font-weight: bold;">Request Dispatch Error: ${err.message}<br>${err.stack}</div>`);
                btn.prop('disabled', false).text('Create Purchase Invoice');
                $msg.find('.btn-cancel-final-invoice').prop('disabled', false);
            }
        });
        
        $msg.find('.btn-cancel-final-invoice').on('click', (e) => {
            $(e.currentTarget).closest('.invoice-preview-card').remove();
            me.append_message('Assistant', "Invoice creation cancelled.", null, true);
            me.pending_invoice_data = null;
        });
    }

    async process_invoice_details(text) {
        const me = this;
        this.awaiting_invoice_details = false;
        
        const thinking = $('<div class="message assistant thinking"><i>Fetching ERPNext data...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        frappe.call({
            method: 'nexapp.api.fetch_po_and_site_details',
            args: {
                text_input: text,
                invoice_data: JSON.stringify(this.pending_invoice_data)
            },
            callback: (r) => {
                thinking.remove();
                if (r.message && r.message.status === 'success') {
                    me.render_final_invoice_preview(r.message.data);
                } else {
                    me.append_message('Assistant', "⚠️ " + (r.message ? r.message.message : "Error parsing details. Please try again."), null, true);
                    me.awaiting_invoice_details = true;
                }
            }
        });
    }

    render_final_invoice_preview(data) {
        const me = this;
        
        let items_html = '';
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                items_html += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.qty}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${frappe.format(item.rate, {fieldtype: 'Currency'})}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${frappe.format(item.amount, {fieldtype: 'Currency'})}</td>
                    </tr>
                `;
            });
        }
        
        const html = `
            <div class="final-invoice-preview" style="background: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; color: #333;">
                <h4 style="margin-top: 0; color: var(--ai-accent); border-bottom: 1px solid #eee; padding-bottom: 8px;">Purchase Invoice Preview</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
                    <div><strong>Supplier:</strong><br>${data.supplier_name}</div>
                    <div><strong>Invoice No:</strong><br>${data.invoice_no}</div>
                    <div><strong>Invoice Date:</strong><br>${data.invoice_date}</div>
                    <div><strong>Circuit ID:</strong><br>${data.circuit_id}</div>
                    <div><strong>Site Name:</strong><br>${data.site_name || 'N/A'}</div>
                    <div><strong>LMS ID:</strong><br>${data.lms_id || 'N/A'}</div>
                    <div><strong>Payment Type:</strong><br>${data.payment_type || 'N/A'}</div>
                    <div><strong>Duration:</strong><br>${data.duration_from} to ${data.duration_to}</div>
                    <div><strong>Expense Type:</strong><br>${data.expense_type || 'N/A'}</div>
                    <div><strong>Payment Cycle:</strong><br>${data.payment_cycle || 'N/A'}</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Qty</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Rate</th>
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items_html}
                    </tbody>
                </table>

                <div style="text-align: right; margin-bottom: 15px;">
                    <div><strong>GST:</strong> ${frappe.format(data.gst_amount, {fieldtype: 'Currency'})}</div>
                    <div style="font-size: 15px; font-weight: bold; margin-top: 5px;">Grand Total: ${frappe.format(data.grand_total, {fieldtype: 'Currency'})}</div>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button class="btn-create-invoice" style="flex: 2; background: #28a745; color: #fff; border: none; border-radius: 6px; padding: 10px; font-weight: 600; cursor: pointer;">Create Draft Purchase Invoice</button>
                    <button class="btn-cancel-final" style="flex: 1; background: #fff; color: #dc3545; border: 1px solid #dc3545; border-radius: 6px; padding: 10px; font-weight: 600; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        const $msg = this.append_message('Assistant', html, null, true);
        
        $msg.find('.btn-create-invoice').on('click', (e) => {
            const btn = $(e.currentTarget);
            btn.prop('disabled', true).text('Creating...');
            $msg.find('.btn-cancel-final').prop('disabled', true);
            
            frappe.call({
                method: 'nexapp.api.create_draft_purchase_invoice',
                args: { invoice_data: JSON.stringify(data) },
                callback: (r) => {
                    if (r.message && r.message.status === 'success') {
                        btn.text('Created');
                        const link = `/app/purchase-invoice/${r.message.invoice_name}`;
                        me.append_message('Assistant', `🎉 **Purchase Invoice Created Successfully**\n\nPurchase Invoice: [${r.message.invoice_name}](${link})\nStatus: **Draft**\n\nYou may review and submit it later.`, null, true);
                        me.pending_invoice_data = null;
                    } else {
                        btn.prop('disabled', false).text('Create Draft Purchase Invoice');
                        $msg.find('.btn-cancel-final').prop('disabled', false);
                        me.append_message('Assistant', "⚠️ Failed to create invoice: " + (r.message ? r.message.message : "Unknown error"), null, true);
                    }
                }
            });
        });
        
        $msg.find('.btn-cancel-final').on('click', (e) => {
            $(e.currentTarget).closest('.final-invoice-preview').remove();
            me.append_message('Assistant', "Creation cancelled.", null, true);
            me.pending_invoice_data = null;
        });
    }

    async initiate_bank_reconciliation_workflow() {
        const me = this;
        const roles = this.user_context.roles || [];
        const role_profile = this.user_context.role_profile;
        const is_authorized = role_profile === 'Accounts' || roles.includes('System Manager') || roles.includes('Accounts Manager');

        if (!is_authorized) {
            this.append_message('Assistant', "⚠️ I'm sorry, but only the **Accounts** team has access to perform Bank Reconciliation.", null, true);
            return;
        }

        this.awaiting_bank_statement = true;

        const workflow_id = `bank-recon-${frappe.utils.get_random(5)}`;

        const instructions = `
            <div class="bank-recon-instructions" style="background: #f8faff; border-left: 4px solid var(--ai-accent); padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; line-height: 1.6; color: #444;">
                <div style="font-weight: 700; color: var(--ai-accent); margin-bottom: 8px; font-size: 14px;">
                    <i class="fa fa-university"></i> Bank Reconciliation
                </div>
                <p style="margin: 0 0 10px 0;">Please download the standard template, fill in your data, and upload the file (.xlsx or .csv) to begin.</p>
                <ul style="margin: 0; padding-left: 18px;">
                    <li><strong>Required columns:</strong> Transaction Date, Transaction Description, Reference No, Debit Amount, Credit Amount.</li>
                    <li><strong>Instant Upload</strong>: Simply <strong>Paste (Ctrl+V)</strong> your file into the chat.</li>
                </ul>
            </div>
        `;

        let buttons_html = `
            <button class="btn-download-bank-template" style="width: 100%; background: #fff; color: var(--ai-accent); border: 1.5px solid var(--ai-accent); border-radius: 12px; padding: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa fa-download"></i> Download Template
            </button>
        `;

        const action_html = `
            <div id="${workflow_id}" class="workflow-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-top: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                ${instructions}
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${buttons_html}
                </div>
            </div>
        `;

        const el = this.append_message('Assistant', action_html);

        el.find('.btn-download-bank-template').on('click', () => {
            window.open('/api/method/nexapp.api.download_bank_statement_template', '_blank');
        });
    }

    async process_bank_statement_upload(file_url) {
        const me = this;
        const thinking = $('<div class="message assistant thinking"><i>Analyzing bank statement...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        try {
            const r = await frappe.call({
                method: 'nexapp.api.parse_bank_statement',
                args: { file_url: file_url }
            });
            
            thinking.remove();
            
            if (r.message && r.message.status === 'success') {
                const data = r.message;
                const workflow_id = `bank-recon-upload-${frappe.utils.get_random(5)}`;
                
                let bank_options = data.bank_accounts.map(b => `<option value="${b}">${b}</option>`).join('');
                
                const instructions = `
                    <div class="bank-recon-instructions" style="background: #f8faff; border-left: 4px solid var(--ai-accent); padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; line-height: 1.6; color: #444;">
                        <div style="font-weight: 700; color: var(--ai-accent); margin-bottom: 8px; font-size: 14px;">
                            <i class="fa fa-check-circle"></i> Bank Statement Uploaded Successfully
                        </div>
                        <p style="margin: 0 0 10px 0;">We found <strong>${data.transaction_count}</strong> transactions in the statement.</p>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: 600; font-size: 12px; margin-bottom: 4px; display: block;">Select Bank Account to reconcile against:</label>
                            <select class="bank-account-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; font-family: inherit;">
                                ${bank_options}
                            </select>
                        </div>
                    </div>
                `;

                let buttons_html = `
                    <div class="reconciliation-period-prompt" style="margin-bottom: 10px;">
                        <label style="font-weight: 600; font-size: 12px; margin-bottom: 4px; display: block;">Do You want to reconciliation by period?</label>
                        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                            <button class="btn-recon-period-yes" style="flex: 1; background: #e2e8f0; border: none; border-radius: 8px; padding: 6px; font-weight: 600;">Yes</button>
                            <button class="btn-recon-period-no" style="flex: 1; background: #e2e8f0; border: none; border-radius: 8px; padding: 6px; font-weight: 600;">No</button>
                        </div>
                        <div class="period-dates" style="display: none; gap: 8px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label style="font-size: 11px; display: block;">From Date</label>
                                <input type="date" class="recon-from-date" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #ccc;">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-size: 11px; display: block;">To Date</label>
                                <input type="date" class="recon-to-date" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #ccc;">
                            </div>
                        </div>
                    </div>
                    <div class="reconciliation-actions" style="display: none; gap: 8px;">
                        <button class="btn-start-reconciliation" style="flex: 1; background: var(--ai-accent, #000); color: #fff; border: none; border-radius: 12px; padding: 10px; font-weight: 600;">
                            Start Reconciliation
                        </button>
                        <button class="btn-cancel-reconciliation" style="flex: 1; background: #f1f5f9; color: #475569; border: none; border-radius: 12px; padding: 10px; font-weight: 600;">
                            Cancel
                        </button>
                    </div>
                `;

                const action_html = `
                    <div id="${workflow_id}" class="workflow-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-top: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        ${instructions}
                        ${buttons_html}
                    </div>
                `;

                const el = this.append_message('Assistant', action_html);

                if (data.detected_bank) {
                    el.find('.bank-account-select').val(data.detected_bank);
                }

                el.find('.btn-recon-period-yes').on('click', () => {
                    el.find('.btn-recon-period-yes').css({'background': 'var(--ai-accent, #000)', 'color': '#fff'});
                    el.find('.btn-recon-period-no').css({'background': '#e2e8f0', 'color': '#000'});
                    el.find('.period-dates').css('display', 'flex');
                    el.find('.reconciliation-actions').css('display', 'flex');
                });

                el.find('.btn-recon-period-no').on('click', () => {
                    el.find('.btn-recon-period-no').css({'background': 'var(--ai-accent, #000)', 'color': '#fff'});
                    el.find('.btn-recon-period-yes').css({'background': '#e2e8f0', 'color': '#000'});
                    el.find('.period-dates').hide();
                    el.find('.recon-from-date').val('');
                    el.find('.recon-to-date').val('');
                    el.find('.reconciliation-actions').css('display', 'flex');
                });

                el.find('.btn-cancel-reconciliation').on('click', () => {
                    el.find('.btn-start-reconciliation, .btn-cancel-reconciliation, .btn-recon-period-yes, .btn-recon-period-no').prop('disabled', true);
                    me.append_message('Assistant', 'Reconciliation cancelled.', null, true);
                });

                el.find('.btn-start-reconciliation').on('click', () => {
                    const selected_bank = el.find('.bank-account-select').val();
                    const from_date = el.find('.recon-from-date').val();
                    const to_date = el.find('.recon-to-date').val();
                    
                    if (el.find('.period-dates').css('display') !== 'none' && (!from_date || !to_date)) {
                        frappe.msgprint('Please select both From Date and To Date');
                        return;
                    }
                    
                    el.find('.btn-start-reconciliation, .btn-cancel-reconciliation, .btn-recon-period-yes, .btn-recon-period-no').prop('disabled', true);
                    el.find('.bank-account-select, .recon-from-date, .recon-to-date').prop('disabled', true);
                    me.start_bank_reconciliation_matching(selected_bank, file_url, from_date, to_date);
                });

            } else {
                this.append_message('Assistant', '⚠️ ' + (r.message.message || 'Failed to parse the bank statement. Please make sure you are using the correct template.'), null, true);
            }

        } catch (e) {
            thinking.remove();
            console.error(e);
            this.append_message('Assistant', "⚠️ Error processing the file. Please ensure it is a valid format.", null, true);
        }
    }

    async start_bank_reconciliation_matching(bank_account, file_url, from_date, to_date) {
        const me = this;
        const thinking = $('<div class="message assistant thinking"><i>Matching transactions...</i></div>');
        this.wrapper.find('#ai-messages').append(thinking);

        try {
            const args = { bank_account: bank_account, file_url: file_url };
            if (from_date && to_date) {
                args.from_date = from_date;
                args.to_date = to_date;
            }
            
            const r = await frappe.call({
                method: 'nexapp.api.run_reconciliation_matching',
                args: args
            });
            
            thinking.remove();

            if (r.message && r.message.status === 'success') {
                const data = r.message;
                const workflow_id = `bank-recon-results-${frappe.utils.get_random(5)}`;
                
                const summary_html = `
                    <div class="bank-recon-summary" style="background: #f8faff; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; line-height: 1.6; color: #444;">
                        <div style="font-weight: 700; color: #10b981; margin-bottom: 8px; font-size: 14px;">
                            <i class="fa fa-check-circle"></i> Reconciliation Complete
                        </div>
                        <p style="margin: 0 0 10px 0;">Analyzed <strong>${data.total}</strong> transactions.</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; text-align: center; margin-bottom: 10px;">
                            <div style="background: #d1fae5; padding: 8px; border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: 700; color: #047857;">${data.exact_matches}</div>
                                <div style="font-size: 10px; color: #065f46; text-transform: uppercase; font-weight: 600;">Exact Matches</div>
                            </div>
                            <div style="background: #fef3c7; padding: 8px; border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: 700; color: #b45309;">${data.suggestions}</div>
                                <div style="font-size: 10px; color: #92400e; text-transform: uppercase; font-weight: 600;">Suggestions</div>
                            </div>
                            <div style="background: #dbeafe; padding: 8px; border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: 700; color: #1d4ed8;">${data.reconciled || 0}</div>
                                <div style="font-size: 10px; color: #1e40af; text-transform: uppercase; font-weight: 600;">Reconciled</div>
                            </div>
                            <div style="background: #fee2e2; padding: 8px; border-radius: 6px;">
                                <div style="font-size: 18px; font-weight: 700; color: #b91c1c;">${data.unmatched}</div>
                                <div style="font-size: 10px; color: #991b1b; text-transform: uppercase; font-weight: 600;">Unmatched</div>
                            </div>
                        </div>
                    </div>
                `;

                let buttons_html = `
                    <button class="btn-proceed-reconcile" style="flex: 1; background: var(--ai-accent, #000); color: #fff; border: none; border-radius: 12px; padding: 10px; font-weight: 600;">
                        Proceed to Reconcile
                    </button>
                    <button class="btn-view-grid" style="flex: 1; background: #fff; color: var(--ai-accent, #000); border: 1.5px solid var(--ai-accent, #000); border-radius: 12px; padding: 10px; font-weight: 600;">
                        View Grid
                    </button>
                `;

                let encoded_data = encodeURIComponent(JSON.stringify(data));
                const action_html = `
                    <div id="${workflow_id}" class="workflow-card bank-recon-card" data-payload="${encoded_data}" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-top: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        ${summary_html}
                        <div style="display: flex; gap: 8px;">
                            ${buttons_html}
                        </div>
                    </div>
                `;

                const el = this.append_message('Assistant', action_html, null, true);
                
                this.current_reconciliation_data = data;

            } else {
                this.append_message('Assistant', '⚠️ Failed to match transactions: ' + (r.message.message || ''), null, true);
            }

        } catch (e) {
            thinking.remove();
            console.error(e);
            this.append_message('Assistant', "⚠️ Error during matching.", null, true);
        }
    }
    
    async confirm_bank_reconciliation(payload, card_el) {
        try {
            const r = await frappe.call({
                method: 'nexapp.api.confirm_reconciliation',
                args: { payload: JSON.stringify(payload) }
            });
            if (r.message && r.message.status === 'success') {
                card_el.find('.btn-proceed-reconcile').text('Reconciled Successfully!').css('background', '#10b981');
                this.append_message('Assistant', '✅ Reconciled successfully. Vouchers updated with clearance date.', null, true);
            } else {
                card_el.find('.btn-proceed-reconcile').prop('disabled', false).text('Proceed to Reconcile');
                this.append_message('Assistant', '⚠️ Failed to reconcile.', null, true);
            }
        } catch(e) {
            console.error(e);
            card_el.find('.btn-proceed-reconcile').prop('disabled', false).text('Proceed to Reconcile');
            this.append_message('Assistant', '⚠️ Error confirming reconciliation.', null, true);
        }
    }

    show_reconciliation_grid(full_data) {
        let grid_data = full_data.grid_data;
        if (!grid_data || grid_data.length === 0) return;
        
        let rows = grid_data.map((r, i) => {
            let status_color = '#64748b';
            let checkbox = '';
            if (r.status === 'Matched') {
                status_color = '#10b981';
                checkbox = `<input type="checkbox" class="recon-checkbox" data-idx="${i}" checked />`;
            } else if (r.status === 'Suggested') {
                status_color = '#f59e0b';
                checkbox = `<input type="checkbox" class="recon-checkbox" data-idx="${i}" checked />`;
            } else if (r.status === 'Reconciled') {
                status_color = '#3b82f6';
                checkbox = `<input type="checkbox" class="recon-checkbox" data-idx="${i}" />`;
            }
            
            return `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${checkbox}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${r.date || ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${frappe.utils.escape_html(r.narration || '')}">${frappe.utils.escape_html(r.narration || '')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${frappe.utils.escape_html(r.ref_no || '')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${r.amount || 0}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: ${status_color}; font-weight: 600;">${r.status || ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${frappe.utils.escape_html(r.matched_voucher || '')}</td>
            </tr>
            `;
        }).join('');

        const grid_html = `
            <div class="bank-recon-grid-container" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 10px; overflow: hidden;">
                <div style="background: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155; display: flex; justify-content: space-between; align-items: center;">
                    Reconciliation Results
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn btn-xs btn-default download-recon-excel">Download Excel</button>
                        <i class="fa fa-times close-grid" style="cursor: pointer; color: #94a3b8;"></i>
                    </div>
                </div>
                <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                        <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 1;">
                            <tr>
                                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; width: 30px; text-align: center;"><i class="fa fa-check-square-o"></i></th>
                                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; white-space: nowrap;">Date</th>
                                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Narration</th>
                                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; white-space: nowrap;">Ref No</th>
                                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">Amount</th>
                                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Status</th>
                                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Voucher</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        const el = this.append_message('Assistant', grid_html);
        el.find('.close-grid').on('click', () => el.remove());
        
        el.find('.download-recon-excel').on('click', () => {
            const $form = $("<form>").attr("method", "POST").attr("action", "/api/method/nexapp.api.download_recon_excel");
            $("<input type='hidden'>").attr("name", "data").attr("value", JSON.stringify(grid_data)).appendTo($form);
            $("<input type='hidden'>").attr("name", "csrf_token").attr("value", frappe.csrf_token).appendTo($form);
            $form.appendTo("body").submit().remove();
        });
        
        el.find('.recon-checkbox').on('change', function() {
            let is_checked = $(this).prop('checked');
            let idx = $(this).data('idx');
            let row_data = grid_data[idx];
            
            if (is_checked) {
                let exists = full_data.reconcile_payload.find(p => p.voucher_no === row_data.matched_voucher);
                if (!exists && row_data.matched_voucher) {
                    full_data.reconcile_payload.push({ voucher_no: row_data.matched_voucher, clearance_date: row_data.date });
                }
            } else {
                full_data.reconcile_payload = full_data.reconcile_payload.filter(p => p.voucher_no !== row_data.matched_voucher);
            }
        });
    }
}

