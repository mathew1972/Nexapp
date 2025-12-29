function handleCCRAction({ doc, call, createToast }) {
    // Create a custom dialog with options
    const dialog = new frappe.ui.Dialog({
        title: 'Customer Contact Review',
        fields: [
            {
                fieldname: 'review_type',
                label: 'Review Type',
                fieldtype: 'Select',
                options: [
                    'Comprehensive Review',
                    'Quick Check',
                    'Follow-up Required'
                ].join('\n'),
                default: 'Quick Check'
            },
            {
                fieldname: 'include_notes',
                label: 'Include Notes',
                fieldtype: 'Check',
                default: 1
            },
            {
                fieldname: 'send_notification',
                label: 'Send Notification',
                fieldtype: 'Check',
                default: 0
            }
        ],
        primary_action_label: 'Run CCR',
        primary_action: (values) => {
            executeCCRProcess({ 
                doc, 
                call, 
                createToast, 
                options: values 
            });
            dialog.hide();
        }
    });
    
    dialog.show();
}