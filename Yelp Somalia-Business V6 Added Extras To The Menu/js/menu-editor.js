// /js/menu-editor.js
import { auth, db } from "../firebase-config/indexfirebaseConfig.js";

let currentBusinessId = null;
let currentUser = null;
let businessDataCache = null;

let latestSectionsData = [];
let latestItemsData = {};
let currentItemExtras = []; // <-- ADD THIS NEW VARIABLE


// DOM Elements
let loadingDiv, editorErrorDiv, editorAuthPromptDiv, menuEditorContentDiv,
    businessNameH1, editorStatusP,
    addSectionForm, sectionNameInput, sectionOrderInput,
    sectionsListDiv, editorLoginPromptButton, liveOrdersLink,
    // --- ADD THESE NEW MODAL VARIABLES ---
    editItemModal, editItemForm, editItemIdInput, editItemModalTitle,
    editItemNameInput, editItemDescriptionInput, editItemPriceInput, editItemOrderInput,
    editItemImageUpload, editItemImagePreview,
    editExtraNameInput, editExtraPriceInput, editBtnAddExtra, editExtrasList,
    editItemCancelBtn, editItemSaveBtn, editItemStatus;

document.addEventListener('DOMContentLoaded', () => {
    getDOMElements();

    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('id');

    if (!currentBusinessId) {
        showError("No business ID found in URL. Cannot manage menu.");
        return;
    }

    auth.onAuthStateChanged(user => {
        currentUser = user;
        checkPermissionsAndLoadMenu();
    });

    if (addSectionForm) {
        addSectionForm.addEventListener('submit', handleAddSection);
    }
    if (sectionsListDiv) {
        sectionsListDiv.addEventListener('click', handleSectionListClick);
    }
    if(editorLoginPromptButton) {
        editorLoginPromptButton.addEventListener('click', () => {
            document.getElementById('login-show-button')?.click();
        });
    }
    // ==========================================================
    // ===== ADD THE NEW MODAL EVENT LISTENERS HERE =============
    // ==========================================================
    if (editItemForm) {
        editItemForm.addEventListener('submit', handleSaveItemChanges);
    }
    if (editItemCancelBtn) {
        editItemCancelBtn.addEventListener('click', () => {
            editItemModal.style.display = 'none';
        });
    }
    if (editBtnAddExtra) {
        editBtnAddExtra.addEventListener('click', () => {
            const name = editExtraNameInput.value.trim();
            const price = parseFloat(editExtraPriceInput.value);
            if (name && !isNaN(price) && price >= 0) {
                itemToEditExtras.push({ name, price });
                renderEditExtrasList();
                editExtraNameInput.value = '';
                editExtraPriceInput.value = '';
                editExtraNameInput.focus();
            } else {
                alert("Please enter a valid name and price for the extra.");
            }
        });
    }
    if (editExtrasList) {
        editExtrasList.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-delete-extra-edit')) {
                const index = parseInt(event.target.dataset.index);
                if (!isNaN(index)) {
                    itemToEditExtras.splice(index, 1);
                    renderEditExtrasList();
                }
            }
        });
    }
    if (editItemImageUpload) {
        editItemImageUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    editItemImagePreview.src = e.target.result;
                    editItemImagePreview.style.display = 'block';
                    itemToEditImage.base64 = e.target.result.split(',')[1];
                    itemToEditImage.type = file.type;
                    itemToEditImage.changed = true;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    // ==========================================================
});


function getDOMElements() {
    loadingDiv = document.getElementById('loading-editor');
    editorErrorDiv = document.getElementById('editor-error');
    editorAuthPromptDiv = document.getElementById('editor-auth-prompt');
    menuEditorContentDiv = document.getElementById('menu-editor-content');
    businessNameH1 = document.getElementById('menu-editor-business-name');
    editorStatusP = document.getElementById('menu-editor-status');
    addSectionForm = document.getElementById('add-section-form');
    sectionNameInput = document.getElementById('section-name');
    sectionOrderInput = document.getElementById('section-order');
    sectionsListDiv = document.getElementById('sections-list');
    editorLoginPromptButton = document.getElementById('editor-login-prompt-button');
    liveOrdersLink = document.getElementById('live-orders-link');
    // --- ADD THESE NEW MODAL ELEMENT ASSIGNMENTS ---
    editItemModal = document.getElementById('edit-item-modal');
    editItemForm = document.getElementById('edit-item-form');
    editItemIdInput = document.getElementById('edit-item-id');
    editItemModalTitle = document.getElementById('edit-item-modal-title');
    editItemNameInput = document.getElementById('edit-item-name');
    editItemDescriptionInput = document.getElementById('edit-item-description');
    editItemPriceInput = document.getElementById('edit-item-price');
    editItemOrderInput = document.getElementById('edit-item-order');
    editItemImageUpload = document.getElementById('edit-item-image-upload');
    editItemImagePreview = document.getElementById('edit-item-image-preview');
    editExtraNameInput = document.getElementById('edit-extra-name');
    editExtraPriceInput = document.getElementById('edit-extra-price');
    editBtnAddExtra = document.getElementById('edit-btn-add-extra');
    editExtrasList = document.getElementById('edit-extras-list');
    editItemCancelBtn = document.getElementById('edit-item-cancel-btn');
    editItemSaveBtn = document.getElementById('edit-item-save-btn');
    editItemStatus = document.getElementById('edit-item-status');
}

function showLoading(isLoading) {
    if (loadingDiv) loadingDiv.style.display = isLoading ? 'flex' : 'none';
    // Control menuEditorContentDiv visibility based on permissions too, not just loading
    if (isLoading && menuEditorContentDiv) menuEditorContentDiv.style.display = 'none';
    else if (!isLoading && menuEditorContentDiv && editorAuthPromptDiv.style.display === 'none' && editorErrorDiv.style.display === 'none') {
        menuEditorContentDiv.style.display = 'block';
    }
    if (editorErrorDiv) editorErrorDiv.style.display = 'none';
    if (editorAuthPromptDiv) editorAuthPromptDiv.style.display = 'none';
}

function showError(message) {
    showLoading(false); // Ensure loading is hidden
    if (menuEditorContentDiv) menuEditorContentDiv.style.display = 'none';
    if (editorErrorDiv) {
        editorErrorDiv.textContent = message;
        editorErrorDiv.style.display = 'block';
    }
}
function showAuthPrompt(message = "You must be logged in as the business owner to manage this menu.") {
    showLoading(false); // Ensure loading is hidden
    if (menuEditorContentDiv) menuEditorContentDiv.style.display = 'none';
    if (editorAuthPromptDiv) {
        editorAuthPromptDiv.querySelector('p:first-of-type').textContent = message;
        editorAuthPromptDiv.style.display = 'block';
    }
}
function showStatus(message, isSuccess = false) {
    if (editorStatusP) {
        editorStatusP.textContent = message;
        editorStatusP.className = `status-message ${isSuccess ? 'success' : (message ? 'submitting' : '')}`;
        editorStatusP.style.display = message ? 'block' : 'none';
         if(message && !isSuccess && !message.toLowerCase().includes("deleting")) {
            setTimeout(() => { if (editorStatusP.textContent === message) editorStatusP.style.display = 'none';}, 4000);
         }
         if(isSuccess) {
            setTimeout(() => { if (editorStatusP.textContent === message) editorStatusP.style.display = 'none';}, 2500);
         }
    }
}

async function checkPermissionsAndLoadMenu() {
    showLoading(true);
    if (!currentUser) {
        showAuthPrompt("Please log in to manage menus.");
        if(liveOrdersLink) liveOrdersLink.style.display = 'none';
        return;
    }
    if (!currentBusinessId) {
        showError("Business ID is missing.");
        if(liveOrdersLink) liveOrdersLink.style.display = 'none';
        return;
    }

    try {
        const businessRef = db.ref(`businesses/${currentBusinessId}`);
        const snapshot = await businessRef.once('value');
        if (!snapshot.exists()) {
            showError("Business not found.");
            if(liveOrdersLink) liveOrdersLink.style.display = 'none';
            return;
        }
        businessDataCache = snapshot.val();
        businessDataCache.id = currentBusinessId;

        if (businessDataCache.submitterUid !== currentUser.uid) {
            showAuthPrompt("You do not have permission to manage this menu.");
            if(liveOrdersLink) liveOrdersLink.style.display = 'none';
            return;
        }

        if (businessNameH1) businessNameH1.textContent = `Manage Menu for ${businessDataCache.name || 'Your Business'}`;
        if(liveOrdersLink) {
            liveOrdersLink.href = `/dashboard/live-orders.html?businessId=${currentBusinessId}`;
            liveOrdersLink.style.display = 'inline';
        }
        // Show content only after permissions are verified and no errors
        menuEditorContentDiv.style.display = 'block';
        editorAuthPromptDiv.style.display = 'none';
        editorErrorDiv.style.display = 'none';
        loadingDiv.style.display = 'none'; // Explicitly hide loading

        loadMenuData();

    } catch (error) {
        console.error("Error checking permissions:", error);
        showError("Error verifying your permissions. Please try again.");
        if(liveOrdersLink) liveOrdersLink.style.display = 'none';
    }
}

async function handleAddSection(e) {
    e.preventDefault();
    const name = sectionNameInput.value.trim();
    const order = sectionOrderInput.value ? parseInt(sectionOrderInput.value) : latestSectionsData.length + 1; // Default order

    if (!name) {
        showStatus("Section name is required.", false);
        return;
    }
    showStatus("Adding section...", false);

    try {
        const sectionsRef = db.ref(`menus/${currentBusinessId}/sections`);
        const newSectionRef = sectionsRef.push();
        await newSectionRef.set({
            name: name,
            order: order,
        });
        showStatus("Section added successfully!", true);
        addSectionForm.reset();
        // Real-time listener will update the UI
    } catch (error) {
        console.error("Error adding section:", error);
        showStatus(`Error: ${error.message}`, false);
    }
}

function loadMenuData() {
    const menuSectionsRef = db.ref(`menus/${currentBusinessId}/sections`);
    const menuItemsRef = db.ref(`menus/${currentBusinessId}/items`);

    menuSectionsRef.orderByChild('order').on('value', snapshot => {
        console.log("Menu Editor: Sections data received/updated.");
        const sections = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                sections.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
        }
        latestSectionsData = sections;
        renderCombinedMenu();
    }, error => {
        console.error("Error loading menu sections:", error);
        if (sectionsListDiv) sectionsListDiv.innerHTML = '<p class="error-message">Could not load menu sections.</p>';
        latestSectionsData = [];
        renderCombinedMenu();
    });

    menuItemsRef.orderByChild('order').on('value', snapshot => {
        console.log("Menu Editor: Items data received/updated.");
        const allItemsBySection = {};
        if (snapshot.exists()) {
            snapshot.forEach(itemSnap => {
                const item = { id: itemSnap.key, ...itemSnap.val() };
                if (!item.sectionId) {
                    console.warn("Item found without sectionId, skipping:", item.id, item.name);
                    return;
                }
                if (!allItemsBySection[item.sectionId]) {
                    allItemsBySection[item.sectionId] = [];
                }
                allItemsBySection[item.sectionId].push(item);
            });
        }
        for (const sectionId in allItemsBySection) {
            allItemsBySection[sectionId].sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        latestItemsData = allItemsBySection;
        renderCombinedMenu();
    }, error => {
        console.error("Error loading menu items:", error);
        latestItemsData = {};
        renderCombinedMenu();
    });
}

function renderCombinedMenu() {
    if (!sectionsListDiv) {
        console.error("sectionsListDiv is not available for rendering.");
        return;
    }
    sectionsListDiv.innerHTML = '';

    if (latestSectionsData.length === 0) {
        sectionsListDiv.innerHTML = '<p>No menu sections created yet. Add one above!</p>';
        return;
    }

    latestSectionsData.forEach(section => {
        const sectionItems = latestItemsData[section.id] || [];
        renderSection(section, sectionItems);
    });
    console.log("Menu Editor: UI re-rendered with combined data.");
}

function renderSection(section, items) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'menu-section';
    sectionDiv.dataset.sectionId = section.id;

    let itemsHTML = '';
    if (items.length > 0) {
        items.forEach(item => {
            const price = parseFloat(item.price);
            const formattedPrice = !isNaN(price) ? price.toFixed(2) : 'N/A';
            
            // --- NEW: Get and display availability ---
            const availability = item.availability || "available"; // Default to available if not set
            let availabilityText = "Available";
            let availabilityClass = "status-available";
            if (availability === "unavailable") {
                availabilityText = "Unavailable";
                availabilityClass = "status-unavailable";
            } else if (availability === "out_of_stock") {
                availabilityText = "Out of Stock";
                availabilityClass = "status-out-of-stock";
            }

            itemsHTML += `
                <div class="menu-item" data-item-id="${item.id}" data-current-availability="${availability}">
                    ${item.itemImageBase64 ? `<img src="data:${item.itemImageType};base64,${item.itemImageBase64}" alt="${item.name}" class="item-image-display">` : ''}
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                        <div class="item-price">$${formattedPrice}</div>
                        <div class="item-availability-display ${availabilityClass}">Status: ${availabilityText}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-secondary btn-small btn-edit-item">Edit Info</button>
                        <button class="btn btn-secondary btn-small btn-toggle-availability">Change Status</button>
                        <button class="btn btn-danger btn-small btn-delete-item">Delete</button>
                    </div>
                    <div class="edit-availability-form" style="display:none;">
                        <select class="item-availability-edit-select">
                            <option value="available" ${availability === 'available' ? 'selected' : ''}>Available</option>
                            <option value="unavailable" ${availability === 'unavailable' ? 'selected' : ''}>Unavailable</option>
                            <option value="out_of_stock" ${availability === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
                        </select>
                        <button class="btn btn-primary btn-small btn-save-availability">Save Status</button>
                        <button class="btn btn-secondary btn-small btn-cancel-availability-edit">Cancel</button>
                    </div>
                </div>
            `;
        });
    } else {
        itemsHTML = '<p>No items in this section yet.</p>';
    }

    sectionDiv.innerHTML = `
    <div class="section-header">
        <h3 class="section-title-display">${section.name}</h3>
        <input type="text" class="section-title-edit" value="${section.name}" style="display:none;">
        <input type="number" class="section-order-edit" value="${section.order || 0}" style="display:none;">
        <div class="section-actions">
            <button class="btn btn-secondary btn-small btn-edit-section">Edit</button>
            <button class="btn btn-primary btn-small btn-save-section" style="display:none;">Save Changes</button>
            <button class="btn btn-secondary btn-small btn-cancel-edit-section" style="display:none;">Cancel</button>
            <button class="btn btn-danger btn-small btn-delete-section">Delete Section</button>
        </div>
    </div>
    <div class="menu-items-list">${itemsHTML}</div>
    <div class="add-item-to-section-area">
        <button class="btn btn-primary btn-small btn-show-add-item-form" data-section-id="${section.id}" data-section-name="${section.name}">+ Add Item to ${section.name}</button>
        <form class="add-item-form" data-section-id="${section.id}" style="display:none;">
            <h4>Add New Item</h4>
            <div class="form-group">
                <label>Item Name:</label>
                <input type="text" name="itemName" placeholder="e.g., Coffee" required>
            </div>
            <div class="form-group">
                <label>Description (optional):</label>
                <textarea name="itemDescription" placeholder="e.g., Freshly brewed Arabica"></textarea>
            </div>
            <div class="form-group">
                <label>Base Price:</label>
                <input type="number" name="itemPrice" placeholder="e.g., 2.50" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Display Order (optional):</label>
                <input type="number" name="itemOrder" placeholder="e.g., 1">
            </div>
            <div class="form-group">
                <label for="itemAvailability-${section.id}">Initial Availability:</label>
                <select name="itemAvailability" id="itemAvailability-${section.id}" class="item-availability-select">
                    <option value="available" selected>Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>
            </div>
            <div class="form-group">
                <label>Item Image (optional, max 1.5MB):</label>
                <input type="file" class="item-image-upload" name="itemImageFile" accept="image/png, image/jpeg, image/gif, image/webp">
                <img class="item-image-preview" src="#" alt="Preview" style="display:none;">
                <input type="hidden" name="itemImageBase64">
                <input type="hidden" name="itemImageType">
            </div>

            <!-- ============================================= -->
            <!-- ===== THIS IS THE NEW "EXTRAS" SECTION ====== -->
            <!-- ============================================= -->
            <div class="manage-extras-container">
    <h4>Manage Extras / Options</h4>
    
    <!-- This now uses the standard .form-group structure -->
    <div class="form-group">
        <label>Add a New Extra</label>
        <div class="add-extra-form">
            <input type="text" name="extraName" placeholder="Extra Name (e.g., Extra Cheese)">
            <input type="number" name="extraPrice" placeholder="Price">
            <button type="button" class="btn btn-secondary btn-add-extra">Add</button>
        </div>
    </div>

    <div class="extras-list">
        <!-- This list will be populated by JS as you add extras -->
    </div>
</div>

            <div class="item-form-actions">
                <button type="submit" class="btn btn-primary btn-small">Save New Item</button>
                <button type="button" class="btn btn-secondary btn-small btn-cancel-add-item">Cancel</button>
            </div>
            <p class="item-form-status error-message"></p>
        </form>
    </div>
`;
    sectionsListDiv.appendChild(sectionDiv);

    const itemImageUpload = sectionDiv.querySelector('.item-image-upload');
    const itemImagePreview = sectionDiv.querySelector('.item-image-preview');
    const itemImageBase64Input = sectionDiv.querySelector('input[name="itemImageBase64"]');
    const itemImageTypeInput = sectionDiv.querySelector('input[name="itemImageType"]');

    if (itemImageUpload && itemImagePreview && itemImageBase64Input && itemImageTypeInput) {
        itemImageUpload.addEventListener('change', function() {
            handleImagePreview(this.files[0], itemImagePreview, itemImageBase64Input, itemImageTypeInput, this.closest('.add-item-form').querySelector('.item-form-status'));
        });
    }
}

function handleImagePreview(file, previewElement, base64Input, typeInput, statusElement) {
    base64Input.value = '';
    typeInput.value = '';
    previewElement.style.display = 'none';
    previewElement.src = '#';
    if (statusElement) statusElement.textContent = '';

    if (file) {
        const maxSizeMB = 1.5;
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
            if (statusElement) statusElement.textContent = `Invalid file type. Use JPG, PNG, GIF, WEBP.`;
            if (previewElement.form) previewElement.form.reset();
            return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            if (statusElement) statusElement.textContent = `Image exceeds ${maxSizeMB}MB limit.`;
            if (previewElement.form) previewElement.form.reset();
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
            base64Input.value = e.target.result.split(',')[1];
            typeInput.value = file.type;
        };
        reader.onerror = () => { if (statusElement) statusElement.textContent = 'Error reading photo.'; };
        reader.readAsDataURL(file);
    }
}

async function handleSectionListClick(event) {
    const target = event.target;
    const sectionDiv = target.closest('.menu-section');
    const sectionId = sectionDiv?.dataset.sectionId;

    if (target.classList.contains('btn-show-add-item-form')) {
        const sectionIdForForm = target.dataset.sectionId;
        const sectionNameForForm = target.dataset.sectionName;
        const form = sectionDiv.querySelector(`.add-item-form[data-section-id="${sectionIdForForm}"]`);
        if (form) {
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
            form.querySelector('h4').textContent = `Add New Item to ${sectionNameForForm}`;
            target.style.display = 'none'; // Hide the "+ Add Item" button
            currentItemExtras = []; // Clear the extras array for the new item
        const extrasList = form.querySelector('.extras-list');
        if (extrasList) extrasList.innerHTML = ''; // Clear the visual list
        }
    }
    else if (target.classList.contains('btn-cancel-add-item')) {
        const form = target.closest('.add-item-form');
        const showButton = form.closest('.add-item-to-section-area').querySelector('.btn-show-add-item-form');
        if (form) {
            form.style.display = 'none';
            form.reset();
            form.querySelector('.item-image-preview').style.display = 'none';
            form.querySelector('.item-form-status').textContent = '';
        }
        if (showButton) showButton.style.display = 'block'; // Show the "+ Add Item" button again
    }
    else if (target.classList.contains('btn-add-extra')) {
    const form = target.closest('.add-item-form');
    const extraNameInput = form.querySelector('input[name="extraName"]');
    const extraPriceInput = form.querySelector('input[name="extraPrice"]');

    const name = extraNameInput.value.trim();
    const price = parseFloat(extraPriceInput.value);

    if (name && !isNaN(price) && price >= 0) {
        currentItemExtras.push({ name, price });
        renderExtrasList(form);
        extraNameInput.value = '';
        extraPriceInput.value = '';
        extraNameInput.focus();
    } else {
        alert("Please enter a valid name and price for the extra.");
    }
}
else if (target.classList.contains('btn-delete-extra')) {
    const form = target.closest('.add-item-form');
    const indexToDelete = parseInt(target.dataset.index);
    if (!isNaN(indexToDelete)) {
        currentItemExtras.splice(indexToDelete, 1); // Remove the extra from the array
        renderExtrasList(form); // Re-render the list
    }
}
    else if (target.closest('.add-item-form') && target.type === 'submit') {
        event.preventDefault();
        const form = target.closest('.add-item-form');
        const currentSectionId = form.dataset.sectionId;
        await handleAddItem(form, currentSectionId);
    }
    else if (target.classList.contains('btn-delete-section') && sectionId) {
        if (confirm("Are you sure you want to delete this section and ALL its items? This cannot be undone.")) {
            showStatus("Deleting section...", false);
            try {
                const itemsInSectionRef = db.ref(`menus/${currentBusinessId}/items`).orderByChild('sectionId').equalTo(sectionId);
                const itemsSnapshot = await itemsInSectionRef.once('value');
                const itemDeletePromises = [];
                itemsSnapshot.forEach(itemSnap => {
                    itemDeletePromises.push(db.ref(`menus/${currentBusinessId}/items/${itemSnap.key}`).remove());
                });
                await Promise.all(itemDeletePromises);
                await db.ref(`menus/${currentBusinessId}/sections/${sectionId}`).remove();
                showStatus("Section and its items deleted.", true);
            } catch (error) {
                console.error("Error deleting section:", error);
                showStatus(`Error: ${error.message}`, false);
            }
        }
    }
    else if (target.classList.contains('btn-edit-section') && sectionId) {
        toggleSectionEditMode(sectionDiv, true);
    }
    else if (target.classList.contains('btn-cancel-edit-section') && sectionId) {
        toggleSectionEditMode(sectionDiv, false);
        // Values are re-rendered by listener, so no need to manually revert input fields
    }
    else if (target.classList.contains('btn-save-section') && sectionId) {
        const newName = sectionDiv.querySelector('.section-title-edit').value.trim();
        const newOrder = parseInt(sectionDiv.querySelector('.section-order-edit').value) || 0;
        if (!newName) { alert("Section name cannot be empty."); return; }
        showStatus("Saving section changes...", false);
        try {
            await db.ref(`menus/${currentBusinessId}/sections/${sectionId}`).update({ name: newName, order: newOrder });
            showStatus("Section updated.", true);
            // toggleSectionEditMode(sectionDiv, false); // UI updated by listener
        } catch (error) {
            console.error("Error updating section:", error);
            showStatus("Error saving section.", false);
        }
    }
    // --- NEW: Availability Event Handlers ---
    else if (target.classList.contains('btn-toggle-availability')) {
        const menuItemDiv = target.closest('.menu-item');
        const editForm = menuItemDiv.querySelector('.edit-availability-form');
        const itemActions = menuItemDiv.querySelector('.item-actions');
        if (editForm && itemActions) {
            editForm.style.display = 'block';
            itemActions.style.display = 'none'; // Hide main action buttons
            // Set the select to the current availability
            const currentAvailability = menuItemDiv.dataset.currentAvailability || 'available';
            editForm.querySelector('.item-availability-edit-select').value = currentAvailability;
        }
    }
    else if (target.classList.contains('btn-cancel-availability-edit')) {
        const menuItemDiv = target.closest('.menu-item');
        const editForm = menuItemDiv.querySelector('.edit-availability-form');
        const itemActions = menuItemDiv.querySelector('.item-actions');
        if (editForm && itemActions) {
            editForm.style.display = 'none';
            itemActions.style.display = 'flex'; // Show main action buttons
        }
    }
    else if (target.classList.contains('btn-save-availability')) {
        const menuItemDiv = target.closest('.menu-item');
        const itemId = menuItemDiv.dataset.itemId;
        const newAvailability = menuItemDiv.querySelector('.item-availability-edit-select').value;
        if (itemId && newAvailability) {
            showStatus("Updating availability...", false);
            try {
                await db.ref(`menus/${currentBusinessId}/items/${itemId}`).update({ availability: newAvailability });
                showStatus("Availability updated.", true);
                // UI will be updated by the real-time listener on items
                // const editForm = menuItemDiv.querySelector('.edit-availability-form');
                // const itemActions = menuItemDiv.querySelector('.item-actions');
                // if (editForm) editForm.style.display = 'none';
                // if (itemActions) itemActions.style.display = 'flex';
            } catch (error) {
                console.error("Error updating availability:", error);
                showStatus("Error updating availability.", false);
            }
        }
    }
    // --- End of New Availability Handlers ---
    else if (target.classList.contains('btn-delete-item')) {
        const menuItemDiv = target.closest('.menu-item');
        const itemId = menuItemDiv?.dataset.itemId;
        if (itemId && confirm("Are you sure you want to delete this item?")) {
            showStatus("Deleting item...", false);
            try {
                await db.ref(`menus/${currentBusinessId}/items/${itemId}`).remove();
                showStatus("Item deleted.", true);
            } catch (error) {
                console.error("Error deleting item:", error);
                showStatus("Error deleting item.", false);
            }
        }
    }
    // And REPLACE it with this:
else if (target.classList.contains('btn-edit-item')) {
    const menuItemDiv = target.closest('.menu-item');
    const itemId = menuItemDiv?.dataset.itemId;
    if (itemId) {
        openEditItemModal(itemId);
    }
}
}

// Add this entire block of new functions to js/menu-editor.js

let itemToEditExtras = []; // Temporary storage for extras in the edit modal
let itemToEditImage = { base64: null, type: null };

/**
 * Opens and populates the Edit Item modal with data from Firebase.
 * @param {string} itemId The ID of the item to edit.
 */
async function openEditItemModal(itemId) {
    showStatus(`Loading item ${itemId}...`);
    try {
        const itemRef = db.ref(`menus/${currentBusinessId}/items/${itemId}`);
        const snapshot = await itemRef.once('value');
        if (!snapshot.exists()) {
            throw new Error("Item not found.");
        }
        const itemData = snapshot.val();

        // Populate the form
        editItemIdInput.value = itemId;
        editItemModalTitle.textContent = `Edit "${itemData.name}"`;
        editItemNameInput.value = itemData.name || '';
        editItemDescriptionInput.value = itemData.description || '';
        editItemPriceInput.value = itemData.price || 0;
        editItemOrderInput.value = itemData.order || 0;

        // Reset and populate image
        itemToEditImage = { base64: null, type: null };
        editItemImageUpload.value = '';
        if (itemData.itemImageBase64) {
            editItemImagePreview.src = `data:${itemData.itemImageType};base64,${itemData.itemImageBase64}`;
            editItemImagePreview.style.display = 'block';
        } else {
            editItemImagePreview.style.display = 'none';
        }

        // Reset and populate extras
        itemToEditExtras = itemData.options ? Object.values(itemData.options) : [];
        renderEditExtrasList();

        editItemModal.style.display = 'flex';
        showStatus(""); // Clear loading message

    } catch (error) {
        console.error("Error opening edit modal:", error);
        showStatus(`Error: ${error.message}`, false);
    }
}

/**
 * Renders the list of extras inside the edit modal.
 */
function renderEditExtrasList() {
    editExtrasList.innerHTML = '';
    itemToEditExtras.forEach((extra, index) => {
        const item = document.createElement('div');
        item.className = 'extra-item';
        item.innerHTML = `
            <span class="extra-item-name">${extra.name}</span>
            <span class="extra-item-price">+$${parseFloat(extra.price).toFixed(2)}</span>
            <button type="button" class="btn btn-danger btn-small btn-delete-extra-edit" data-index="${index}">×</button>
        `;
        editExtrasList.appendChild(item);
    });
}

/**
 * Saves all changes from the edit modal back to Firebase.
 */
async function handleSaveItemChanges(event) {
    event.preventDefault();
    const itemId = editItemIdInput.value;
    if (!itemId) return;

    editItemSaveBtn.disabled = true;
    editItemStatus.textContent = "Saving...";
    editItemStatus.className = 'form-message submitting';
    editItemStatus.style.display = 'block';

    try {
        const updates = {
            name: editItemNameInput.value.trim(),
            description: editItemDescriptionInput.value.trim(),
            price: parseFloat(editItemPriceInput.value),
            order: parseInt(editItemOrderInput.value) || 0
        };

        // Add image update if a new one was selected
        if (itemToEditImage.base64) {
            updates.itemImageBase64 = itemToEditImage.base64;
            updates.itemImageType = itemToEditImage.type;
        }

        // Convert extras array back to the Firebase object structure
        updates.options = {};
        if (itemToEditExtras.length > 0) {
            itemToEditExtras.forEach((extra, index) => {
                updates.options[`option_${index + 1}`] = extra;
            });
        } else {
            updates.options = null; // Set to null to delete the options field if empty
        }

        await db.ref(`menus/${currentBusinessId}/items/${itemId}`).update(updates);
        
        editItemStatus.textContent = "Changes saved successfully!";
        editItemStatus.className = 'form-message success';
        setTimeout(() => {
            editItemModal.style.display = 'none';
        }, 1500);

    } catch (error) {
        console.error("Error saving item changes:", error);
        editItemStatus.textContent = `Error: ${error.message}`;
        editItemStatus.className = 'form-message error';
    } finally {
        editItemSaveBtn.disabled = false;
    }
}

function toggleSectionEditMode(sectionDiv, isEditing) {
    const titleDisplay = sectionDiv.querySelector('.section-title-display');
    const titleEdit = sectionDiv.querySelector('.section-title-edit');
    const orderEdit = sectionDiv.querySelector('.section-order-edit');
    const btnEdit = sectionDiv.querySelector('.btn-edit-section');
    const btnSave = sectionDiv.querySelector('.btn-save-section');
    const btnCancel = sectionDiv.querySelector('.btn-cancel-edit-section');

    // Ensure all elements exist before trying to modify their style
    if (titleDisplay) titleDisplay.style.display = isEditing ? 'none' : 'block';
    if (titleEdit) {
        titleEdit.style.display = isEditing ? 'inline-block' : 'none';
        if (isEditing && titleDisplay) titleEdit.value = titleDisplay.textContent; // Pre-fill on edit
    }
    if (orderEdit) orderEdit.style.display = isEditing ? 'inline-block' : 'none';
    if (btnEdit) btnEdit.style.display = isEditing ? 'none' : 'inline-block';
    if (btnSave) btnSave.style.display = isEditing ? 'inline-block' : 'none';
    if (btnCancel) btnCancel.style.display = isEditing ? 'inline-block' : 'none';
}

async function handleAddItem(form, sectionId) {
    const itemName = form.elements.itemName.value.trim();
    const itemDescription = form.elements.itemDescription.value.trim();
    const itemPrice = parseFloat(form.elements.itemPrice.value);
    const itemOrder = form.elements.itemOrder.value ? parseInt(form.elements.itemOrder.value) : 0;
    const itemAvailability = form.elements.itemAvailability.value; // Get availability
    const itemImageBase64 = form.elements.itemImageBase64.value;
    const itemImageType = form.elements.itemImageType.value;
    const statusElement = form.querySelector('.item-form-status');

    if (!itemName || isNaN(itemPrice) || itemPrice <= 0) {
        statusElement.textContent = "Item name and a valid price are required.";
        return;
    }
    statusElement.textContent = "Adding item...";
    statusElement.className = "item-form-status submitting-message";

    try {
        const itemsRef = db.ref(`menus/${currentBusinessId}/items`);
        const newItemRef = itemsRef.push();
        const newItemData = {
            sectionId: sectionId,
            name: itemName,
            description: itemDescription,
            price: itemPrice,
            order: itemOrder,
            availability: itemAvailability || "available" // Save availability
        };
        // --- ADD THIS LOGIC ---
        if (currentItemExtras.length > 0) {
            newItemData.options = {};
            currentItemExtras.forEach((extra, index) => {
                newItemData.options[`option_${index + 1}`] = extra;
            });
        }
        
        await newItemRef.set(newItemData);
        if (itemImageBase64 && itemImageType) {
            newItemData.itemImageBase64 = itemImageBase64;
            newItemData.itemImageType = itemImageType;
        }
        await newItemRef.set(newItemData);

        statusElement.textContent = "Item added successfully!";
        statusElement.className = "item-form-status success-message";
        form.reset();
        const previewImg = form.querySelector('.item-image-preview');
        if (previewImg) previewImg.style.display = 'none';

        setTimeout(() => {
            if (statusElement.textContent === "Item added successfully!") {
                 statusElement.textContent = "";
                 statusElement.className = "item-form-status error-message";
            }
            // Hide form and show the "+ Add Item" button again
            form.style.display = 'none';
            const showButton = form.closest('.add-item-to-section-area').querySelector('.btn-show-add-item-form');
            if (showButton) showButton.style.display = 'block';
        }, 1500);
    } catch (error) {
        console.error("Error adding item:", error);
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = "item-form-status error-message";
    }
}

// Add these two new functions anywhere in js/menu-editor.js

function renderExtrasList(form) {
    const extrasList = form.querySelector('.extras-list');
    if (!extrasList) return;
    extrasList.innerHTML = '';

    currentItemExtras.forEach((extra, index) => {
        const item = document.createElement('div');
        item.className = 'extra-item';
        item.innerHTML = `
            <span class="extra-item-name">${extra.name}</span>
            <span class="extra-item-price">+$${extra.price.toFixed(2)}</span>
            <button type="button" class="btn btn-danger btn-small btn-delete-extra" data-index="${index}">×</button>
        `;
        extrasList.appendChild(item);
    });
}
// End of /js/menu-editor.js

