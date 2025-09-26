// /js/archived-orders.js
import { db, auth } from "../firebase-config/indexfirebaseConfig.js";

let currentBusinessId = null;
let currentUser = null;
let businessDataCache = null;
let allArchivedOrdersCache = {};
let currentActiveArchiveTab = 'eatingIn'; // Default active tab

// DOM Elements
let loadingDiv, errorDiv, authPromptDiv, contentDiv,
    businessNameH1, sortArchivedOrdersSelect,
    backToMenuEditorLink, backToLiveOrdersLink, archivedOrdersLoginPromptButton,
    orderTypeTabsContainerArchive, tabButtonsArchive = {}, orderCountBadgesArchive = {}, orderTypePanelsArchive = {};

document.addEventListener('DOMContentLoaded', () => {
    getArchivedDOMElements();
    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('businessId');

    if (!currentBusinessId) {
        showArchivedError("No business ID specified. Cannot load archived orders."); return;
    }
    if (backToMenuEditorLink) {
        backToMenuEditorLink.href = `/menu-editor.html?id=${currentBusinessId}`;
        backToMenuEditorLink.style.display = 'inline-block';
    }
    if (backToLiveOrdersLink) {
        backToLiveOrdersLink.href = `/live-orders.html?businessId=${currentBusinessId}`;
        backToLiveOrdersLink.style.display = 'inline-block';
    }

    auth.onAuthStateChanged(user => {
        currentUser = user;
        checkArchivedPermissionsAndLoad();
    });

    if (archivedOrdersLoginPromptButton) archivedOrdersLoginPromptButton.addEventListener('click', () => document.getElementById('login-show-button')?.click());
    if (sortArchivedOrdersSelect) sortArchivedOrdersSelect.addEventListener('change', renderArchivedOrders);

    Object.values(tabButtonsArchive).forEach(button => {
        if (button) button.addEventListener('click', handleArchiveTabClick);
    });
});

function getArchivedDOMElements() {
    loadingDiv = document.getElementById('loading-archived-orders');
    errorDiv = document.getElementById('archived-orders-error');
    authPromptDiv = document.getElementById('archived-orders-auth-prompt');
    contentDiv = document.getElementById('archived-orders-content');
    businessNameH1 = document.getElementById('archived-orders-business-name');
    sortArchivedOrdersSelect = document.getElementById('sort-archived-orders');
    
    backToMenuEditorLink = document.getElementById('back-to-menu-editor-link-archive');
    backToLiveOrdersLink = document.getElementById('back-to-live-orders-link-archive');
    archivedOrdersLoginPromptButton = document.getElementById('archived-orders-login-prompt-button');

    orderTypeTabsContainerArchive = document.querySelector('.order-type-tabs'); // Uses same class
    const orderTypes = ['eatingIn', 'takeaway', 'delivery', 'other'];
    orderTypes.forEach(type => {
        tabButtonsArchive[type] = orderTypeTabsContainerArchive?.querySelector(`button[data-order-type="${type}"]`);
        orderCountBadgesArchive[type] = document.getElementById(`${type}-archive-count`); // Ensure unique IDs for badges
        orderTypePanelsArchive[type] = document.getElementById(`${type}-archived-orders-panel`); // Unique IDs for panels
    });
}

function showArchivedLoadingState(state) {
    if(loadingDiv) loadingDiv.style.display = state === 'loading' ? 'flex' : 'none';
    if(errorDiv) errorDiv.style.display = state === 'error' ? 'block' : 'none';
    if(authPromptDiv) authPromptDiv.style.display = state === 'auth' ? 'block' : 'none';
    if(contentDiv) contentDiv.style.display = state === 'content' ? 'block' : 'none';
}
function showArchivedError(message) {
    if(errorDiv) errorDiv.textContent = message;
    showArchivedLoadingState('error');
}
function showArchivedAuthPrompt(message = "Login required.") {
    if(authPromptDiv && authPromptDiv.querySelector('p:first-of-type')) {
        authPromptDiv.querySelector('p:first-of-type').textContent = message;
    }
    showArchivedLoadingState('auth');
}

async function checkArchivedPermissionsAndLoad() {
    showArchivedLoadingState('loading');
    if (!currentUser) { showArchivedAuthPrompt("Please log in to view archived orders."); return; }
    if (!currentBusinessId) { showArchivedError("Business ID is missing."); return; }

    try {
        const businessRef = db.ref(`businesses/${currentBusinessId}`);
        const snapshot = await businessRef.once('value');
        if (!snapshot.exists()) { showArchivedError("Business not found."); return; }
        businessDataCache = snapshot.val();

        if (!businessDataCache || businessDataCache.submitterUid !== currentUser.uid) {
            showArchivedAuthPrompt("You do not have permission to view these orders."); return;
        }

        if (businessNameH1) businessNameH1.textContent = `Archived Orders for ${businessDataCache.name || 'Your Business'}`;
        
        if (!ensureArchivedPanelsExist()) {
            showArchivedError("Dashboard UI components are missing. Please check HTML structure.");
            return;
        }
        showArchivedLoadingState('content');
        listenForArchivedOrders();

    } catch (error) {
        console.error("Permission check/load error (archived):", error);
        showArchivedError("Error verifying permissions. Please try again.");
    }
}

function listenForArchivedOrders() {
    const ordersRef = db.ref(`archived_orders/${currentBusinessId}`);
    ordersRef.on('value', snapshot => {
        allArchivedOrdersCache = snapshot.val() || {};
        renderArchivedOrders();
    }, error => {
        console.error("Error fetching archived orders:", error);
        Object.values(orderTypePanelsArchive).forEach(panel => {
            if(panel) panel.innerHTML = '<p class="error-message">Could not load archived orders.</p>';
        });
    });
}

function handleArchiveTabClick(event) {
    const newTabType = event.currentTarget.dataset.orderType;
    currentActiveArchiveTab = newTabType;
    Object.values(tabButtonsArchive).forEach(btn => btn?.classList.remove('active'));
    if(tabButtonsArchive[currentActiveArchiveTab]) tabButtonsArchive[currentActiveArchiveTab].classList.add('active');
    Object.values(orderTypePanelsArchive).forEach(panel => {
        if (panel) {
            panel.style.display = 'none';
            panel.classList.remove('active-panel');
            panel.innerHTML = ''; 
        }
    });
    const activePanelToShow = orderTypePanelsArchive[currentActiveArchiveTab];
    if (activePanelToShow) {
        activePanelToShow.style.display = 'grid';
        activePanelToShow.classList.add('active-panel');
    }
    renderArchivedOrders();
}

// /js/archived-orders.js
// ... (keep existing imports, global variables, DOM element declarations, getArchivedDOMElements, showArchivedLoadingState, showError, showAuthPrompt, checkArchivedPermissionsAndLoad, listenForArchivedOrders, handleArchiveTabClick, createArchivedOrderCard, ensureArchivedPanelsExist)

function renderArchivedOrders() {
    if (!sortArchivedOrdersSelect || !orderTypePanelsArchive[currentActiveArchiveTab]) {
        console.warn("RenderArchivedOrders: Critical elements missing. Current Tab:", currentActiveArchiveTab);
        // Check if the panel itself exists in the DOM, if not, it's a bigger issue.
        if (!orderTypePanelsArchive[currentActiveArchiveTab]) {
            console.error(`Panel for tab "${currentActiveArchiveTab}" does not exist in DOM.`);
        }
        return;
    }

    const activePanel = orderTypePanelsArchive[currentActiveArchiveTab];
    if (activePanel) activePanel.innerHTML = '';
    else { console.error("Archived active panel is null for tab:", currentActiveArchiveTab); return; }

    const orderCounts = { eatingIn: 0, takeaway: 0, delivery: 0, other: 0 };
    let activeTabArchivedOrders = [];

    Object.entries(allArchivedOrdersCache).forEach(([id, data]) => {
        const order = { id, ...data };
        const type = order.fulfillment?.orderType || 'other';
        if (orderCounts.hasOwnProperty(type)) orderCounts[type]++;
        if (type === currentActiveArchiveTab) activeTabArchivedOrders.push(order);
    });
    
    Object.keys(orderCounts).forEach(type => {
        if (orderCountBadgesArchive[type]) orderCountBadgesArchive[type].textContent = orderCounts[type];
    });

    const sortBy = sortArchivedOrdersSelect.value;
    switch (sortBy) {
        case 'oldest_finalized': 
            activeTabArchivedOrders.sort((a,b) => (a.finalizedTimestamp || a.timestamp || 0) - (b.finalizedTimestamp || b.timestamp || 0)); 
            break;
        case 'original_newest': 
            activeTabArchivedOrders.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)); 
            break;
        case 'original_oldest': 
            activeTabArchivedOrders.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0)); 
            break;
        case 'status_completed_first': // NEW SORT CASE
            activeTabArchivedOrders.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return -1; // a comes first
                if (b.status === 'completed' && a.status !== 'completed') return 1;  // b comes first
                // If both are 'completed' or neither are, sort by newest finalized
                return (b.finalizedTimestamp || b.timestamp || 0) - (a.finalizedTimestamp || a.timestamp || 0);
            });
            break;
        case 'status_cancelled_first': // NEW SORT CASE
            activeTabArchivedOrders.sort((a, b) => {
                if (a.status === 'cancelled' && b.status !== 'cancelled') return -1; // a comes first
                if (b.status === 'cancelled' && a.status !== 'cancelled') return 1;  // b comes first
                // If both are 'cancelled' or neither are, sort by newest finalized
                return (b.finalizedTimestamp || b.timestamp || 0) - (a.finalizedTimestamp || a.timestamp || 0);
            });
            break;
        case 'newest_finalized': 
        default: 
            activeTabArchivedOrders.sort((a,b) => (b.finalizedTimestamp || b.timestamp || 0) - (a.finalizedTimestamp || a.timestamp || 0)); 
            break;
    }

    if (activeTabArchivedOrders.length === 0) {
        let typeName = currentActiveArchiveTab.replace(/([A-Z])/g, ' $1');
        typeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
        activePanel.innerHTML = `<p class="no-orders-message">No archived '${typeName}' orders.</p>`;
        return;
    }

    activeTabArchivedOrders.forEach(order => {
        const card = createArchivedOrderCard(order); // createArchivedOrderCard remains the same
        activePanel.appendChild(card);
    });
}

// --- NO OTHER CHANGES NEEDED in js/archived-orders.js for this feature ---
// Functions like getArchivedDOMElements, showArchivedLoadingState, showArchivedError, showArchivedAuthPrompt, 
// checkArchivedPermissionsAndLoad, listenForArchivedOrders, handleArchiveTabClick, 
// createArchivedOrderCard, ensureArchivedPanelsExist remain the same.

function createArchivedOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card status-${order.status || 'unknown'}`; // Use status for border color
    card.dataset.orderId = order.id;

    const originalOrderTime = order.timestamp ? new Date(order.timestamp).toLocaleString() : 'N/A';
    const finalizedTime = order.finalizedTimestamp ? new Date(order.finalizedTimestamp).toLocaleString() : 'N/A';
    
    let fulfillmentHTML = ''; // Same as live-orders createOrderCard
    if (order.fulfillment) {
        const ff = order.fulfillment;
        if (ff.orderType === 'eatingIn') fulfillmentHTML += `<p><strong>Table:</strong> ${ff.tableNumber || 'N/A'}</p>`;
        else if (ff.orderType === 'takeaway') {
            fulfillmentHTML += `<p><strong>Name:</strong> ${ff.customerName || 'N/A'}</p>`;
            if(ff.notes) fulfillmentHTML += `<p><strong>Notes:</strong> ${ff.notes}</p>`;
        } else if (ff.orderType === 'delivery') {
            fulfillmentHTML += `<p><strong>District:</strong> ${ff.district || ''}</p><p><strong>Neighborhood:</strong> ${ff.neighborhood || ''}</p><p><strong>Phone:</strong> ${ff.phone || 'N/A'}</p>`;
            if(ff.addressDetails) fulfillmentHTML += `<p><strong>Address:</strong> ${ff.addressDetails}</p>`;
            if(ff.notes) fulfillmentHTML += `<p><strong>Delivery Notes:</strong> ${ff.notes}</p>`;
        } else if (ff.orderType === 'other') fulfillmentHTML += `<p><strong>Details:</strong> ${ff.specification || 'N/A'}</p>`;
    }

    let itemsHTML = ''; // Same as live-orders createOrderCard
    (order.items || []).forEach(item => {
        itemsHTML += `<li><span class="item-name-qty">${item.name} x ${item.quantity}</span> <span class="item-subtotal">$${(item.price * item.quantity).toFixed(2)}</span></li>`;
    });

    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">ID: ${order.id.slice(-6).toUpperCase()}</span>
            <span class="order-status status-${order.status || 'unknown'}">${order.status || 'Unknown'}</span>
        </div>
        <div class="order-fulfillment-details">
            <p><strong>Order Type:</strong> ${order.fulfillment?.orderType || 'N/A'}</p>
            ${fulfillmentHTML}
            <p><small><em>Ordered: ${originalOrderTime}</em></small></p>
            <p><small><em>Finalized: ${finalizedTime}</em></small></p>
        </div>
        <ul class="order-items-list">
            ${itemsHTML}
        </ul>
        <div class="order-total">
            <strong>Total: $${parseFloat(order.totalPrice || 0).toFixed(2)}</strong>
        </div>
        <div class="order-actions-archive">
            <!-- No actions for archived orders, or maybe a "View Details" if more info is hidden -->
        </div>
    `;
    return card;
}

function ensureArchivedPanelsExist() {
    const orderTypes = ['eatingIn', 'takeaway', 'delivery', 'other'];
    let allPanelsExist = true;
    orderTypes.forEach(type => {
        if (!orderTypePanelsArchive[type]) {
            console.error(`ARCHIVED: Panel for order type "${type}" not found! ID expected: ${type}-archived-orders-panel`);
            allPanelsExist = false;
        }
    });
    return allPanelsExist;
}