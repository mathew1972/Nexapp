frappe.listview_settings['CRM Deal'] = {
    hide_name_column: true,
    disable_column_config: true,   // 🔒 global, no user override

    onload(listview) {
        // Remove Email column globally (without deleting field)
        listview.columns = listview.columns.filter(
            col => col.fieldname !== 'email'
        );

        // Safety: also remove from selectable fields
        listview.available_fields = (listview.available_fields || []).filter(
            f => f.fieldname !== 'email'
        );

        listview.refresh();
    }
};
