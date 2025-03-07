frappe.pages['user-manual'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Nexapp Technologies',
        single_column: true // Force full-width layout
    });

    // Hide default sidebar completely
    $('.desk-sidebar').remove();
    $('.layout-side-section').remove();

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Document',
            filters: { 'published': 1 },
            fields: ['name', 'title', 'category', 'content', 'attach_file']
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                // ========== SIDEBAR STRUCTURE ==========
                let sidebarHtml = `
                    <div class="custom-sidebar">
                        <div class="sidebar-section">
                            <h4>On this Page</h4>
                            <ul class="list-unstyled">
                                <li><a href="#introduction">Introduction</a></li>
                                <li><a href="#getting-started">Code</a></li>
                                <li><a href="#why-frappe">Installation Process</a></li>
                                <li><a href="#prerequisites">Prerequisites</a></li>
                            </ul>
                        </div>
                        <div class="sidebar-section">
                            <h4>Framework</h4>
                            <ul class="list-unstyled">
                                <li><a href="#installation">Installation</a></li>
                                <li><a href="#tutorial">Tutorial</a></li>
                            </ul>
                        </div>
                    </div>
                `;

                // ========== MAIN CONTENT STRUCTURE ==========
                let mainContentHtml = `
                    <div class="main-content">
                        <div class="page-header">
                            <h2>User Manual</h2>
                        </div>
                        <div class="document-list">
                `;

                // Add documents
                r.message.forEach(doc => {
                    mainContentHtml += `
                        <div class="document-card">
                            <h3>${doc.title}</h3>
                            <div class="meta">
                                <span class="category">${doc.category}</span>
                            </div>
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
                    `;
                });

                mainContentHtml += `</div></div>`;

                // ========== FINAL LAYOUT ==========
                let finalHtml = `
                    <div class="container-fluid">
                        <div class="row">
                            ${sidebarHtml}
                            ${mainContentHtml}
                        </div>
                    </div>
                    <style>
                        /* Full page layout */
                        .container-fluid {
                            padding: 0;
                            margin: 0;
                        }
                        
                        /* Custom sidebar */
                        .custom-sidebar {
                            width: 260px;
                            background: #e3f2fd;
                            border-right: 1px solid #dee2e6;
                            padding: 20px;
                            height: calc(100vh - 60px);
                            position: fixed;
                        }
                        
                        /* Main content area */
                        .main-content {
                            margin-left: 260px;
                            padding: 25px;
                            min-height: calc(100vh - 60px);
                        }
                        
                        .document-card {
                            background: white;
                            padding: 20px;
                            margin-bottom: 20px;
                            border-radius: 8px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        }

                        .image-container {
                            margin: 15px 0;
                            text-align: center;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                            padding: 10px;
                        }

                        .attached-image {
                            max-width: 100%;
                            height: auto;
                            max-height: 250px;
                            object-fit: contain;
                        }
                    </style>
                `;

                $(wrapper).find('.layout-main-section').html(finalHtml);
            } else {
                $(wrapper).find('.layout-main-section').html(`
                    <div class="alert alert-info">No documents found</div>
                `);
            }
        }
    });
};

// PDF Download Handler 
$(document).on('click', '.download-pdf', function() {
    let docName = $(this).data('name');
    window.open('/api/method/nexapp.api.download_document_pdf?name=' + docName);
});