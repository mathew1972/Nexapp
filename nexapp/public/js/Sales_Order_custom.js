frappe.ui.form.on('Sales Order', {
    refresh: function (frm) {
        // --- START SIDEBAR COLLAPSE ---
        function collapse_sidebar_by_default() {
            let $side = frm.page.wrapper.find('.layout-side-section');
            let $main = frm.page.wrapper.find('.layout-main-section');
            if (!$side.hasClass('hide')) {
                $main.removeClass('col-sm-10').addClass('col-sm-12');
                $side.removeClass('col-sm-2').addClass('hide').hide();
            }
        }

        $(document.body).off('toggleSidebar.so_custom');
        $(document.body).on('toggleSidebar.so_custom', function () {
            let $side = frm.page.wrapper.find('.layout-side-section');
            let $main = frm.page.wrapper.find('.layout-main-section');
            
            if ($side.hasClass('hide')) {
                $side.removeClass('hide').addClass('col-sm-2').show();
                $main.removeClass('col-sm-12').addClass('col-sm-10');
            } else {
                $side.removeClass('col-sm-2').addClass('hide').hide();
                $main.removeClass('col-sm-10').addClass('col-sm-12');
            }
        });

        collapse_sidebar_by_default();
        setTimeout(collapse_sidebar_by_default, 100);
        setTimeout(collapse_sidebar_by_default, 300);

        // --- START UI STYLING ---
        if (window.nexapp && window.nexapp.ui && window.nexapp.ui.render_odoo_ui) {
            window.nexapp.ui.render_odoo_ui(frm);
        }
        $(frm.wrapper).addClass('custom-sales-order-ui');
        inject_so_guidelines_button(frm);
    }
});



// --- START FRAPPE CONFIRM OVERRIDE (CHATGPT STYLE) ---
if (!window.custom_frappe_confirm_overridden) {
    const original_frappe_confirm = frappe.confirm;
    frappe.confirm = function (message, confirm_action, reject_action) {

        // Strip out frappe specific formatting if present, but usually 'message' is just HTML string
        let popup_html = `
        <div id="custom-frappe-confirm-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10005; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: white; border-radius: 16px; width: 480px; max-width: 90%; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); font-family: 'Inter', -apple-system, sans-serif;">
                <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 19px; color: #111827; font-weight: 600;">Confirm</h3>
                <div style="font-size: 15px; color: #374151; margin-bottom: 32px; line-height: 1.5; font-weight: 500;">
                    ${message}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="custom-confirm-btn-cancel" style="background: #ffffff; color: #374151; border: 1px solid #d1d5db; border-radius: 24px; padding: 10px 20px; font-size: 14.5px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; outline: none;">Cancel</button>
                    <button id="custom-confirm-btn-yes" style="background: #10b981; color: white; border: none; border-radius: 24px; padding: 10px 20px; font-size: 14.5px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3); transition: all 0.2s ease; outline: none;">Confirm</button>
                </div>
            </div>
        </div>`;

        $('body').append(popup_html);

        // Add ChatGPT style hover effects to the pill buttons
        $('#custom-confirm-btn-cancel').hover(
            function () { $(this).css('background', '#f3f4f6'); },
            function () { $(this).css('background', '#ffffff'); }
        );
        $('#custom-confirm-btn-yes').hover(
            function () { $(this).css('background', '#059669'); },
            function () { $(this).css('background', '#10b981'); }
        );

        $('#custom-confirm-btn-cancel').on('click', function () {
            $('#custom-frappe-confirm-overlay').fadeOut(150, function () { $(this).remove(); });
            if (reject_action) reject_action();
        });

        $('#custom-confirm-btn-yes').on('click', function () {
            $('#custom-frappe-confirm-overlay').fadeOut(150, function () { $(this).remove(); });
            if (confirm_action) confirm_action();
        });
    };
    window.custom_frappe_confirm_overridden = true;
}
// --- END FRAPPE CONFIRM OVERRIDE ---

// --- START FRAPPE MSGPRINT OVERRIDE (CHATGPT STYLE) ---
if (!window.custom_frappe_msgprint_overridden) {
    const original_frappe_msgprint = frappe.msgprint;
    frappe.msgprint = function (msg, title, is_minimizable) {
        if (!msg) return;

        let data = {};

        // Sometimes Frappe passes the message as an array of JSON strings or objects
        if (Array.isArray(msg)) {
            let combined_msg = "";
            for (let i = 0; i < msg.length; i++) {
                let m = msg[i];
                if (typeof m === 'string') {
                    try {
                        let parsed = JSON.parse(m);
                        if (parsed && parsed.message) {
                            combined_msg += parsed.message + "<br><br>";
                        } else {
                            combined_msg += m + "<br><br>";
                        }
                    } catch (e) {
                        combined_msg += m + "<br><br>";
                    }
                } else if ($.isPlainObject(m) && m.message) {
                    combined_msg += m.message + "<br><br>";
                }
            }
            data = { message: combined_msg.trim() };
        } else if ($.isPlainObject(msg)) {
            data = msg;
        } else if (typeof msg === 'string') {
            try {
                let parsed = JSON.parse(msg);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // recursively handle array inside string
                    data = { message: parsed.map(p => typeof p === 'object' ? p.message : p).join("<br><br>") };
                } else if ($.isPlainObject(parsed)) {
                    data = parsed;
                } else {
                    data = { message: msg };
                }
            } catch (e) {
                data = { message: msg, title: title };
            }
        } else {
            data = { message: msg, title: title };
        }

        let message_text = data.message || data.msg || "";
        let message_title = data.title || title || "Message";

        if (typeof message_text === 'object') {
            // Unpack one level deeper if message itself is an object
            message_text = message_text.message || JSON.stringify(message_text);
        }

        let popup_html = `
        <div class="custom-frappe-msg-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10005; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: white; border-radius: 16px; width: 480px; max-width: 90%; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); font-family: 'Inter', -apple-system, sans-serif;">
                <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 19px; color: #111827; font-weight: 600;">${message_title}</h3>
                <div style="font-size: 15px; color: #374151; margin-bottom: 32px; line-height: 1.5; font-weight: 500;">
                    ${message_text}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="custom-msg-btn-ok" style="background: #6A5B98; color: white; border: none; border-radius: 24px; padding: 10px 20px; font-size: 14.5px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(106, 91, 152, 0.2); transition: all 0.2s ease; outline: none;">OK</button>
                </div>
            </div>
        </div>`;

        $('body').append(popup_html);

        $('.custom-msg-btn-ok').hover(
            function () { $(this).css('background', '#584982'); },
            function () { $(this).css('background', '#6A5B98'); }
        );

        $('.custom-msg-btn-ok').on('click', function () {
            $(this).closest('.custom-frappe-msg-overlay').fadeOut(150, function () { $(this).remove(); });
        });
    };
    window.custom_frappe_msgprint_overridden = true;
}
// --- END FRAPPE MSGPRINT OVERRIDE ---
frappe.ui.form.on("Sales Order", {
    before_submit: function(frm) {
        if (frm.doc.custom_task_type !== "Sales Order Request - POC To Paid") {
            return;
        }

        return new Promise((resolve, reject) => {
            let is_confirmed = false;
            
            const d = new frappe.ui.Dialog({
                title: "Confirm POC to Paid Conversion",
                fields: [{ fieldtype: "HTML", options: `<p>Do you want to convert the POC to a Paid Customer?</p>` }],
                primary_action_label: "Convert",
                secondary_action_label: "Cancel",
                primary_action: function () {
                    is_confirmed = true;
                    d.hide();
                    resolve(); // Let the framework continue submitting
                },
                secondary_action: function () {
                    d.hide();
                }
            });

            // Intercept modal close (via Cancel or clicking outside)
            d.onhide = () => {
                if (!is_confirmed) {
                    frappe.validated = false; // standard Frappe way to safely abort the transaction
                    reject(new Error("User cancelled POC to Paid conversion")); // Stop the submit promise
                }
            };

            // Style primary button to be green
            $(d.wrapper).find('.btn-primary').css({ 'background': '#10b981', 'border-color': '#10b981' });
            d.show();
        });
    },

    // Following methods (setup, custom_task) are defined later

    setup(frm) {

        frm.set_query("custom_feasibility", "items", function (doc, cdt, cdn) {

            console.log("Custom Query Running");

            return {
                query: "nexapp.api.get_feasibility_list",
                filters: {
                    customer: doc.customer || "",
                    order_type: doc.order_type || ""
                }
            };

        });

    },
    custom_task(frm) {
        if (frm.doc.custom_task) {
            // Guard against double-firing
            if (frappe.flags._task_confirm_pending) return;
            
            frappe.call({
                method: "frappe.client.get",
                args: { doctype: "Task", name: frm.doc.custom_task },
                async: false,
                callback: function(r) {
                    if (!r.message) return;
                    let task = r.message;
                    
                    if (!task.custom_blanket_order) return;
                    
                    let task_items = task.custom_circuit_id || [];
                    if (task_items.length === 0) {
                        frappe.msgprint("No items found in Task Circuit ID table to copy.");
                        return;
                    }
                    
                    frappe.flags._task_confirm_pending = true;
                    
                    setTimeout(function() {
                        frappe.confirm(
                            "Do you want to update the Items as per Task?",
                            () => {
                                frm.clear_table("items");
                                
                                let promises = [];
                                
                                task_items.forEach(task_item => {
                                    let row = frm.add_child("items");
                                    
                                    // Check both the main Task doctype and the child table for the rate
                                    let rate = flt(task.otc) || flt(task_item.otc);
                                    if (rate === 0) {
                                        rate = flt(task.arc) || flt(task_item.arc);
                                    }
                                    if (rate === 0) {
                                        rate = flt(task.custom_mrc) || flt(task_item.custom_mrc);
                                    }
                                    if (rate === 0) {
                                        rate = flt(task.mrc) || flt(task_item.mrc);
                                    }
                                    
                                    // Synchronously inject blanket order BEFORE item_code to bypass frontend validations
                                    // and ensure they are immediately visible in the UI
                                    row.against_blanket_order = 1;
                                    row.blanket_order = task.custom_blanket_order;
                                    row.custom_feasibility = task_item.circuit_id;
                                    row.custom_site_info = task_item.site_name;
                                    row.custom_solution = task_item.solution;
                                    
                                    // Store protected rate temporarily to override Frappe's background wipes later
                                    row._custom_rate = rate;
                                    
                                    // Trigger Frappe's standard item fetch
                                    let p = frappe.model.set_value(row.doctype, row.name, "item_code", task_item.custom_product).then(() => {
                                        // Set basic fields that are safe
                                        frappe.model.set_value(row.doctype, row.name, {
                                            item_name: task_item.custom_product_name,
                                            qty: 1
                                        });
                                    });
                                    
                                    promises.push(p);
                                });
                                
                                Promise.all(promises).then(() => {
                                    // Refresh immediately so Blanket Order fields show up right away
                                    frm.refresh_field("items");
                                    
                                    // Wait 1.5 seconds for Frappe to fetch Blanket Order Rates, then overwrite them
                                    setTimeout(() => {
                                        let rate_promises = [];
                                        
                                        frm.doc.items.forEach(row => {
                                            if (row._custom_rate !== undefined && row._custom_rate > 0) {
                                                // Only override if the Task actually specifies a rate > 0.
                                                // Otherwise, leave the standard Item Price / Blanket Order Rate intact!
                                                let p = frappe.model.set_value(row.doctype, row.name, {
                                                    rate: row._custom_rate,
                                                    price_list_rate: row._custom_rate,
                                                    amount: row._custom_rate
                                                });
                                                rate_promises.push(p);
                                            }
                                        });
                                        
                                        Promise.all(rate_promises).then(() => {
                                            frm.refresh_field("items");
                                            frappe.flags._task_confirm_pending = false;
                                        });
                                    }, 1500);
                                }).catch(() => {
                                    frappe.flags._task_confirm_pending = false;
                                });
                            },
                            () => {
                                // User cancelled
                                frappe.flags._task_confirm_pending = false;
                            }
                        );
                    }, 500);
                }
            });
        }
    }
});

function inject_so_guidelines_button(frm) {
    if ($('#smart_btn_guidelines_so').length === 0) {
        let section = frm.get_field('customer_section') || frm.get_field('custom_deal_information');
        if (section && section.wrapper) {
            let $wrapper = $(section.wrapper);
            let $head = $wrapper.find('.form-section-heading, .section-head').first();
            if ($head.length === 0) {
                $head = $wrapper.find('h4, div').filter(function () {
                    return $(this).text().indexOf('Customer') !== -1 || $(this).text().indexOf('Deal') !== -1;
                }).first();
            }
            if ($head.length === 0) $head = $wrapper;

            $head.css({ 'position': 'relative', 'display': 'flex', 'align-items': 'center' });
            let guidelinesBtnHtml = `
                    <button class="odoo-smart-btn" id="smart_btn_guidelines_so" title="Sales Order Guidelines" style="position: absolute; right: 24px; top: 50%; transform: translateY(-50%); z-index: 10; border: 1px solid #e2e0ea !important; outline: none !important;">
                        <i class="fa fa-book" style="color: #7768A5; font-size: 21px; margin-right: 9px;"></i>
                        <div style="text-align: left; line-height: 1.2;">
                            <span style="font-size: 11.5px; color: #64748b; text-transform: uppercase; display: block;">Guidelines</span>
                            <span style="font-weight: 700; color: #0f172a;">Sales Order</span>
                        </div>
                    </button>
                `;
            $head.append(guidelinesBtnHtml);

            $('#smart_btn_guidelines_so').off('click').on('click', function (e) {
                e.stopPropagation();
                if (typeof show_sales_order_guidelines === 'function') {
                    show_sales_order_guidelines();
                }
            });
        }
    }
}

function show_sales_order_guidelines() {
    let htmlContent = `
        <div id="custom_so_guidelines_modal" style="
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        ">
            <div class="custom-guidelines-modal-content" style="
                background: #ffffff;
                border-radius: 16px;
                width: 650px;
                max-width: 90vw;
                max-height: 85vh;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                transform: scale(0.95) translateY(10px);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
                position: relative;
                font-family: 'Outfit', 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
            ">
                <!-- Header -->
                <div style="
                    padding: 24px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                ">
                    <div style="
                        width: 44px;
                        height: 44px;
                        border-radius: 10px;
                        background: rgba(119, 104, 165, 0.1);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fa fa-book" style="color: #7768A5; font-size: 22px;"></i>
                    </div>
                    <div>
                        <h3 style="font-weight: 800; margin: 0; color: #0f172a; font-size: 17px; font-family: 'Outfit', 'Inter', sans-serif;">Sales Order Implementation Guidelines</h3>
                        <span style="font-size: 12px; color: #64748b; font-weight: 500; display: block; margin-top: 2px;">Official operational standards for Sales Order processing</span>
                    </div>
                </div>

                <!-- Close Button -->
                <button id="close_so_guidelines_modal" style="
                    position: absolute;
                    top: 20px; right: 20px;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: #e2e8f0;
                    color: #475569;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.2s, color 0.2s;
                    z-index: 10;
                " onmouseover="this.style.background='#cbd5e1'; this.style.color='#0f172a';" onmouseout="this.style.background='#e2e8f0'; this.style.color='#475569';">
                    <i class="fa fa-times"></i>
                </button>

                <!-- Body (Scrollable) -->
                <div style="
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                ">
                    <!-- Card 1 -->
                    <div style="background: #f8fafc; border-left: 4px solid #7768A5; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-check-circle" style="color: #7768A5; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">1. Order Verification</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Verify <strong>Customer Details</strong> and confirm the exact delivery locations.</li>
                            <li>Ensure that <strong>Purchase Order (PO) Details</strong> map accurately to the requested items.</li>
                        </ul>
                    </div>

                    <!-- Card 2 -->
                    <div style="background: #f8fafc; border-left: 4px solid #eab308; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-money" style="color: #eab308; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">2. Contract & Pricing</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Confirm that the <strong>Contract Terms</strong> and <strong>Service Type</strong> have been fully negotiated and attached.</li>
                            <li>Pricing must match the final approved CRM Deal and PO amount without discrepancy.</li>
                        </ul>
                    </div>

                    <!-- Card 3 -->
                    <div style="background: #f8fafc; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; border-left-width: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <i class="fa fa-exclamation-triangle" style="color: #ef4444; font-size: 15px;"></i>
                            <h4 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 14px; font-family: 'Outfit', sans-serif;">3. Tax & Compliance</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                            <li>Review the <strong>GST Details</strong> and <strong>Taxes</strong> section carefully before finalizing.</li>
                            <li>Missing or incorrect taxation categories will result in invoice rejection from the customer.</li>
                        </ul>
                    </div>
                </div>

                <!-- Footer -->
                <div style="
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                ">
                    <button id="close_so_guidelines_modal_btn" style="
                        background: #7768A5;
                        color: #ffffff;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 8px;
                        font-weight: 700;
                        font-size: 13px;
                        cursor: pointer;
                        box-shadow: 0 2px 4px rgba(119, 104, 165, 0.2);
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='0.9';" onmouseout="this.style.opacity='1';">Close Guidelines</button>
                </div>
            </div>
        </div>
    `;

    $('#custom_so_guidelines_modal').remove();
    $('body').append(htmlContent);

    let $modal = $('#custom_so_guidelines_modal');

    setTimeout(() => {
        $modal.css('opacity', '1');
        $modal.find('.custom-guidelines-modal-content').css('transform', 'scale(1) translateY(0)');
    }, 10);

    let closeModal = function () {
        $modal.css('opacity', '0');
        $modal.find('.custom-guidelines-modal-content').css('transform', 'scale(0.95) translateY(10px)');
        setTimeout(() => $modal.remove(), 300);
    };

    $('#close_so_guidelines_modal, #close_so_guidelines_modal_btn').on('click', closeModal);
    $modal.on('click', function (e) {
        if (e.target.id === 'custom_so_guidelines_modal') closeModal();
    });
}