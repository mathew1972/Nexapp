let po_btn_interval;

$(document).on('page-change', function() {
    if (frappe.get_route()[0] === 'List' && frappe.get_route()[1] === 'Material Request') {
        if (po_btn_interval) clearInterval(po_btn_interval);
        
        po_btn_interval = setInterval(() => {
            if (window.cur_list && window.cur_list.page && window.cur_list.doctype === 'Material Request') {
                if (!window.cur_list.page.custom_po_btn_added) {
                    // Create a prominent standalone button
                    let btn = window.cur_list.page.add_button(__('Create Purchase Order'), function() {
                        var selected_docs = window.cur_list.get_checked_items();
                        
                        if (selected_docs.length === 0) {
                            frappe.msgprint(__('Please select at least one Material Request from the list below.'));
                            return;
                        }

                        var mr_names = selected_docs.map(function(doc) {
                            return doc.name;
                        });

                        frappe.call({
                            method: "nexapp.api.make_po_from_multiple_mr",
                            args: {
                                mr_names: JSON.stringify(mr_names)
                            },
                            freeze: true,
                            freeze_message: __('Creating Purchase Order...'),
                            callback: function(r) {
                                if (r.message) {
                                    frappe.set_route("Form", "Purchase Order", r.message);
                                }
                            }
                        });
                    });

                    // Add color and styling to the button to make it stand out
                    btn.removeClass('btn-default').addClass('btn-primary');
                    btn.css({
                        'background-color': '#665793', // User requested color
                        'color': 'white',
                        'border-color': '#665793',
                        'font-weight': 'bold',
                        'display': 'none' // Hide by default
                    });

                    // Add an event listener to toggle button visibility when checkboxes are clicked
                    // We bind to document to ensure it works even if the list view DOM is recreated
                    $(document).on('change', '.list-row-checkbox, .list-header-checkbox', function() {
                        if (window.cur_list && window.cur_list.doctype === 'Material Request') {
                            var selected_docs = window.cur_list.get_checked_items();
                            if (selected_docs.length > 0) {
                                btn.show();
                            } else {
                                btn.hide();
                            }
                        }
                    });

                    window.cur_list.page.custom_po_btn_added = true;
                    clearInterval(po_btn_interval);
                } else {
                    clearInterval(po_btn_interval);
                }
            }
        }, 500);
    } else {
        if (po_btn_interval) clearInterval(po_btn_interval);
    }
});
