/* ============================================================================
   NEXAPP — CRM Lead V10.4 UI Extension (Native CRM Integrated Architecture)
   ============================================================================
   SCOPE: Strictly Nexapp Custom Layer — 0% Core Modifications.
   RULES:
   1. NEVER REPARENT NATIVE VUE COMPONENTS. NO appendChild(nativeTabs).
   2. NO DETACHED FIXED OVERLAYS. ONE INTEGRATED NATURAL PAGE SCROLL.
   3. NO DUPLICATE NATIVE LEAD UI (Native sidebar hidden via CSS).
   4. 100% METADATA-DRIVEN FIELD & WORKFLOW ENGINE.
   ============================================================================ */

window.__NEXAPP_CRM_EXTENSION_LOADED__ = true;
console.log("[NEXAPP CRM] Extension v10.4 (Integrated Native Architecture) loaded");

(function() {
    let currentLeadId = null;
    let currentDoc = null;
    let isProcessing = false;
    let lostReasonsCache = null;
    let leadMetaCache = null;
    let routeObserver = null;
    const leadDocCache = new Map();

    // Safe HTML Escaping helper to prevent XSS
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Safe URL sanitizer for website and link hrefs
    function sanitizeUrl(url) {
        if (!url) return '';
        const trimmed = String(url).trim();
        if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
            return escapeHtml(trimmed);
        }
        if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) {
            return 'https://' + escapeHtml(trimmed);
        }
        return '';
    }

    // Standard Toast Notification
    function showToast(msg, indicator = 'green') {
        let toast = document.getElementById('v10-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'v10-toast';
            toast.style.cssText = 'position:fixed; bottom:24px; right:24px; padding:12px 20px; background:#0f172a; color:#fff; border-radius:10px; font-size:13px; font-weight:600; z-index:999999; box-shadow:0 10px 25px rgba(0,0,0,0.2); transition:all 0.3s;';
            document.body.appendChild(toast);
        }
        toast.style.background = indicator === 'orange' ? '#d97706' : indicator === 'blue' ? '#2563eb' : indicator === 'red' ? '#dc2626' : '#059669';
        toast.innerText = msg;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    // Independent API Wrappers using fetch() for zero framework dependency
    function callApi(method, args = {}) {
        const params = new URLSearchParams();
        for (const k in args) {
            if (args[k] !== undefined && args[k] !== null) {
                params.append(k, typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]);
            }
        }
        const csrfToken = window.csrf_token || (window.frappe && window.frappe.csrf_token) || '';
        return fetch(`/api/method/${method}?${params.toString()}`, {
            headers: { 'X-Frappe-CSRF-Token': csrfToken }
        }).then(res => res.json());
    }

    function postApi(method, args = {}) {
        const formData = new FormData();
        for (const k in args) {
            if (args[k] !== undefined && args[k] !== null) {
                formData.append(k, typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]);
            }
        }
        const csrfToken = window.csrf_token || (window.frappe && window.frappe.csrf_token) || '';
        return fetch(`/api/method/${method}`, {
            method: 'POST',
            headers: { 'X-Frappe-CSRF-Token': csrfToken },
            body: formData
        }).then(res => res.json());
    }

    // Fetch CRM Lead Metadata dynamically from Nexapp Normalized Backend API
    function fetchLeadMetadata() {
        if (leadMetaCache) return Promise.resolve(leadMetaCache);
        return callApi('nexapp.api.crm_lead.get_metadata', { doctype: 'CRM Lead' }).then(res => {
            if (res && res.message) {
                leadMetaCache = res.message;
                return leadMetaCache;
            }
            return null;
        }).catch(err => {
            console.error('[NEXAPP CRM] Error fetching normalized metadata:', err);
            return null;
        });
    }

    function removeV10LeadWorkspace() {
        currentLeadId = null;
        currentDoc = null;
        isProcessing = false;
        const topSec = document.getElementById('nexapp-v10-lead-top-section');
        if (topSec) topSec.remove();
        const rightPanel = document.getElementById('v10-dynamic-right-panel');
        if (rightPanel) rightPanel.remove();
    }

    function parseLeadIdFromPath(path) {
        if (!path.startsWith('/crm/leads/')) return null;
        const sub = path.replace('/crm/leads/', '');
        const parts = sub.split(/[\/\?\#]/);
        const leadId = decodeURIComponent(parts[0]);
        if (!leadId || ['view', 'new', 'kanban', 'list'].includes(leadId)) {
            return null;
        }
        return leadId;
    }

    function handleDashboardContainer(path) {
        const isDashboardRoute = path === '/crm/dashboard' || path === '/crm/dashboard/' || path === '/crm' || path === '/crm/' || window.location.hash === '#/dashboard';
        const dashContainer = document.getElementById('nexapp-crm-dashboard-container');
        const mainContentArea = document.querySelector('#app > div > div:nth-child(2)')
            || document.querySelector('.flex-1.overflow-auto')
            || document.querySelector('.overflow-y-scroll')
            || document.querySelector('#app main')
            || document.querySelector('#app div.flex-1.overflow-y-auto')
            || document.querySelector('#app div.flex-1');

        if (isDashboardRoute) {
            if (mainContentArea) {
                Array.from(mainContentArea.children).forEach(child => {
                    if (child.id !== 'nexapp-crm-dashboard-container') {
                        child.style.display = 'none';
                    }
                });

                if (!dashContainer) {
                    const newContainer = document.createElement('div');
                    newContainer.id = 'nexapp-crm-dashboard-container';
                    newContainer.style.cssText = 'width: 100%; height: 100%; min-height: 85vh; border: none; overflow: hidden; position: relative; z-index: 50; background: #0b0f19;';

                    const iframe = document.createElement('iframe');
                    iframe.id = 'nexapp-crm-dashboard-iframe';
                    iframe.src = '/crm-dashboard?embed=1';
                    iframe.style.cssText = 'width: 100%; height: 100%; min-height: 85vh; border: none; background: transparent;';
                    newContainer.appendChild(iframe);
                    mainContentArea.appendChild(newContainer);
                } else {
                    dashContainer.style.display = 'block';
                }
            }
        } else {
            if (mainContentArea) {
                Array.from(mainContentArea.children).forEach(child => {
                    if (child.id !== 'nexapp-crm-dashboard-container' && child.style.display === 'none') {
                        child.style.display = '';
                    }
                });
            }
            if (dashContainer) {
                dashContainer.style.display = 'none';
            }
        }
    }

    function syncSidebarActiveState() {
        const path = window.location.pathname;

        let activeRouteCategory = '';
        if (path.startsWith('/crm/dashboard') || path === '/crm' || path === '/crm/') activeRouteCategory = 'dashboard';
        else if (path.startsWith('/crm/leads')) activeRouteCategory = 'leads';
        else if (path.startsWith('/crm/deals')) activeRouteCategory = 'deals';
        else if (path.startsWith('/crm/contacts')) activeRouteCategory = 'contacts';
        else if (path.startsWith('/crm/customer')) activeRouteCategory = 'customer';
        else if (path.startsWith('/crm/organizations')) activeRouteCategory = 'organizations';

        const allSidebarItems = document.querySelectorAll('aside button, aside a, [class*="sidebar"] button, [class*="sidebar"] a, #app nav button, #app nav a');

        allSidebarItems.forEach(item => {
            const text = (item.innerText || '').trim().toLowerCase();
            if (!text) return;

            let isCurrentRouteItem = false;
            if (activeRouteCategory && text.includes(activeRouteCategory)) {
                isCurrentRouteItem = true;
            }

            if (!isCurrentRouteItem) {
                item.removeAttribute('aria-current');
                item.removeAttribute('data-active');
                item.style.setProperty('background-color', 'transparent', 'important');
                item.style.setProperty('color', '#94a3b8', 'important');
            } else {
                item.setAttribute('data-active', 'true');
                item.setAttribute('aria-current', 'page');
                item.style.removeProperty('background-color');
                item.style.removeProperty('color');
            }
        });
    }

    // Router Guard & Integrated Mount
    function initV10LeadWorkspace(targetLeadId = null) {
        const path = window.location.pathname;
        const leadId = targetLeadId || parseLeadIdFromPath(path);

        syncSidebarActiveState();
        handleDashboardContainer(path);

        if (!leadId) {
            removeV10LeadWorkspace();
            return;
        }

        const existingTop = document.getElementById('nexapp-v10-lead-top-section');
        const existingRight = document.getElementById('v10-dynamic-right-panel');
        if (existingTop && existingRight && currentLeadId === leadId && currentDoc) {
            return; // Deduplication: Already mounted for this lead ID
        }

        currentLeadId = leadId;

        if (leadDocCache.has(leadId)) {
            currentDoc = leadDocCache.get(leadId);
            fetchLeadMetadata().then(meta => renderV10IntegratedUI(currentDoc, meta));
            fetchLeadDocument(leadId, true);
            return;
        }

        if (isProcessing) return;
        isProcessing = true;
        fetchLeadDocument(leadId, false);
    }

    function fetchLeadDocument(leadId, silent = false) {
        Promise.all([
            callApi('frappe.client.get', { doctype: 'CRM Lead', name: leadId }),
            fetchLeadMetadata()
        ]).then(([docRes, meta]) => {
            if (docRes && docRes.message) {
                currentDoc = docRes.message;
                leadDocCache.set(leadId, currentDoc);
                renderV10IntegratedUI(currentDoc, meta);
            }
            isProcessing = false;
        }).catch(err => {
            console.error('[NEXAPP CRM] Error fetching lead:', err);
            isProcessing = false;
        });
    }

    // Lost Reason Modal Handler
    function openLostReasonModal(targetStatus) {
        const modalId = 'v10-lost-reason-modal';
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        function loadAndRenderModal(reasons) {
            const modalHtml = `
                <div class="v10-modal-overlay" id="${modalId}">
                    <div class="v10-modal-container">
                        <div class="v10-modal-header">
                            <h3>Mark Lead as ${escapeHtml(targetStatus)}</h3>
                            <button class="v10-modal-close" id="v10-modal-close-btn">&times;</button>
                        </div>
                        <div class="v10-modal-body">
                            <div class="v10-form-group">
                                <label for="v10-lost-reason-select">Lost Reason *</label>
                                <select class="v10-select" id="v10-lost-reason-select">
                                    <option value="">Select Lost Reason...</option>
                                    ${reasons.map(r => `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="v10-form-group">
                                <label for="v10-lost-notes-input">Additional Notes</label>
                                <textarea class="v10-textarea" id="v10-lost-notes-input" rows="3" placeholder="Provide details regarding this outcome..."></textarea>
                            </div>
                        </div>
                        <div class="v10-modal-footer">
                            <button class="v10-btn" id="v10-modal-cancel-btn">Cancel</button>
                            <button class="v10-btn v10-btn-danger" id="v10-modal-submit-btn">Mark ${escapeHtml(targetStatus)}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('v10-modal-close-btn').onclick = () => document.getElementById(modalId).remove();
            document.getElementById('v10-modal-cancel-btn').onclick = () => document.getElementById(modalId).remove();

            document.getElementById('v10-modal-submit-btn').onclick = function() {
                const reasonSelect = document.getElementById('v10-lost-reason-select');
                const notesInput = document.getElementById('v10-lost-notes-input');
                const reason = reasonSelect.value;
                const notes = notesInput.value.trim();

                if (!reason) {
                    alert('Please select a valid Lost Reason.');
                    return;
                }

                if (reason === 'Other' && !notes) {
                    alert('Notes are mandatory when Lost Reason is set to "Other".');
                    return;
                }

                postApi('frappe.client.set_value', {
                    doctype: 'CRM Lead',
                    name: currentLeadId,
                    fieldname: {
                        status: targetStatus,
                        lost_reason: reason,
                        lost_notes: notes
                    }
                }).then(() => {
                    showToast(`Status changed to ${targetStatus}`, 'orange');
                    document.getElementById(modalId).remove();
                    isProcessing = false;
                    fetchLeadDocument(currentLeadId);
                });
            };
        }

        if (lostReasonsCache) {
            loadAndRenderModal(lostReasonsCache);
        } else {
            callApi('frappe.client.get_list', { doctype: 'CRM Lost Reason', fields: ['name'], limit_page_length: 50 }).then(r => {
                lostReasonsCache = r.message || [{ name: 'Price too high' }, { name: 'Competitor' }, { name: 'Not a fit' }, { name: 'No response' }, { name: 'Other' }];
                loadAndRenderModal(lostReasonsCache);
            });
        }
    }

    // Dynamic Database-Driven Status Transition Manager
    function changeLeadStatus(newStatus, meta) {
        if (!currentLeadId) return;

        const targetStatusObj = (meta?.statuses || []).find(s => s.name === newStatus);

        if (targetStatusObj && targetStatusObj.type === 'Lost') {
            openLostReasonModal(newStatus);
        } else {
            postApi('frappe.client.set_value', {
                doctype: 'CRM Lead',
                name: currentLeadId,
                fieldname: 'status',
                value: newStatus
            }).then(() => {
                showToast(`Status updated to ${newStatus}`, 'green');
                isProcessing = false;
                fetchLeadDocument(currentLeadId);
            });
        }
    }

    // Dynamic Custom Modal Editor (Replaces browser prompt() completely)
    function editLeadFieldModal(fieldMeta, doc) {
        if (fieldMeta.read_only) {
            showToast(`${fieldMeta.label} is read-only`, 'orange');
            return;
        }

        const fname = fieldMeta.fieldname;
        const currentVal = doc[fname] !== undefined && doc[fname] !== null ? doc[fname] : '';
        const modalId = 'v10-field-edit-modal';
        let existing = document.getElementById(modalId);
        if (existing) existing.remove();

        let inputControlHtml = '';
        const ft = fieldMeta.fieldtype;

        if (ft === 'Select') {
            const options = (fieldMeta.options || '').split('\n').map(o => o.trim()).filter(Boolean);
            inputControlHtml = `
                <select class="v10-select" id="v10-edit-input">
                    <option value="">-- None --</option>
                    ${options.map(o => `<option value="${escapeHtml(o)}" ${o === currentVal ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
                </select>
            `;
        } else if (ft === 'Check') {
            inputControlHtml = `
                <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                    <input type="checkbox" id="v10-edit-input" ${currentVal ? 'checked' : ''} style="width:18px; height:18px;"/>
                    Enable ${escapeHtml(fieldMeta.label)}
                </label>
            `;
        } else if (ft === 'Small Text' || ft === 'Text' || ft === 'Long Text') {
            inputControlHtml = `<textarea class="v10-textarea" id="v10-edit-input" rows="4">${escapeHtml(currentVal)}</textarea>`;
        } else if (ft === 'Date') {
            inputControlHtml = `<input type="date" class="v10-select" id="v10-edit-input" value="${escapeHtml(currentVal)}"/>`;
        } else if (ft === 'Datetime') {
            const dtVal = currentVal ? String(currentVal).replace(' ', 'T').substring(0, 16) : '';
            inputControlHtml = `<input type="datetime-local" class="v10-select" id="v10-edit-input" value="${escapeHtml(dtVal)}"/>`;
        } else if (ft === 'Currency' || ft === 'Float' || ft === 'Int') {
            inputControlHtml = `<input type="number" step="${ft === 'Int' ? '1' : '0.01'}" class="v10-select" id="v10-edit-input" value="${escapeHtml(currentVal)}"/>`;
        } else if (ft === 'Link') {
            inputControlHtml = `
                <input type="text" class="v10-select" id="v10-edit-input" value="${escapeHtml(currentVal)}" placeholder="Search ${escapeHtml(fieldMeta.options || '')}..."/>
                <div id="v10-link-suggestions" style="max-height:120px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px; display:none;"></div>
            `;
        } else {
            inputControlHtml = `<input type="text" class="v10-select" id="v10-edit-input" value="${escapeHtml(currentVal)}"/>`;
        }

        const modalHtml = `
            <div class="v10-modal-overlay" id="${modalId}">
                <div class="v10-modal-container" style="max-width:440px;">
                    <div class="v10-modal-header">
                        <h3>Edit ${escapeHtml(fieldMeta.label || fname)}</h3>
                        <button class="v10-modal-close" id="v10-field-modal-close">&times;</button>
                    </div>
                    <div class="v10-modal-body">
                        <div class="v10-form-group">
                            <label style="font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; display:block;">
                                ${escapeHtml(fieldMeta.label || fname)} (${escapeHtml(ft)})
                            </label>
                            ${inputControlHtml}
                        </div>
                    </div>
                    <div class="v10-modal-footer">
                        <button class="v10-btn" id="v10-field-modal-cancel">Cancel</button>
                        <button class="v10-btn v10-btn-primary" id="v10-field-modal-save">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const closeBtn = document.getElementById('v10-field-modal-close');
        const cancelBtn = document.getElementById('v10-field-modal-cancel');
        const saveBtn = document.getElementById('v10-field-modal-save');
        const inputElem = document.getElementById('v10-edit-input');

        const closeModal = () => document.getElementById(modalId)?.remove();
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        if (ft === 'Link' && fieldMeta.options) {
            inputElem.addEventListener('input', function() {
                const query = inputElem.value.trim();
                const sugBox = document.getElementById('v10-link-suggestions');
                if (query.length < 1) {
                    sugBox.style.display = 'none';
                    return;
                }
                callApi('frappe.client.get_list', { doctype: fieldMeta.options, filters: [['name', 'like', `%${query}%`]], limit_page_length: 5 }).then(res => {
                    if (res && res.message && res.message.length > 0) {
                        sugBox.innerHTML = res.message.map(r => `
                            <div class="v10-sug-item" style="padding:6px 10px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9;" data-val="${escapeHtml(r.name)}">
                                <strong>${escapeHtml(r.name)}</strong>
                            </div>
                        `).join('');
                        sugBox.style.display = 'block';
                        sugBox.querySelectorAll('.v10-sug-item').forEach(item => {
                            item.onclick = function() {
                                inputElem.value = item.getAttribute('data-val');
                                sugBox.style.display = 'none';
                            };
                        });
                    } else {
                        sugBox.style.display = 'none';
                    }
                });
            });
        }

        saveBtn.onclick = function() {
            let newVal = inputElem.value;
            if (ft === 'Check') {
                newVal = inputElem.checked ? 1 : 0;
            }

            postApi('frappe.client.set_value', {
                doctype: 'CRM Lead',
                name: currentLeadId,
                fieldname: fname,
                value: newVal
            }).then(res => {
                if (res && res.message) {
                    showToast(`Updated ${fieldMeta.label}`, 'green');
                    currentDoc[fname] = newVal;
                    leadDocCache.set(currentLeadId, currentDoc);
                    closeModal();
                    fetchLeadMetadata().then(meta => renderV10IntegratedUI(currentDoc, meta));
                } else {
                    showToast(`Failed to update ${fieldMeta.label}`, 'orange');
                }
            }).catch(err => {
                console.error('[NEXAPP CRM] Field save error:', err);
                showToast(`Error saving ${fieldMeta.label}`, 'orange');
            });
        };
    }

    // Dynamic Field Value Formatter
    function formatFieldValue(fieldMeta, val, doc, meta) {
        if (val === null || val === undefined || val === '') {
            return '<span style="color:var(--nx-v10-text-muted); font-style:italic;">—</span>';
        }

        const ft = fieldMeta.fieldtype;

        if (ft === 'Check') {
            return val ? '<span class="v10-tag-chip" style="background:#dcfce7; color:#166534;">Yes</span>'
                       : '<span class="v10-tag-chip" style="background:#f1f5f9; color:#64748b;">No</span>';
        }

        if (ft === 'Currency') {
            const currSymbol = meta?.currency === 'INR' ? '₹' : meta?.currency === 'USD' ? '$' : meta?.currency === 'EUR' ? '€' : (meta?.currency || '');
            return `<strong style="color:var(--nx-v10-primary);">${escapeHtml(currSymbol)} ${parseFloat(val).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>`;
        }

        if (ft === 'Link') {
            return `<span style="font-weight:600; color:#3b82f6;">${escapeHtml(val)}</span>`;
        }

        if (ft === 'Select') {
            return `<span class="v10-status-pill status-${escapeHtml(String(val).toLowerCase())}">${escapeHtml(val)}</span>`;
        }

        if (ft === 'Attach Image') {
            const safeImg = sanitizeUrl(val);
            return safeImg ? `<img src="${safeImg}" style="max-height:40px; border-radius:6px;"/>` : escapeHtml(val);
        }

        if (ft === 'Attach') {
            const safeFile = sanitizeUrl(val);
            return safeFile ? `<a href="${safeFile}" target="_blank" style="color:#3b82f6; text-decoration:underline;">📎 Download Attachment</a>` : escapeHtml(val);
        }

        if (ft === 'Table') {
            const rows = Array.isArray(val) ? val : [];
            if (!rows.length) return '<span style="color:var(--nx-v10-text-muted);">No records</span>';

            const childCols = meta?.child_meta?.[fieldMeta.options] || [];
            const colFields = childCols.length > 0 ? childCols.slice(0, 4) : Object.keys(rows[0]).filter(k => !['name', 'owner', 'parent', 'idx'].includes(k)).slice(0, 4).map(k => ({ fieldname: k, label: k }));

            let tableHtml = `<div style="overflow-x:auto; margin-top:6px;"><table style="width:100%; font-size:11px; border-collapse:collapse; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;"><thead><tr style="background:#edf2f7; text-align:left;">`;
            colFields.forEach(c => {
                tableHtml += `<th style="padding:4px 8px; font-weight:700; color:#475569;">${escapeHtml(c.label || c.fieldname)}</th>`;
            });
            tableHtml += `</tr></thead><tbody>`;

            rows.forEach(r => {
                tableHtml += `<tr style="border-top:1px solid #e2e8f0;">`;
                colFields.forEach(c => {
                    tableHtml += `<td style="padding:4px 8px;">${escapeHtml(r[c.fieldname] !== undefined && r[c.fieldname] !== null ? r[c.fieldname] : '—')}</td>`;
                });
                tableHtml += `</tr>`;
            });
            tableHtml += `</tbody></table></div>`;
            return tableHtml;
        }

        return escapeHtml(String(val));
    }

    // Fully Metadata-Driven Lead Details Panel
    function renderDynamicDetailsPanel(meta, doc) {
        if (!meta || !meta.fields || !meta.sections) {
            return '<div style="padding:16px; color:#64748b;">Metadata loading...</div>';
        }

        const fieldMap = new Map();
        meta.fields.forEach(f => fieldMap.set(f.fieldname, f));

        let html = `<h3 style="font-size:13px; font-weight:800; margin:0 0 14px 0; text-transform:uppercase; letter-spacing:0.04em;">Lead Details & Meta</h3>`;

        meta.sections.forEach(sec => {
            const secFields = sec.fields.map(fn => fieldMap.get(fn)).filter(f => f && f.hidden !== 1);
            if (!secFields.length) return;

            html += `<div class="v10-panel-section">
                <div class="v10-section-title">${escapeHtml(sec.label.toUpperCase())}</div>`;

            secFields.forEach(fMeta => {
                const val = doc[fMeta.fieldname];
                const formattedVal = formatFieldValue(fMeta, val, doc, meta);
                const isEditable = !fMeta.read_only;
                html += `
                    <div class="v10-panel-field" data-fieldname="${escapeHtml(fMeta.fieldname)}" style="cursor:${isEditable ? 'pointer' : 'default'};" title="${isEditable ? 'Click to edit ' + escapeHtml(fMeta.label) : 'Read-only field'}">
                        <span class="label">${escapeHtml(fMeta.label || fMeta.fieldname)}</span>
                        <span class="value">${formattedVal} ${isEditable ? '<span class="v10-edit-trigger">Edit</span>' : ''}</span>
                    </div>
                `;
            });
            html += `</div>`;
        });

        return html;
    }

    // Dynamic Key Information Grid
    function renderKeyInformationGrid(meta, doc) {
        if (!meta || !meta.fields) return '';
        const nonHiddenFields = meta.fields.filter(f => f.hidden !== 1 && !['Tab Break', 'Section Break', 'Column Break', 'Table'].includes(f.fieldtype));
        const priorityFieldnames = ['organization', 'company_name', 'job_title', 'title', 'email', 'mobile_no', 'phone', 'lead_owner', 'owner', 'custom_inside_sales', 'industry', 'territory'];
        
        let selectedFields = nonHiddenFields.filter(f => priorityFieldnames.includes(f.fieldname));
        if (selectedFields.length < 6) {
            const extra = nonHiddenFields.filter(f => !selectedFields.includes(f)).slice(0, 8 - selectedFields.length);
            selectedFields = selectedFields.concat(extra);
        }
        selectedFields = selectedFields.slice(0, 8);

        return selectedFields.map(fMeta => {
            const val = doc[fMeta.fieldname];
            const formatted = formatFieldValue(fMeta, val, doc, meta);
            return `
                <div class="v10-info-field">
                    <div class="label">${escapeHtml(fMeta.label || fMeta.fieldname)}</div>
                    <div class="value">${formatted}</div>
                </div>
            `;
        }).join('');
    }

    // Action Triggers Preserving Native Workflows
    function openConvertToDealWorkflow() {
        const headerBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Convert') || b.innerText.includes('Deal'));
        if (headerBtn) {
            headerBtn.click();
        } else {
            alert("Unable to open native Deal conversion workflow.");
        }
    }

    function openEmailComposer() {
        const emailTabBtn = Array.from(document.querySelectorAll('[role="tab"]')).find(b => (b.innerText || '').trim().toLowerCase() === 'emails' || (b.innerText || '').trim().toLowerCase() === 'email');
        if (emailTabBtn) {
            emailTabBtn.click();
        } else if (currentDoc && currentDoc.email) {
            window.location.href = `mailto:${currentDoc.email}`;
        }
    }

    function openTelephony() {
        const num = currentDoc?.mobile_no || currentDoc?.phone;
        if (num) {
            window.location.href = `tel:${num}`;
        } else {
            alert('No phone number set for this lead.');
        }
    }

    function openWhatsApp() {
        if (currentDoc && (currentDoc.mobile_no || currentDoc.phone)) {
            const num = (currentDoc.mobile_no || currentDoc.phone).replace(/[^0-9]/g, '');
            window.open(`https://wa.me/${num}`, '_blank');
        } else {
            alert('No mobile number set for WhatsApp.');
        }
    }

    function copyToClipboardText(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Copied ID: ${text}`, 'green');
        });
    }

    function runDuplicateCheck(doc) {
        const dupContainer = document.getElementById('v10-dup-check-result');
        if (!dupContainer) return;

        dupContainer.innerHTML = `<span style="color:#64748b;">CHECKING CRM REGISTRY...</span>`;

        postApi('nexapp.api.crm_lead.check_duplicates', {
            lead_name: doc.name,
            email: doc.email || '',
            mobile_no: doc.mobile_no || '',
            phone: doc.phone || '',
            organization: doc.organization || ''
        }).then(res => {
            if (res && res.message) {
                const data = res.message;
                if (data.status === 'POTENTIAL DUPLICATES FOUND') {
                    dupContainer.innerHTML = `
                        <span style="color:#dc2626; font-weight:700;">⚠️ ${data.count} POTENTIAL DUPLICATES FOUND</span>
                        <div style="font-size:11px; color:#475569; margin-top:2px;">
                            Matched: ${data.duplicates.map(d => `<a href="/crm/leads/${escapeHtml(d.name)}" style="color:#2563eb; text-decoration:underline; font-weight:600; margin-right:8px;">${escapeHtml(d.lead_name || d.name)} (${escapeHtml(d.status)}) ${d.match_signals ? '[' + d.match_signals.join(', ') + ']' : ''}</a>`).join('')}
                        </div>
                    `;
                } else if (data.status === 'NO POTENTIAL DUPLICATES') {
                    dupContainer.innerHTML = `<span style="color:#166534; font-weight:600;">✓ NO POTENTIAL DUPLICATES FOUND IN REGISTRY</span>`;
                } else {
                    dupContainer.innerHTML = `<span style="color:#64748b;">${escapeHtml(data.status)}</span>`;
                }
            } else {
                dupContainer.innerHTML = `<span style="color:#64748b;">DUPLICATE CHECK NOT YET RUN</span>`;
            }
        }).catch(err => {
            console.error('[NEXAPP CRM] Duplicate check error:', err);
            dupContainer.innerHTML = `<span style="color:#dc2626;">DUPLICATE CHECK UNAVAILABLE</span>`;
        });
    }

    function fetchAndRenderLeadIntelligence(leadName) {
        postApi('nexapp.api.crm_lead.get_lead_intelligence', { lead_name: leadName })
            .then(res => {
                if (!res || !res.message) return;
                const intel = res.message;

                // 1. Render Lead Score
                const scoreNum = document.getElementById('v11-score-num');
                const scoreSignals = document.getElementById('v11-score-signals');
                if (scoreNum && intel.lead_score) {
                    scoreNum.innerText = intel.lead_score.score;
                    let sigHtml = '';
                    (intel.lead_score.strong_signals || []).slice(0, 3).forEach(s => {
                        sigHtml += `<div class="v11-signal-item strong">✓ ${escapeHtml(s)}</div>`;
                    });
                    (intel.lead_score.weak_signals || []).slice(0, 2).forEach(w => {
                        sigHtml += `<div class="v11-signal-item weak">⚠ ${escapeHtml(w)}</div>`;
                    });
                    if (scoreSignals) scoreSignals.innerHTML = sigHtml || '<div style="color:#64748b;">Profile complete</div>';
                }

                // 2. Render Engagement
                const engPct = document.getElementById('v11-eng-pct');
                const engStatusChip = document.getElementById('v11-eng-status-chip');
                const engLabel = document.getElementById('v11-eng-label');
                if (engPct && intel.engagement) {
                    engPct.innerText = intel.engagement.percentage;
                    if (engStatusChip) {
                        engStatusChip.innerText = intel.engagement.status.toUpperCase();
                        engStatusChip.style.background = intel.engagement.percentage > 50 ? '#dcfce7' : '#f1f5f9';
                        engStatusChip.style.color = intel.engagement.percentage > 50 ? '#15803d' : '#475569';
                    }
                    if (engLabel) engLabel.innerText = intel.engagement.label;
                }

                // 3. Render SLA Status
                const slaStatusText = document.getElementById('v11-sla-status-text');
                const slaChip = document.getElementById('v11-sla-chip');
                const slaDetail = document.getElementById('v11-sla-detail');
                if (slaStatusText && intel.sla) {
                    slaStatusText.innerText = intel.sla.status;
                    if (slaChip) {
                        slaChip.innerText = intel.sla.status;
                        slaChip.style.background = intel.sla.status === 'OVERDUE' ? '#fee2e2' : (intel.sla.status === 'AT RISK' ? '#fef3c7' : '#f1f5f9');
                        slaChip.style.color = intel.sla.status === 'OVERDUE' ? '#dc2626' : (intel.sla.status === 'AT RISK' ? '#b45309' : '#475569');
                    }
                    if (slaDetail) slaDetail.innerText = intel.sla.detail;
                }

                // 4. Render NexAI Next Best Action
                const aiTitle = document.getElementById('v11-ai-action-title');
                const aiReasonText = document.getElementById('v11-ai-reason-text');
                const aiEvidenceList = document.getElementById('v11-ai-evidence-list');
                const aiBadge = document.getElementById('v11-ai-confidence-badge');

                if (aiTitle && intel.next_best_action) {
                    aiTitle.innerText = intel.next_best_action.action;
                    if (aiReasonText) aiReasonText.innerText = intel.next_best_action.reason;
                    if (aiBadge) aiBadge.innerText = `${intel.next_best_action.confidence.toUpperCase()} CONFIDENCE`;

                    if (aiEvidenceList && intel.next_best_action.evidence) {
                        aiEvidenceList.innerHTML = intel.next_best_action.evidence.map(e => `<div>• ${escapeHtml(e)}</div>`).join('');
                    }
                }
            })
            .catch(err => {
                console.error('[NEXAPP CRM] Error fetching intelligence:', err);
            });
    }

    // MAIN INTEGRATED RENDER ENGINE (0% REPARENTING, NATURAL DOM FLOW)
    function renderV10IntegratedUI(doc, meta) {
        // Find native main container inside #app
        const nativeMainContainer = document.querySelector('#app div.flex.h-full.overflow-hidden')
            || document.querySelector('#app div.flex.flex-1.overflow-hidden.flex-col')
            || document.querySelector('#app main');

        if (!nativeMainContainer) {
            setTimeout(() => renderV10IntegratedUI(doc, meta), 100);
            return;
        }

        // Hide native side panel / Resizer completely to prevent duplicate UI
        const nativeResizer = document.querySelector('#app [side="right"]')
            || document.querySelector('#app div[side="right"]');

        if (nativeResizer) {
            nativeResizer.style.setProperty('display', 'none', 'important');
        }

        const leadTitle = doc.lead_name || doc.name;
        const initials = leadTitle.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const currentStatus = doc.status || 'New';

        const allStatuses = meta?.statuses || [
            { name: 'New', position: 1, type: 'Open' },
            { name: 'Contacted', position: 2, type: 'Ongoing' },
            { name: 'Nurture', position: 3, type: 'Ongoing' },
            { name: 'Qualified', position: 4, type: 'Won' },
            { name: 'Converted', position: 5, type: 'Won' },
            { name: 'Unqualified', position: 6, type: 'Lost' },
            { name: 'Junk', position: 7, type: 'Lost' }
        ];

        const journeySteps = allStatuses.filter(s => s.type !== 'Lost').map(s => s.name);
        const currentStatusObj = allStatuses.find(s => s.name === currentStatus);
        const isTerminal = currentStatusObj ? currentStatusObj.type === 'Lost' : ['Unqualified', 'Junk'].includes(currentStatus);
        const activeIdx = journeySteps.indexOf(currentStatus);

        const safeWeb = sanitizeUrl(doc.website);

        // 1. Render/Update Top Enhancement Section
        let topSec = document.getElementById('nexapp-v10-lead-top-section');
        if (!topSec) {
            topSec = document.createElement('div');
            topSec.id = 'nexapp-v10-lead-top-section';
            nativeMainContainer.prepend(topSec);
        }

        topSec.innerHTML = `
            <!-- HERO IDENTITY CARD -->
            <div class="v10-hero-card">
                <div class="v10-hero-top">
                    <div class="v10-hero-identity">
                        <div class="v10-avatar-badge">
                            ${doc.image || doc.organization_logo ? `<img src="${sanitizeUrl(doc.image || doc.organization_logo)}" alt="${escapeHtml(leadTitle)}"/>` : escapeHtml(initials)}
                        </div>
                        <div class="v10-hero-details">
                            <h1>
                                ${escapeHtml(leadTitle)}
                                <span class="v10-status-pill status-${escapeHtml(currentStatus.toLowerCase())}">• ${escapeHtml(currentStatus)}</span>
                                <span class="v10-lead-id-tag" id="v10-copy-id-btn" title="Click to copy Lead ID">
                                    LEAD ID ${escapeHtml(doc.name)} 📋
                                </span>
                            </h1>
                            <div class="v10-hero-subhead">
                                <span>${escapeHtml(doc.job_title || '—')}</span>
                                ${doc.organization ? `• <strong>${escapeHtml(doc.organization)}</strong>` : ''}
                                ${safeWeb ? `• <a href="${safeWeb}" target="_blank" rel="noopener">${escapeHtml(doc.website)} ↗</a>` : ''}
                            </div>
                            <div class="v10-hero-tags">
                                ${doc.source ? `<span class="v10-tag-chip">${escapeHtml(doc.source)}</span>` : ''}
                                ${doc.industry ? `<span class="v10-tag-chip">${escapeHtml(doc.industry)}</span>` : ''}
                                ${doc.no_of_employees ? `<span class="v10-tag-chip">${escapeHtml(doc.no_of_employees)} employees</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="v10-hero-right">
                        <div class="v10-owner-box">
                            <div class="label">LEAD OWNER</div>
                            <div class="value">${escapeHtml(doc.lead_owner || 'Unassigned')}</div>
                            ${doc.custom_inside_sales ? `<div class="label" style="margin-top:4px;">INSIDE SALES</div><div class="value">${escapeHtml(doc.custom_inside_sales)}</div>` : ''}
                        </div>
                        <div class="v10-quick-actions">
                            <button class="v10-btn-icon" id="v10-act-email" title="Send Email via CRM">✉</button>
                            <button class="v10-btn-icon" id="v10-act-call" title="Call Lead">📞</button>
                            <button class="v10-btn-icon" id="v10-act-wa" title="WhatsApp">💬</button>
                            <button class="v10-btn-icon" id="v10-act-convert" title="Convert to Deal Workflow" style="background:var(--nx-v10-primary); color:white;">⚡</button>
                        </div>
                    </div>
                </div>

                <div class="v10-hero-strip">
                    <div class="v10-strip-item">
                        <div class="label">STATUS</div>
                        <div class="value">${escapeHtml(currentStatus)}</div>
                    </div>
                    <div class="v10-strip-item">
                        <div class="label">SOURCE</div>
                        <div class="value">${escapeHtml(doc.source || '—')}</div>
                    </div>
                    <div class="v10-strip-item">
                        <div class="label">TERRITORY</div>
                        <div class="value">${escapeHtml(doc.territory || '—')}</div>
                    </div>
                    <div class="v10-strip-item">
                        <div class="label">INDUSTRY</div>
                        <div class="value">${escapeHtml(doc.industry || '—')}</div>
                    </div>
                    <div class="v10-strip-item">
                        <div class="label">EMPLOYEES</div>
                        <div class="value">${escapeHtml(doc.no_of_employees || '—')}</div>
                    </div>
                </div>
            </div>

            <!-- DATABASE-DRIVEN LEAD JOURNEY -->
            <div class="v10-journey-card">
                <div class="v10-journey-header">
                    <div class="v10-journey-title">
                        <div class="v10-journey-icon">⚡</div>
                        <div class="v10-journey-title-text">
                            <h3>LEAD JOURNEY</h3>
                            <span>Sales lifecycle & milestone</span>
                        </div>
                    </div>
                    <span class="v10-status-pill status-${escapeHtml(currentStatus.toLowerCase())}">• CURRENT - ${escapeHtml(currentStatus.toUpperCase())}</span>
                </div>

                ${!isTerminal ? `
                <div class="v10-journey-steps">
                    <div class="v10-journey-line">
                        <div class="v10-journey-line-progress" style="width: ${Math.max(0, activeIdx) * (100 / Math.max(1, journeySteps.length - 1))}%;"></div>
                    </div>
                    ${journeySteps.map((step, idx) => `
                        <div class="v10-journey-step ${idx < activeIdx ? 'completed' : ''} ${idx === activeIdx ? 'active' : ''}" data-step="${escapeHtml(step)}">
                            <div class="v10-step-node">${idx < activeIdx ? '✓' : idx + 1}</div>
                            <div class="v10-step-info">
                                <div class="v10-step-name">${escapeHtml(step)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="v10-milestone-box">
                    <div class="v10-milestone-info">
                        <div style="font-size:16px;">➔</div>
                        <div>
                            <div class="title">NEXT CONFIGURED STATUS</div>
                            <div class="desc">Next Status: ${escapeHtml(journeySteps[Math.min(journeySteps.length - 1, activeIdx + 1)] || 'Converted')}</div>
                        </div>
                    </div>
                    <div class="v10-milestone-actions">
                        <button class="v10-btn" id="v10-btn-change-status">Change Status</button>
                        <button class="v10-btn v10-btn-primary" id="v10-btn-next-step">Move to ${escapeHtml(journeySteps[Math.min(journeySteps.length - 1, activeIdx + 1)] || 'Converted')} →</button>
                        ${allStatuses.filter(s => s.type === 'Lost').map(lStatus => `
                            <button class="v10-btn v10-btn-danger" data-lost-status="${escapeHtml(lStatus.name)}">${escapeHtml(lStatus.name)}</button>
                        `).join('')}
                    </div>
                </div>
                ` : `
                <div class="v10-terminal-card">
                    <div class="v10-terminal-icon">✖</div>
                    <div class="v10-terminal-content">
                        <h4>TERMINAL OUTCOME — ${escapeHtml(currentStatus.toUpperCase())}</h4>
                        <p><strong>Lost Reason:</strong> ${escapeHtml(doc.lost_reason || 'Not specified')}</p>
                        ${doc.lost_notes ? `<p><strong>Notes:</strong> ${escapeHtml(doc.lost_notes)}</p>` : ''}
                    </div>
                    <button class="v10-btn" id="v10-btn-reopen" style="margin-left:auto;">Re-open Lead</button>
                </div>
                `}
            </div>

            <!-- MODERN EXECUTIVE INTELLIGENCE & KEY METADATA GRID -->
            <div class="v12-grid-2col" style="display:grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; margin-bottom: 20px;">
                <!-- KEY INFORMATION CARD -->
                <div class="v10-card v12-card-enhanced" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 4px 20px -2px rgba(0,0,0,0.05); padding:24px;">
                    <div class="v10-card-header" style="display:flex; justify-size:space-between; align-items:center; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:28px; height:28px; border-radius:8px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px;">ℹ</div>
                            <div>
                                <h3 style="font-size:14px; font-weight:800; margin:0; letter-spacing:0.04em; color:#0f172a; text-transform:uppercase;">KEY INFORMATION</h3>
                                <span style="font-size:11px; color:#64748b;">Primary sales metadata</span>
                            </div>
                        </div>
                        <span class="v10-tag-chip" style="background:#f8fafc; border:1px solid #e2e8f0; color:#475569; font-weight:600; font-size:11px;">SYNCHRONIZED</span>
                    </div>
                    <div class="v10-key-info-grid">
                        ${renderKeyInformationGrid(meta, doc)}
                    </div>
                </div>

                <!-- NEXAI NEXT BEST ACTION CARD -->
                <div class="v10-card v10-ai-card v12-card-enhanced" id="v11-nexai-card" style="background:linear-gradient(135deg, #ffffff 0%, #faf5ff 100%); border:1px solid #e9d5ff; border-radius:16px; box-shadow:0 4px 20px -2px rgba(124,58,237,0.08); padding:24px;">
                    <div class="v10-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #f3e8ff;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:28px; height:28px; border-radius:8px; background:#7c3aed; color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">✦</div>
                            <div>
                                <h3 style="color:#5b21b6; font-size:14px; font-weight:800; margin:0; letter-spacing:0.04em; text-transform:uppercase;">NexAI — Next Best Action</h3>
                                <span style="font-size:11px; color:#7e22ce;">Predictive decision guidance</span>
                            </div>
                        </div>
                        <span class="v10-ai-badge" id="v11-ai-confidence-badge" style="background:#7c3aed; color:white; font-weight:800; padding:4px 10px; border-radius:8px; font-size:10px; letter-spacing:0.05em;">HIGH CONFIDENCE</span>
                    </div>
                    <div class="v10-ai-headline" id="v11-ai-action-title" style="font-size:16px; font-weight:800; color:#4c1d95; margin-bottom:8px;">Evaluating Intelligence...</div>
                    <div class="v11-ai-reason-box" id="v11-ai-reason-box" style="background:#ffffff; border-left:4px solid #8b5cf6; border-radius:10px; padding:12px 16px; margin:12px 0 16px 0; box-shadow:0 2px 8px rgba(139,92,246,0.06);">
                        <div style="font-weight:700; margin-bottom:4px; color:#5b21b6; font-size:13px;" id="v11-ai-reason-text">Analyzing lead engagement and status signals...</div>
                        <div class="v11-ai-evidence" id="v11-ai-evidence-list" style="font-size:12px; color:#6b21a8;"></div>
                    </div>
                    <div class="v10-ai-actions" id="v11-ai-actions-container" style="display:flex; gap:10px; margin-top:auto;">
                        <button class="v10-btn v10-btn-primary" id="v10-ai-act-email" style="background:#7c3aed; border-color:#7c3aed; font-weight:700; border-radius:8px; padding:8px 16px;">Send Email</button>
                        <button class="v10-btn" id="v10-ai-act-followup" style="background:white; border:1px solid #ddd6fe; color:#6b21a8; font-weight:600; border-radius:8px; padding:8px 16px;">Create Follow-up</button>
                    </div>
                </div>
            </div>

            <!-- V11 BUSINESS INTELLIGENCE METRICS (LEAD SCORE, ENGAGEMENT, SLA) -->
            <div class="v11-intel-grid" style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px;">
                <!-- LEAD SCORE CARD -->
                <div class="v11-intel-card" id="v11-score-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                    <div class="v11-intel-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span class="title" style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">LEAD SCORE</span>
                        <span class="v10-tag-chip" style="background:#eff6ff; color:#1d4ed8; font-weight:700; font-size:10px;">PROPRIETARY</span>
                    </div>
                    <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:8px;">
                        <div class="v11-score-val" id="v11-score-num" style="font-size:28px; font-weight:900; color:#2563eb; line-height:1;">—</div>
                        <span style="font-size:13px; font-weight:700; color:#94a3b8;">/ 100</span>
                    </div>
                    <div class="v11-score-signals" id="v11-score-signals" style="font-size:11.5px; color:#475569; display:flex; flex-direction:column; gap:4px;">
                        <div class="v11-signal-item">Calculating signals...</div>
                    </div>
                </div>

                <!-- ENGAGEMENT CARD -->
                <div class="v11-intel-card" id="v11-engagement-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                    <div class="v11-intel-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span class="title" style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">ENGAGEMENT</span>
                        <span class="v10-tag-chip" id="v11-eng-status-chip" style="background:#f1f5f9; color:#475569; font-weight:700; font-size:10px;">CALCULATING</span>
                    </div>
                    <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:8px;">
                        <div class="v11-score-val" id="v11-eng-pct" style="font-size:28px; font-weight:900; color:#0284c7; line-height:1;">—</div>
                        <span style="font-size:13px; font-weight:700; color:#94a3b8;">%</span>
                    </div>
                    <div style="font-size:12px; color:#475569; font-weight:600;" id="v11-eng-label">Activity based</div>
                </div>

                <!-- SLA STATUS CARD -->
                <div class="v11-intel-card" id="v11-sla-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                    <div class="v11-intel-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span class="title" style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">SLA MONITOR</span>
                        <span class="v10-tag-chip" id="v11-sla-chip" style="background:#f1f5f9; color:#475569; font-weight:700; font-size:10px;">CHECKING</span>
                    </div>
                    <div class="v11-score-val" id="v11-sla-status-text" style="font-size:20px; font-weight:800; color:#0f172a; margin-bottom:4px;">—</div>
                    <div style="font-size:12px; color:#64748b;" id="v11-sla-detail">Response SLA evaluation</div>
                </div>
            </div>

            <!-- DUPLICATE CHECK BAR -->
            <div class="v10-dup-bar" style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #2563eb; border-radius:12px; padding:14px 20px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                <div class="v10-dup-info" style="display:flex; align-items:center; gap:12px;">
                    <div class="v10-dup-icon" style="width:30px; height:30px; border-radius:8px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-weight:800;">🔍</div>
                    <div class="v10-dup-text" id="v10-dup-check-result">
                        <span style="font-weight:600; color:#1e293b;">Database Duplicate Signal Status</span>
                    </div>
                </div>
                <button class="v10-btn" id="v10-dup-review-btn" style="padding:6px 14px; font-size:12px; font-weight:600; border-radius:8px; background:#f8fafc; border:1px solid #cbd5e1; color:#334155;">Run DB Check</button>
            </div>
        `;

        // 2. Render/Update Right Panel Below Native Activities
        let rightPanel = document.getElementById('v10-dynamic-right-panel');
        if (!rightPanel) {
            rightPanel = document.createElement('div');
            rightPanel.id = 'v10-dynamic-right-panel';
            rightPanel.className = 'v10-right-panel';
            nativeMainContainer.appendChild(rightPanel);
        }

        if (rightPanel) {
            rightPanel.innerHTML = renderDynamicDetailsPanel(meta, doc);

            rightPanel.querySelectorAll('.v10-panel-field[data-fieldname]').forEach(elem => {
                elem.addEventListener('click', () => {
                    const fname = elem.getAttribute('data-fieldname');
                    const fMeta = meta.fields.find(f => f.fieldname === fname);
                    if (fMeta) {
                        editLeadFieldModal(fMeta, doc);
                    }
                });
            });
        }

        // Run Real Backend Duplicate Check & Real Business Intelligence Engine
        runDuplicateCheck(doc);
        fetchAndRenderLeadIntelligence(doc.name);

        // Attach Action Listeners
        document.getElementById('v10-copy-id-btn')?.addEventListener('click', () => copyToClipboardText(doc.name));
        document.getElementById('v10-act-convert')?.addEventListener('click', openConvertToDealWorkflow);
        document.getElementById('v10-act-email')?.addEventListener('click', openEmailComposer);
        document.getElementById('v10-act-call')?.addEventListener('click', openTelephony);
        document.getElementById('v10-act-wa')?.addEventListener('click', openWhatsApp);

        document.getElementById('v10-btn-next-step')?.addEventListener('click', () => {
            const nextStatus = journeySteps[Math.min(journeySteps.length - 1, activeIdx + 1)];
            if (nextStatus && nextStatus !== currentStatus) changeLeadStatus(nextStatus, meta);
        });

        document.getElementById('v10-btn-change-status')?.addEventListener('click', () => {
            const modalId = 'v10-status-select-modal';
            let existing = document.getElementById(modalId);
            if (existing) existing.remove();

            const modalHtml = `
                <div class="v10-modal-overlay" id="${modalId}">
                    <div class="v10-modal-container" style="max-width:380px;">
                        <div class="v10-modal-header">
                            <h3>Change Lead Status</h3>
                            <button class="v10-modal-close" id="v10-status-modal-close">&times;</button>
                        </div>
                        <div class="v10-modal-body">
                            <div class="v10-form-group">
                                <label>Select Target Status:</label>
                                <select class="v10-select" id="v10-status-modal-select">
                                    ${allStatuses.map(s => `<option value="${escapeHtml(s.name)}" ${s.name === currentStatus ? 'selected' : ''}>${escapeHtml(s.name)} (${escapeHtml(s.type)})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="v10-modal-footer">
                            <button class="v10-btn" id="v10-status-modal-cancel">Cancel</button>
                            <button class="v10-btn v10-btn-primary" id="v10-status-modal-submit">Apply Status</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('v10-status-modal-close').onclick = () => document.getElementById(modalId).remove();
            document.getElementById('v10-status-modal-cancel').onclick = () => document.getElementById(modalId).remove();
            document.getElementById('v10-status-modal-submit').onclick = function() {
                const choice = document.getElementById('v10-status-modal-select').value;
                document.getElementById(modalId).remove();
                if (choice && choice !== currentStatus) {
                    changeLeadStatus(choice, meta);
                }
            };
        });

        // Lost Status Buttons Listener
        topSec.querySelectorAll('button[data-lost-status]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lostStat = btn.getAttribute('data-lost-status');
                changeLeadStatus(lostStat, meta);
            });
        });

        // Dynamic Re-open Behavior
        document.getElementById('v10-btn-reopen')?.addEventListener('click', () => {
            const firstOpenStatus = allStatuses.find(s => s.type === 'Open')?.name || allStatuses[0]?.name || 'New';
            changeLeadStatus(firstOpenStatus, meta);
        });

        document.getElementById('v10-ai-act-email')?.addEventListener('click', openEmailComposer);
        document.getElementById('v10-dup-review-btn')?.addEventListener('click', () => runDuplicateCheck(doc));

        isProcessing = false;
    }

    // Intercept Global Lead Clicks for Instant Navigation
    document.addEventListener('click', function(e) {
        const leadLink = e.target.closest('a[href*="/crm/leads/"], tr[data-name], div[class*="lead"]');
        if (leadLink) {
            const href = leadLink.getAttribute('href') || leadLink.dataset.href || '';
            const leadId = parseLeadIdFromPath(href) || leadLink.dataset.name;
            if (leadId) {
                initV10LeadWorkspace(leadId);
            }
        }
    }, true);

    // Event-Driven Route Lifecycle (Deduplicated)
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        initV10LeadWorkspace();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        initV10LeadWorkspace();
    };

    window.addEventListener('popstate', function() {
        initV10LeadWorkspace();
    });

    window.addEventListener('hashchange', function() {
        initV10LeadWorkspace();
    });

    function setupRouteObserver() {
        if (routeObserver) return;
        let lastPath = window.location.pathname + window.location.hash;
        routeObserver = new MutationObserver(() => {
            const currentPath = window.location.pathname + window.location.hash;
            const isLeadPath = window.location.pathname.startsWith('/crm/leads/');
            const isDashPath = window.location.pathname === '/crm/dashboard' || window.location.pathname === '/crm/dashboard/' || window.location.pathname === '/crm' || window.location.pathname === '/crm/' || window.location.hash === '#/dashboard';

            const topSec = document.getElementById('nexapp-v10-lead-top-section');
            const rightPanel = document.getElementById('v10-dynamic-right-panel');
            const dashContainer = document.getElementById('nexapp-crm-dashboard-container');

            if (isLeadPath && (!topSec || !rightPanel)) {
                initV10LeadWorkspace();
                lastPath = currentPath;
            } else if (isDashPath) {
                handleDashboardContainer(window.location.pathname);
                if (currentPath !== lastPath) {
                    syncSidebarActiveState();
                    lastPath = currentPath;
                }
            } else if (currentPath !== lastPath) {
                lastPath = currentPath;
                initV10LeadWorkspace();
            }
        });
        const appElem = document.getElementById('app') || document.body;
        routeObserver.observe(appElem, { childList: true, subtree: true });
    }

    function startInitPolling() {
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds total
        const interval = setInterval(() => {
            attempts++;
            const currentPath = window.location.pathname;
            const isDashPath = currentPath === '/crm/dashboard' || currentPath === '/crm/dashboard/' || currentPath === '/crm' || currentPath === '/crm/' || window.location.hash === '#/dashboard';
            const dashContainer = document.getElementById('nexapp-crm-dashboard-container');

            if (isDashPath && !dashContainer) {
                initV10LeadWorkspace();
            }

            if (dashContainer || attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 100);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initV10LeadWorkspace();
        setupRouteObserver();
        startInitPolling();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            initV10LeadWorkspace();
            setupRouteObserver();
            startInitPolling();
        });
    }
})();
