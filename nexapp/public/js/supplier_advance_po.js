// ======================================================
// Supplier Advance → Purchase Order UI ONLY
// (NO Match Now logic here — Universal handler is in bank_reconciliation.js)
// ======================================================

console.log('✅ supplier_advance_po.js UI loaded');

(function () {

    // --------------------------------------------------
    // Inject Purchase Order UI
    // --------------------------------------------------
    function inject_po_ui() {

        if ($('#purchase-order-group').length) return;

        const html = `
            <div id="purchase-order-group" style="margin-top:15px; display:none;">
                <label class="control-label">
                    Purchase Order <span class="text-muted">(Optional)</span>
                </label>

                <div class="dropdown">
                    <button class="btn btn-default dropdown-toggle"
                            type="button"
                            id="purchase-order-toggle"
                            data-toggle="dropdown"
                            style="width:100%; text-align:left;">
                        Select Purchase Order
                        <span class="caret" style="float:right; margin-top:8px;"></span>
                    </button>

                    <div class="dropdown-menu"
                         id="purchase-order-items"
                         style="max-height:200px; overflow:auto; width:100%;">
                    </div>
                </div>

                <input type="hidden" id="purchase-order" />
            </div>
        `;

        if ($('#supplier-group').length) {
            $('#supplier-group').after(html);
        }
    }

    // --------------------------------------------------
    // Reset Purchase Order when supplier changes
    // --------------------------------------------------
    function reset_purchase_order() {
        $('#purchase-order').val('');
        $('#purchase-order-toggle').text('Select Purchase Order');
        $('#purchase-order-items').empty();
    }

    // --------------------------------------------------
    // Load Purchase Orders from backend
    // --------------------------------------------------
    function load_purchase_orders(supplier) {

        const $items = $('#purchase-order-items');
        if (!$items.length) return;

        $items.empty();

        frappe.call({
            method: 'nexapp.api.get_purchase_orders_by_supplier',
            args: { supplier: supplier },
            callback: function (r) {

                const list = r.message || [];

                if (!list.length) {
                    $items.append(`<div class="dropdown-item text-muted">No Purchase Orders Found</div>`);
                    return;
                }

                list.forEach(function (po) {
                    $items.append(
                        `<a class="dropdown-item" data-value="${po.name}">
                            ${po.name}
                        </a>`
                    );
                });
            }
        });
    }

    // --------------------------------------------------
    // When Supplier is selected
    // --------------------------------------------------
    $(document).on('click', '#supplier-items .dropdown-item', function () {

        if ($('#category').val() !== 'Supplier Advance') return;

        const supplier = $(this).data('value');
        if (!supplier) return;

        $('#supplier').val(supplier);
        $('#supplier-toggle').text(supplier);

        setTimeout(function () {
            inject_po_ui();
            reset_purchase_order();
            $('#purchase-order-group').show();
            load_purchase_orders(supplier);
        }, 300);
    });

    // --------------------------------------------------
    // When Purchase Order is selected
    // --------------------------------------------------
    $(document).on('click', '#purchase-order-items .dropdown-item', function () {

        const po = $(this).data('value');
        if (!po) return;

        $('#purchase-order').val(po);
        $('#purchase-order-toggle').text(po);
    });

})();
