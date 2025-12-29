frappe.pages['billing-portal'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Billing Portal',
        single_column: true
    });
    
    page.body.html('<h1>Billing Portal</h1><div id="content">Loading...</div>');
    
    frappe.call({
        method: "nexapp.api.get_billing_data",
        callback: function(r) {
            console.log(r);
            if(r.message) {
                $("#content").html(JSON.stringify(r.message));
            } else {
                $("#content").html("Error loading data");
            }
        }
    });
};