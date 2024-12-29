frappe.ui.form.on('Site', {
    // Triggered when the "street" field value changes
    street: function (frm) {
        // Ensure all address fields are filled before making API call
        if (!frm.doc.pincode || !frm.doc.city || !frm.doc.state || !frm.doc.country) {
            frappe.msgprint(__('Please enter the pincode first to ensure accurate suggestions.'));
            return;
        }

        // Your API key (replace with your valid API key)
        const apiKey = 'AlzaSy6XDkagsDhc2QpCUqUEbnuy8JCo6aZU0IH';
        const url = 'https://maps.gomaps.pro/maps/api/place/queryautocomplete/json';

        // Extract required fields from the form
        const city = frm.doc.city || '';
        const country = frm.doc.country || 'IN'; // Default to India if country is not provided
        const pincode = frm.doc.pincode || '';
        const state = frm.doc.state || '';
        const district = frm.doc.district || '';

        // Build the search input by combining street, city, and state
        let searchInput = frm.doc.street;
        if (city) {
            searchInput = `${city} ${searchInput}`;
        }
        if (state) {
            searchInput = `${state} ${searchInput}`;
        }

        // Construct the API query parameters
        const queryParams = `input=${encodeURIComponent(searchInput)}&components=country:${country}|postal_code:${pincode}|locality:${city}|administrative_area_level_1:${state}|administrative_area_level_2:${district}&key=${apiKey}`;

        // Prevent API call if a selection was just made from the dropdown
        if (frm.dropdownSelected) {
            frm.dropdownSelected = false; // Reset the flag
            return;
        }

        // Debounce mechanism to limit API calls as the user types
        let typingTimer;
        const doneTypingInterval = 1000; // Wait 1 second after typing stops

        // Clear any existing timeout or dropdown
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            // Clear any previous suggestions dropdown
            clearPreviousSuggestions();

            // Fetch suggestions from the API
            fetch(`${url}?${queryParams}`)
                .then(response => response.json())
                .then(data => {
                    console.log('API Response:', data); // Debugging: Log the API response

                    if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
                        // Extract predictions from API response
                        const predictions = data.predictions.map(prediction => prediction.description);

                        // Convert city and country to lowercase for case-insensitive comparison
                        const lowerCity = city.toLowerCase();
                        const lowerCountry = country.toLowerCase();

                        // Filter predictions strictly matching city and country
                        const filteredPredictions = predictions.filter(description => {
                            const lowerDescription = description.toLowerCase();
                            return lowerDescription.includes(lowerCity) && lowerDescription.includes(lowerCountry);
                        });

                        // If no strict matches are found, fall back to partial matches
                        if (filteredPredictions.length === 0) {
                            const partialMatchPredictions = predictions.filter(description => {
                                const lowerDescription = description.toLowerCase();
                                return lowerDescription.includes(lowerCity) || lowerDescription.includes(lowerCountry);
                            });

                            // If no partial matches either, display a message
                            if (partialMatchPredictions.length === 0) {
                                frappe.msgprint(__('No street suggestions found that match your city and country.'));
                            } else {
                                // Show partial matches in dropdown
                                showSuggestions(partialMatchPredictions, frm);
                            }
                        } else {
                            // Show strict matches in dropdown
                            showSuggestions(filteredPredictions, frm);
                        }
                    } else {
                        frappe.msgprint(__('No valid predictions found.'));
                    }
                })
                .catch(error => {
                    console.error('Error fetching suggestions:', error);
                    frappe.msgprint(__('Failed to fetch street suggestions from GoMaps.Pro'));
                });
        }, doneTypingInterval);
    }
});

// Function to clear any previous suggestions dropdown
function clearPreviousSuggestions() {
    const existingDropdowns = document.querySelectorAll('.street-suggestions-dropdown');
    existingDropdowns.forEach(dropdown => dropdown.remove());
}

// Function to display suggestions dynamically as a dropdown
function showSuggestions(suggestions, frm) {
    // Remove any existing dropdown to avoid duplicates
    clearPreviousSuggestions();

    // Create a dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'street-suggestions-dropdown'; // Add a class for styling

    // Inline CSS for dropdown styling
    dropdownContainer.style.position = 'absolute';
    dropdownContainer.style.maxHeight = '200px';
    dropdownContainer.style.overflowY = 'auto';
    dropdownContainer.style.border = '1px solid #ccc';
    dropdownContainer.style.backgroundColor = 'white';
    dropdownContainer.style.width = '100%';
    dropdownContainer.style.zIndex = '999';

    // Populate dropdown with suggestions
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'street-suggestion-item';
        suggestionItem.textContent = suggestion;

        // Style for suggestion items
        suggestionItem.style.padding = '8px';
        suggestionItem.style.cursor = 'pointer';

        // Highlight suggestion on hover
        suggestionItem.onmouseover = function () {
            suggestionItem.style.backgroundColor = '#f0f0f0';
        };
        suggestionItem.onmouseout = function () {
            suggestionItem.style.backgroundColor = 'white';
        };

        // Handle click event for selecting a suggestion
        suggestionItem.onclick = function () {
            frm.set_value('street', suggestion); // Set the selected value
            clearPreviousSuggestions(); // Clear dropdown after selection
            frm.dropdownSelected = true; // Flag to prevent re-triggering
            frm.refresh_field('street'); // Refresh the form field
        };

        dropdownContainer.appendChild(suggestionItem);
    });

    // Attach the dropdown to the "street" input field
    const streetInputElement = document.querySelector('.form-control[data-fieldname="street"]');
    if (streetInputElement) {
        streetInputElement.parentElement.appendChild(dropdownContainer);
    }
}
