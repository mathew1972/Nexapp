// ======================================================
// Customer Advance → Sales Order UI Extension ONLY
// Safe Version (Does NOT override Match Now)
// ======================================================

console.log("✅ customer_advance_po.js loaded");

(function () {

    // --------------------------------------------------
    // Inject Sales Order UI
    // --------------------------------------------------
    function inject_so_ui() {
        if ($('#sales-order-group-new').length) return;

        const html = `
            <div id="sales-order-group-new" style="margin-top:15px; display:none;">
                <label class="control-label">
                    Sales Order <span class="text-muted">(Optional)</span>
                </label>

                <div class="dropdown">
                    <button class="btn btn-default dropdown-toggle"
                            type="button"
                            id="sales-order-toggle-new"
                            data-toggle="dropdown"
                            style="width:100%; text-align:left;">
                        Select Sales Order
                        <span class="caret" style="float:right; margin-top:8px;"></span>
                    </button>

                    <div class="dropdown-menu"
                         id="sales-order-items-new"
                         style="max-height:200px; overflow:auto; width:100%;">
                    </div>
                </div>

                <input type="hidden" id="sales-order-new" />
            </div>
        `;

        if ($('#customer-group').length) {
            $('#customer-group').after(html);
        }
    }

    // --------------------------------------------------
    // Reset Sales Order
    // --------------------------------------------------
    function reset_sales_order() {
        $('#sales-order-new').val('');
        $('#sales-order-toggle-new').text('Select Sales Order');
        $('#sales-order-items-new').empty();
    }

    // --------------------------------------------------
    // Load Sales Orders from API
    // --------------------------------------------------
    function load_sales_orders(customer) {
        const $items = $('#sales-order-items-new');
        if (!$items.length) return;

        $items.empty();

        frappe.call({
            method: 'nexapp.api.get_submitted_sales_orders_by_customer',
            args: { customer: customer },
            callback: function (r) {

                const list = r.message || [];

                if (!list.length) {
                    $items.append(
                        `<div class="dropdown-item text-muted">No Sales Orders Found</div>`
                    );
                    return;
                }

                list.forEach(function (so) {
                    $items.append(
                        `<a class="dropdown-item" data-value="${so.name}">
                            ${so.name}
                         </a>`
                    );
                });
            }
        });
    }

    // --------------------------------------------------
    // When Customer selected
    // --------------------------------------------------
    $(document).on('click', '#customer-items .dropdown-item', function () {

        if ($('#category').val() !== 'Customer Advance') return;

        const customer = $(this).data('value');
        if (!customer) return;

        $('#customer').val(customer);
        $('#customer-toggle').text(customer);

        setTimeout(function () {
            inject_so_ui();
            reset_sales_order();
            $('#sales-order-group-new').show();
            load_sales_orders(customer);
        }, 300);
    });

    // --------------------------------------------------
    // When Sales Order selected
    // --------------------------------------------------
    $(document).on('click', '#sales-order-items-new .dropdown-item', function () {

        const so = $(this).data('value');
        if (!so) return;

        $('#sales-order-new').val(so);
        $('#sales-order-toggle-new').text(so);
    });

    // --------------------------------------------------
    // Hide SO when category changes
    // --------------------------------------------------
    $(document).on('change', '#category', function () {
        if ($(this).val() !== 'Customer Advance') {
            $('#sales-order-group-new').hide();
            reset_sales_order();
        }
    });

})();
