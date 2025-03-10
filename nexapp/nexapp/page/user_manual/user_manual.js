frappe.pages['user-manual'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Nexapp Technologies',
        single_column: true
    });

    // Clear existing content
    $(wrapper).find('.layout-main-section').empty();

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Document',
            filters: { 'published': 1 },
            fields: ['name', 'title', 'category', 'sub_category', 'content', 'attach_file']
        },
        callback: function(r) {
            const container = $(`<div class="container-fluid" style="display: flex; gap: 20px; margin-top: 20px;"></div>`);
            const leftSidebar = $(`<div class="left-sidebar" style="width: 240px; background: #f8f9fa; padding: 15px;"></div>`);
            const mainContent = $(`<div class="main-content" style="flex: 1; min-width: 0;"></div>`);
            const rightSidebar = $(`<div class="right-sidebar" style="width: 240px; background: #f8f9fa; padding: 15px;"></div>`);

            // Build navigation
            if (r.message && r.message.length) {
                const categories = {};
                
                // Process documents
                r.message.forEach(doc => {
                    if (!categories[doc.category]) categories[doc.category] = {};
                    if (!categories[doc.category][doc.sub_category]) categories[doc.category][doc.sub_category] = [];
                    categories[doc.category][doc.sub_category].push(doc);
                });

                // Build left sidebar
                Object.keys(categories).forEach(category => {
                    leftSidebar.append(`<h3>${category}</h3>`);
                    Object.keys(categories[category]).forEach(subCat => {
                        const subCatId = subCat.toLowerCase().replace(/ /g, '-');
                        leftSidebar.append(`
                            <div class="subcategory-item" style="margin: 8px 0;">
                                <a href="#" class="subcat-link" data-subcat="${subCatId}">${subCat}</a>
                            </div>
                        `);
                    });
                });

                // Build main content
                Object.entries(categories).forEach(([category, subCats]) => {
                    Object.entries(subCats).forEach(([subCat, docs]) => {
                        const subCatId = subCat.toLowerCase().replace(/ /g, '-');
                        const section = $(`
                            <section class="main-section" id="${subCatId}" style="display: none; margin-bottom: 30px;">
                                <div class="category-path" style="font-size: 0.9em; color: #666; margin-bottom: 15px;">
                                    ${category} » ${subCat}
                                </div>
                            </section>
                        `);
                        
                        docs.forEach(doc => {
                            section.append(`
                                <div class="document-card" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
                                    <h3>${doc.title}</h3>
                                    <div class="content">${doc.content}</div>
                                    ${doc.attach_file ? `
                                        <img src="${doc.attach_file}" style="max-width: 100%; margin-top: 15px;">
                                    ` : ''}
                                </div>
                            `);
                        });
                        
                        mainContent.append(section);
                    });
                });

                // Activate first section
                mainContent.find('.main-section').first().show();

                // Navigation click handler
                leftSidebar.on('click', '.subcat-link', function(e) {
                    e.preventDefault();
                    const subCatId = $(this).data('subcat');
                    mainContent.find('.main-section').hide();
                    $(`#${subCatId}`).show();
                });
            } else {
                mainContent.html(`
                    <div style="text-align: center; padding: 50px;">
                        <h4>No documents found</h4>
                        <p>Create documents in the Document doctype to see content here</p>
                    </div>
                `);
            }

            // Build right sidebar
            rightSidebar.html(`
                <h4>Help Resources</h4>
                <div style="margin-top: 15px;">
                    <p>Search or type a command (Ctrl + G)</p>
                    <button class="btn btn-default btn-block" onclick="alert('Help content')">
                        Help Documentation
                    </button>
                </div>
            `);

            // Assemble layout
            container.append(leftSidebar, mainContent, rightSidebar);
            $(wrapper).find('.layout-main-section').append(container);
        }
    });
};