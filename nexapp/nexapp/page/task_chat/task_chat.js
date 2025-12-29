    frappe.pages['task-chat'].on_page_load = function (wrapper) {
        let page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Task Chat',
            single_column: true
        });

        $(wrapper).find('.layout-main-section-wrapper').css('margin-left', '0');

        let chat_html = `
            <style>
                #chat-wrapper {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 120px);
                    max-width: 800px;
                    margin: auto;
                    font-family: "Segoe UI", Arial, sans-serif;
                    background: #f5f6fa;
                    border-radius: 10px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    overflow: hidden;
                }
                #messages {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                }
                .msg {
                    max-width: 75%;
                    padding: 10px 14px;
                    border-radius: 16px;
                    margin: 8px 0;
                    line-height: 1.4;
                    animation: fadeIn 0.3s ease-in-out;
                }
                .bot {
                    background: #e1e9ff;
                    color: #1a1a1a;
                    align-self: flex-start;
                    border-bottom-left-radius: 4px;
                }
                .user {
                    background: #4f8ff7;
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 4px;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                #input-bar {
                    display: flex;
                    gap: 8px;
                    padding: 12px;
                    background: white;
                    border-top: 1px solid #ddd;
                }
                #chat-input {
                    flex: 1;
                    padding: 10px;
                    border-radius: 20px;
                    border: 1px solid #ccc;
                    outline: none;
                }
                #send-btn {
                    padding: 10px 18px;
                    border-radius: 20px;
                }
            </style>

            <div id="chat-wrapper">
                <div id="messages"></div>
                <div id="input-bar">
                    <input id="chat-input" type="text" placeholder="Type your message..." />
                    <button id="send-btn" class="btn btn-primary">Send</button>
                </div>
            </div>
        `;

        $(chat_html).appendTo(page.body);

        const messagesEl = document.getElementById('messages');
        const inputEl = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');

        let state = 'ask_subject';
        let taskData = { subject: '', description: '', due_date: '' };

        function appendMsg(sender, text) {
            const div = document.createElement('div');
            div.className = `msg ${sender}`;
            div.innerHTML = frappe.utils.escape_html(text);
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function askNext() {
            if (state === 'ask_subject') {
                appendMsg('bot', '👋 Hi! What is the Task subject/title?');
            } else if (state === 'ask_description') {
                appendMsg('bot', '✏️ Please enter a short description.');
            } else if (state === 'ask_due') {
                appendMsg('bot', '📅 Optional: Enter a due date (YYYY-MM-DD) or type "skip".');
            } else if (state === 'confirm') {
                appendMsg('bot', '⏳ Creating your Task now...');
                createTask();
            }
        }

        function createTask() {
            let doc = {
                doctype: 'Task',
                subject: taskData.subject,
                description: taskData.description
            };
            if (taskData.due_date && taskData.due_date.toLowerCase() !== 'skip') {
                doc.exp_end_date = taskData.due_date;
            }

            frappe.call({
                method: 'frappe.client.insert',
                args: { doc: doc },
                callback: function (r) {
                    if (!r.exc) {
                        appendMsg('bot', `✅ Task created: <a href="/app/task/${r.message.name}" target="_blank">${r.message.name}</a>`);
                    } else {
                        appendMsg('bot', '❌ Error creating task. Check permissions.');
                    }
                    state = 'ask_subject';
                    taskData = { subject: '', description: '', due_date: '' };
                    appendMsg('bot', 'You can create another task now.');
                }
            });
        }

        function handleUserInput(text) {
            if (!text) return;
            appendMsg('user', text);

            if (state === 'ask_subject') {
                taskData.subject = text;
                state = 'ask_description';
                askNext();
            } else if (state === 'ask_description') {
                taskData.description = text;
                state = 'ask_due';
                askNext();
            } else if (state === 'ask_due') {
                taskData.due_date = text;
                state = 'confirm';
                askNext();
            }
        }

        sendBtn.addEventListener('click', () => {
            const text = inputEl.value.trim();
            inputEl.value = '';
            handleUserInput(text);
        });

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendBtn.click();
            }
        });

        appendMsg('bot', '🤖 Welcome to Task Chat!');
        askNext();
    };
    /////////////////////////////////////////////////////////////////
function createTask() {
    let doc = {
        doctype: 'Task',
        subject: taskData.subject || 'Untitled Task',
        description: taskData.description || '',
        type: 'ERPNEXT Issue'
    };

    if (
        taskData.due_date &&
        taskData.due_date.toLowerCase() !== 'skip' &&
        /^\d{4}-\d{2}-\d{2}$/.test(taskData.due_date)
    ) {
        doc.exp_end_date = taskData.due_date;
    }

    frappe.call({
        method: 'frappe.client.insert',
        args: { doc: doc },
        callback: function (r) {
            if (!r.exc) {
                appendMsg(
                    'bot',
                    `✅ Task created: <a href="/app/task/${r.message.name}" target="_blank">${r.message.name}</a>`
                );

                // Call our custom Python method to send to n8n
                frappe.call({
                    method: 'nexapp.api.send_to_n8n',
                    args: {
                        task_id: r.message.name,
                        subject: r.message.subject,
                        description: r.message.description,
                        due_date: r.message.exp_end_date || null,
                        type: r.message.type
                    },
                    callback: function (res) {
                        console.log('N8N Webhook Response:', res.message);
                    }
                });

            } else {
                appendMsg('bot', '❌ Error creating task. Check permissions.');
            }

            state = 'ask_subject';
            taskData = { subject: '', description: '', due_date: '' };
            appendMsg('bot', 'You can create another task now.');
        }
    });
}
