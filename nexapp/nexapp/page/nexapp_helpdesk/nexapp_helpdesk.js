frappe.pages['nexapp-helpdesk'].on_page_load = function(wrapper) {
    frappe.require('/assets/nexapp/css/helpdesk/orange_theme.css');
    frappe.require('/assets/nexapp/js/helpdesk/helpdesk_page.js', function() {
        HelpdeskApp.init(wrapper);
    });
};
