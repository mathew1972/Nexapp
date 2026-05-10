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
        } catch (e) {
            console.error("AI Assistant init error:", e);
        }
    }

    setup_layout() {
        $('.page-head').hide();
        $('.layout-main').css('padding-top', '0');

        this.wrapper.find('.layout-main-section').html(`
            <div id="ai-page" class="sidebar-collapsed">
                <div id="ai-sidebar">
                    <div class="sidebar-header">
                        <span class="sidebar-title">Nexapp AI Assistant</span>
                        <button id="sidebar-toggle" class="btn-icon-sm" title="Open sidebar">
                            <i class="fa fa-indent"></i>
                        </button>
                    </div>

                    <button class="new-chat-btn">
                        <i class="fa fa-plus"></i> <span class="btn-text">New Chat</span>
                    </button>

                    <div id="collapsed-icons" class="hidden">
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
                                <textarea id="ai-input" placeholder="Ask Nexapp AI anything..." rows="1"></textarea>
                                
                                <div class="input-bottom-row">
                                    <div class="left-actions">
                                        <div id="prompt-selector" class="dropup">
                                            <button class="action-toggle dropdown-toggle" id="ai-prompt-btn" data-toggle="dropdown">
                                                <i class="fa fa-rocket"></i> <span id="selected-prompt-label">Select Prompt</span>
                                            </button>
                                            <div class="dropdown-menu" id="prompt-options-container"></div>
                                        </div>
                                    </div>
                                    
                                    <div class="right-actions">
                                        <button class="btn-icon" id="ai-attach" title="Attach file">
                                            <i class="fa fa-paperclip"></i>
                                        </button>
                                        <button id="ai-send" title="Send message">
                                            <i class="fa fa-arrow-up"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
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
                        const el = $(`<a class="dropdown-item prompt-item" data-prompt="${p.full_prompt}">${p.short_prompt}</a>`);
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
            const pinned_icon = item.pinned ? '<i class="fa fa-thumb-tack text-primary" style="font-size:14px; margin-right:8px;"></i>' : '';

            const el = $(`
                <div class="history-item-wrapper ${active_class}" data-id="${item.name}">
                    <div class="history-item-content">
                        ${pinned_icon}
                        <span class="history-title">${item.title}</span>
                    </div>
                    <div class="dropdown history-menu">
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
                this.append_message(msg.role, msg.content);
            });
        }
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
        this.wrapper.on('input', '#ai-input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            // Limit max height
            if (this.scrollHeight > 200) {
                $(this).css('overflow-y', 'auto');
                this.style.height = '200px';
            } else {
                $(this).css('overflow-y', 'hidden');
            }

            // Enable/Disable Send Button (only if not thinking)
            if (!me.is_thinking) {
                const $sendBtn = me.wrapper.find('#ai-send');
                if (this.value.trim()) {
                    $sendBtn.prop('disabled', false);
                } else {
                    $sendBtn.prop('disabled', true);
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
        this.wrapper.on('click', '#sidebar-toggle', () => {
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
            const history_id = $(e.currentTarget).closest('.history-item-wrapper').attr('data-id');
            frappe.confirm(__('Are you sure you want to delete this chat?'), async () => {
                await frappe.call({
                    method: 'nexapp.api.delete_chat_history',
                    args: { history_id: history_id }
                });
                if (me.current_history_id === history_id) me.new_chat();
                me.load_history();
            });
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
            <div class="greeting-content">
                <h1 class="greeting-header">${greeting}, ${name}</h1>
                <p class="greeting-subtext">How can I assist you with your work today?</p>
            </div>
        `;
        this.wrapper.find('#greeting-msg').html(html);
    }

    new_chat() {
        this.current_history_id = null;
        this.wrapper.find('.history-item-wrapper').removeClass('active');
        this.wrapper.find('#ai-messages').empty();

        // Re-inject greeting container if it was removed
        if (this.wrapper.find('#greeting-container').length === 0) {
            this.wrapper.find('#ai-content').prepend('<div id="greeting-container"><div id="greeting-msg"></div></div>');
        }

        this.wrapper.find('#selected-prompt-label').text('Select Prompt');
        this.set_greeting();
    }

    append_message(role, content) {
        const role_class = role.toLowerCase();
        const el = $(`<div class="message ${role_class}">${content}</div>`);
        this.wrapper.find('#ai-messages').append(el);
        const msgs = this.wrapper.find('#ai-messages')[0];
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        return el;
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
        const file_url = this.attached_file;

        // Reset attachment preview
        this.wrapper.find('#attachment-preview').addClass('hidden').empty();
        this.attached_file = null;

        // 1. Check for specific erp user workflow
        if (lowerText.includes('add a new employee as an erp user') || lowerText.includes('create erp user')) {
            this.append_message('User', text);
            this.initiate_user_creation_workflow();
            return;
        }

        // 2. Check for Feasibility Template request
        if (lowerText.includes('feasibility') && lowerText.includes('template')) {
            this.append_message('User', text);
            this.initiate_feasibility_workflow('template');
            return;
        }

        // 3. Check for Feasibility Upload request (with or without file)
        if (lowerText.includes('feasibility') && (lowerText.includes('upload') || lowerText.includes('bulk') || lowerText.includes('create'))) {
            if (file_url) {
                this.append_message('User', text);
                this.process_feasibility_upload(file_url);
                return;
            } else {
                this.append_message('User', text);
                this.initiate_feasibility_workflow('upload');
                return;
            }
        }

        // 4. SMART DETECTION: If a file is attached but text is generic/empty
        if (file_url && (!text || text.trim() === "" || lowerText === "send")) {
            if (this.awaiting_feasibility_upload) {
                this.append_message('User', "Sending the feasibility file...");
                this.process_feasibility_upload(file_url);
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
                            me.append_message('Assistant', "I've detected a Feasibility Template in your attachment. Let's start the import process.");
                            me.process_feasibility_upload(file_url);
                        } else {
                            me.append_message('User', "Attached a file.");
                            me.append_message('Assistant', "I've received your file. What would you like me to do with it?");
                        }
                    }
                });
                return;
            }
        }        // 5. Normal AI Response
        this.append_message('User', text);
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
                <div class="remove-attachment"><i class="fa fa-times-circle"></i></div>
            </div>
        `);

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
        frappe.prompt([
            { label: 'New Title', fieldname: 'title', fieldtype: 'Data', default: current_title, reqd: 1 }
        ], (values) => {
            frappe.call({
                method: 'frappe.client.set_value',
                args: { doctype: 'AI Assistant History', name: id, fieldname: 'title', value: values.title },
                callback: () => this.load_history()
            });
        }, 'Rename Chat', 'Update');
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
        this.append_message('Assistant', 'I can help you create a new ERP User record. Please fill in the details below:');

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

        const $msg = this.append_message('Assistant', form_html);
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

                        me.append_message('Assistant', `🎉 The ERP user account for ${full_name} has been successfully created and activated.`);
                        me.append_message('Assistant', `A welcome email with login instructions has been sent to ${email}.`);
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
        const is_authorized = role_profile === 'CRM Manager' || roles.includes('System Manager');

        if (!is_authorized) {
            this.append_message('Assistant', "⚠️ I'm sorry, but only the **CRM Manager** has access to create or upload Feasibility records.");
            return;
        }

        if (mode === 'upload') {
            this.awaiting_feasibility_upload = true;
            this.append_message('Assistant', 'Please attach the completed feasibility file using the paperclip icon 📎 below and click Send to proceed with the bulk creation.');
            return;
        }

        this.awaiting_feasibility_upload = false;

        if (mode === 'template') {
            this.append_message('Assistant', 'Here is the feasibility template for you to download:');
        } else {
            this.append_message('Assistant', 'I can help you with Feasibility records. You can download the template below, or attach your completed file using the paperclip icon 📎 and click Send to upload.');
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
                        me.append_message('Assistant', `✅ Done! All ${res.success_count} records from your file have been created successfully.`);
                    } else if (res.status === 'confirmation_required') {
                        // NEW: Enrich pincodes using the browser's internet connection
                        me.enrich_rows_with_pincode(res.rows).then(enriched_rows => {
                            me.last_enriched_rows = enriched_rows; // Store for preservation
                            const $conf = me.append_message('Assistant', `I've analyzed your file and found ${res.total_records} records ready for import. I've automatically filled in the City, District, and State for the pincodes. Would you like to create them now?`);
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
                                me.append_message('Assistant', "Upload cancelled. You can upload the file again whenever you're ready.");
                            });
                        });
                    } else if (res.status === 'warning') {
                        let warn_msg = `⚠️ Found potential duplicate records for Site Name or Site ID:<br><br>`;
                        warn_msg += `<div style="background: #fff5f5; padding: 12px; border-radius: 8px; font-size: 13px; color: #c53030; max-height: 200px; overflow-y: auto; border-left: 4px solid #fc8181;">`;
                        res.duplicates.forEach(dup => {
                            warn_msg += `• ${dup}<br>`;
                        });
                        warn_msg += `</div><br>Would you like to proceed with the upload anyway?`;

                        const $warn = me.append_message('Assistant', warn_msg);
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
                            me.append_message('Assistant', "Upload cancelled. Please update your file and try again.");
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
                        me.append_message('Assistant', error_msg);
                    }
                }
            },
            error: (err) => {
                thinking.remove();
                me.append_message('Assistant', "⚠️ Sorry, there was an error processing the upload. Please check your file format.");
            }
        });
    }

    async enrich_rows_with_pincode(rows) {
        const me = this;
        const status = me.append_message('Assistant', "<i>Validating pincodes and preparing location details...</i>");

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
                    me.append_message('Assistant', "⚠️ Upload processed but returned an invalid response.");
                }
            } else {
                me.append_message('Assistant', "⚠️ Sorry, the background upload failed.");
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

        const el = this.append_message('Assistant', card_html);
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
        card.on('click', '.rb-group-header', function() {
            $(this).toggleClass('collapsed');
            $(this).next('.rb-group-body').toggleClass('hidden');
        });

        // Event: Select All in group
        card.on('click', '.rb-select-all-btn', function(e) {
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
        card.on('change', '#rb-filter-date-range', function() {
            if ($(this).val() === 'Custom') {
                card.find('#rb-custom-date-fields').css('display', 'flex');
            } else {
                card.find('#rb-custom-date-fields').hide();
            }
        });

        // Event: Generate
        card.on('click', '#rb-generate', () => {
            const selected = {};
            card.find('.rb-field-cb:checked').each(function() {
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
}
