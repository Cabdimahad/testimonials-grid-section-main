// /js/live-orders.js
import { db, auth } from "../firebase-config/indexfirebaseConfig.js";

let currentBusinessId = null;
let currentUser = null;
let businessDataCache = null;
let allOrdersCache = {}; // This will now only contain active (non-completed/cancelled) orders from active_orders
let soundEnabled = false;
let lastPlayedOrderIds = new Set();
let currentActiveTab = 'eatingIn';
let newOrderSound; // <-- ADD THIS

// DOM Elements
let loadingDiv, errorDiv, authPromptDiv, contentDiv,
    businessNameH1, sortOrdersSelect, /* REMOVED: showCompletedToggle */ toggleSoundButton,
    viewArchivedOrdersLink, // ADDED
    backToMenuEditorLink, ordersLoginPromptButton,
    orderTypeTabsContainer, tabButtons = {}, orderCountBadges = {}, orderTypePanels = {};



document.addEventListener('DOMContentLoaded', () => {
    getDOMElements();
    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('businessId');

    if (!currentBusinessId) {
        showError("No business ID specified. Cannot load orders."); return;
    }
    if (backToMenuEditorLink) {
        backToMenuEditorLink.href = `../dashboard/menu-editor.html?id=${currentBusinessId}`;
        backToMenuEditorLink.style.display = 'inline-block';
    }
    // Setup the link for archived orders
    if (viewArchivedOrdersLink) {
        viewArchivedOrdersLink.href = `../tools/archived-orders.html?businessId=${currentBusinessId}`;
        // viewArchivedOrdersLink.target = "_blank"; // Optional: open in new tab
    }


    auth.onAuthStateChanged(user => {
        currentUser = user;
        checkPermissionsAndLoadOrders();
    });

    if (ordersLoginPromptButton) ordersLoginPromptButton.addEventListener('click', () => document.getElementById('login-show-button')?.click());
    if (sortOrdersSelect) sortOrdersSelect.addEventListener('change', renderOrders);
    // REMOVED: Event listener for showCompletedToggle
    if (toggleSoundButton) toggleSoundButton.addEventListener('click', toggleNotificationSound);

    Object.values(tabButtons).forEach(button => {
        if (button) button.addEventListener('click', handleTabClick);
    });
});

function getDOMElements() {
    loadingDiv = document.getElementById('loading-orders');
    errorDiv = document.getElementById('orders-error');
    authPromptDiv = document.getElementById('orders-auth-prompt');
    contentDiv = document.getElementById('live-orders-content');
    businessNameH1 = document.getElementById('orders-business-name');
    sortOrdersSelect = document.getElementById('sort-orders');
    // REMOVED: showCompletedToggle = document.getElementById('show-completed-toggle');
    viewArchivedOrdersLink = document.getElementById('view-archived-orders-link'); // ADDED
    toggleSoundButton = document.getElementById('toggle-sound-button');
    backToMenuEditorLink = document.getElementById('back-to-menu-editor-link');
    ordersLoginPromptButton = document.getElementById('orders-login-prompt-button');

    orderTypeTabsContainer = document.querySelector('.order-type-tabs');
    const orderTypes = ['eatingIn', 'takeaway', 'delivery', 'other'];
    orderTypes.forEach(type => {
        tabButtons[type] = orderTypeTabsContainer?.querySelector(`button[data-order-type="${type}"]`);
        orderCountBadges[type] = document.getElementById(`${type}-count`);
        orderTypePanels[type] = document.getElementById(`${type}-orders-panel`);
    });
    // ADD THIS LINE
newOrderSound = document.getElementById('new-order-sound');
}

// --- showLoadingState, showError, showAuthPrompt, checkPermissionsAndLoadOrders (with ensurePanelsExist) ---
// --- createOrderCard, toggleNotificationSound, ensurePanelsExist functions remain the SAME ---
// --- handleUpdateOrderStatus needs a slight modification for archiving ---

async function checkPermissionsAndLoadOrders() {
    showLoadingState('loading');
    if (!currentUser) { showAuthPrompt("Please log in to view live orders."); return; }
    if (!currentBusinessId) { showError("Business ID is missing."); return; }

    try {
        const businessRef = db.ref(`businesses/${currentBusinessId}`);
        const snapshot = await businessRef.once('value');
        if (!snapshot.exists()) { showError("Business not found."); return; }
        businessDataCache = snapshot.val();

        if (!businessDataCache || businessDataCache.submitterUid !== currentUser.uid) {
            showAuthPrompt("You do not have permission to view these orders."); return;
        }

        if (businessNameH1) businessNameH1.textContent = `Live Orders for ${businessDataCache.name || 'Your Business'}`;
        
        if (!ensurePanelsExist()) {
            showError("Dashboard UI components are missing. Please check HTML structure.");
            return;
        }
        
        showLoadingState('content');
        listenForOrders();

    } catch (error) {
        console.error("Permission check/load error:", error);
        showError("Error verifying permissions. Please try again.");
    }
}


// /js/live-orders.js
// ... (other code remains the same)

function listenForOrders() {
    const ordersRef = db.ref(`active_orders/${currentBusinessId}`);
    ordersRef.on('value', snapshot => {
        const fetchedOrders = snapshot.val() || {};
        allOrdersCache = {}; // Reset cache, will be populated with active orders
        let hasNewUnplayedOrder = false;

        Object.entries(fetchedOrders).forEach(([id, data]) => {
            // Only add non-completed/non-cancelled orders to the live cache
            if (data.status !== 'completed' && data.status !== 'cancelled') {
                allOrdersCache[id] = data; // Add to our working cache

                // Check for sound notification:
                // If the order ID is new to our sound tracking AND
                // its status is one of the initial "new order" states
                if (!lastPlayedOrderIds.has(id) && 
                    (data.status === 'pending' || data.status === 'pending_payment_confirmation')) {
                    hasNewUnplayedOrder = true;
                    lastPlayedOrderIds.add(id); // Mark as "sound played for this ID"
                }
            } else {
                // If an order becomes completed/cancelled, remove it from sound tracking for future
                lastPlayedOrderIds.delete(id);
            }
        });

        if (hasNewUnplayedOrder && soundEnabled) {
            newOrderSound.play().catch(e => console.warn("Sound play failed:", e));
        }
        renderOrders(); // This will re-render based on the filtered allOrdersCache
    }, error => {
        console.error("Error fetching orders:", error);
        Object.values(orderTypePanels).forEach(panel => {
            if(panel) panel.innerHTML = '<p class="error-message">Could not load orders.</p>';
        });
    });
}

// ... (rest of live-orders.js remains the same)

function handleTabClick(event) { // This function should be good from the previous fix
    const newTabType = event.currentTarget.dataset.orderType;
    currentActiveTab = newTabType;
    Object.values(tabButtons).forEach(btn => btn?.classList.remove('active'));
    if(tabButtons[currentActiveTab]) tabButtons[currentActiveTab].classList.add('active');
    Object.values(orderTypePanels).forEach(panel => {
        if (panel) {
            panel.style.display = 'none';
            panel.classList.remove('active-panel');
            panel.innerHTML = ''; 
        }
    });
    const activePanelToShow = orderTypePanels[currentActiveTab];
    if (activePanelToShow) {
        activePanelToShow.style.display = 'grid';
        activePanelToShow.classList.add('active-panel');
    } else {
        console.error(`Panel for tab type "${currentActiveTab}" not found!`);
    }
    renderOrders();
}

function renderOrders() {
    // MODIFIED: Removed dependency on showCompletedToggle
    if (!sortOrdersSelect || !orderTypePanels[currentActiveTab]) {
        console.warn("RenderOrders: Critical elements missing or currentActiveTab panel not found. Current tab:", currentActiveTab);
        return;
    }

    const activePanel = orderTypePanels[currentActiveTab];
    if (activePanel) {
        activePanel.innerHTML = ''; 
    } else {
        console.error(`RenderOrders: Active panel for tab "${currentActiveTab}" is null or undefined!`);
        return;
    }

    const orderCounts = { eatingIn: 0, takeaway: 0, delivery: 0, other: 0 };
    let activeTabOrders = [];

    Object.entries(allOrdersCache).forEach(([id, data]) => { // allOrdersCache now only contains active ones
        const order = { id, ...data };
        const type = order.fulfillment?.orderType || 'other';

        if (orderCounts.hasOwnProperty(type)) {
            orderCounts[type]++; // Count all active orders for the badge
        }

        if (type === currentActiveTab) {
            // No need to check for completed/cancelled here as allOrdersCache is pre-filtered
            activeTabOrders.push(order);
        }
    });
    
    Object.keys(orderCounts).forEach(type => {
        if (orderCountBadges[type]) {
            orderCountBadges[type].textContent = orderCounts[type];
        }
    });

    const sortBy = sortOrdersSelect.value;
    switch (sortBy) {
        case 'oldest': activeTabOrders.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0)); break;
        case 'status_pending':
            activeTabOrders.sort((a,b) => {
                if(a.status === 'pending' && b.status !== 'pending') return -1;
                if(b.status === 'pending' && a.status !== 'pending') return 1;
                return (b.timestamp || 0) - (a.timestamp || 0);
            });
            break;
        case 'newest': default: activeTabOrders.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)); break;
    }

    if (activeTabOrders.length === 0) {
        let typeName = currentActiveTab.replace(/([A-Z])/g, ' $1');
        typeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
        activePanel.innerHTML = `<p class="no-orders-message">No active '${typeName}' orders.</p>`;
        return;
    }

    activeTabOrders.forEach(order => {
        const card = createOrderCard(order);
        activePanel.appendChild(card);
    });
}


// createOrderCard function remains the same as provided in the tabbed solution
// In js/live-orders.js, REPLACE the entire createOrderCard function.

// In js/live-orders.js, REPLACE the entire createOrderCard function.

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card status-${order.status || 'unknown'}`;
    card.dataset.orderId = order.id;

    const orderTime = order.timestamp ? new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
    
    // =============================================================
    // ===== THIS LOGIC IS UPGRADED TO SHOW NAME/PHONE EVERYWHERE ==
    // =============================================================
    let fulfillmentHTML = '';
    if (order.fulfillment) {
        const ff = order.fulfillment;
        
        // Helper function to build name/phone string
const getNamePhoneHTML = (f) => {
    let html = '';
    // ADD class="customer-name"
    if (f.customerName) html += `<p class="customer-name"><strong>Name:</strong> ${f.customerName}</p>`;
    // ADD class="customer-phone"
    if (f.phone) html += `<p class="customer-phone"><strong>Phone:</strong> ${f.phone}</p>`;
    return html;
};

        if (ff.orderType === 'eatingIn') {
            fulfillmentHTML += `<p><strong>Table:</strong> ${ff.tableNumber || 'N/A'}</p>`;
            fulfillmentHTML += getNamePhoneHTML(ff); // Add name and phone
        } 
        else if (ff.orderType === 'takeaway') {
            fulfillmentHTML += getNamePhoneHTML(ff); // Add name and phone
            if(ff.notes) fulfillmentHTML += `<p><strong>Notes:</strong> ${ff.notes}</p>`;
        } 
        else if (ff.orderType === 'delivery') {
            fulfillmentHTML += getNamePhoneHTML(ff); // Add name and phone
            fulfillmentHTML += `<p><strong>District:</strong> ${ff.district || ''}</p><p><strong>Neighborhood:</strong> ${ff.neighborhood || ''}</p>`;
            if(ff.addressDetails) fulfillmentHTML += `<p><strong>Address:</strong> ${ff.addressDetails}</p>`;
            if(ff.notes) fulfillmentHTML += `<p><strong>Delivery Notes:</strong> ${ff.notes}</p>`;
        } 
        else if (ff.orderType === 'other') {
            fulfillmentHTML += `<p><strong>Details:</strong> ${ff.specification || 'N/A'}</p>`;
            fulfillmentHTML += getNamePhoneHTML(ff); // Add name and phone
        }
    }

    let itemsHTML = '';
    (order.items || []).forEach(item => {
        let optionsHTML = '';
        if (item.options && item.options.length > 0) {
            optionsHTML = '<ul class="order-item-options-list">';
            item.options.forEach(opt => {
                optionsHTML += `<li>+ ${opt.name}</li>`;
            });
            optionsHTML += '</ul>';
        }
        let notesHTML = item.notes ? `<p class="order-item-notes"><em>Notes: ${item.notes}</em></p>` : '';
        itemsHTML += `
            <li>
                <span class="item-name-qty">${item.name} x ${item.quantity}</span>
                <span class="item-subtotal">$${(item.price * item.quantity).toFixed(2)}</span>
                ${optionsHTML}
                ${notesHTML}
            </li>
        `;
    });

    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">ID: ${order.id.slice(-6).toUpperCase()}</span>
            <span class="order-time">${orderTime}</span>
            <span class="order-status status-${order.status || 'unknown'}">${order.status || 'Unknown'}</span>
        </div>
        <div class="order-fulfillment-details">
            ${fulfillmentHTML}
        </div>
        <ul class="order-items-list">
            ${itemsHTML}
        </ul>
        <div class="order-total">
            <strong>Total: $${parseFloat(order.totalPrice || 0).toFixed(2)}</strong>
        </div>
        <div class="order-actions">
            <select class="order-status-select">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="accepted" ${order.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button class="btn btn-sm btn-primary btn-update-status">Update</button>
        </div>
    `;
    card.querySelector('.btn-update-status').addEventListener('click', handleUpdateOrderStatus);
    return card;
}


// handleUpdateOrderStatus remains the same (it already handles archiving)
// In js/live-orders.js, REPLACE your handleUpdateOrderStatus function with this one.

// In js/live-orders.js, REPLACE your existing handleUpdateOrderStatus function.

// In js/live-orders.js, REPLACE your entire handleUpdateOrderStatus function.

async function handleUpdateOrderStatus(event) {
    const orderCard = event.target.closest('.order-card');
    if (!orderCard) return;
    const orderId = orderCard.dataset.orderId;
    const statusSelect = orderCard.querySelector('.order-status-select');
    const newStatus = statusSelect.value;

    if (!orderId || !newStatus) return;
    const updateButton = event.target;
    updateButton.disabled = true;

    try {
        const orderRef = db.ref(`active_orders/${currentBusinessId}/${orderId}`);
        const snapshot = await orderRef.once('value');
        
        if (!snapshot.exists()) {
            console.warn(`Order ${orderId} not found in active_orders to update.`);
            return;
        }
        
        const orderData = snapshot.val();
        
        // This check determines if we should process ANY rewards.
        const shouldProcessRewards = (newStatus === 'completed') && !orderData.pointsAwarded;
        
        if (shouldProcessRewards && orderData.userId) {
            const userId = orderData.userId;
            // ===================================================================
        // ===            ADD THIS NEW ACTIVATION LOGIC BLOCK              ===
        // ===================================================================
        try {
            const userProfileRef = db.ref(`userProfiles/${userId}`);
            const userSnapshot = await userProfileRef.once('value');
            const userData = userSnapshot.val();

            // Check if the user was referred AND has NOT activated their referral yet
            if (userData && userData.referredBy && !userData.hasActivatedReferral) {
                const referrerCode = userData.referredBy;
                console.log(`User ${userId} was referred by ${referrerCode} and is making their first purchase.`);

                // Increment the referrer's activationCount
                const referrerActivationRef = db.ref(`referrers/${referrerCode}/activationCount`);
                await referrerActivationRef.transaction(currentCount => (currentCount || 0) + 1);
                
                // Set the flag on the user's profile so this only runs once
                await userProfileRef.update({ hasActivatedReferral: true });

                console.log(`Successfully activated referral for ${referrerCode}.`);
            }
        } catch (error) {
            console.error("Error processing referral activation:", error);
        }
        // ===================================================================
            console.log(`Order ${orderId} is 'completed'. Processing all rewards for user ${userId}.`);
            
            // --- Logic Block 1: Handle Lifetime and Weekly Points ---
            const orderType = orderData.fulfillment?.orderType;
            const pointsToAward = (orderType === 'delivery') ? 5 : 3;

            await db.ref(`userProfiles/${userId}/points`).transaction(p => (p || 0) + pointsToAward);
            console.log(`Awarded +${pointsToAward} to user's lifetime points.`);

            const streaksSnapshot = await db.ref(`user_streaks/${userId}`).once('value');
            const streaksData = streaksSnapshot.val();
            if (streaksData && streaksData.weeklyStreakLock && streaksData.weeklyStreakLock.businessId === currentBusinessId) {
                await db.ref(`user_streaks/${userId}/${currentBusinessId}/weeklyPoints`).transaction(p => (p || 0) + pointsToAward);
                console.log(`Awarded +${pointsToAward} to user's weekly points.`);
            }

            // --- Logic Block 2: Handle Loyalty Card Stamp and Win ---
            if (businessDataCache.loyaltyProgramEnabled === true) {
                const userLoyaltyCardRef = db.ref(`user_loyalty_cards/${userId}/${currentBusinessId}`);
                const cardSnapshot = await userLoyaltyCardRef.once('value');
                let cardData = cardSnapshot.val() || { stampCount: 0, hasClaimedFirstReward: false };
                
                cardData.stampCount += 1;

                const hasClaimedFirst = cardData.hasClaimedFirstReward === true;
                const goal = hasClaimedFirst ? 10 : 5;

                if (cardData.stampCount >= goal) {
                    // USER HAS WON!
                    const prizeDesc = hasClaimedFirst ? businessDataCache.loyaltyStandardReward : businessDataCache.loyaltyFirstReward;
                    const userProfileSnap = await db.ref(`userProfiles/${userId}`).once('value');
                    const username = userProfileSnap.val()?.username || 'Valued Customer';

                    const newWinRef = db.ref('loyalty_wins').push();
                    await newWinRef.set({
                        userId: userId,
                        businessId: currentBusinessId,
                        username: username,
                        claimedAt: firebase.database.ServerValue.TIMESTAMP,
                        prizeDescription: prizeDesc
                    });
                    // =======================================================
    // ===== NEW: NOTIFY THE BUSINESS OWNER ==================
    // =======================================================
    alert(`Congratulations! A customer, ${username}, just won a loyalty prize by completing this order. They have been notified.`);
    // =======================================================
                    // Reset the card for the next round
                    cardData = { stampCount: 0, hasClaimedFirstReward: true };
                    console.log(`User ${userId} won a loyalty prize! Card has been reset.`);
                }
                await userLoyaltyCardRef.set(cardData);
                console.log(`User ${userId} loyalty card updated. New stamp count: ${cardData.stampCount}`);
            }

            // --- Logic Block 3: Log the transaction ---
            await db.ref('point_transactions').push().set({
                userId: userId,
                action: `order_${orderType}`,
                points: pointsToAward,
                relatedId: orderId,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            // Mark the original order data so this block doesn't run again
            orderData.pointsAwarded = true;
        }
        
        // --- Final Step: Archive or Update the Order Status ---
        if (newStatus === 'completed' || newStatus === 'cancelled') {
            const orderDataToArchive = { ...orderData, status: newStatus, finalizedTimestamp: firebase.database.ServerValue.TIMESTAMP };
            await db.ref(`archived_orders/${currentBusinessId}/${orderId}`).set(orderDataToArchive);
            await orderRef.remove();
        } else {
            await orderRef.update({ 
                status: newStatus,
                lastStatusUpdate: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } catch (error) {
        console.error(`Error updating status for order ${orderId}:`, error);
        alert("Failed to update order status. Please try again.");
        if(updateButton) updateButton.disabled = false;
    }
}
// toggleNotificationSound function remains the same
function toggleNotificationSound() {
    soundEnabled = !soundEnabled;
    if (toggleSoundButton) {
        if (soundEnabled) {
            toggleSoundButton.innerHTML = '<i class="fas fa-volume-up"></i> Disable Sound';
            toggleSoundButton.classList.replace('btn-secondary', 'btn-success') || toggleSoundButton.classList.add('btn-success');
            newOrderSound.play().catch(e => console.warn("Test sound play failed:", e));
        } else {
            toggleSoundButton.innerHTML = '<i class="fas fa-volume-mute"></i> Enable Sound';
            toggleSoundButton.classList.replace('btn-success', 'btn-secondary') || toggleSoundButton.classList.add('btn-secondary');
        }
    }
}

// ensurePanelsExist function remains the same
function ensurePanelsExist() {
    const orderTypes = ['eatingIn', 'takeaway', 'delivery', 'other'];
    let allPanelsExist = true;
    orderTypes.forEach(type => {
        if (!orderTypePanels[type]) {
            console.error(`Panel for order type "${type}" not found in DOM! ID expected: ${type}-orders-panel`);
            allPanelsExist = false;
        }
    });
    return allPanelsExist;
}

// showLoadingState, showError, showAuthPrompt - these utility functions remain the same.
function showLoadingState(state) {
    if(loadingDiv) loadingDiv.style.display = state === 'loading' ? 'flex' : 'none';
    if(errorDiv) errorDiv.style.display = state === 'error' ? 'block' : 'none';
    if(authPromptDiv) authPromptDiv.style.display = state === 'auth' ? 'block' : 'none';
    if(contentDiv) contentDiv.style.display = state === 'content' ? 'block' : 'none';
}
function showError(message) {
    if(errorDiv) errorDiv.textContent = message;
    showLoadingState('error');
}
function showAuthPrompt(message = "Login required.") {
    if(authPromptDiv && authPromptDiv.querySelector('p:first-of-type')) {
         authPromptDiv.querySelector('p:first-of-type').textContent = message;
    }
    showLoadingState('auth');
}