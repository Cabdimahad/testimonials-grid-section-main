// /js/sales-report.js
import { db, auth } from "../firebase-config/indexfirebaseConfig.js";

let currentBusinessId = null;

// DOM Elements
let loadingDiv, errorDiv, authPromptDiv, contentDiv,
    businessNameH1, reportForm, startDateInput, endDateInput,
    generateReportBtn, reportDisplayArea, reportLoadingMessage;

document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM elements
    loadingDiv = document.getElementById('loading-reports');
    errorDiv = document.getElementById('reports-error');
    authPromptDiv = document.getElementById('reports-auth-prompt');
    contentDiv = document.getElementById('sales-report-content');
    businessNameH1 = document.getElementById('reports-business-name');
    reportForm = document.getElementById('report-generator-form');
    startDateInput = document.getElementById('start-date');
    endDateInput = document.getElementById('end-date');
    generateReportBtn = document.getElementById('generate-report-btn');
    reportDisplayArea = document.getElementById('report-display-area');
    reportLoadingMessage = document.getElementById('report-loading-message');

    // Get businessId from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('businessId');

    if (!currentBusinessId) {
        showError("No business ID specified. Cannot load reports.");
        return;
    }

    // Check auth and permissions
    auth.onAuthStateChanged(user => {
        if (user) {
            checkPermissionsAndLoad(user.uid);
        } else {
            showAuthPrompt();
        }
    });

    reportForm.addEventListener('submit', handleGenerateReport);
});

async function checkPermissionsAndLoad(userId) {
    showLoadingState('loading');
    try {
        const businessRef = db.ref(`businesses/${currentBusinessId}`);
        const snapshot = await businessRef.once('value');
        if (!snapshot.exists()) {
            showError("Business not found.");
            return;
        }
        const businessData = snapshot.val();
        if (businessData.submitterUid !== userId) {
            showAuthPrompt("You do not have permission to view these reports.");
            return;
        }

        businessNameH1.textContent = `Sales Report for ${businessData.name}`;
        showLoadingState('content');
    } catch (error) {
        console.error("Error verifying permissions:", error);
        showError("An error occurred while verifying your permissions.");
    }
}

async function handleGenerateReport(e) {
    e.preventDefault();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert("Please select both a start and end date.");
        return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        alert("Start date cannot be after the end date.");
        return;
    }

    reportDisplayArea.style.display = 'none';
    reportLoadingMessage.style.display = 'flex';
    generateReportBtn.disabled = true;

    try {
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1); // Include full end day

        const ordersRef = db.ref(`archived_orders/${currentBusinessId}`);
        const snapshot = await ordersRef.orderByChild('timestamp')
                                        .startAt(startTimestamp)
                                        .endAt(endTimestamp)
                                        .once('value');
        
        // Process the data
        let totalSales = 0;
        let totalCommission = 0;
        let completedOrders = 0;
        const itemTally = {};

        if (snapshot.exists()) {
            snapshot.forEach(orderSnapshot => {
                const order = orderSnapshot.val();
                if (order.status === 'completed') {
                    completedOrders++;
                    totalSales += order.subtotal || 0;
                    totalCommission += order.serviceFee || 0;

                    (order.items || []).forEach(item => {
                        if (itemTally[item.name]) {
                            itemTally[item.name] += item.quantity;
                        } else {
                            itemTally[item.name] = item.quantity;
                        }
                    });
                }
            });
        }

        // Get top 5 selling items
        const topItems = Object.entries(itemTally)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        displayReportResults({ totalSales, totalCommission, completedOrders, topItems, startDate, endDate });

    } catch (error) {
        console.error("Error generating report:", error);
        reportDisplayArea.innerHTML = `<p class="error-message">Failed to generate report: ${error.message}</p>`;
        reportDisplayArea.style.display = 'block';
    } finally {
        reportLoadingMessage.style.display = 'none';
        generateReportBtn.disabled = false;
    }
}

function displayReportResults(results) {
    let topItemsHTML = '<p>No items sold in this period.</p>';
    if (results.topItems.length > 0) {
        topItemsHTML = '<ol>';
        results.topItems.forEach(item => {
            topItemsHTML += `<li>${item[0]} - <strong>${item[1]}</strong> sold</li>`;
        });
        topItemsHTML += '</ol>';
    }

    reportDisplayArea.innerHTML = `
        <h2>Report for ${new Date(results.startDate).toLocaleDateString()} to ${new Date(results.endDate).toLocaleDateString()}</h2>
        <div class="report-stats-grid">
            <div class="stat-card">
                <h4>Total Sales Value</h4>
                <p>$${results.totalSales.toFixed(2)}</p>
            </div>
            <div class="stat-card">
                <h4>Completed Orders</h4>
                <p>${results.completedOrders}</p>
            </div>
            <div class="stat-card">
                <h4>Your Commission Paid</h4>
                <p>$${results.totalCommission.toFixed(2)}</p>
            </div>
        </div>
        <div class="top-items-list">
            <h3>Top Selling Items</h3>
            ${topItemsHTML}
        </div>
    `;
    reportDisplayArea.style.display = 'block';
}

// Helper functions to show different page states
function showLoadingState(state) {
    loadingDiv.style.display = state === 'loading' ? 'flex' : 'none';
    errorDiv.style.display = state === 'error' ? 'block' : 'none';
    authPromptDiv.style.display = state === 'auth' ? 'block' : 'none';
    contentDiv.style.display = state === 'content' ? 'block' : 'none';
}
function showError(message) {
    errorDiv.textContent = message;
    showLoadingState('error');
}
function showAuthPrompt() {
    showLoadingState('auth');
}