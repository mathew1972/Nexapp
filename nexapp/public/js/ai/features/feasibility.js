window.render_feasibility = function () {

    $("#ai-workspace").html(`
        <h4>📊 Feasibility Builder</h4>

        <input type="file" id="excel_file" class="form-control"/>
        <br>

        <button class="btn btn-primary" id="process_file">
            Process File
        </button>

        <div id="preview"></div>
    `);

    $("#process_file").click(function () {
        frappe.msgprint("Next step: connect backend");
    });
};