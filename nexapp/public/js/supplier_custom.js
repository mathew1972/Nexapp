frappe.ui.form.on('Supplier', {
    refresh: function(frm) {
        render_bank_account_html(frm);
    },
    after_save: function(frm) {
        render_bank_account_html(frm);
    }
});

function render_bank_account_html(frm) {
    if (!frm.doc.name) {
        frm.fields_dict.custom_bank_details_html.$wrapper.html('');
        return;
    }

    frappe.db.get_list('Bank Account', {
        filters: {
            party_type: 'Supplier',
            party: frm.doc.name
        },
        fields: [
            'account_name',
            'custom_details',
            'bank',
            'account_type',
            'custom_ifsc',
            'bank_account_no',
            'is_default'
        ]
    }).then(records => {
        if (!records || records.length === 0) {
            frm.fields_dict.custom_bank_details_html.$wrapper.html('<p style="color:red;">No linked Bank Account found for this supplier.</p>');
            return;
        }

        let html = '';
        records.forEach((record, i) => {
            html += `
                <div style="width: 100%; border:2px solid #d9534f; background:#fff6f6; padding:30px; margin-bottom:30px; border-radius:12px;">
                    <h4 style="background-color:#f8d7da; color:#721c24; padding:14px 24px; border-radius:8px; margin-bottom:25px; font-size:18px;">
                        🏦 Bank Account ${i + 1}
                    </h4>
                    <table style="width:100%; border-collapse: collapse; font-size:15px;">
                        <tr>
                            <td style="width: 50%; padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Account Name</strong><br>${record.account_name || '-'}</td>
                            <td style="width: 50%; padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Bank</strong><br>${record.bank || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Alias</strong><br>${record.custom_details || '-'}</td>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Account Type</strong><br>${record.account_type || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Bank Account No</strong><br>${record.bank_account_no || '-'}</td>
                            <td style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>IFSC Code</strong><br>${record.custom_ifsc || '-'}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 14px 20px; border: 1px solid #e3a1a1;"><strong>Is Default</strong><br>${record.is_default ? '✅ Yes' : '❌ No'}</td>
                        </tr>
                    </table>
                </div>
            `;
        });

        frm.fields_dict.custom_bank_details_html.$wrapper.html(html);
    });
}
