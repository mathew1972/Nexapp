frappe.listview_settings['CRM Deal'] = {
  onload(listview) {
    listview.page.add_inner_button('Test', () => {
      frappe.msgprint('Test button clicked from CRM Deal List');
    });
  }
};
