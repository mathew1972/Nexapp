function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

window.setup_feasibility_pincode = function(frm) {
    // Attach a debounced event handler to the pincode field wrapper using event delegation
    if (frm.fields_dict.pincode && frm.fields_dict.pincode.wrapper) {
        $(frm.fields_dict.pincode.wrapper).off('input', 'input').on('input', 'input', debounce(function(e) {
            let raw_val = e.target.value || "";
            const pincode = raw_val.replace(/\D/g, ''); // Remove non-digit characters

            // Reset alert flag when user starts typing
            frm._alert_shown = false;

            // If pincode length is exactly 6 digits, fetch location details
            if (pincode.length === 6) {
                // Update the model so Frappe knows the new pincode value immediately
                if (frm.doc.pincode !== pincode) {
                    frm.set_value("pincode", pincode);
                }

                // Fetch location details
                frappe.show_alert({message: "Fetching location details...", indicator: "blue"});

                // Make the external API call via the backend proxy to avoid SSL errors
                frappe.call({
                    method: 'nexapp.api.get_pincode_details',
                    args: { pincode: pincode },
                    callback: function(r) {
                        let details = r.message;
                        if (Array.isArray(details) && details.length > 0 && details[0].Status === "Success" && details[0].PostOffice && details[0].PostOffice.length > 0) {
                            const po = details[0].PostOffice[0];
                            details = {
                                district: po.District || "",
                                country: po.Country || "India",
                                city: po.Block || po.Name || "",
                                state: po.State || ""
                            };
                        }
                        
                        if (details && details.district) {
                            frm.set_value("district", details.district || "");
                            frm.set_value("country", details.country || "India");
                            frm.set_value("city", details.city || "");
                            const state = details.state || "";
                            frm.set_value("state", state);

                            const state_territory_map = {
                                "Delhi": "North", "Haryana": "North", "Punjab": "North", "Himachal Pradesh": "North", "Uttar Pradesh": "North", "Uttarakhand": "North", "Jammu and Kashmir": "North", "Chandigarh": "North", "Rajasthan": "North", "Ladakh": "North",
                                "Karnataka": "South", "Tamil Nadu": "South", "Kerala": "South", "Andhra Pradesh": "South", "Telangana": "South", "Puducherry": "South", "Lakshadweep": "South",
                                "Maharashtra": "West", "Gujarat": "West", "Goa": "West", "Dadra and Nagar Haveli": "West", "Daman and Diu": "West", "Madhya Pradesh": "West", "Chattisgarh": "West", "Chhattisgarh": "West",
                                "West Bengal": "East", "Odisha": "East", "Bihar": "East", "Jharkhand": "East", "Assam": "East", "Sikkim": "East", "Meghalaya": "East", "Tripura": "East", "Arunachal Pradesh": "East", "Manipur": "East", "Nagaland": "East", "Mizoram": "East", "Andaman and Nicobar Islands": "East"
                            };

                            if (state && state_territory_map[state]) {
                                frm.set_value("territory", state_territory_map[state]);
                            }
                        } else {
                            frappe.msgprint("Pincode not found or invalid.");
                        }
                    },
                    error: function(err) {
                        console.error("API Error:", err);
                        frappe.msgprint("Error fetching data from API.");
                    }
                });
            } 
            // If pincode length is less than 6 and greater than 0, do nothing
            else if (pincode.length === 0) {
                if (frm.doc.pincode !== "") {
                    frm.set_value("pincode", "");
                }
                frm.set_value("district", "");
                frm.set_value("country", "");
                frm.set_value("city", "");
                frm.set_value("state", "");
            }
        }, 500)); // 500 ms debounce for input
    }
};

window.setup_feasibility_map_picker = function(frm) {
    // Attach click handler to inline form button
    if (frm.fields_dict.open_map_picker_btn && frm.fields_dict.open_map_picker_btn.$input) {
        const $btn = frm.fields_dict.open_map_picker_btn.$input;
        $btn.html(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -2px;"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg> Open Map & Pick Location`);
        $btn.css({
            'background-color': '#71639e',
            'color': '#ffffff',
            'font-weight': '500',
            'border': 'none',
            'padding': '6px 14px',
            'border-radius': '6px',
            'box-shadow': '0 2px 4px rgba(113, 99, 158, 0.25)',
            'display': 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            'cursor': 'pointer',
            'transition': 'all 0.2s ease'
        });
        $btn.hover(
            function() { $(this).css({ 'background-color': '#5b4f80', 'box-shadow': '0 4px 8px rgba(113, 99, 158, 0.35)' }); },
            function() { $(this).css({ 'background-color': '#71639e', 'box-shadow': '0 2px 4px rgba(113, 99, 158, 0.25)' }); }
        );

        $btn.off('click').on('click', function() {
            show_interactive_map_picker(frm);
        });
    }

    // Auto expand the site address textarea on load/refresh and bind auto-resize on input
    setTimeout(function() {
        if (frm.fields_dict.address_street && frm.fields_dict.address_street.wrapper) {
            const $textarea = $(frm.fields_dict.address_street.wrapper).find('textarea');
            if (typeof window.auto_expand_textarea === 'function') {
                window.auto_expand_textarea($textarea);
            }
            $textarea.off('input.auto_expand_feasibility').on('input.auto_expand_feasibility', function() {
                if (typeof window.auto_expand_textarea === 'function') {
                    window.auto_expand_textarea($(this));
                }
            });
        }
    }, 1500);

    // 2. Attach debounced listeners to Latitude and Longitude fields for manual entry reverse geocoding
    const geocode_fn = debounce(function() {
        const lat = parseFloat(frm.doc.latitude);
        const lon = parseFloat(frm.doc.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
            frappe.show_alert({ message: "Fetching address from coordinates...", indicator: "blue" });
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.address) {
                        const addr = data.address;
                        const street = data.display_name || "";
                        
                        const current_address = frm.doc.address_street || "";
                        const new_address = format_address_field_with_geocoded(current_address, street);
                        frm.set_value("address_street", new_address);

                        setTimeout(() => {
                            if (frm.fields_dict.address_street && frm.fields_dict.address_street.wrapper) {
                                const $textarea = $(frm.fields_dict.address_street.wrapper).find('textarea');
                                if (typeof window.auto_expand_textarea === 'function') {
                                    window.auto_expand_textarea($textarea);
                                }
                            }
                        }, 200);

                        const pincode = addr.postcode || "";
                        if (pincode && pincode.length === 6) {
                            if (frm.doc.pincode !== pincode) {
                                frm.set_value("pincode", pincode);
                            }
                            frappe.call({
                                method: 'nexapp.api.get_pincode_details',
                                args: { pincode: pincode },
                                callback: function(r) {
                                    let details = r.message;
                                    if (Array.isArray(details) && details.length > 0 && details[0].Status === "Success" && details[0].PostOffice && details[0].PostOffice.length > 0) {
                                        const po = details[0].PostOffice[0];
                                        details = {
                                            district: po.District || "",
                                            country: po.Country || "India",
                                            city: po.Block || po.Name || "",
                                            state: po.State || ""
                                        };
                                    }
                                    
                                    if (details && details.district) {
                                        frm.set_value("district", details.district || "");
                                        frm.set_value("country", details.country || "India");
                                        frm.set_value("city", details.city || "");
                                        const state = details.state || "";
                                        frm.set_value("state", state);

                                        const state_territory_map = {
                                            "Delhi": "North", "Haryana": "North", "Punjab": "North", "Himachal Pradesh": "North", "Uttar Pradesh": "North", "Uttarakhand": "North", "Jammu and Kashmir": "North", "Chandigarh": "North", "Rajasthan": "North", "Ladakh": "North",
                                            "Karnataka": "South", "Tamil Nadu": "South", "Kerala": "South", "Andhra Pradesh": "South", "Telangana": "South", "Puducherry": "South", "Lakshadweep": "South",
                                            "Maharashtra": "West", "Gujarat": "West", "Goa": "West", "Dadra and Nagar Haveli": "West", "Daman and Diu": "West", "Madhya Pradesh": "West", "Chattisgarh": "West", "Chhattisgarh": "West",
                                            "West Bengal": "East", "Odisha": "East", "Bihar": "East", "Jharkhand": "East", "Assam": "East", "Sikkim": "East", "Meghalaya": "East", "Tripura": "East", "Arunachal Pradesh": "East", "Manipur": "East", "Nagaland": "East", "Mizoram": "East", "Andaman and Nicobar Islands": "East"
                                        };

                                        if (state && state_territory_map[state]) {
                                            frm.set_value("territory", state_territory_map[state]);
                                        }
                                        frm.refresh();
                                        frappe.show_alert({ message: "Address updated successfully!", indicator: "green" });
                                    } else {
                                        fallback_geocode();
                                    }
                                },
                                error: function() {
                                    fallback_geocode();
                                }
                            });
                        } else {
                            fallback_geocode();
                        }

                        function fallback_geocode() {
                            const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || "";
                            const district = addr.state_district || addr.district || addr.county || "";
                            const state = addr.state || "";
                            const country = addr.country || "India";

                            frm.set_value("city", city);
                            frm.set_value("district", district);
                            frm.set_value("state", state);
                            frm.set_value("country", country);

                            const state_territory_map = {
                                "Delhi": "North", "NCT of Delhi": "North", "Haryana": "North", "Punjab": "North", "Himachal Pradesh": "North", "Uttar Pradesh": "North", "Uttarakhand": "North", "Jammu and Kashmir": "North", "Chandigarh": "North", "Rajasthan": "North", "Ladakh": "North",
                                "Karnataka": "South", "Tamil Nadu": "South", "Kerala": "South", "Andhra Pradesh": "South", "Telangana": "South", "Puducherry": "South", "Lakshadweep": "South",
                                "Maharashtra": "West", "Gujarat": "West", "Goa": "West", "Dadra and Nagar Haveli": "West", "Daman and Diu": "West", "Madhya Pradesh": "West", "Chattisgarh": "West", "Chhattisgarh": "West",
                                "West Bengal": "East", "Odisha": "East", "Bihar": "East", "Jharkhand": "East", "Assam": "East", "Sikkim": "East", "Meghalaya": "East", "Tripura": "East", "Arunachal Pradesh": "East", "Manipur": "East", "Nagaland": "East", "Mizoram": "East", "Andaman and Nicobar Islands": "East"
                            };

                            if (state && state_territory_map[state]) {
                                frm.set_value("territory", state_territory_map[state]);
                            }
                            frm.refresh();
                            frappe.show_alert({ message: "Address updated successfully!", indicator: "green" });
                        }
                    }
                })
                .catch(err => console.error("Geocoding Error:", err));
        }
    }, 1000);

    if (frm.fields_dict.latitude && frm.fields_dict.latitude.wrapper) {
        $(frm.fields_dict.latitude.wrapper).off('input', 'input').on('input', 'input', geocode_fn);
    }
    if (frm.fields_dict.longitude && frm.fields_dict.longitude.wrapper) {
        $(frm.fields_dict.longitude.wrapper).off('input', 'input').on('input', 'input', geocode_fn);
    }
};

function show_interactive_map_picker(frm) {
    function init_modal() {
        let cur_lat = parseFloat(frm.doc.latitude) || 28.6139; // Default to New Delhi if empty
        let cur_lon = parseFloat(frm.doc.longitude) || 77.2090;

        const d = new frappe.ui.Dialog({
            title: '🗺️ Select Location on Map',
            fields: [
                {
                    fieldname: 'map_html',
                    fieldtype: 'HTML',
                    options: `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><div id="leaflet-map-container" style="height: 450px; width: 100%; min-height: 450px; position: relative; border-radius: 8px; background-color: #f0f0f0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"><div style="padding: 20px; text-align: center; color: #666;">Loading interactive map tiles...</div></div>`
                },
                {
                    fieldname: 'selected_coords',
                    fieldtype: 'Data',
                    label: 'Selected Coordinates (Lat, Lon)',
                    default: `${cur_lat}, ${cur_lon}`,
                    read_only: 1
                },
                {
                    fieldname: 'selected_address',
                    fieldtype: 'Small Text',
                    label: 'Fetched Address',
                    default: 'Fetching address...',
                    read_only: 1
                }
            ],
            primary_action_label: 'Confirm Location',
            primary_action: function(values) {
                const coordsStr = d.get_value('selected_coords') || '';
                const coords = coordsStr.split(', ');
                const lat = parseFloat(coords[0]);
                const lon = parseFloat(coords[1]);
                if (!isNaN(lat) && !isNaN(lon)) {
                    frm.set_value('latitude', lat);
                    frm.set_value('longitude', lon);
                }

                if (d._fetched_data && d._fetched_data.address) {
                    const addr = d._fetched_data.address;
                    const street_val = d._fetched_data.display_name || "";
                    
                    const current_address = frm.doc.address_street || "";
                    const new_address = format_address_field_with_geocoded(current_address, street_val);
                    frm.set_value('address_street', new_address);

                    setTimeout(() => {
                        if (frm.fields_dict.address_street && frm.fields_dict.address_street.wrapper) {
                            const $textarea = $(frm.fields_dict.address_street.wrapper).find('textarea');
                            if (typeof window.auto_expand_textarea === 'function') {
                                window.auto_expand_textarea($textarea);
                            }
                        }
                    }, 200);

                    const pincode = addr.postcode || "";
                    if (pincode && pincode.length === 6) {
                        frm.set_value('pincode', pincode);
                        frappe.show_alert({message: "Fetching official postal data for pincode...", indicator: "blue"});
                        frappe.call({
                            method: 'nexapp.api.get_pincode_details',
                            args: { pincode: pincode },
                            callback: function(r) {
                                let details = r.message;
                                if (Array.isArray(details) && details.length > 0 && details[0].Status === "Success" && details[0].PostOffice && details[0].PostOffice.length > 0) {
                                    const po = details[0].PostOffice[0];
                                    details = {
                                        district: po.District || "",
                                        country: po.Country || "India",
                                        city: po.Block || po.Name || "",
                                        state: po.State || ""
                                    };
                                }
                                
                                if (details && details.district) {
                                    frm.set_value("district", details.district || "");
                                    frm.set_value("country", details.country || "India");
                                    frm.set_value("city", details.city || "");
                                    const state = details.state || "";
                                    frm.set_value("state", state);

                                    const state_territory_map = {
                                        "Delhi": "North", "Haryana": "North", "Punjab": "North", "Himachal Pradesh": "North", "Uttar Pradesh": "North", "Uttarakhand": "North", "Jammu and Kashmir": "North", "Chandigarh": "North", "Rajasthan": "North", "Ladakh": "North",
                                        "Karnataka": "South", "Tamil Nadu": "South", "Kerala": "South", "Andhra Pradesh": "South", "Telangana": "South", "Puducherry": "South", "Lakshadweep": "South",
                                        "Maharashtra": "West", "Gujarat": "West", "Goa": "West", "Dadra and Nagar Haveli": "West", "Daman and Diu": "West", "Madhya Pradesh": "West", "Chattisgarh": "West", "Chhattisgarh": "West",
                                        "West Bengal": "East", "Odisha": "East", "Bihar": "East", "Jharkhand": "East", "Assam": "East", "Sikkim": "East", "Meghalaya": "East", "Tripura": "East", "Arunachal Pradesh": "East", "Manipur": "East", "Nagaland": "East", "Mizoram": "East", "Andaman and Nicobar Islands": "East"
                                    };

                                    if (state && state_territory_map[state]) {
                                        frm.set_value("territory", state_territory_map[state]);
                                    }
                                    frm.refresh();
                                    frappe.show_alert({message: "Location and address updated successfully!", indicator: "green"});
                                } else {
                                    fallback_update();
                                }
                            },
                            error: function() {
                                fallback_update();
                            }
                        });
                    } else {
                        fallback_update();
                    }

                    function fallback_update() {
                        frm.set_value('city', addr.city || addr.town || addr.village || addr.suburb || addr.county || "");
                        const district = addr.state_district || addr.district || addr.county || "";
                        frm.set_value('district', district);
                        frm.set_value('state', addr.state || "");
                        frm.set_value('country', addr.country || "India");

                        const state = addr.state || "";
                        const state_territory_map = {
                            "Delhi": "North", "NCT of Delhi": "North", "Haryana": "North", "Punjab": "North", "Himachal Pradesh": "North", "Uttar Pradesh": "North", "Uttarakhand": "North", "Jammu and Kashmir": "North", "Chandigarh": "North", "Rajasthan": "North", "Ladakh": "North",
                            "Karnataka": "South", "Tamil Nadu": "South", "Kerala": "South", "Andhra Pradesh": "South", "Telangana": "South", "Puducherry": "South", "Lakshadweep": "South",
                            "Maharashtra": "West", "Gujarat": "West", "Goa": "West", "Dadra and Nagar Haveli": "West", "Daman and Diu": "West", "Madhya Pradesh": "West", "Chattisgarh": "West", "Chhattisgarh": "West",
                            "West Bengal": "East", "Odisha": "East", "Bihar": "East", "Jharkhand": "East", "Assam": "East", "Sikkim": "East", "Meghalaya": "East", "Tripura": "East", "Arunachal Pradesh": "East", "Manipur": "East", "Nagaland": "East", "Mizoram": "East", "Andaman and Nicobar Islands": "East"
                        };

                        if (state && state_territory_map[state]) {
                            frm.set_value('territory', state_territory_map[state]);
                        }
                        frm.refresh();
                        frappe.show_alert({message: "Location and address updated successfully!", indicator: "green"});
                    }
                }
                d.hide();
            }
        });

        d.show();

        setTimeout(() => {
            const container = document.getElementById('leaflet-map-container');
            if (!container) return;
            container.innerHTML = ''; // clear loading text

            const map = L.map('leaflet-map-container').setView([cur_lat, cur_lon], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            let marker = L.marker([cur_lat, cur_lon], {draggable: true}).addTo(map);

            function update_modal_location(lat, lon) {
                marker.setLatLng([lat, lon]);
                d.set_value('selected_coords', `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
                d.set_value('selected_address', 'Fetching address...');

                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.address) {
                            d.set_value('selected_address', data.display_name || "");
                            d._fetched_data = data;
                        } else {
                            d.set_value('selected_address', 'Address not found');
                        }
                    }).catch(err => d.set_value('selected_address', 'Error fetching address'));
            }

            update_modal_location(cur_lat, cur_lon);

            map.on('click', function(e) {
                update_modal_location(e.latlng.lat, e.latlng.lng);
            });

            marker.on('dragend', function(e) {
                const pos = marker.getLatLng();
                update_modal_location(pos.lat, pos.lng);
            });

            // Force leaflet to recalculate container size multiple times during/after modal opening
            setTimeout(() => { map.invalidateSize(true); }, 300);
            setTimeout(() => { map.invalidateSize(true); }, 700);
            setTimeout(() => { map.invalidateSize(true); }, 1500);
        }, 700);
    }

    if (typeof window.L === 'undefined') {
        frappe.show_alert({ message: "Loading interactive map library...", indicator: "blue" });
        if ($('link[href*="leaflet.css"]').length === 0) {
            $('<link/>', { rel: 'stylesheet', type: 'text/css', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' }).appendTo('head');
        }
        $.getScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', function() {
            setTimeout(init_modal, 500); // give CSS time to parse
        });
    } else {
        init_modal();
    }
}

function format_address_field_with_geocoded(current_val, geocoded_addr) {
    if (!geocoded_addr) return current_val || "";
    
    let clean_current = current_val || "";
    const search_term = "Address as per Latitude & Longitude:";
    
    // Check if the heading already exists in the text and strip it/overwrite it
    const idx = clean_current.indexOf(search_term);
    if (idx !== -1) {
        clean_current = clean_current.substring(0, idx).trim();
    }
    
    const heading = "\n\nAddress as per Latitude & Longitude:\n____________________________________\n";
    
    if (clean_current) {
        return clean_current + heading + geocoded_addr;
    } else {
        return "Address as per Latitude & Longitude:\n____________________________________\n" + geocoded_addr;
    }
}

if (typeof window.auto_expand_textarea === 'undefined') {
    window.auto_expand_textarea = function($textarea) {
        if (!$textarea || $textarea.length === 0) return;
        $textarea.css('overflow-y', 'hidden');
        $textarea.each(function() {
            // Ensure the element is visible so scrollHeight is valid
            if (this.offsetWidth > 0 || this.offsetHeight > 0) {
                this.style.setProperty('height', 'auto', 'important');
                const scrollHeight = this.scrollHeight;
                if (scrollHeight > 0) {
                    this.style.setProperty('height', (scrollHeight + 10) + 'px', 'important');
                }
            }
        });
    };
}

// Global event handlers for automatic textarea expansion on tab change, accordion click, or field focus
$(document).on('click', '.nav-link, .tab-link, [role="tab"], .octicon-triangle-down, .section-head', function() {
    setTimeout(() => {
        if (window.cur_frm && window.cur_frm.fields_dict) {
            if (window.cur_frm.fields_dict.address_street && window.cur_frm.fields_dict.address_street.wrapper) {
                const $textarea = $(window.cur_frm.fields_dict.address_street.wrapper).find('textarea');
                if (typeof window.auto_expand_textarea === 'function') {
                    window.auto_expand_textarea($textarea);
                }
            }
        }
    }, 100);
    setTimeout(() => {
        if (window.cur_frm && window.cur_frm.fields_dict) {
            if (window.cur_frm.fields_dict.address_street && window.cur_frm.fields_dict.address_street.wrapper) {
                const $textarea = $(window.cur_frm.fields_dict.address_street.wrapper).find('textarea');
                if (typeof window.auto_expand_textarea === 'function') {
                    window.auto_expand_textarea($textarea);
                }
            }
        }
    }, 300);
    setTimeout(() => {
        if (window.cur_frm && window.cur_frm.fields_dict) {
            if (window.cur_frm.fields_dict.address_street && window.cur_frm.fields_dict.address_street.wrapper) {
                const $textarea = $(window.cur_frm.fields_dict.address_street.wrapper).find('textarea');
                if (typeof window.auto_expand_textarea === 'function') {
                    window.auto_expand_textarea($textarea);
                }
            }
        }
    }, 800);
});

// Trigger auto-expand when any textarea inside the address_street field wrapper gets focus
$(document).on('focus', 'textarea', function() {
    const $this = $(this);
    if ($this.closest('[data-fieldname="address_street"]').length > 0) {
        if (typeof window.auto_expand_textarea === 'function') {
            window.auto_expand_textarea($this);
        }
    }
});
