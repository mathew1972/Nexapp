window.call_api = function (method, args, callback) {

    frappe.call({
        method: method,
        args: args,
        callback: function (r) {
            callback(r);
        }
    });
};