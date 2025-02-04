frappe.ui.form.on('Feasibility', {
    refresh: function(frm) {
        const fields = [
            'site_name', 'customer', 'customer_request', 'feasibility_completed_date', 
            'region', 'circuit_id', 'feasibility_type', 
            'exiting_circuit_id', 'feasibility_status', 'feasibility_remark', 
            'reason_for_partial_feasible', 'reason_for_high_commercials', 'reason_for_not_feasible', 
            'solution', 'static_ip', 'no_of_static_ip_required', 
            'primary_data_plan', 'secondary_data_plan', 
            'site_type', 'street', 'city', 'country', 
            'longitude', 'site_id__legal_code', 'pincode', 
            'district', 'state', 'latitude', 'primary_contact', 
            'contact_html', 'alternate_contact', 'contact_html2', 
            'description', 'lms_provider','sales_order', 'sales_order_date', 
            'amended_from', 'solution_code', 'managed_services', 'config_type',
            'solution_name'
        ];

        fields.forEach(function(field) {
            if (frm.fields_dict[field]) {
                const fieldElement = $(frm.fields_dict[field].wrapper).find('input, textarea, select');

                if (frm.fields_dict[field].df.reqd) {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-left': '4px solid red',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                } else {
                    fieldElement.css({
                        'border': '1px solid #ccc',
                        'border-radius': '7px',
                        'padding': '5px',
                        'outline': 'none',
                        'background-color': '#ffffff',
                        'transition': '0.3s ease-in-out'
                    });
                }

                fieldElement.on('focus', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'border-left': '5px solid red',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #80bdff',
                            'box-shadow': '0 0 8px 0 rgba(0, 123, 255, 0.5)',
                            'background-color': '#ffffff'
                        });
                    }
                });

                fieldElement.on('blur', function() {
                    if (frm.fields_dict[field].df.reqd) {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'border-left': '5px solid red',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    } else {
                        $(this).css({
                            'border': '1px solid #ccc',
                            'box-shadow': 'none',
                            'background-color': '#ffffff'
                        });
                    }
                });
            }
        });
    }
});

//before_save: function (frm) {
  //  const statuses = ['Feasible', 'Partial Feasible', 'Not Feasible', 'High Commercials'];
   // if (statuses.includes(frm.doc.feasibility_status)) {
        // Update the feasibility_completed_date to the current date and time
    //    frm.set_value('feasibility_completed_date', frappe.datetime.now_datetime());
    //} else if (frm.doc.feasibility_status === 'Pending') {
      //  frappe.throw(__('The document cannot be submitted as the status is "Pending".'));
    //}
//},

//customer_request: function (frm) {
  //  if (frm.doc.customer_request) {
  //      const today = frappe.datetime.now_date(); // Get today's date
  //      if (frm.doc.customer_request > today) {
  //          frappe.msgprint(__('The Customer Request date cannot be greater than today.'));
  //          frm.set_value('customer_request', null); // Clear the field
   //     }
  //  }
//}