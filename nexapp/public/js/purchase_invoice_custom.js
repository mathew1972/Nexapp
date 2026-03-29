frappe.ui.form.on("Purchase Invoice", {
    refresh(frm) {
        if (frm.doc.docstatus !== 0) return;

        // ── Date converter ──
        function toERPDate(s, yr) {
            if (!s) return "";
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            const M = {
                january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
                july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
                jan: "01", feb: "02", mar: "03", apr: "04", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
            };
            const p = s.replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase().split(/\s+/);

            // Look for a month name anywhere in the string
            let monthIdx = -1;
            let monthCode = "";
            for (let i = 0; i < p.length; i++) {
                if (M[p[i]]) { monthIdx = i; monthCode = M[p[i]]; break; }
            }

            if (monthIdx !== -1) {
                // Determine day and year based on month position
                let d = "", y = "";
                if (monthIdx === 0) { // Month Day Year
                    d = p[1]; y = p[2];
                } else if (monthIdx === 1) { // Day Month Year
                    d = p[0]; y = p[2];
                }

                if (d && !isNaN(d) && y && !isNaN(y)) {
                    const fy = y.length === 2 ? `20${y}` : y;
                    return `${fy}-${monthCode}-${d.padStart(2, "0")}`;
                }
            }
            return s;
        }

        // ── Inject global styles once ──
        if (!document.getElementById("aocr-css")) {
            $("<style id='aocr-css'>").html(`
/* === Design Tokens === */
:root {
    --aocr-primary: #4f46e5;
    --aocr-primary-hover: #4338ca;
    --aocr-primary-light: #f5f3ff;
    --aocr-bg: #f8fafc;
    --aocr-card-bg: #ffffff;
    --aocr-text-main: #0f172a;
    --aocr-text-muted: #64748b;
    --aocr-border: #e2e8f0;
    --aocr-radius: 16px;
    --aocr-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
    --aocr-shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03);
}

/* === Toolbar button === */
.aocr-btn-trigger {
    background: var(--aocr-primary) !important; color: #fff !important; border: none !important;
    border-radius: 10px !important; font-weight: 600 !important; font-size: 13px !important;
    padding: 7px 18px !important; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2) !important;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
.aocr-btn-trigger:hover { 
    background: var(--aocr-primary-hover) !important; 
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3) !important;
    transform: translateY(-1.5px);
}

/* === Modal === */
.aocr-modal .modal-dialog { max-width: 1440px !important; width: 98% !important; margin: 8px auto !important; }
.aocr-modal .modal-content { 
    height: 94vh !important; display: flex !important; flex-direction: column !important; 
    overflow: hidden !important; border-radius: var(--aocr-radius) !important; 
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; border: none !important;
}
.aocr-modal .modal-header { 
    background: #fff !important; padding: 16px 24px !important; 
    border-bottom: 1px solid var(--aocr-border) !important;
}
.aocr-modal .modal-title { color: var(--aocr-text-main) !important; font-size: 18px !important; font-weight: 700 !important; }
.aocr-modal .modal-header .close { color: var(--aocr-text-muted) !important; opacity: 0.7 !important; }
.aocr-modal .modal-body { flex: 1 !important; padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; background: var(--aocr-bg) !important; }


/* === Upload Cards === */
.aocr-up-card { 
    border: 1px solid var(--aocr-border); border-radius: var(--aocr-radius); 
    background: var(--aocr-card-bg); overflow: visible; display: flex; 
    flex-direction: column; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.aocr-up-card-head { 
    padding: 8px 16px; background: #fff; border-bottom: 1px solid var(--aocr-border); 
    font-size: 12.5px; font-weight: 700; color: var(--aocr-text-main); 
    display: flex; align-items: center; gap: 8px;
}
.aocr-up-card-body { padding: 12px 16px; flex: 1; display: flex; flex-direction: column; overflow: visible; }
.aocr-up-badge { background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

/* === Dropzone === */
.aocr-dropzone-box { 
    border: 2px dashed var(--aocr-border); border-radius: var(--aocr-radius); 
    padding: 12px 10px; text-align: center; cursor: pointer; 
    background: #fafafa; transition: all 0.2s;
}
.aocr-dropzone-box:hover, .aocr-dropzone-box.over { border-color: var(--aocr-primary); background: #f5f3ff; }
.aocr-dz-icon { 
    width: 28px; height: 28px; border-radius: 50%; background: #eff6ff; 
    display: flex; align-items: center; justify-content: center; 
    margin: 0 auto 6px; font-size: 14px; color: var(--aocr-primary); 
    transition: all 0.3s;
}
.aocr-dropzone-box:hover .aocr-dz-icon { transform: translateY(-2px); }

/* === Buttons === */
.aocr-btn-main { 
    background: var(--aocr-primary); color: #fff; border: none; padding: 12px 24px; 
    border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; 
    width: 100%; transition: all 0.2s; display: flex; align-items: center; 
    justify-content: center; gap: 10px;
}
.aocr-btn-main:hover:not([disabled]) { background: var(--aocr-primary-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
.aocr-btn-main[disabled] { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

.aocr-btn-sm { 
    background: #fff; color: var(--aocr-text-main); border: 1px solid var(--aocr-border); 
    padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; 
    cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
}
.aocr-btn-sm:hover { background: #f8fafc; border-color: #cbd5e1; }

.aocr-btn-add { 
    background: #f5f3ff; color: var(--aocr-primary); border: 1px solid #ddd6fe; 
    padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; 
    cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
}
.aocr-btn-add:hover { background: #ede9fe; transform: translateY(-1px); }

.aocr-btn-del { 
    background: transparent; color: #ef4444; border: none; padding: 6px; 
    border-radius: 6px; cursor: pointer; transition: all 0.2s;
}
.aocr-btn-del:hover { background: #fee2e2; }

/* === Review Layout === */
.aocr-rev-topbar { 
    display: flex; align-items: center; justify-content: space-between; 
    padding: 16px 24px; background: #fff; border-bottom: 1px solid var(--aocr-border); 
}
.aocr-rev-panels { display: flex; flex: 1; overflow: hidden; }
.aocr-rev-form-col { display: flex; flex-direction: column; background: var(--aocr-bg); border-right: 1px solid var(--aocr-border); transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.aocr-rev-form-scroll { overflow-y: auto; padding: 24px; height: calc(94vh - 200px); scroll-behavior: smooth; padding-bottom: 120px; }
.aocr-rev-form-scroll::-webkit-scrollbar { width: 6px; }
.aocr-rev-form-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.aocr-rev-pdf-col { flex: 1; display: flex; flex-direction: column; background: #475569; overflow: hidden; }
.aocr-rev-action-row { 
    padding: 16px 24px; background: #fff; border-top: 1px solid var(--aocr-border); 
    display: flex; align-items: center; justify-content: space-between;
    z-index: 10;
}

/* === Field Sections === */
.aocr-fsec { background: #fff; border: 1px solid var(--aocr-border); border-radius: var(--aocr-radius); overflow: visible; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.aocr-fsec-hdr { 
    display: flex; align-items: center; gap: 8px; padding: 12px 16px; 
    background: #f8fafc; border-bottom: 1px solid var(--aocr-border); 
    font-size: 12px; font-weight: 700; color: var(--aocr-text-main); 
    text-transform: uppercase; letter-spacing: 0.8px;
}
.aocr-fsec-hdr .accent-bar { width: 4px; height: 16px; border-radius: 2px; background: var(--aocr-primary); }
.aocr-fsec-body { padding: 20px; }

/* === Items & Taxes Tables === */
.aocr-tbl-card { background: #fff; border: 1px solid var(--aocr-border); border-radius: var(--aocr-radius); overflow: visible; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.aocr-tbl-hdr { 
    display: flex; align-items: center; justify-content: space-between; 
    padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid var(--aocr-border);
}
.aocr-ocr-tbl { width: 100%; border-collapse: collapse; }
.aocr-ocr-tbl th { 
    padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; 
    color: var(--aocr-text-muted); text-transform: uppercase; letter-spacing: 0.5px; 
    background: #f8fafc; border-bottom: 2px solid var(--aocr-border);
}
.aocr-ocr-tbl td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; overflow: visible; font-size: 12px; }
.aocr-ocr-tbl tr:hover td { background: #f8fafc; }

/* === Form Controls in Table === */
.aocr-ocr-tbl .form-control { 
    height: 30px !important; font-size: 11.5px !important; padding: 4px 8px !important;
}
/* Hide spin buttons */
.aocr-ocr-tbl input::-webkit-outer-spin-button,
.aocr-ocr-tbl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.aocr-ocr-tbl input[type=number] { -moz-appearance: textfield; }

/* === Totals === */
.aocr-total-val { font-size: 24px; font-weight: 800; color: var(--aocr-primary); }

.aocr-empty-highlight input, .aocr-empty-highlight select, .aocr-empty-highlight .control-input { 
    background-color: #fee2e2 !important; border-color: #f87171 !important; transition: all 0.3s ease;
}

/* === Spinner === */
.aocr-spinner { width: 50px; height: 50px; border: 4px solid #f3f4f6; border-top-color: var(--aocr-primary); border-radius: 50%; animation: sp 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
@keyframes sp { to{transform:rotate(360deg)} }

.dot-anim::after { content:''; display:inline-block; width:20px; animation:dt 1.4s steps(4,end) infinite; }
@keyframes dt { 0%{content:''} 25%{content:'.'} 50%{content:'..'} 75%{content:'...'} 100%{content:''} }

/* === Process Flow Dashboard === */
.aocr-dash-title { text-align: center; font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 12px; letter-spacing: -0.025em; }
.aocr-proc-wrap { display: flex; gap: 12px; justify-content: center; margin-bottom: 24px; padding: 0 12px; }
.aocr-proc-card { 
    background: #fff; border-radius: var(--aocr-radius); padding: 12px 10px; width: 150px; 
    position: relative; box-shadow: var(--aocr-shadow); 
    display: flex; flex-direction: column; align-items: center; text-align: center;
    border: 1px solid var(--aocr-border); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.aocr-proc-card:hover { transform: translateY(-2px); box-shadow: var(--aocr-shadow-lg); border-color: transparent; }

.aocr-proc-icon { 
    width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; 
    justify-content: center; font-size: 13px; margin-bottom: 8px; border: 1.5px solid;
    transition: all 0.3s;
}
.aocr-proc-num { 
    position: absolute; top: -8px; left: -8px; width: 18px; height: 18px; 
    border-radius: 5px; background: #fff; border: 1.5px solid; 
    display: flex; align-items: center; justify-content: center; 
    font-size: 9px; font-weight: 800; box-shadow: 0 2px 4px -1px rgba(0,0,0,0.1);
}

.aocr-proc-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; line-height: 1.3; }
.aocr-proc-desc { font-size: 11px; color: #64748b; line-height: 1.5; }

/* === Instructions Guide === */
.aocr-guide-wrap { font-size: 10.5px; line-height: 1.2; color: var(--aocr-text-main); }
.aocr-guide-ol { padding-left: 14px; margin: 0; }
.aocr-guide-ol li { margin-bottom: 3px; font-weight: 500; }
.aocr-guide-ol li strong { font-weight: 700; color: #111827; }
.aocr-guide-sub { list-style: disc; padding-left: 16px; color: var(--aocr-text-muted); margin-top: 1px; }
.aocr-guide-sub li { margin-bottom: 1px; font-weight: 500; }

.aocr-tip-box { 
    margin-top: 6px; padding: 6px 8px; background: #fffbeb; 
    border-left: 3px solid #f59e0b; border-radius: 4px; 
    font-size: 10px; color: #92400e; display: flex; gap: 6px; align-items: flex-start;
}
.aocr-tip-box i { color: #f59e0b; margin-top: 1px; }

/* Colors */
.aocr-proc-teal { border-top-color: #0d9488; }
.aocr-proc-teal .aocr-proc-icon { color: #0d9488; border-color: #2dd4bf; background: #f0fdfa; }
.aocr-proc-teal .aocr-proc-num { border-color: #0d9488; color: #0d9488; }

.aocr-proc-blue { border-top-color: #2563eb; }
.aocr-proc-blue .aocr-proc-icon { color: #2563eb; border-color: #60a5fa; background: #eff6ff; }
.aocr-proc-blue .aocr-proc-num { border-color: #2563eb; color: #2563eb; }

.aocr-proc-orange { border-top-color: #ea580c; }
.aocr-proc-orange .aocr-proc-icon { color: #ea580c; border-color: #fb923c; background: #fff7ed; }
.aocr-proc-orange .aocr-proc-num { border-color: #ea580c; color: #ea580c; }

.aocr-proc-red { border-top-color: #dc2626; }
.aocr-proc-red .aocr-proc-icon { color: #dc2626; border-color: #f87171; background: #fef2f2; }
.aocr-proc-red .aocr-proc-num { border-color: #dc2626; color: #dc2626; }

/* === Collapsible Card === */
.aocr-up-hdr-collapsible { cursor: pointer; user-select: none; transition: background 0.2s; }
.aocr-up-hdr-collapsible:hover { background: #f8fafc !important; }
.aocr-up-hdr-collapsible .chevron { margin-left: auto; transition: transform 0.3s; font-size: 11px; color: #94a3b8; }
.aocr-up-card.collapsed .aocr-up-card-body { display: none; }
.aocr-up-card.collapsed .aocr-up-hdr-collapsible .chevron { transform: rotate(-90deg); }

/* === Loading Screen Premium === */
.aocr-loader-content { text-align: center; max-width: 400px; padding: 40px; border-radius: 20px; background: #fff; position: relative; }
.aocr-loader-gfx { position: relative; width: 80px; height: 100px; margin: 0 auto 30px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
.aocr-loader-gfx i { font-size: 40px; color: var(--aocr-primary); z-index: 1; }
.aocr-scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, var(--aocr-primary), transparent); box-shadow: 0 0 8px var(--aocr-primary); z-index: 2; animation: aocr-scan 2s ease-in-out infinite; }
@keyframes aocr-scan { 0%, 100% { top: 0%; } 50% { top: 100%; } }
.aocr-loader-glow { position: absolute; top: 50%; left: 50%; width: 120px; height: 120px; background: radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, transparent 70%); transform: translate(-50%, -50%); animation: aocr-pulse 2s ease-in-out infinite; }
@keyframes aocr-pulse { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); } }
#aocr-loader-msg { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 8px; min-height: 24px; transition: all 0.3s; }
.aocr-loader-sub { font-size: 13px; color: #64748b; line-height: 1.5; }

/* === Two-Column Grid === */
.fgrid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.fctl { margin-bottom: 10px; }

/* === Font Size Reductions === */
.aocr-modal .control-label, 
.aocr-modal .grid-header div, 
.aocr-modal .btn, 
.aocr-modal .form-control,
.aocr-modal .control-value,
.aocr-modal .static-data,
.aocr-modal .link-field.ui-front input { font-size: 11px !important; }

.aocr-fsec-hdr { font-size: 11px !important; padding: 10px 16px !important; }
.aocr-ocr-tbl th { font-size: 9px !important; padding: 6px 12px !important; }
.aocr-ocr-tbl td, .aocr-ocr-tbl .form-control { font-size: 11px !important; padding: 8px 12px !important; }
.aocr-rev-topbar .modal-title { font-size: 14px !important; }
.aocr-rev-topbar div { font-size: 11px !important; }
.aocr-total-val { font-size: 20px !important; }
#aocr-loader-msg { font-size: 14px !important; }
.aocr-loader-sub { font-size: 11px !important; }

/* === Summary Box === */
.aocr-summary-box { 
    margin: 20px 0; padding: 16px; background: #fff; 
    border: 1px solid var(--aocr-border); border-radius: var(--aocr-radius);
    max-width: 320px; align-self: flex-end; width: 100%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.aocr-summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; }
.aocr-summary-row:last-child { margin-bottom: 0; padding-top: 8px; border-top: 1px solid #f1f5f9; font-weight: 700; color: var(--aocr-primary); font-size: 13px; }
.aocr-summary-label { color: var(--aocr-text-muted); }
.aocr-summary-value { font-weight: 600; color: var(--aocr-text-main); }
.aocr-summary-row:last-child .aocr-summary-value { color: var(--aocr-primary); }

            `).appendTo("head");
        }

        // ── Toolbar button ──
        let $tb = frm.add_custom_button("AI Invoice Scan", openDialog);
        $tb.addClass("aocr-btn-trigger");

        function openDialog() {
            let uploaded_url = null, uploaded_name = "Invoice.pdf";
            let selected_po = null, extracted_data = null;
            let rev_ctrl = {};

            const dialog = new frappe.ui.Dialog({
                title: "AI-Powered Invoice Extraction",
                fields: [{ fieldtype: "HTML", fieldname: "root" }]
            });
            dialog.show();
            dialog.$wrapper.addClass("aocr-modal");

            const $R = dialog.fields_dict.root.$wrapper;
            $R.css({ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" });

            // ── ONE global interceptor: moves any awesomplete list to document.body on first LI insert
            // Works for ALL controls regardless of when awesomplete initialises (no timing dependency)
            const _awObs = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    for (const node of m.addedNodes) {
                        if (node.nodeName !== "LI") continue;
                        const ul = node.parentElement;
                        if (!ul || ul.tagName !== "UL") continue;
                        // Cache the owning input BEFORE we move the ul (while parent is still .awesomplete)
                        if (!ul._aInput) {
                            const awDiv = ul.parentElement;
                            ul._aInput = awDiv?.querySelector?.("input") || null;
                        }
                        if (!ul._aInput) continue;
                        // Move to body so no modal transform / overflow can clip it
                        if (ul.parentElement !== document.body) document.body.appendChild(ul);
                        const rc = ul._aInput.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rc.bottom;
                        const openUp = spaceBelow < 230 && rc.top > spaceBelow;
                        Object.assign(ul.style, {
                            position: "fixed",
                            top: openUp ? Math.max(4, rc.top - 234) + "px" : (rc.bottom + 2) + "px",
                            left: rc.left + "px",
                            width: Math.max(200, rc.width) + "px",
                            zIndex: "999999",
                            maxHeight: "220px",
                            overflowY: "auto",
                            background: "#fff",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 8px 24px rgba(0,0,0,.15)",
                            display: ""
                        });
                    }
                }
            });
            // ONLY observe the modal's wrapper to avoid hijacking global Frappe search/tags
            _awObs.observe(dialog.$wrapper[0], { childList: true, subtree: true });
            // Clean up when dialog is hidden
            dialog.$wrapper.on("hidden.bs.modal", () => {
                _awObs.disconnect();
                $("ul.awesomplete").remove(); // Frappe's awesomplete uses ul with class awesomplete
                $(".awesomplete ul").remove(); // Fallback
            });


            // ================================================================
            // SCREEN 1 — UPLOAD
            // ================================================================
            const $up = $(`
                <div style="flex:1;display:flex;flex-direction:column;overflow-x:hidden;overflow-y:auto;background:var(--aocr-bg);padding: 12px 0;">

                    <!-- Process Flow Dashboard -->
                    <div class="aocr-dash-title">Simplify Your Supplier Invoices Workflow With AI</div>
                    
                    <div class="aocr-proc-wrap">
                        <!-- Step 1 -->
                        <div class="aocr-proc-card aocr-proc-teal">
                            <div class="aocr-proc-icon"><i class="fa fa-file-pdf-o"></i></div>
                            <div class="aocr-proc-title" style="font-size: 11.5px;">PDF Invoice Support</div>
                            <div class="aocr-proc-desc" style="font-size: 10.5px;">Effortlessly processes digital and scanned PDF invoices with high accuracy.</div>
                            <div class="aocr-proc-num">1</div>
                        </div>
                        <!-- Step 2 -->
                        <div class="aocr-proc-card aocr-proc-blue">
                            <div class="aocr-proc-icon"><i class="fa fa-magic"></i></div>
                            <div class="aocr-proc-title" style="font-size: 11.5px;">AI-Powered Extraction</div>
                            <div class="aocr-proc-desc" style="font-size: 10.5px;">Automatically captures key details from PDFs, scan docs, and images.</div>
                            <div class="aocr-proc-num">2</div>
                        </div>
                        <!-- Step 3 -->
                        <div class="aocr-proc-card aocr-proc-orange">
                            <div class="aocr-proc-icon"><i class="fa fa-mouse-pointer"></i></div>
                            <div class="aocr-proc-title" style="font-size: 11.5px;">One-Click Creation</div>
                            <div class="aocr-proc-desc" style="font-size: 10.5px;">Streamline your entire process with one click—cut manual work.</div>
                            <div class="aocr-proc-num">3</div>
                        </div>
                        <!-- Step 4 -->
                        <div class="aocr-proc-card aocr-proc-red">
                            <div class="aocr-proc-icon"><i class="fa fa-user-circle-o"></i></div>
                            <div class="aocr-proc-title" style="font-size: 11.5px;">User-Friendly Interface</div>
                            <div class="aocr-proc-desc" style="font-size: 10.5px;">Simple, intuitive design that anyone can use, no tech skills needed.</div>
                            <div class="aocr-proc-num">4</div>
                        </div>
                    </div>

                    <!-- Action Cards Row -->
                    <div style="display:flex;gap:16px;padding:0 24px;align-items:flex-start;max-width:1100px;margin:0 auto;width:100%;">

                        <!-- Left Column: PO & Instructions -->
                        <div style="flex:1;display:flex;flex-direction:column;gap:12px;">
                            <!-- Link Purchase Order -->
                            <div class="aocr-up-card">
                                <div class="aocr-up-card-head" style="padding: 6px 12px; font-size: 11.5px;">
                                    <i class="fa fa-link" style="color:var(--aocr-primary);"></i>
                                    Link Purchase Order
                                    <span class="aocr-up-badge">Optional</span>
                                </div>
                                <div class="aocr-up-card-body" style="padding: 8px 12px;">
                                    <div id="po-wrap"></div>
                                </div>
                            </div>

                            <!-- Instructions Guide -->
                            <div class="aocr-up-card collapsed" id="how-to-card">
                                <div class="aocr-up-card-head aocr-up-hdr-collapsible" style="padding: 6px 12px; font-size: 11.5px;">
                                    <i class="fa fa-info-circle" style="color:var(--aocr-primary);"></i>
                                    How to use the OCR Invoice Importer
                                    <i class="fa fa-chevron-down chevron"></i>
                                </div>
                                <div class="aocr-up-card-body" style="padding: 10px 14px;">
                                    <div class="aocr-guide-wrap">
                                        <ol class="aocr-guide-ol" style="font-size: 11px; line-height: 1.4;">
                                            <li><strong>Select your invoice PDF file</strong></li>
                                            <li><strong>Click "Choose File"</strong> to upload it</li>
                                            <li><strong>Wait for AI processing</strong> (usually 2-5 seconds)</li>
                                            <li><strong>Review detected data</strong> for items and taxes</li>
                                            <li><strong>Click "Apply"</strong> to sync with Purchase Invoice</li>
                                        </ol>
                                        <div class="aocr-tip-box" style="margin-top: 8px; padding: 6px 10px; font-size: 10.5px;">
                                            <i class="fa fa-lightbulb-o" style="font-size: 12px;"></i>
                                            <div>Best results with clear digital PDFs.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Upload -->
                        <div class="aocr-up-card" style="flex:1.1;">
                            <div class="aocr-up-card-head" style="padding: 6px 12px; font-size: 11.5px;">
                                <i class="fa fa-cloud-upload" style="color:var(--aocr-primary);"></i>
                                Upload Invoice PDF
                            </div>
                            <div class="aocr-up-card-body" style="justify-content:space-between; padding: 12px 14px;">
                                <div class="aocr-dropzone-box" id="dz" style="padding: 12px 10px; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fff; border-width: 2px;">
                                    <div class="aocr-dz-icon" style="width:30px; height:30px; font-size:14px; margin-bottom:8px; background: var(--aocr-primary-light); color: var(--aocr-primary);"><i class="fa fa-upload"></i></div>
                                    <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px;">Drop your PDF here</div>
                                    <button class="aocr-btn-sm" id="btn-browse" style="padding: 4px 16px; font-size:11.5px; border-radius: 6px;"><i class="fa fa-folder-open-o"></i> Choose File</button>
                                    <div id="chip" style="min-height:20px;margin-top:8px; width: 100%; display: flex; justify-content: center;"></div>
                                </div>
                                <button class="aocr-btn-main" id="btn-extract" disabled style="margin-top:12px; height:36px; font-size:12.5px; border-radius: 8px;">
                                    <i class="fa fa-bolt"></i> Extract with AI
                                </button>
                            </div>
                        </div>

                    </div>
                    <!-- Spacing hack for bottom -->
                    <div style="height: 20px;"></div>
                </div>
            `).appendTo($R);

            // PO field
            const po_ctrl = frappe.ui.form.make_control({
                parent: $up.find("#po-wrap"),
                df: {
                    fieldtype: "Link", options: "Purchase Order", fieldname: "po",
                    label: "Purchase Order", placeholder: "Select PO Number...",
                    only_select: true, link_title: 0
                },
                render_input: true
            });
            po_ctrl.refresh();
            po_ctrl.$input.on("change", () => { selected_po = po_ctrl.get_value(); });

            // Collapsible Toggle
            $up.find("#how-to-card .aocr-up-hdr-collapsible").on("click", function () {
                $(this).closest(".aocr-up-card").toggleClass("collapsed");
            });


            // File upload
            function doUpload() {
                new frappe.ui.FileUploader({
                    allow_multiple: false,
                    restrictions: { allowed_file_types: [".pdf"] },
                    on_success(f) {
                        uploaded_url = f.file_url;
                        uploaded_name = f.file_name || "Invoice.pdf";
                        $up.find("#chip").html(`<div class="file-chip"><i class="fa fa-check-circle"></i><span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${uploaded_name}</span></div>`);
                        $up.find("#btn-extract").prop("disabled", false);
                    }
                });
            }
            $up.find("#btn-browse").on("click", e => { e.stopPropagation(); doUpload(); });
            $up.find("#dz").on("click", e => { if (!$(e.target).closest("button").length) doUpload(); });
            $up.find("#dz").on("dragover dragleave drop", function (e) {
                e.preventDefault(); e.stopPropagation();
                if (e.type === "dragover") $(this).addClass("over");
                if (e.type === "dragleave") $(this).removeClass("over");
                if (e.type === "drop") {
                    $(this).removeClass("over");
                    const f = e.originalEvent.dataTransfer.files[0];
                    if (f?.type === "application/pdf") doUpload();
                    else frappe.show_alert({ message: "Please drop a PDF file.", indicator: "red" });
                }
            });

            // ================================================================

            // SCREEN 2 — LOADING
            // ================================================================
            const $ld = $(`
                <div style="flex:1;display:none;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;">
                    <div class="aocr-loader-content">
                        <div class="aocr-loader-glow"></div>
                        <div class="aocr-loader-gfx">
                            <i class="fa fa-file-pdf-o"></i>
                            <div class="aocr-scan-line"></div>
                        </div>
                        <div id="aocr-loader-msg">Analysing your invoice...</div>
                        <div class="aocr-loader-sub">AI is reading fields, amounts, and line items</div>
                    </div>
                </div>
            `).appendTo($R);

            function startLoadingMessages() {
                const msgs = [
                    "Analysing your invoice...",
                    "Reading line items...",
                    "Verifying supplier details...",
                    "Calculating taxes...",
                    "Finalizing extraction..."
                ];
                let idx = 0;
                const $m = $ld.find("#aocr-loader-msg");
                const interval = setInterval(() => {
                    if (!$ld.is(":visible")) { clearInterval(interval); return; }
                    idx = (idx + 1) % msgs.length;
                    $m.fadeOut(200, () => {
                        $m.text(msgs[idx]).fadeIn(200);
                    });
                }, 2500);
            }
            // ================================================================
            // SCREEN 3 — REVIEW
            // ================================================================
            const $rv = $(`
                <div style="flex:1;display:none;flex-direction:column;overflow:hidden;">

                    <!-- Top bar -->
                    <div class="aocr-rev-topbar">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:32px;height:32px;border-radius:50%;background:#ecfdf5;border:1.5px solid #10b981;display:flex;align-items:center;justify-content:center;color:#10b981;font-size:14px;flex-shrink:0;">
                                <i class="fa fa-check"></i>
                            </div>
                            <div>
                                <div style="font-size:15px;font-weight:700;color:var(--aocr-text-main);">Extraction Successful</div>
                                <div style="font-size:12px;color:var(--aocr-text-muted);">Please verify and edit the extracted data below.</div>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button class="aocr-btn-sm" id="btn-tgl"><i class="fa fa-columns"></i><span id="lbl-tgl">Hide PDF</span></button>
                            <button class="aocr-btn-sm" id="btn-back"><i class="fa fa-arrow-left"></i> Back</button>
                        </div>
                    </div>

                    <!-- Panels -->
                    <div class="aocr-rev-panels">

                        <!-- Form col -->
                        <div class="aocr-rev-form-col" id="form-col" style="width:45%;min-width:400px;">
                            <div class="aocr-rev-form-scroll" id="form-body"></div>
                            <div class="aocr-rev-action-row">
                                <div>
                                    <div style="font-size:11px;color:var(--aocr-text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Grand Total</div>
                                    <div class="aocr-total-val" id="g-total">₹ 0.00</div>
                                </div>
                                <button class="aocr-btn-main" id="btn-apply" style="width:auto;padding-left:32px;padding-right:32px;">
                                    <i class="fa fa-check-circle"></i> Apply to Invoice
                                </button>
                            </div>
                        </div>

                        <!-- PDF col -->
                        <div class="aocr-rev-pdf-col" id="pdf-col">
                            <iframe id="pdf-if" style="flex:1;border:none;width:100%;height:100%;"></iframe>
                        </div>

                    </div>
                </div>
            `).appendTo($R);

            // Back
            $rv.find("#btn-back").on("click", () => {
                $rv.hide(); $rv.find("#form-body").empty(); rev_ctrl = {};
                $up.css({ display: "flex" });
            });

            // PDF toggle
            let pdfOn = true;
            $rv.find("#btn-tgl").on("click", function () {
                pdfOn = !pdfOn;
                $rv.find("#pdf-col").toggle(pdfOn);
                $rv.find("#form-col").css({ width: pdfOn ? "45%" : "100%", minWidth: pdfOn ? "400px" : "unset" });
                $rv.find("#lbl-tgl").text(pdfOn ? "Hide PDF" : "Show PDF");
            });

            // Send to AI
            $up.find("#btn-extract").on("click", async () => {
                // Refresh po value just in case
                selected_po = po_ctrl.get_value();
                console.log("Starting extraction with PO:", selected_po);

                $up.hide();
                $ld.css({ display: "flex" });
                startLoadingMessages();
                try {
                    const r = await frappe.call({
                        method: "nexapp.api.extract_purchase_invoice_from_data",
                        args: { file_url: uploaded_url, prompt_code: "PI_EXTRACT", po: selected_po },
                        error: () => false
                    });
                    if (!r?.message) throw new Error("empty");
                    extracted_data = JSON.parse(r.message);
                    console.log("AI Extracted Data:", extracted_data);

                    // Fuzzy match company if extracted
                    const company_to_match = extracted_data.company || extracted_data.customer || "";
                    if (company_to_match) {
                        console.log("Attempting to match company:", company_to_match);
                        const m = await frappe.call({
                            method: "nexapp.api.match_company",
                            args: { name: company_to_match }
                        });
                        if (m?.message) {
                            console.log("Company matched:", m.message);
                            extracted_data.company = m.message;
                        } else {
                            console.log("No company match found for:", company_to_match);
                            // Default to current form's company if available
                            extracted_data.company = frm.doc.company || "";
                        }
                    } else {
                        // AI didn't find a company, use current form's company
                        extracted_data.company = frm.doc.company || "";
                    }

                    $ld.hide();
                    $rv.css({ display: "flex" });
                    render_review(extracted_data);
                } catch (err) {
                    $ld.hide();
                    $up.css({ display: "flex" });
                    const msg = (err?.message && err.message !== "empty")
                        ? err.message : "Could not process the invoice. Please try again.";
                    frappe.show_alert({ message: msg, indicator: "red" }, 8);
                }
            });

            // ================================================================
            // RENDER REVIEW
            // ================================================================
            function render_review(data) {
                const items = data.items || [];
                const taxes = data.taxes || [];
                const yr = data.invoice_date?.split("-")[0];
                const fd = toERPDate(data.custom_dutation_from, yr);
                const td = toERPDate(data.custom_duration_to, yr);

                $rv.find("#pdf-if").attr("src", uploaded_url);

                const $body = $rv.find("#form-body").empty();

                function mkCtrl(df, val, $p) {
                    const c = frappe.ui.form.make_control({ parent: $p, df, render_input: true });
                    if (val || val === 0) c.set_value(val);

                    const refreshHighlight = () => {
                        const v = c.get_value();
                        const $inp = c.$wrapper.find("input, select, textarea");
                        const inpVal = $inp.val();

                        // Check both Frappe's internal value and the actual input DOM value
                        const hasValue = (v || v === 0 || (inpVal && inpVal.trim() !== ""));
                        if (hasValue) {
                            $p.removeClass("aocr-empty-highlight");
                        } else {
                            $p.addClass("aocr-empty-highlight");
                        }
                    };

                    // Initial check with polling (Link fields can be async)
                    let pollCount = 0;
                    const poll = setInterval(() => {
                        refreshHighlight();
                        if (++pollCount > 20 || !($p.hasClass("aocr-empty-highlight"))) {
                            clearInterval(poll);
                        }
                    }, 100);

                    // Bind to events
                    c.$wrapper.on("change input blur click", refreshHighlight);
                    c.$wrapper.find("input, select, textarea").on("change input blur", refreshHighlight);

                    if (c.on_change) {
                        const original_on_change = c.on_change;
                        c.on_change = function () {
                            original_on_change.apply(this, arguments);
                            setTimeout(refreshHighlight, 50);
                        };
                    }

                    return c;
                }
                function mkSec(label, icon) {
                    const $s = $(`
                        <div class="aocr-fsec">
                            <div class="aocr-fsec-hdr"><div class="accent-bar"></div><i class="fa ${icon}"></i>${label}</div>
                            <div class="aocr-fsec-body"></div>
                        </div>`).appendTo($body);
                    return $s.find(".aocr-fsec-body");
                }

                // MERGED SUPPLIER & INVOICE INFO
                const $s1 = mkSec("Invoice Details", "fa-file-text-o");
                const $grid = $('<div class="fgrid-2col">').appendTo($s1);

                // Column 1: Supplier
                const $col1 = $('<div>').appendTo($grid);
                rev_ctrl.supplier = mkCtrl({ fieldtype: "Link", label: "Supplier", fieldname: "supplier", options: "Supplier" }, data.supplier_name, $('<div class="fctl">').appendTo($col1));

                const fetchLMSData = async (init = false) => {
                    const l = rev_ctrl.lms.get_value();
                    if (l) {
                        try {
                            const r = await frappe.db.get_value("Lastmile Services Master", l, ["circuit_id", "customer"]);
                            if (r.message?.circuit_id) rev_ctrl.circuit.set_value(r.message.circuit_id);

                            // NOTE: We do NOT populate Company from LMS Customer field here.
                            // LMS tracks 'Customer' (end-client), while this form tracks 'Company' (internal).
                            // Overwriting Company often leads to clearing due to DocType mismatch.
                        } catch (e) { }
                    } else if (!init) {
                        rev_ctrl.circuit.set_value("");
                    }
                };

                rev_ctrl.lms = mkCtrl({
                    fieldtype: "Link", label: "LMS ID", fieldname: "lms_id_m", options: "Lastmile Services Master",
                    onchange: () => fetchLMSData(false)
                }, data.lms_id, $('<div class="fctl">').appendTo($col1));

                rev_ctrl.circuit = mkCtrl({ fieldtype: "Data", label: "Circuit ID", fieldname: "cid_m", read_only: 1 }, data.circuit_id, $('<div class="fctl">').appendTo($col1));
                rev_ctrl.company = mkCtrl({ fieldtype: "Link", label: "Company", fieldname: "company_m", options: "Company" }, data.company, $('<div class="fctl">').appendTo($col1));

                if (data.lms_id) fetchLMSData(true);

                // Column 2: Invoice Info
                const $col2 = $('<div>').appendTo($grid);
                rev_ctrl.bill_no = mkCtrl({ fieldtype: "Data", label: "Invoice No", fieldname: "bill_no" }, data.invoice_number, $('<div class="fctl">').appendTo($col2));
                rev_ctrl.bill_date = mkCtrl({ fieldtype: "Date", label: "Invoice Date", fieldname: "bill_date" }, data.invoice_date, $('<div class="fctl">').appendTo($col2));
                rev_ctrl.from_d = mkCtrl({ fieldtype: "Date", label: "From Date", fieldname: "from_d" }, fd, $('<div class="fctl">').appendTo($col2));
                rev_ctrl.to_d = mkCtrl({ fieldtype: "Date", label: "To Date", fieldname: "to_d" }, td, $('<div class="fctl">').appendTo($col2));

                // ITEMS
                const $it_wrap = $(`
                    <div class="aocr-tbl-card">
                        <div class="aocr-tbl-hdr">
                            <div style="font-size:12px;font-weight:700;color:var(--aocr-text-main);">LINE ITEMS</div>
                            <button class="aocr-btn-add" id="btn-add-row"><i class="fa fa-plus"></i> Add Item</button>
                        </div>
                        <table class="aocr-ocr-tbl">
                            <thead>
                                <tr>
                                    <th style="width:30%;">Extracted Item</th>
                                    <th style="width:25%;">Item</th>
                                    <th style="width:10%;text-align:center;">Qty</th>
                                    <th style="width:15%;text-align:right;">Rate</th>
                                    <th style="width:15%;text-align:right;">Amount</th>
                                    <th style="width:5%;"></th>
                                </tr>
                            </thead>
                            <tbody id="items-tbody"></tbody>
                        </table>
                    </div>
                `).appendTo($body);

                rev_ctrl.rows = [];
                function calcTotal(is_manual_rounding = false) {
                    const items_total = rev_ctrl.rows.reduce((s, r) => s + (parseFloat(r.$amt.text()) || 0), 0);
                    const taxes_total = rev_ctrl.tax_rows.reduce((s, r) => s + (parseFloat(r.$amt.val()) || 0), 0);
                    const target_total = parseFloat(data.invoice_total || 0);

                    let rounding = 0;
                    if (rev_ctrl.rounding) {
                        if (is_manual_rounding) {
                            rounding = parseFloat(rev_ctrl.rounding.get_value()) || 0;
                        } else {
                            // Auto-calculate rounding to match target
                            rounding = target_total - (items_total + taxes_total);
                            rev_ctrl.rounding.set_value(rounding);
                        }
                    }

                    const grand = items_total + taxes_total + rounding;

                    // Update Summary Box
                    $rv.find("#s-total").text("₹ " + items_total.toFixed(2));
                    $rv.find("#s-tax").text("₹ " + taxes_total.toFixed(2));
                    $rv.find("#s-grand").text("₹ " + grand.toFixed(2));

                    // Update Action Row
                    $rv.find("#g-total").text("₹ " + grand.toFixed(2));
                }

                function addRow(i = {}) {
                    const $tr = $("<tr>");

                    // Extracted Item (Raw text from AI)
                    const $ext = $(`<div style="font-size:11px;color:var(--aocr-text-main);font-weight:500;word-break:break-word;">${i.description || '—'}</div>`);
                    $tr.append($("<td>").append($ext));

                    // ERP Item Link
                    const $iw = $('<div style="font-size: 11.5px;">');
                    const ic = mkCtrl({ fieldtype: "Link", options: "Item", placeholder: "Select..." }, i.description, $iw);
                    $tr.append($("<td>").append($iw));

                    const $q = $(`<input type="number" class="form-control" value="${i.qty || 1}" style="text-align:center;">`);
                    $tr.append($("<td>").append($q));
                    const $ra = $(`<input type="number" class="form-control" value="${i.rate || 0}" style="text-align:right;">`);
                    $tr.append($("<td>").append($ra));
                    const $am = $(`<div style="text-align:right;font-weight:700;font-size:11px;">0.00</div>`);
                    $tr.append($("<td>").append($am));
                    const $del = $(`<button class="aocr-btn-del"><i class="fa fa-trash-o"></i></button>`);
                    $tr.append($('<td style="text-align:center;">').append($del));
                    $it_wrap.find("#items-tbody").append($tr);
                    const rd = { ic, $qty: $q, $rate: $ra, $amt: $am, $tr };
                    rev_ctrl.rows.push(rd);
                    const rc = () => { $am.text(((parseFloat($q.val()) || 0) * (parseFloat($ra.val()) || 0)).toFixed(2)); calcTotal(); };
                    $q.on("input", rc); $ra.on("input", rc);
                    $del.on("click", () => { $tr.remove(); rev_ctrl.rows = rev_ctrl.rows.filter(x => x.$tr !== $tr); calcTotal(); });
                    rc();
                }

                // TAXES
                const $tx_wrap = $(`
                    <div class="aocr-tbl-card">
                        <div class="aocr-tbl-hdr">
                            <div style="font-size:12px;font-weight:700;color:var(--aocr-text-main);">TAXES & CHARGES</div>
                            <button class="aocr-btn-add" id="btn-add-tax"><i class="fa fa-plus"></i> Add Tax</button>
                        </div>
                        <table class="aocr-ocr-tbl">
                            <thead>
                                <tr>
                                    <th style="width:40%;">Account Head</th>
                                    <th style="width:30%;">Description</th>
                                    <th style="width:25%;text-align:right;">Amount</th>
                                    <th style="width:5%;"></th>
                                </tr>
                            </thead>
                            <tbody id="taxes-tbody"></tbody>
                        </table>
                    </div>
                `).appendTo($body);

                rev_ctrl.tax_rows = [];
                // Initialize Summary early to avoid runtime errors in calcTotal
                const $summary = $(`
                    <div class="aocr-summary-box">
                        <div class="aocr-summary-row" style="color: #6b7280; font-style: italic; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                            <span class="aocr-summary-label">Total as per Invoice</span>
                            <span class="aocr-summary-value">₹ ${parseFloat(data.invoice_total || 0).toFixed(2)}</span>
                        </div>
                        <div class="aocr-summary-row">
                            <span class="aocr-summary-label">Total Amount</span>
                            <span class="aocr-summary-value" id="s-total">₹ 0.00</span>
                        </div>
                        <div class="aocr-summary-row">
                            <span class="aocr-summary-label">Taxes & Charges</span>
                            <span class="aocr-summary-value" id="s-tax">₹ 0.00</span>
                        </div>
                        <div class="aocr-summary-row" id="rounding-wrap" style="margin-top: 4px;">
                            <span class="aocr-summary-label">Rounding Adj.</span>
                        </div>
                        <div class="aocr-summary-row" style="margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                            <span class="aocr-summary-label">Grand Total</span>
                            <span class="aocr-summary-value" id="s-grand" style="font-size: 14px; color: var(--aocr-primary); font-weight: 800;">₹ 0.00</span>
                        </div>
                    </div>
                `).appendTo($body);

                rev_ctrl.rounding = mkCtrl({
                    fieldtype: "Currency", label: "", fieldname: "rounding",
                    onchange: () => calcTotal(true)
                }, 0, $summary.find("#rounding-wrap"));
                rev_ctrl.rounding.$wrapper.css({ width: "80px", margin: 0 });
                rev_ctrl.rounding.$input.css({ height: "24px", textAlign: "right", padding: "2px 6px" });

                function addTaxRow(t = {}) {
                    const $tr = $("<tr>");
                    const $aw = $('<div>');
                    const ac = mkCtrl({ fieldtype: "Link", options: "Account", placeholder: "Tax Account..." }, t.account_head, $aw);
                    $tr.append($("<td>").append($aw));
                    const $desc = $(`<input type="text" class="form-control" value="${t.description || 'Tax'}" style="height:32px;">`);
                    $tr.append($("<td>").append($desc));
                    const $am = $(`<input type="number" class="form-control" value="${t.tax_amount || 0}" style="text-align:right;height:32px;">`);
                    $tr.append($("<td>").append($am));
                    const $del = $(`<button class="aocr-btn-del"><i class="fa fa-trash-o"></i></button>`);
                    $tr.append($('<td style="text-align:center;">').append($del));
                    $tx_wrap.find("#taxes-tbody").append($tr);
                    const trd = { ac, $desc, $amt: $am, $tr };
                    rev_ctrl.tax_rows.push(trd);
                    $am.on("input", calcTotal);
                    $del.on("click", () => { $tr.remove(); rev_ctrl.tax_rows = rev_ctrl.tax_rows.filter(x => x.$tr !== $tr); calcTotal(); });
                    calcTotal();
                }

                if (items.length) items.forEach(addRow); else addRow();
                if (taxes.length) taxes.forEach(addTaxRow);
                $it_wrap.find("#btn-add-row").on("click", () => addRow());
                $tx_wrap.find("#btn-add-tax").on("click", () => addTaxRow());

                calcTotal();
            }

            // Apply
            $rv.on("click", "#btn-apply", async () => {
                const supplier = rev_ctrl.supplier.get_value();
                const company = rev_ctrl.company.get_value();
                if (!supplier || !company) {
                    frappe.msgprint("Please select Supplier and Company."); return;
                }

                frappe.dom.freeze("Applying...");
                try {
                    await frm.set_value("supplier", supplier);
                    await frm.set_value("company", company);
                    await frm.set_value("bill_no", rev_ctrl.bill_no.get_value());
                    await frm.set_value("bill_date", rev_ctrl.bill_date.get_value());

                    const fm = {
                        custom_dutation_from: rev_ctrl.from_d.get_value(),
                        custom_duration_to: rev_ctrl.to_d.get_value(),
                        custom_lms_id: rev_ctrl.lms.get_value(),
                        custom_circuit_id: rev_ctrl.circuit.get_value(),
                        rounding_adjustment: parseFloat(rev_ctrl.rounding.get_value()) || 0
                    };
                    for (const [k, v] of Object.entries(fm)) { if (frm.fields_dict[k]) await frm.set_value(k, v); }

                    // Items
                    const lms_id = rev_ctrl.lms.get_value();
                    const circuit_id = rev_ctrl.circuit.get_value();
                    frm.clear_table("items");
                    rev_ctrl.rows.forEach(r => {
                        const row = frm.add_child("items");
                        row.item_code = r.ic.get_value() || "Service";
                        row.qty = parseFloat(r.$qty.val()) || 1;
                        row.rate = parseFloat(r.$rate.val()) || 0;
                        row.circuit_id = circuit_id;
                        row.lms_id = lms_id;
                    });
                    frm.refresh_field("items");

                    // Taxes
                    frm.clear_table("taxes");
                    rev_ctrl.tax_rows.forEach(r => {
                        const row = frm.add_child("taxes");
                        row.account_head = r.ac.get_value();
                        row.description = r.$desc.val() || "Tax";
                        row.tax_amount = parseFloat(r.$amt.val()) || 0;
                        row.charge_type = "Actual";
                    });
                    frm.refresh_field("taxes");

                    dialog.hide();
                    setTimeout(() => { if (document.activeElement) document.activeElement.blur(); }, 100);
                    frappe.show_alert({ message: "Invoice data applied successfully.", indicator: "green" }, 5);
                } catch (e) {
                    console.error(e);
                    frappe.msgprint("An error occurred while applying data.");
                } finally {
                    frappe.dom.unfreeze();
                }
            });
        }
    }
});