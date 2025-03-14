frappe.pages['user-manual'].on_page_load = function(wrapper) {
    // Fixed Navbar with Dropdown
    $('.navbar').css({
        'position': 'fixed',
        'top': '0',
        'width': '100%',
        'z-index': '1000',
        'background': 'white',
        'box-shadow': '0 2px 5px rgba(0,0,0,0.1)',
        'padding': '10px 20px',
        'display': 'flex',
        'align-items': 'center'
    }).html(`
        <div class="dropdown" style="position: relative;">
            <button class="btn btn-default dropdown-toggle" 
                    type="button" 
                    id="appDropdown" 
                    data-toggle="dropdown" 
                    aria-haspopup="true" 
                    aria-expanded="false"
                    style="background: none; border: none; 
                           color: #2d3e50; font-weight: 500;
                           font-size: 14px;">
                Select Application
            </button>
            <div class="dropdown-menu" aria-labelledby="appDropdown" 
                 style="min-width: 200px; border-radius: 6px; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        margin-top: 8px;">
                <a class="dropdown-item" href="#" data-app="all" 
                   style="font-size: 13px; padding: 8px 16px; color: #4a5c6b;">
                    All Applications
                </a>
            </div>
        </div>
    `);

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
            fields: ['name', 'title', 'category', 'sub_category', 'content', 'attach_file', 'app']
        },
        callback: function(r) {
            const container = $(`<div class="container-fluid" style="display: flex; gap: 20px;"></div>`);
            const leftSidebar = $(`<div class="left-sidebar" style="width: 240px; background: #f8f9fa; padding: 15px; position: sticky; top: 70px; height: calc(100vh - 70px); overflow-y: auto;"></div>`);
            const mainContent = $(`<div class="main-content" style="flex: 1; min-width: 0;"></div>`);
            const rightSidebar = $(`<div class="right-sidebar" style="width: 240px; background: #f8f9fa; padding: 15px; position: sticky; top: 70px; height: calc(100vh - 70px); overflow-y: auto;"></div>`);

            let allDocuments = r.message || [];
            const dropdownMenu = $('.dropdown-menu');
            
            // Clear existing dropdown items except 'All Applications'
            dropdownMenu.find('.dropdown-item:not([data-app="all"])').remove();

            // Get unique apps with null/empty checks
            const apps = [...new Set(allDocuments
                .filter(doc => doc.app && typeof doc.app === 'string' && doc.app.trim() !== '')
                .map(doc => doc.app.trim()))];

            console.log('Found apps:', apps); // Debugging line

            if(apps.length > 0) {
                apps.forEach(app => {
                    dropdownMenu.append(`
                        <a class="dropdown-item" 
                           href="#" 
                           data-app="${app}"
                           style="font-size: 13px; padding: 8px 16px; color: #4a5c6b;">
                            ${app}
                        </a>
                    `);
                });
            }

            // Reinitialize dropdown after adding items
            $('#appDropdown').dropdown('dispose').dropdown();

            // Filter function
            const filterDocuments = (selectedApp) => {
                return selectedApp && selectedApp !== 'all' 
                    ? allDocuments.filter(doc => doc.app === selectedApp)
                    : allDocuments;
            };

            // Build UI function
            const buildUI = (docs) => {
                leftSidebar.empty();
                mainContent.empty();
                rightSidebar.empty();

                if (docs.length) {
                    const categories = {};
                    docs.forEach(doc => {
                        if (!categories[doc.category]) categories[doc.category] = {};
                        if (!categories[doc.category][doc.sub_category]) {
                            categories[doc.category][doc.sub_category] = [];
                        }
                        categories[doc.category][doc.sub_category].push(doc);
                    });

                    // Build left sidebar
                    Object.keys(categories).forEach(category => {
                        leftSidebar.append(`
                            <h4 style="
                                margin: 10px 0 8px 0;
                                font-weight: 600;
                                color: #2d3e50;
                                font-size: 13px;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                ${category}
                            </h4>
                        `);
                        
                        Object.keys(categories[category]).forEach(subCat => {
                            const subCatId = subCat.toLowerCase().replace(/ /g, '-');
                            leftSidebar.append(`
                                <div style="margin: 4px 0 4px 12px;">
                                    <a href="#" 
                                        class="subcat-link" 
                                        data-subcat="${subCatId}" 
                                        style="
                                            display: block;
                                            padding: 3px 12px;
                                            color: #4a5c6b;
                                            text-decoration: none;
                                            font-size: 12px;
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                            line-height: 1.4;
                                            border-radius: 8px;
                                            transition: all 0.2s;">
                                        ${subCat}
                                    </a>
                                </div>
                            `);
                        });
                    });

                    // Build main content
                    Object.entries(categories).forEach(([category, subCats]) => {
                        Object.entries(subCats).forEach(([subCat, docs]) => {
                            const subCatId = subCat.toLowerCase().replace(/ /g, '-');
                            const section = $(`
                                <section id="${subCatId}" style="display:none; margin-bottom:30px; padding-right:20px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; padding-bottom:10px; border-bottom:1px solid #eee;">
                                        <div style="
                                            font-size: 0.85em; 
                                            color: #666;
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            ${category} » ${subCat}
                                        </div>
                                        <button class="btn btn-default download-full-pdf" 
                                                data-subcategory="${subCat}"
                                                style="
                                                    padding: 4px 12px; 
                                                    font-size: 12px;
                                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            Download Full PDF
                                        </button>
                                    </div>
                                </section>
                            `);

                            docs.forEach(doc => {
                                section.append(`
                                    <div style="
                                        background: white; 
                                        padding: 20px; 
                                        border-radius: 8px; 
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
                                        margin-bottom: 20px;">
                                        <h3 style="
                                            margin-top: 0; 
                                            color: #2d3e50; 
                                            font-size: 18px;
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            ${doc.title}
                                        </h3>
                                        <div style="
                                            color: #4a5c6b; 
                                            line-height: 1.6; 
                                            font-size: 13px;
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            ${doc.content}
                                        </div>
                                        ${doc.attach_file ? `
                                            <img src="${doc.attach_file}" 
                                                 style="
                                                     max-width: 100%; 
                                                     margin: 15px 0;
                                                     border-radius: 6px;
                                                     box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                        ` : ''}
                                    </div>
                                `);
                            });

                            mainContent.append(section);
                        });
                    });

                    // Activate first section
                    mainContent.find('section').first().show();
                    leftSidebar.find('.subcat-link').first().css({
                        'background-color': 'white',
                        'color': '#2d3e50',
                        'font-weight': '600',
                        'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
                    });

                    // Navigation handler
                    leftSidebar.on('click', '.subcat-link', function(e) {
                        e.preventDefault();
                        const subCatId = $(this).data('subcat');
                        
                        $('.subcat-link').css({
                            'background-color': 'transparent',
                            'color': '#4a5c6b',
                            'font-weight': 'normal',
                            'box-shadow': 'none'
                        });
                        
                        $(this).css({
                            'background-color': 'white',
                            'color': '#2d3e50',
                            'font-weight': '600',
                            'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
                        });
                        
                        mainContent.find('section').hide();
                        $(`#${subCatId}`).show();
                    });

                    // PDF handler
                    $(document).on('click', '.download-full-pdf', function() {
                        const subcategory = $(this).data('subcategory');
                        window.open(`/api/method/nexapp.api.download_subcategory_pdf?subcategory=${encodeURIComponent(subcategory)}`, '_blank');
                    });

                } else {
                    mainContent.html(`
                        <div style="
                            text-align: center; 
                            padding: 50px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            <h4 style="color: #6c757d; font-size: 14px;">No documents found</h4>
                            <p style="color: #8895a1; font-size: 12px;">Create documents to see content</p>
                        </div>
                    `);
                }

                // Right sidebar
                rightSidebar.html(`
                    <h4 style="
                        color: #2d3e50; 
                        margin-bottom: 15px;
                        font-size: 13px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        Help Resources
                    </h4>
                    <div style="margin-top: 10px;">
                        <p style="
                            color: #6c757d; 
                            font-size: 12px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Search (Ctrl + G)
                        </p>
                        <button class="btn btn-default btn-block" 
                                style="
                                    background: #fff; 
                                    border: 1px solid #dee2e6; 
                                    color: #4a5c6b;
                                    font-size: 12px;
                                    padding: 6px;
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Help Docs
                        </button>
                    </div>
                `);

                container.append(leftSidebar, mainContent, rightSidebar);
                $(wrapper).find('.layout-main-section').append(container);
            };

            // Dropdown click handler
            $('.dropdown-menu').on('click', '.dropdown-item', function(e) {
                e.preventDefault();
                const selectedApp = $(this).data('app');
                const filteredDocs = filterDocuments(selectedApp);
                buildUI(filteredDocs);
                
                // Update dropdown button text
                $('#appDropdown').html(`
                    ${selectedApp === 'all' ? 'All Applications' : selectedApp}
                    <span class="caret"></span>
                `);
            });

            // Initial load
            buildUI(allDocuments);
        }
    });

    function removeDuplicates(docs) {
        const seen = new Map();
        return docs.filter(doc => {
            const key = `${doc.title}-${doc.content}`.toLowerCase().replace(/\s+/g, '');
            return seen.has(key) ? false : seen.set(key, true);
        });
    }
};