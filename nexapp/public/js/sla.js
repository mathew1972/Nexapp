frappe.ui.form.on('HD Ticket', {
    status: function(frm) {
        // Auto-set resolution date when resolved
        if (frm.doc.status === 'Resolved' && !frm.doc.custom_resolution_date_2) {
            frm.set_value('custom_resolution_date_2', frappe.datetime.now_datetime());
        }

        // Handle hold timing
        if (frm.doc.status === 'On Hold' && !frm.holdStart) {
            frm.holdStart = new Date();
        } else if (['Open', 'Replied'].includes(frm.doc.status) && frm.holdStart) {
            const holdEnd = new Date();
            frm.totalHoldDuration = (frm.totalHoldDuration || 0) + (holdEnd - frm.holdStart);
            frm.holdStart = null;
        }
    },

    priority: function(frm) {
        // Refresh display when priority changes (assuming resolution_by is updated elsewhere)
        if (frm.slaInterval) clearInterval(frm.slaInterval);
        frm.script_manager.trigger('refresh');
    },

    refresh: function(frm) {
        // Hide SLA for new/unsaved tickets
        if (frm.is_new()) return;

        const container = frm.fields_dict.custom_resolution_update.$wrapper;
        let finalClosedDate = null;

        // Initialize hold tracking
        frm.totalHoldDuration = frm.totalHoldDuration || 0;
        frm.holdStart = frm.holdStart || null;

        // Clear existing interval
        if (frm.slaInterval) {
            clearInterval(frm.slaInterval);
            frm.slaInterval = null;
        }

        function initializeDisplay() {
            container.empty().html(`
                <div class="original-sla" style="border: 1px solid #eee; border-radius: 4px; padding: 12px; margin-bottom: 15px;">
                    <div class="sla-status" style="text-align: center; font-family: monospace; font-size: 14px; font-weight: bold; padding: 10px; border-radius: 4px; margin-bottom: 10px;"></div>
                    <div class="progress-fill" style="height: 15px; background: #e9ecef; border-radius: 8px; overflow: hidden;">
                        <div class="progress-bar" style="width: 0%; height: 100%; background: #2376f5; transition: width 0.5s ease-in-out;"></div>
                    </div>
                    <div class="timer" style="text-align: center; font-family: monospace; font-size: 14px; margin-top: 8px;"></div>
                    <div class="violation-duration" style="text-align: center; font-family: monospace; font-size: 12px; color: #dc3545; margin-top: 5px;"></div>
                </div>
            `);
        }

        function parseDateTime(datetimeStr) {
            return frappe.datetime.str_to_obj(datetimeStr);
        }

        function formatDuration(ms) {
            const absoluteMs = Math.abs(ms);
            const hours = Math.floor(absoluteMs / 3600000);
            const minutes = Math.floor((absoluteMs % 3600000) / 60000);
            const seconds = Math.floor((absoluteMs % 60000) / 1000);
            return `${hours}h ${minutes}m ${seconds}s`;
        }

        function calculateSLA() {
            try {
                const now = new Date();
                const openingDateTime = parseDateTime(`${frm.doc.opening_date} ${frm.doc.opening_time}`);
                const resolutionBy = frm.doc.resolution_by ? parseDateTime(frm.doc.resolution_by) : null;

                // Validate required fields
                if (!openingDateTime || !resolutionBy || !frm.doc.opening_date) {
                    container.hide();
                    return;
                }

                // Handle terminal statuses
                if (['Closed', 'Wrong Circuit'].includes(frm.doc.status)) {
                    container.find('.progress-bar').hide();
                    container.find('.sla-status').text(`⚫ ${frm.doc.status.toUpperCase()}`);
                    return;
                }

                // Calculate effective elapsed time
                let elapsed = now - openingDateTime;
                elapsed -= (frm.totalHoldDuration || 0);
                if (frm.holdStart) elapsed -= (now - frm.holdStart);

                // Calculate time dynamics
                const totalExpectedTime = resolutionBy - openingDateTime;
                const remainingTime = resolutionBy - now;
                const violationDuration = now - resolutionBy;

                // Update progress
                const progress = Math.min((elapsed / totalExpectedTime) * 100, 100);
                container.find('.progress-bar').css('width', `${progress}%`);

                // Update display elements
                const statusElement = container.find('.sla-status')[0];
                const timerElement = container.find('.timer')[0];
                const violationElement = container.find('.violation-duration')[0];

                if (frm.doc.status === 'Resolved') {
                    statusElement.textContent = "🟢 RESOLVED";
                    statusElement.style.background = "#28a74522";
                    timerElement.textContent = '';
                    violationElement.textContent = '';
                } else if (now > resolutionBy) {
                    statusElement.textContent = "🔴 SLA VIOLATED";
                    statusElement.style.background = "#dc354522";
                    violationElement.textContent = `Overdue: ${formatDuration(violationDuration)}`;
                    timerElement.textContent = '';
                } else {
                    statusElement.textContent = "🕒 SLA IN PROGRESS";
                    statusElement.style.background = "#2376f522";
                    timerElement.textContent = `Remaining: ${formatDuration(remainingTime)}`;
                    violationElement.textContent = '';
                }

            } catch (e) {
                console.error('SLA Error:', e);
                container.hide();
            }
        }

        initializeDisplay();
        calculateSLA();
        frm.slaInterval = setInterval(calculateSLA, 1000);

        // Cleanup handler
        frm.script_manager.on('cleanup', () => {
            if (frm.slaInterval) clearInterval(frm.slaInterval);
        });
    },

    after_save: function(frm) {
        // Refresh to show SLA after initial save
        frm.script_manager.trigger('refresh');
    }
});