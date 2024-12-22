frappe.ui.form.on('Site', {
    onload: function (frm) {
        update_all_child_rows_stock(frm); // Ensure stock is updated on load
    },

    refresh: function (frm) {
        update_all_child_rows_stock(frm); // Also update on refresh
    },
});

frappe.ui.form.on('site_item', {
    item_code: function (frm, cdt, cdn) {
        fetch_stock_for_child_row(frm, cdt, cdn); // Update stock when item_code changes
    },

    warehouse: function (frm, cdt, cdn) {
        fetch_stock_for_child_row(frm, cdt, cdn); // Update stock when warehouse changes
    },
});

function fetch_stock_for_child_row(frm, cdt, cdn) {
    const row = frappe.get_doc(cdt, cdn);

    if (row.item_code && row.warehouse) {
        frappe.call({
            method: "nexapp.api.get_stock_details", // Adjust to your app's path
            args: {
                item_code: row.item_code,
                warehouse: row.warehouse,
            },
            callback: function (response) {
                if (response.message) {
                    const item_balance = response.message.item_balance || 0;

                    // Update the stock fields
                    frappe.model.set_value(cdt, cdn, "stock_balance", item_balance);
                    frappe.model.set_value(cdt, cdn, "stock_reserved", response.message.item_reserved || 0);

                    // Add an indicator for stock status
                    const indicator = item_balance > 0 ? "green" : "red";
                    const indicatorHTML = `<span class="indicator ${indicator}"></span>`;

                    // Add the indicator to the `item_code` field in the child table
                    const item_field = frm.fields_dict.site_item.grid.get_field("item_code");
                    const grid_row = frm.fields_dict.site_item.grid.grid_rows_by_docname[row.name];
                    if (item_field && grid_row) {
                        $(grid_row.wrapper).find('[data-fieldname="item_code"]').html(`${indicatorHTML} ${row.item_code}`);
                    }
                }
            },
        });
    } else {
        frappe.model.set_value(cdt, cdn, "stock_balance", 0);
        frappe.model.set_value(cdt, cdn, "stock_reserved", 0);
    }
}

function update_all_child_rows_stock(frm) {
    const table_fieldname = "site_item";
    const rows = frm.doc[table_fieldname] || [];

    rows.forEach((row) => {
        if (row.item_code && row.warehouse) {
            fetch_stock_for_child_row(frm, row.doctype, row.name);
        }
    });
}

