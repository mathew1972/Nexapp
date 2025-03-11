frappe.pages['user-manual'].on_page_load = function(wrapper) {
    // Fixed Navbar Implementation
    $('.navbar').css({
        'position': 'fixed',
        'top': '0',
        'width': '100%',
        'z-index': '1000',
        'background': 'white',
        'box-shadow': '0 2px 5px rgba(0,0,0,0.1)'
    });

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Nexapp Technologies',
        single_column: true
    });

    // Add padding to main container
    $(wrapper).find('.layout-main-section').css('padding-top', '70px').empty();

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Document',
            filters: { 
                'published': 1
            },
            fields: ['name', 'title', 'category', 'sub_category', 'content', 'attach_file']
        },
        callback: function(r) {
            const container = $(`<div class="container-fluid" style="display: flex; gap: 20px;"></div>`);
            const leftSidebar = $(`<div class="left-sidebar" style="width: 240px; background: #f8f9fa; padding: 15px; position: sticky; top: 70px; height: calc(100vh - 70px); overflow-y: auto;"></div>`);
            const mainContent = $(`<div class="main-content" style="flex: 1; min-width: 0;"></div>`);
            const rightSidebar = $(`<div class="right-sidebar" style="width: 240px; background: #f8f9fa; padding: 15px; position: sticky; top: 70px; height: calc(100vh - 70px); overflow-y: auto;"></div>`);

            if (r.message && r.message.length) {
                // Deduplication logic
                const uniqueDocs = removeDuplicates(r.message);
                const categories = {};

                uniqueDocs.forEach(doc => {
                    if (!categories[doc.category]) categories[doc.category] = {};
                    if (!categories[doc.category][doc.sub_category]) {
                        categories[doc.category][doc.sub_category] = [];
                    }
                    categories[doc.category][doc.sub_category].push(doc);
                });

                // Build left sidebar
                Object.keys(categories).forEach(category => {
                    leftSidebar.append(`<h5 style="margin:15px 0 10px 0; font-weight:600; color:#2d3e50;">${category}</h5>`);
                    
                    Object.keys(categories[category]).forEach(subCat => {
                        const subCatId = subCat.toLowerCase().replace(/ /g, '-');
                        leftSidebar.append(`
                            <div style="margin:8px 0 8px 15px;">
                                <a href="#" class="subcat-link" data-subcat="${subCatId}" 
                                   style="display:block; padding:4px 0; color:#4a5c6b; text-decoration:none;">
                                    ${subCat}
                                </a>
                            </div>
                        `);
                    });
                });

                // Build main content with corrected order
                Object.entries(categories).forEach(([category, subCats]) => {
                    Object.entries(subCats).forEach(([subCat, docs]) => {
                        const subCatId = subCat.toLowerCase().replace(/ /g, '-');
                        const section = $(`
                            <section id="${subCatId}" style="display:none; margin-bottom:30px; padding-right:20px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; padding-bottom:10px; border-bottom:1px solid #eee;">
                                    <div style="font-size:0.9em; color:#666;">
                                        ${category} » ${subCat}
                                    </div>
                                    <button class="btn btn-default download-full-pdf" 
                                            data-subcategory="${subCat}"
                                            style="padding:5px 15px; font-size:13px;">
                                        Download Full PDF
                                    </button>
                                </div>
                            </section>
                        `);

                        // Correct order: Title -> Content -> Image
                        docs.forEach(doc => {
                            section.append(`
                                <div style="background:white; padding:25px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-bottom:25px;">
                                    <h2 style="margin-top:0; color:#2d3e50; font-size:22px;">
                                        ${doc.title}
                                    </h2>
                                    <div style="color:#4a5c6b; line-height:1.6; font-size:15px;">
                                        ${doc.content}
                                    </div>
                                    ${doc.attach_file ? `
                                        <img src="${doc.attach_file}" 
                                             style="max-width:100%; 
                                                    margin:20px 0;
                                                    border-radius:6px;
                                                    box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                                    ` : ''}
                                </div>
                            `);
                        });

                        mainContent.append(section);
                    });
                });

                // Activate first section
                mainContent.find('section').first().show();

                // Navigation handler
                leftSidebar.on('click', '.subcat-link', function(e) {
                    e.preventDefault();
                    const subCatId = $(this).data('subcat');
                    mainContent.find('section').hide();
                    $(`#${subCatId}`).show();
                    $('.subcat-link').css({'font-weight':'normal','color':'#4a5c6b'});
                    $(this).css({'font-weight':'600','color':'#2d3e50'});
                });

                // PDF handler (opens in new tab)
                $(document).on('click', '.download-full-pdf', function() {
                    const subcategory = $(this).data('subcategory');
                    window.open(`/api/method/nexapp.api.download_subcategory_pdf?subcategory=${encodeURIComponent(subcategory)}`, '_blank');
                });

            } else {
                mainContent.html(`
                    <div style="text-align:center; padding:50px;">
                        <h4 style="color:#6c757d;">No documents found</h4>
                        <p style="color:#8895a1;">Create documents to see content</p>
                    </div>
                `);
            }

            // Right sidebar
            rightSidebar.html(`
                <h4 style="color:#2d3e50; margin-bottom:20px;">Help Resources</h4>
                <div style="margin-top:15px;">
                    <p style="color:#6c757d; font-size:14px;">Search (Ctrl + G)</p>
                    <button class="btn btn-default btn-block" 
                            style="background:#fff; border:1px solid #dee2e6; color:#4a5c6b;"
                            onclick="alert('Help documentation loading...')">
                        Help Docs
                    </button>
                </div>
            `);

            container.append(leftSidebar, mainContent, rightSidebar);
            $(wrapper).find('.layout-main-section').append(container);
        }
    });

    // Deduplication function
    function removeDuplicates(docs) {
        const seen = new Map();
        return docs.filter(doc => {
            const key = `${doc.title}-${doc.content}`.toLowerCase().replace(/\s+/g, '');
            if (!seen.has(key)) {
                seen.set(key, true);
                return true;
            }
            return false;
        });
    }
};