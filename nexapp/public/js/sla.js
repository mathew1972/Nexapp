frappe.ui.form.on('HD Ticket', {
    status: function(frm) {
        // Auto-set resolution date when resolved
        if (frm.doc.status === 'Resolved' && !frm.doc.custom_resolution_date_2) {
            frm.set_value('custom_resolution_date_2', frappe.datetime.now_datetime());
        }

        // Handle hold timing
        if (frm.doc.status === 'On Hold' && !frm.holdStart) {
            frm.holdStart = new Date(); // Start tracking hold time
        } else if (['Open', 'Replied'].includes(frm.doc.status) && frm.holdStart) {
            // Calculate and accumulate hold duration
            const holdEnd = new Date();
            frm.totalHoldDuration = (frm.totalHoldDuration || 0) + (holdEnd - frm.holdStart);
            frm.holdStart = null;
        }
    },

    refresh: function(frm) {
        const container = frm.fields_dict.custom_resolution_update.$wrapper;
        let l1Completed = false;
        let finalClosedDate = null;

        // Initialize hold tracking
        frm.totalHoldDuration = frm.totalHoldDuration || 0;
        frm.holdStart = frm.holdStart || null;

        // Clear existing interval
        if (frm.slaInterval) {
            clearInterval(frm.slaInterval);
            frm.slaInterval = null;
        }

        const PRIORITY_MAP = {
            'Urgent': 2,
            'High': 4,
            'Medium': 8,
            'Low': 24
        };

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

                <div class="l1-timeline" style="border: 1px solid #eee; border-radius: 4px; padding: 12px; margin-top: 15px;">
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span class="l1-title" style="font-size: 12px; color: #666;"></span>
                            <span class="l1-remaining" style="font-size: 12px; color: #666;"></span>
                        </div>
                        <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                            <div class="l1-progress" style="width: 0%; height: 100%; background: #ff4444; transition: width 0.5s ease-in-out;"></div>
                        </div>
                    </div>
                </div>
            `);
        }

        function parseFrappeDateTime(dateStr, timeStr) {
            try {
                const [year, month, day] = dateStr.split('-');
                const [hours, minutes, seconds] = timeStr?.split(':') || [0, 0, 0];
                return new Date(year, month-1, day, hours, minutes, seconds);
            } catch {
                return null;
            }
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
                // Handle terminal statuses
                if (['Wrong Circuit', 'Closed'].includes(frm.doc.status)) {
                    if (frm.slaInterval) {
                        clearInterval(frm.slaInterval);
                        frm.slaInterval = null;
                    }

                    const statusElement = container.find('.sla-status')[0];
                    const progressBar = container.find('.progress-bar')[0];
                    const timerElement = container.find('.timer')[0];
                    const violationElement = container.find('.violation-duration')[0];
                    const l1Timeline = container.find('.l1-timeline');

                    if (frm.doc.status === 'Wrong Circuit') {
                        statusElement.textContent = "🔴 WRONG CIRCUIT";
                        statusElement.style.background = "#dc354522";
                        timerElement.textContent = '';
                        l1Timeline.hide();
                        return;
                    }

                    // Handle Closed
                    if (!finalClosedDate) {
                        finalClosedDate = frm.doc.custom_resolution_date_2 ? 
                            new Date(frm.doc.custom_resolution_date_2) : new Date();
                    }

                    const openingDateTime = parseFrappeDateTime(frm.doc.opening_date, frm.doc.opening_time);
                    if (!openingDateTime) return;

                    const elapsedTime = finalClosedDate - openingDateTime - (frm.totalHoldDuration || 0);
                    
                    statusElement.textContent = "⚫ CLOSED";
                    statusElement.style.background = "#6c757d22";
                    progressBar.style.display = 'none';
                    timerElement.textContent = `Time to Close: ${formatDuration(elapsedTime)}`;
                    violationElement.textContent = '';

                    // L1 calculations
                    const ticketPriority = frm.doc.priority || 'High';
                    const originalHours = PRIORITY_MAP[ticketPriority] || 4;
                    const l1Hours = originalHours < 4 ? originalHours / 2 : 4;
                    const L1_DURATION = l1Hours * 60 * 60 * 1000;
                    const l1Elapsed = elapsedTime;
                    const l1Progress = Math.min((l1Elapsed / L1_DURATION) * 100, 100);

                    container.find('.l1-progress').css('width', `${l1Progress}%`);
                    container.find('.l1-title').text(`L1 Agent (${l1Hours.toFixed(1)} hours)`);
                    container.find('.l1-remaining').text(l1Progress >= 100 ? "Completed" : "Stopped");
                    return;
                }

                // Handle On Hold status
                if (frm.doc.status === 'On Hold') {
                    container.show();
                    const statusElement = container.find('.sla-status')[0];
                    const progressBar = container.find('.progress-bar')[0];
                    const timerElement = container.find('.timer')[0];
                    const l1Timeline = container.find('.l1-timeline');

                    const openingDateTime = parseFrappeDateTime(frm.doc.opening_date, frm.doc.opening_time);
                    const resolutionBy = new Date(frm.doc.resolution_by);
                    const now = new Date();
                    
                    if (!openingDateTime || !resolutionBy) return;

                    // Calculate effective elapsed time (excluding hold duration)
                    let elapsed = now - openingDateTime - (frm.totalHoldDuration || 0);
                    if (frm.holdStart) elapsed -= (now - frm.holdStart);

                    const totalExpectedTime = resolutionBy - openingDateTime;
                    const progress = Math.min((elapsed / totalExpectedTime) * 100, 100);

                    // Update SLA display
                    statusElement.textContent = "⏸️ ON HOLD";
                    statusElement.style.background = "#ffc10722";
                    progressBar.style.width = `${progress}%`;
                    timerElement.textContent = `Paused: ${formatDuration(elapsed)}`;

                    // Update L1 timeline
                    const ticketPriority = frm.doc.priority || 'High';
                    const originalHours = PRIORITY_MAP[ticketPriority] || 4;
                    const l1Hours = originalHours < 4 ? originalHours / 2 : 4;
                    const L1_DURATION = l1Hours * 60 * 60 * 1000;
                    const l1Progress = Math.min((elapsed / L1_DURATION) * 100, 100);

                    container.find('.l1-progress').css('width', `${l1Progress}%`);
                    container.find('.l1-title').text(`L1 Agent (${l1Hours.toFixed(1)} hours)`);
                    container.find('.l1-remaining').text("Paused");
                    return;
                }

                // Active status handling (Open/Replied)
                if (!frm.doc.opening_date || !frm.doc.opening_time || !frm.doc.resolution_by) {
                    container.hide();
                    return;
                }
                container.show();

                const statusElement = container.find('.sla-status')[0];
                const progressBar = container.find('.progress-bar')[0];
                const timerElement = container.find('.timer')[0];
                const violationElement = container.find('.violation-duration')[0];
                const l1Timeline = container.find('.l1-timeline');
                l1Timeline.show();

                const openingDateTime = parseFrappeDateTime(frm.doc.opening_date, frm.doc.opening_time);
                const resolutionBy = new Date(frm.doc.resolution_by);
                const resolutionDate = frm.doc.custom_resolution_date_2 ? 
                    new Date(frm.doc.custom_resolution_date_2) : null;
                const now = new Date();

                if (!openingDateTime || !resolutionBy || isNaN(openingDateTime) || isNaN(resolutionBy)) {
                    statusElement.textContent = "⚠️ Invalid date format";
                    return;
                }

                // Adjust elapsed time for holds
                let elapsed = now - openingDateTime - (frm.totalHoldDuration || 0);
                if (frm.holdStart) elapsed -= (now - frm.holdStart);
                const totalExpectedTime = resolutionBy - openingDateTime;

                if (frm.doc.status === 'Resolved') {
                    if (!resolutionDate) {
                        statusElement.textContent = "⚠️ Missing Resolution Date";
                        return;
                    }

                    const actualResolutionTime = resolutionDate - openingDateTime - (frm.totalHoldDuration || 0);
                    const isWithinSLA = actualResolutionTime <= totalExpectedTime;

                    violationElement.textContent = !isWithinSLA ? 
                        `Violation Duration: ${formatDuration(resolutionDate - resolutionBy)}` : "";

                    statusElement.textContent = isWithinSLA ? "🟢 ON TIME SLA" : "🔴 SLA VIOLATED";
                    statusElement.style.background = isWithinSLA ? "#28a74522" : "#dc354522";
                    progressBar.style.display = 'none';
                    timerElement.textContent = `Resolution Time: ${formatDuration(actualResolutionTime)}`;

                } else {
                    const progress = Math.min((elapsed / totalExpectedTime) * 100, 100);
                    
                    progressBar.style.display = 'block';
                    progressBar.style.width = `${progress}%`;

                    if (now > resolutionBy) {
                        const violationDuration = now - resolutionBy;
                        statusElement.textContent = "🔴 SLA VIOLATED";
                        statusElement.style.background = "#dc354522";
                        timerElement.textContent = "";
                        violationElement.textContent = `Violation Duration: ${formatDuration(violationDuration)}`;
                    } else {
                        statusElement.textContent = "🕒 SLA IN PROGRESS";
                        statusElement.style.background = "#2376f522";
                        const remaining = resolutionBy - now + (frm.totalHoldDuration || 0);
                        timerElement.textContent = `Remaining: ${formatDuration(remaining)}`;
                        violationElement.textContent = "";
                    }
                }

                // L1 calculations with hold adjustment
                if (!l1Completed) {
                    const ticketPriority = frm.doc.priority || 'High';
                    const originalHours = PRIORITY_MAP[ticketPriority] || 4;
                    const l1Hours = originalHours < 4 ? originalHours / 2 : 4;
                    const L1_DURATION = l1Hours * 60 * 60 * 1000;
                    const l1Elapsed = elapsed;
                    const l1Progress = Math.min((l1Elapsed / L1_DURATION) * 100, 100);

                    container.find('.l1-progress').css('width', `${l1Progress}%`);
                    container.find('.l1-title').text(`L1 Agent (${l1Hours.toFixed(1)} hours)`);

                    if (l1Progress >= 100 || frm.doc.status === 'Resolved') {
                        l1Completed = true;
                        container.find('.l1-remaining').text("Completed");
                    } else {
                        const remaining = L1_DURATION - l1Elapsed;
                        container.find('.l1-remaining').text(`Remaining: ${formatDuration(remaining)}`);
                    }
                }

            } catch (e) {
                console.error('SLA Error:', e);
                container.hide();
            }
        }

        // Initialize and start updates
        initializeDisplay();
        calculateSLA();
        frm.slaInterval = setInterval(calculateSLA, 1000);
        frm.script_manager.cleanup.push(() => {
            if (frm.slaInterval) {
                clearInterval(frm.slaInterval);
                frm.slaInterval = null;
            }
        });
    }
});