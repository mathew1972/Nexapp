frappe.pages['user-manual'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Nexapp Technologies',
        single_column: true
    });

    // Hide default sidebar
    $('.desk-sidebar').remove();
    $('.layout-side-section').remove();

    // Add toggle button
    const toggleButton = $(`
        <button class="sidebar-toggle btn btn-default">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
        </button>
    `).appendTo(page.main);

    let isSidebarOpen = localStorage.getItem('sidebarOpen') !== 'false';

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Document',
            filters: { 'published': 1 },
            fields: ['name', 'title', 'category', 'sub_category', 'content', 'attach_file']
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                // Organize data
                const categories = {};
                const anchors = [];
                
                // Process documents
                r.message.forEach(doc => {
                    if (!categories[doc.category]) {
                        categories[doc.category] = {};
                    }
                    if (!categories[doc.category][doc.sub_category]) {
                        categories[doc.category][doc.sub_category] = [];
                    }
                    const docId = doc.title.toLowerCase().replace(/ /g, '-');
                    categories[doc.category][doc.sub_category].push({...doc, id: docId});
                    anchors.push({
                        title: doc.title,
                        id: docId
                    });
                });

                // ========== LEFT SIDEBAR ==========
                const leftSidebar = `
                    <div class="left-sidebar">
                        <div class="sidebar-section">
                            ${Object.keys(categories).map(category => `
                                <div class="category-group">
                                    <h3>${category}</h3>
                                    ${Object.keys(categories[category]).map(subCat => `
                                        <div class="subcategory-item">
                                            <a href="#${subCat.toLowerCase().replace(/ /g, '-')}">
                                                ${subCat}
                                            </a>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                // ========== MAIN CONTENT ==========
                const mainContent = `
                    <div class="main-content">
                        ${Object.entries(categories).map(([category, subCats]) => `
                            ${Object.entries(subCats).map(([subCat, docs]) => `
                                <section class="main-section" id="${subCat.toLowerCase().replace(/ /g, '-')}">
                                    <div class="category-path">${category} » ${subCat}</div>
                                    ${docs.map(doc => `
                                        <div class="document-card" id="${doc.id}">
                                            <h3>${doc.title}</h3>
                                            <div class="content">${doc.content}</div>
                                            ${doc.attach_file ? `
                                                <div class="image-container">
                                                    <img src="${doc.attach_file}" 
                                                         class="attached-image" 
                                                         alt="${doc.title}">
                                                </div>
                                            ` : ''}
                                            <button class="btn btn-secondary download-pdf" 
                                                    data-name="${doc.name}"
                                                    style="margin-top: 15px;">
                                                Download PDF
                                            </button>
                                        </div>
                                    `).join('')}
                                </section>
                            `).join('')}
                        `).join('')}
                    </div>
                `;

                // ========== RIGHT SIDEBAR ==========
                const rightSidebar = `
                    <div class="right-sidebar">
                        <div class="on-this-page">
                            <h4>On this Page</h4>
                            <ul class="list-unstyled">
                                ${anchors.map(anchor => `
                                    <li class="toc-item">
                                        <a href="#${anchor.id}">${anchor.title}</a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                `;

                // ========== FINAL LAYOUT ==========
                const finalHtml = `
                    <div class="container-fluid">
                        <div class="three-column-layout ${isSidebarOpen ? '' : 'sidebar-collapsed'}">
                            ${leftSidebar}
                            ${mainContent}
                            ${rightSidebar}
                        </div>
                    </div>
                    <style>
                        .sidebar-toggle {
                            position: fixed;
                            left: 15px;
                            top: 70px;
                            z-index: 1000;
                            padding: 8px;
                            border-radius: 50%;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            background: white;
                            transition: all 0.3s ease;
                        }

                        .three-column-layout {
                            display: grid;
                            grid-template-columns: 240px 1fr 240px;
                            transition: all 0.3s ease;
                        }

                        .three-column-layout.sidebar-collapsed {
                            grid-template-columns: 0 1fr 240px;
                        }

                        .left-sidebar {
                            background: #ffffff;
                            padding: 20px;
                            border-right: 1px solid #e5e7eb;
                            position: sticky;
                            top: 60px;
                            height: calc(100vh - 60px);
                            overflow-y: auto;
                            transition: all 0.3s ease;
                            overflow-x: hidden;
                        }

                        .sidebar-collapsed .left-sidebar {
                            transform: translateX(-100%);
                            width: 0;
                        }

                        .main-content {
                            padding: 30px 40px;
                            background: #f8f9fa;
                            transition: margin-left 0.3s ease;
                        }

                        .category-path {
                            font-size: 10px;
                            color: #6c757d;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin: 15px 0 5px;
                        }

                        .document-card {
                            background: white;
                            padding: 20px;
                            margin-bottom: 20px;
                            border-radius: 8px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                        }

                        .category-group h3 {
                            color: #2A4B5D;
                            font-size: 16px;
                            margin: 15px 0;
                            padding-bottom: 5px;
                            border-bottom: 1px solid #e5e7eb;
                        }

                        .subcategory-item {
                            margin: 8px 0;
                        }

                        .subcategory-item a {
                            color: #6c757d;
                            text-decoration: none;
                            font-size: 14px;
                        }

                        .subcategory-item a:hover {
                            color: #2A4B5D;
                        }

                        .toc-item {
                            margin: 8px 0;
                            font-size: 14px;
                        }

                        .toc-item a {
                            color: #6c757d;
                            text-decoration: none;
                        }

                        .image-container {
                            margin: 20px 0;
                            text-align: center;
                        }

                        .attached-image {
                            max-width: 100%;
                            height: auto;
                            max-height: 400px;
                            object-fit: contain;
                        }

                        @media (max-width: 1200px) {
                            .three-column-layout {
                                grid-template-columns: 0 1fr 240px;
                            }
                            
                            .three-column-layout.sidebar-collapsed {
                                grid-template-columns: 240px 1fr 240px;
                            }
                            
                            .sidebar-toggle {
                                display: block;
                            }
                        }

                        @media (min-width: 1201px) {
                            .sidebar-toggle {
                                display: none;
                            }
                        }
                    </style>
                `;

                $(wrapper).find('.layout-main-section').html(finalHtml);

                // Toggle functionality
                toggleButton.off('click').on('click', function() {
                    isSidebarOpen = !isSidebarOpen;
                    localStorage.setItem('sidebarOpen', isSidebarOpen);
                    $('.three-column-layout').toggleClass('sidebar-collapsed', !isSidebarOpen);
                });

                // Close sidebar on mobile by default
                if ($(window).width() < 1200) {
                    isSidebarOpen = false;
                    localStorage.setItem('sidebarOpen', 'false');
                    $('.three-column-layout').addClass('sidebar-collapsed');
                }
            }
        }
    });
};

// PDF Download Handler
$(document).on('click', '.download-pdf', function() {
    let docName = $(this).data('name');
    window.open('/api/method/nexapp.api.download_document_pdf?name=' + docName);
});