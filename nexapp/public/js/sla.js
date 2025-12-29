frappe.ui.form.on('HD Ticket', {
    status: function(frm) {
        // Handle hold timing
        if ((frm.doc.status === 'On Hold' || frm.doc.agreement_status === 'Paused') && !frm.holdStart) {
            frm.holdStart = new Date();
            if (!frm.doc.on_hold_since) {
                frm.set_value('on_hold_since', frappe.datetime.now_datetime());
            }
        } else if (['Open', 'Replied'].includes(frm.doc.status) && frm.holdStart && frm.doc.agreement_status !== 'Paused') {
            const holdEnd = new Date();
            frm.totalHoldDuration = (frm.totalHoldDuration || 0) + (holdEnd - frm.holdStart);
            frm.holdStart = null;
            frm.set_value('on_hold_since', null);
        }
    },

    agreement_status: function(frm) {
        if (frm.doc.agreement_status === 'Paused' && frm.doc.status !== 'On Hold') {
            frm.set_value('status', 'On Hold');
        } else if (frm.doc.agreement_status !== 'Paused' && frm.doc.status === 'On Hold') {
            frm.set_value('status', 'Open');
        }
    },

    priority: function(frm) {
        if (frm.slaInterval) clearInterval(frm.slaInterval);
        frm.refresh();
    },

    refresh: function(frm) {
        if (frm.is_new()) return;

        const container = frm.fields_dict.custom_resolution_update.$wrapper;
        frm.totalHoldDuration = frm.totalHoldDuration || 0;
        frm.holdStart = frm.holdStart || null;

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
                    ${(frm.doc.status === 'On Hold' || frm.doc.agreement_status === 'Paused') ? 
                        `<div class="hold-duration" style="text-align: center; font-family: monospace; font-size: 12px; color: #ffc107; margin-top: 5px;"></div>` : ''}
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

                if (!openingDateTime || !resolutionBy || !frm.doc.opening_date) {
                    container.hide();
                    return;
                }

                if (['Closed', 'Wrong Circuit'].includes(frm.doc.status)) {
                    container.find('.progress-bar').hide();
                    container.find('.sla-status').text(`⚫ ${frm.doc.status.toUpperCase()}`);
                    return;
                }

                let elapsed = now - openingDateTime;
                elapsed -= (frm.totalHoldDuration || 0);
                if (frm.holdStart) elapsed -= (now - frm.holdStart);

                const totalExpectedTime = resolutionBy - openingDateTime;
                const remainingTime = resolutionBy - now;
                const violationDuration = now - resolutionBy;

                const progress = Math.min((elapsed / totalExpectedTime) * 100, 100);
                container.find('.progress-bar').css('width', `${progress}%`);

                const statusElement = container.find('.sla-status')[0];
                const timerElement = container.find('.timer')[0];
                const violationElement = container.find('.violation-duration')[0];
                const holdElement = container.find('.hold-duration')[0];

                if (frm.doc.status === 'Resolved') {
                    statusElement.textContent = "🟢 RESOLVED";
                    statusElement.style.background = "#28a74522";
                    timerElement.textContent = '';
                    violationElement.textContent = '';
                } 
                else if (frm.doc.status === 'On Hold' || frm.doc.agreement_status === 'Paused') {
                    statusElement.textContent = "🟡 ON HOLD";
                    statusElement.style.background = "#ffc10722";
                    timerElement.textContent = '';
                    violationElement.textContent = '';
                    
                    if (holdElement) {
                        const holdDuration = frm.holdStart ? now - frm.holdStart : 0;
                        holdElement.textContent = `On Hold: ${formatDuration(holdDuration)}`;
                    }
                }
                else if (now > resolutionBy) {
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

        // 🟢 Use 10 seconds interval
        frm.slaInterval = setInterval(calculateSLA, 10000);

        $(frm.wrapper).on('remove', function () {
            if (frm.slaInterval) {
                clearInterval(frm.slaInterval);
            }
        });
    },

    after_save: function(frm) {
        frm.refresh();
    }
});
