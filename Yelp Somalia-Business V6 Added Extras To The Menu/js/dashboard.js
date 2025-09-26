// js/dashboard.js (Complete, Corrected, and Fully Refactored)

const auth = firebase.auth();
const db = firebase.database();

// --- Global DOM Element Variables ---
let loadingDashboard, dashboardErrorContainer, dashboardError, noBusinessAssociatedPrompt, noBusinessUserEmail, noBusinessLogoutLink,
    dashboardAppContent, sidebarBusinessName, sidebarCurrentPlan,
    overviewBusinessName, overviewCategory, overviewPlan, overviewStatus,
    editInfoForm, editBusinessName, editBusinessCategory, editBusinessAddress, editBusinessCity,
    editBusinessPhone, editBusinessHours, editBusinessDescription,
    editBusinessPhotoUpload, editBusinessPhotoPreview, editBusinessPhotoStatus,
    saveInfoButton, editInfoStatus,
    linkToMenuEditor, linkToLiveOrders, linkToArchivedOrders, linkToSalesReports,
    settingsUserEmail,
    dashboardLogoutButton,
    contentSections, sidebarLinks, quickLinkBtns, editSocialInstagram, editSocialFacebook, editSocialTikTok,
    analyticsTotalReviewsEl, analyticsAvgRatingEl,
    analyticsAvgFoodRatingEl, analyticsAvgServiceRatingEl, analyticsAvgEnvRatingEl,

    analyticsAvgPriceRatingEl, analyticsAvgDeliveryTimeEl, noAnalyticsDataEl,
    analyticsChartsContainerEl, averageRatingsChartCanvas, overallRatingDistributionChartCanvas,
    averageRatingsChartMessageEl, overallRatingDistributionChartMessageEl,
    loyaltyStatusDisplay, toggleLoyaltyBtn, loyaltySettingsForm,
    firstRewardDescInput, standardRewardDescInput, saveLoyaltySettingsBtn,
    loyaltySettingsStatus, manualStampForm, manualStampUserIdInput,
    grantStampBtn, manualStampStatus, streakStatusDisplay, toggleStreakBtn, streakSettingsForm,
    editWeeklyPrize, saveStreakSettingsBtn, streakSettingsStatus,
    paymentTypeMerchantRadio, paymentTypeEvcRadio,
    merchantInputGroup, evcInputGroup,
    paymentNumberMerchantInput, paymentNumberEvcInput,
    redemptionSettingsForm, savePinBtn, pinSettingsStatus, editRedemptionPin;

// --- Global State ---
let currentUser = null;
let currentBusinessId = null;
let currentBusinessData = null;
let businessProfilePhoto = { base64: null, type: null, changed: false };
let averageRatingsChartInstance = null;
let overallRatingDistributionChartInstance = null;

// =====================================================================
// ===          MAIN INITIALIZATION (WHEN THE PAGE LOADS)           ===
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    getDOMElements();
    setupEventListeners();
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            findUserBusiness(user.uid);
        } else {
            resetDashboardUI();
            showAuthRequiredScreen();
        }
    });
});

// =====================================================================
// ===                SETUP AND EVENT LISTENERS                     ===
// =====================================================================
function getDOMElements() {
    loadingDashboard = document.getElementById('loading-dashboard');
    dashboardErrorContainer = document.getElementById('dashboard-error-container');
    dashboardError = document.getElementById('dashboard-error');
    noBusinessAssociatedPrompt = document.getElementById('no-business-associated-prompt');
    noBusinessUserEmail = document.getElementById('no-business-user-email');
    noBusinessLogoutLink = document.getElementById('no-business-logout-link');
    dashboardAppContent = document.getElementById('dashboard-app-content');
    sidebarBusinessName = document.getElementById('sidebar-business-name');
    sidebarCurrentPlan = document.getElementById('sidebar-current-plan');
    overviewBusinessName = document.getElementById('overview-business-name');
    overviewCategory = document.getElementById('overview-category');
    overviewPlan = document.getElementById('overview-plan');
    overviewStatus = document.getElementById('overview-status');
    editInfoForm = document.getElementById('edit-info-form');
    editBusinessName = document.getElementById('edit-business-name');
    editBusinessCategory = document.getElementById('edit-business-category');
    editBusinessAddress = document.getElementById('edit-business-address');
    editBusinessCity = document.getElementById('edit-business-city');
    editBusinessPhone = document.getElementById('edit-business-phone');
    editBusinessHours = document.getElementById('edit-business-hours');
    editBusinessDescription = document.getElementById('edit-business-description');
    editBusinessPhotoUpload = document.getElementById('edit-business-photo-upload');
    editBusinessPhotoPreview = document.getElementById('edit-business-photo-preview');
    editBusinessPhotoStatus = document.getElementById('edit-business-photo-status');
    saveInfoButton = document.getElementById('save-info-button');
    editInfoStatus = document.getElementById('edit-info-status');
    linkToMenuEditor = document.getElementById('link-to-menu-editor');
    linkToLiveOrders = document.getElementById('link-to-live-orders');
    linkToArchivedOrders = document.getElementById('link-to-archived-orders');
    linkToSalesReports = document.getElementById('link-to-sales-reports');
    settingsUserEmail = document.getElementById('settings-user-email');
    dashboardLogoutButton = document.getElementById('dashboard-logout-button');
    contentSections = document.querySelectorAll('.dashboard-content .content-section');
    sidebarLinks = document.querySelectorAll('.dashboard-sidebar ul li a[href^="#"]:not(#dashboard-logout-button)');
    quickLinkBtns = document.querySelectorAll('.quick-actions .quick-link-btn');
    editSocialInstagram = document.getElementById('edit-social-instagram');
    editSocialFacebook = document.getElementById('edit-social-facebook');
    editSocialTikTok = document.getElementById('edit-social-tiktok');
    paymentTypeMerchantRadio = document.getElementById('edit-select-merchant');
    paymentTypeEvcRadio = document.getElementById('edit-select-evc');
    merchantInputGroup = document.getElementById('edit-merchant-input-group');
    evcInputGroup = document.getElementById('edit-evc-input-group');
    paymentNumberMerchantInput = document.getElementById('edit-payment-number-merchant');
    paymentNumberEvcInput = document.getElementById('edit-payment-number-evc');
    redemptionSettingsForm = document.getElementById('redemption-settings-form');
    savePinBtn = document.getElementById('save-pin-btn');
    pinSettingsStatus = document.getElementById('pin-settings-status');
    editRedemptionPin = document.getElementById('edit-redemption-pin');
    editWeeklyPrize = document.getElementById('edit-weekly-prize');
    loyaltyStatusDisplay = document.getElementById('loyalty-status-display');
    toggleLoyaltyBtn = document.getElementById('toggle-loyalty-program-btn');
    loyaltySettingsForm = document.getElementById('loyalty-settings-form');
    firstRewardDescInput = document.getElementById('first-reward-desc');
    standardRewardDescInput = document.getElementById('standard-reward-desc');
    saveLoyaltySettingsBtn = document.getElementById('save-loyalty-settings-btn');
    loyaltySettingsStatus = document.getElementById('loyalty-settings-status');
    manualStampForm = document.getElementById('manual-stamp-form');
    manualStampUserIdInput = document.getElementById('manual-stamp-user-id');
    grantStampBtn = document.getElementById('grant-stamp-btn');
    manualStampStatus = document.getElementById('manual-stamp-status');
    streakStatusDisplay = document.getElementById('streak-status-display');
    toggleStreakBtn = document.getElementById('toggle-streak-program-btn');
    streakSettingsForm = document.getElementById('streak-settings-form');
    saveStreakSettingsBtn = document.getElementById('save-streak-settings-btn');
    streakSettingsStatus = document.getElementById('streak-settings-status');
    analyticsTotalReviewsEl = document.getElementById('analytics-total-reviews');
    analyticsAvgRatingEl = document.getElementById('analytics-avg-rating');
    analyticsAvgFoodRatingEl = document.getElementById('analytics-avg-food-rating');
    analyticsAvgServiceRatingEl = document.getElementById('analytics-avg-service-rating');
    analyticsAvgEnvRatingEl = document.getElementById('analytics-avg-env-rating');
    analyticsAvgPriceRatingEl = document.getElementById('analytics-avg-price-rating');
    analyticsAvgDeliveryTimeEl = document.getElementById('analytics-avg-delivery-time');
    noAnalyticsDataEl = document.getElementById('no-analytics-data');
    analyticsChartsContainerEl = document.getElementById('analytics-charts-container');
    averageRatingsChartCanvas = document.getElementById('averageRatingsChart');
    overallRatingDistributionChartCanvas = document.getElementById('overallRatingDistributionChart');
    averageRatingsChartMessageEl = document.getElementById('averageRatingsChartMessage');
    overallRatingDistributionChartMessageEl = document.getElementById('overallRatingDistributionChartMessage');
}

function setupEventListeners() {
    if (dashboardLogoutButton) dashboardLogoutButton.addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); });
    if (noBusinessLogoutLink) noBusinessLogoutLink.addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); });
    sidebarLinks.forEach(link => link.addEventListener('click', handleNavClick));
    quickLinkBtns.forEach(link => link.addEventListener('click', handleNavClick));
    if (editInfoForm) editInfoForm.addEventListener('submit', handleSaveBusinessInfo);
    if (editBusinessPhotoUpload) editBusinessPhotoUpload.addEventListener('change', handlePhotoUploadChange);
    if (paymentTypeMerchantRadio) paymentTypeMerchantRadio.addEventListener('change', () => togglePaymentInputs('merchant'));
    if (paymentTypeEvcRadio) paymentTypeEvcRadio.addEventListener('change', () => togglePaymentInputs('evc'));
    // Rewards Listeners
    if (redemptionSettingsForm) redemptionSettingsForm.addEventListener('submit', handleSavePinSettings);
    if (toggleLoyaltyBtn) toggleLoyaltyBtn.addEventListener('click', handleToggleLoyaltyProgram);
    if (loyaltySettingsForm) loyaltySettingsForm.addEventListener('submit', handleSaveLoyaltySettings);
    if (manualStampForm) manualStampForm.addEventListener('submit', handleManualStamp);
    if (toggleStreakBtn) toggleStreakBtn.addEventListener('click', handleToggleStreakProgram);
    if (streakSettingsForm) streakSettingsForm.addEventListener('submit', handleSaveStreakSettings);
}

// =====================================================================
// ===                AUTHENTICATION & DATA LOGIC                   ===
// =====================================================================
async function findUserBusiness(userId) {
    showLoadingScreen();
    const businessesRef = db.ref('businesses');
    try {
        const snapshot = await businessesRef.orderByChild('submitterUid').equalTo(userId).limitToFirst(1).once('value');
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                currentBusinessId = childSnapshot.key;
                currentBusinessData = { id: childSnapshot.key, ...childSnapshot.val() };
            });
            initializeDashboard();
        } else {
            showNoBusinessAssociatedScreen();
        }
    } catch (error) {
        console.error("Error finding user business:", error);
        showErrorScreen("Error fetching your business details. Please refresh.");
    }
}

function initializeDashboard() {
    if (!currentBusinessData) {
        showErrorScreen("Failed to initialize: Business data missing.");
        return;
    }
    showAppContent();
    populateOverview();
    populateEditForm();
    populateLoyaltySection(); // This now populates all reward forms, including PIN
    updateDynamicLinks();
    if (settingsUserEmail && currentUser) settingsUserEmail.textContent = currentUser.email;
    fetchAndDisplayAnalytics();
    
    // Handle initial section display based on URL hash
    const hash = window.location.hash.substring(1);
    const initialSection = (hash && document.getElementById(hash)) ? hash : 'overview';
    showContentSection(initialSection);
    sidebarLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`.dashboard-sidebar a[href="#${initialSection}"]`)?.classList.add('active');
}

// =====================================================================
// ===                    UI AND DISPLAY LOGIC                      ===
// =====================================================================
function populateOverview() {
    if (!currentBusinessData) return;
    sidebarBusinessName.textContent = currentBusinessData.name || "Your Business";
    sidebarCurrentPlan.textContent = capitalizeFirstLetter(currentBusinessData.selectedPlan || "Basic");
    overviewBusinessName.textContent = currentBusinessData.name || "N/A";
    overviewCategory.textContent = currentBusinessData.category || "N/A";
    overviewPlan.textContent = capitalizeFirstLetter(currentBusinessData.selectedPlan || "Basic");
    overviewStatus.textContent = capitalizeFirstLetter(currentBusinessData.status || "Unknown");
}

function populateEditForm() {
    if (!currentBusinessData || !editInfoForm) return;
    editBusinessName.value = currentBusinessData.name || '';
    editBusinessCategory.value = currentBusinessData.category || '';
    editBusinessAddress.value = currentBusinessData.address || '';
    editBusinessCity.value = currentBusinessData.city || '';
    editBusinessPhone.value = currentBusinessData.phone || '';
    editBusinessHours.value = currentBusinessData.hours || '';
    editBusinessDescription.value = currentBusinessData.description || '';
    if (currentBusinessData.socialLinks) {
        editSocialInstagram.value = currentBusinessData.socialLinks.instagram || '';
        editSocialFacebook.value = currentBusinessData.socialLinks.facebook || '';
        editSocialTikTok.value = currentBusinessData.socialLinks.tiktok || '';
    }
    if (currentBusinessData.paymentNumberType === 'merchant') {
        paymentTypeMerchantRadio.checked = true;
        paymentNumberMerchantInput.value = currentBusinessData.paymentNumber || '';
        togglePaymentInputs('merchant');
    } else if (currentBusinessData.paymentNumberType === 'evc') {
        paymentTypeEvcRadio.checked = true;
        paymentNumberEvcInput.value = currentBusinessData.paymentNumber || '';
        togglePaymentInputs('evc');
    } else {
        paymentTypeMerchantRadio.checked = false;
        paymentTypeEvcRadio.checked = false;
        togglePaymentInputs(null);
    }
    businessProfilePhoto = { base64: null, type: null, changed: false };
    editBusinessPhotoUpload.value = '';
    if (currentBusinessData.profilePictureBase64 && currentBusinessData.profilePictureType) {
        editBusinessPhotoPreview.src = `data:${currentBusinessData.profilePictureType};base64,${currentBusinessData.profilePictureBase64}`;
        editBusinessPhotoPreview.style.display = 'block';
    } else {
        editBusinessPhotoPreview.src = '#';
        editBusinessPhotoPreview.style.display = 'none';
    }
    if (editInfoStatus) editInfoStatus.textContent = '';
}

function populateLoyaltySection() {
    if (!currentBusinessData) return;
    editRedemptionPin.value = currentBusinessData.redemptionPIN || '';
    const isLoyaltyEnabled = currentBusinessData.loyaltyProgramEnabled === true;
    loyaltyStatusDisplay.textContent = isLoyaltyEnabled ? 'Active' : 'Inactive';
    loyaltyStatusDisplay.className = isLoyaltyEnabled ? 'status-active' : 'status-inactive';
    toggleLoyaltyBtn.textContent = isLoyaltyEnabled ? 'Disable Program' : 'Enable Program';
    toggleLoyaltyBtn.classList.toggle('is-active', isLoyaltyEnabled);
    loyaltySettingsForm.style.display = isLoyaltyEnabled ? 'block' : 'none';
    firstRewardDescInput.value = currentBusinessData.loyaltyFirstReward || '';
    standardRewardDescInput.value = currentBusinessData.loyaltyStandardReward || '';
    const isStreakEnabled = currentBusinessData.streakChallengeEnabled === true;
    streakStatusDisplay.textContent = isStreakEnabled ? 'Active' : 'Inactive';
    streakStatusDisplay.className = isStreakEnabled ? 'status-active' : 'status-inactive';
    toggleStreakBtn.textContent = isStreakEnabled ? 'Disable Program' : 'Enable Program';
    toggleStreakBtn.classList.toggle('is-active', isStreakEnabled);
    streakSettingsForm.style.display = isStreakEnabled ? 'block' : 'none';
    editWeeklyPrize.value = currentBusinessData.weeklyPrizeDescription || '';
}

function togglePaymentInputs(selection) {
    if (selection === 'merchant') {
        merchantInputGroup.classList.remove('disabled');
        paymentNumberMerchantInput.required = true;
        evcInputGroup.classList.add('disabled');
        paymentNumberEvcInput.required = false;
        paymentNumberEvcInput.value = '';
    } else if (selection === 'evc') {
        evcInputGroup.classList.remove('disabled');
        paymentNumberEvcInput.required = true;
        merchantInputGroup.classList.add('disabled');
        paymentNumberMerchantInput.required = false;
        paymentNumberMerchantInput.value = '';
    } else {
        merchantInputGroup.classList.add('disabled');
        paymentNumberMerchantInput.required = false;
        evcInputGroup.classList.add('disabled');
        paymentNumberEvcInput.required = false;
    }
}

// --- All other functions ---
async function handleSaveBusinessInfo(event) {
    event.preventDefault();
    if (!currentBusinessId) return;

    showEditInfoStatus("Saving...", null);
    saveInfoButton.disabled = true;

    let paymentType = null;
    let paymentNumString = '';
    if (paymentTypeMerchantRadio.checked) {
        paymentType = 'merchant';
        paymentNumString = paymentNumberMerchantInput.value.trim();
    } else if (paymentTypeEvcRadio.checked) {
        paymentType = 'evc';
        paymentNumString = paymentNumberEvcInput.value.trim();
    }

    if (!paymentType || !paymentNumString) {
        showEditInfoStatus("Please select a payment type and enter the number.", false);
        saveInfoButton.disabled = false;
        return;
    }

    const isOnlyDigits = /^\d+$/.test(paymentNumString);
    if (!isOnlyDigits) {
        showEditInfoStatus("Payment number must contain only digits.", false);
        saveInfoButton.disabled = false;
        return;
    }

    let formattedPaymentNumber;
    if (paymentType === 'merchant' && paymentNumString.length !== 6) {
        showEditInfoStatus("Merchant number must be exactly 6 digits.", false);
        saveInfoButton.disabled = false;
        return;
    } else if (paymentType === 'evc' && paymentNumString.length !== 9) {
        showEditInfoStatus("EVC+ number must be exactly 9 digits.", false);
        saveInfoButton.disabled = false;
        return;
    }
    formattedPaymentNumber = parseInt(paymentNumString, 10);

    const updates = {
        name: editBusinessName.value.trim(),
        category: editBusinessCategory.value.trim(),
        address: editBusinessAddress.value.trim(),
        city: editBusinessCity.value.trim(),
        phone: editBusinessPhone.value.trim(),
        hours: editBusinessHours.value.trim(),
        description: editBusinessDescription.value.trim(),
        socialLinks: {
            instagram: editSocialInstagram.value.trim(),
            facebook: editSocialFacebook.value.trim(),
            tiktok: editSocialTikTok.value.trim()
        },
        paymentNumberType: paymentType,
        paymentNumber: formattedPaymentNumber,
        lastUpdatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (businessProfilePhoto.changed) {
        updates.profilePictureBase64 = businessProfilePhoto.base64 || null;
        updates.profilePictureType = businessProfilePhoto.type || null;
    }

    try {
        await db.ref(`businesses/${currentBusinessId}`).update(updates);
        showEditInfoStatus("Information saved successfully!", true);
        currentBusinessData = { ...currentBusinessData, ...updates };
        if (businessProfilePhoto.changed) businessProfilePhoto.changed = false;
        populateOverview();
        if (sidebarBusinessName) sidebarBusinessName.textContent = currentBusinessData.name || "Your Business";
    } catch (error) {
        showEditInfoStatus(`Error saving: ${error.message}`, false);
    } finally {
        saveInfoButton.disabled = false;
    }
}

async function handleSavePinSettings(event) {
    event.preventDefault();
    if (!currentBusinessId) return;
    const newPin = editRedemptionPin.value.trim();
    if (!/^[0-9]{4}$/.test(newPin)) {
        showFormMessage(pinSettingsStatus, "Invalid PIN. It must be exactly 4 digits.", 'error');
        return;
    }
    savePinBtn.disabled = true;
    showFormMessage(pinSettingsStatus, "Saving PIN...", 'submitting');
    try {
        await db.ref(`businesses/${currentBusinessId}`).update({ redemptionPIN: newPin });
        currentBusinessData.redemptionPIN = newPin;
        showFormMessage(pinSettingsStatus, "Redemption PIN saved successfully!", 'success');
    } catch (error) {
        console.error("Error saving redemption PIN:", error);
        showFormMessage(pinSettingsStatus, `Error: ${error.message}`, 'error');
    } finally {
        savePinBtn.disabled = false;
    }
}

async function handleSaveStreakSettings(event) {
    event.preventDefault();
    if (!currentBusinessId) return;
    const prize = editWeeklyPrize.value.trim();
    if (!prize) {
        showFormMessage(streakSettingsStatus, "The prize description is required.", 'error');
        return;
    }
    saveStreakSettingsBtn.disabled = true;
    showFormMessage(streakSettingsStatus, "Saving...", 'submitting');
    try {
        await db.ref(`businesses/${currentBusinessId}/weeklyPrizeDescription`).set(prize);
        currentBusinessData.weeklyPrizeDescription = prize;
        showFormMessage(streakSettingsStatus, "Settings saved successfully!", 'success');
    } catch (error) {
        showFormMessage(streakSettingsStatus, `Error: ${error.message}`, 'error');
    } finally {
        saveStreakSettingsBtn.disabled = false;
    }
}

// ... (All other functions from your original file: handleToggleLoyaltyProgram, handleSaveLoyaltySettings, handleManualStamp, analytics functions, UI helpers etc. are included below)
function handlePhotoUploadChange(event) {
    const file = event.target.files[0];
    if (editBusinessPhotoStatus) editBusinessPhotoStatus.textContent = '';
    if (!file) {
        businessProfilePhoto = { base64: null, type: null, changed: true };
        editBusinessPhotoPreview.src = '#';
        editBusinessPhotoPreview.style.display = 'none';
        if (editBusinessPhotoStatus) editBusinessPhotoStatus.textContent = 'Photo removed. Save to apply.';
        return;
    }
    const maxSizeMB = 1.5;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        if (editBusinessPhotoStatus) editBusinessPhotoStatus.textContent = 'Invalid type (JPG, PNG, GIF, WEBP).';
        event.target.value = '';
        return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
        if (editBusinessPhotoStatus) editBusinessPhotoStatus.textContent = `Image > ${maxSizeMB}MB.`;
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        editBusinessPhotoPreview.src = e.target.result;
        editBusinessPhotoPreview.style.display = 'block';
        businessProfilePhoto.base64 = e.target.result.split(',')[1];
        businessProfilePhoto.type = file.type;
        businessProfilePhoto.changed = true;
        if (editBusinessPhotoStatus) editBusinessPhotoStatus.textContent = 'New photo selected. Save to apply.';
    };
    reader.onerror = () => { if (editBusinessPhotoStatus) editBusinessPhotoStatus.textContent = 'Error reading photo.'; event.target.value = ''; };
    reader.readAsDataURL(file);
}
function updateDynamicLinks() {
    if (!currentBusinessId) return;
    if (linkToMenuEditor) linkToMenuEditor.href = `../tools/menu-editor.html?id=${currentBusinessId}`;
    if (linkToLiveOrders) linkToLiveOrders.href = `../tools/live-orders.html?businessId=${currentBusinessId}`;
    if (linkToArchivedOrders) linkToArchivedOrders.href = `../tools/archived-orders.html?businessId=${currentBusinessId}`;
    if (linkToSalesReports) linkToSalesReports.href = `../tools/sales-report.html?businessId=${currentBusinessId}`;
}
async function handleToggleLoyaltyProgram() {
    if (!currentBusinessId) return;
    const currentlyEnabled = currentBusinessData.loyaltyProgramEnabled === true;
    const wantToEnable = !currentlyEnabled;
    if (!wantToEnable && !confirm("Are you sure you want to disable the loyalty program? All user progress will be paused.")) return;
    toggleLoyaltyBtn.disabled = true;
    try {
        await db.ref(`businesses/${currentBusinessId}/loyaltyProgramEnabled`).set(wantToEnable);
        currentBusinessData.loyaltyProgramEnabled = wantToEnable;
        populateLoyaltySection();
    } catch (error) {
        console.error("Error toggling loyalty program:", error);
        alert("Failed to update the program status. Please try again.");
    } finally {
        toggleLoyaltyBtn.disabled = false;
    }
}
async function handleSaveLoyaltySettings(event) {
    event.preventDefault();
    if (!currentBusinessId) return;
    const firstReward = firstRewardDescInput.value.trim();
    const standardReward = standardRewardDescInput.value.trim();
    if (!firstReward || !standardReward) {
        showFormMessage(loyaltySettingsStatus, "Both prize descriptions are required.", 'error');
        return;
    }
    saveLoyaltySettingsBtn.disabled = true;
    showFormMessage(loyaltySettingsStatus, "Saving...", 'submitting');
    try {
        const updates = {
            loyaltyFirstReward: firstReward,
            loyaltyStandardReward: standardReward
        };
        await db.ref(`businesses/${currentBusinessId}`).update(updates);
        currentBusinessData.loyaltyFirstReward = firstReward;
        currentBusinessData.loyaltyStandardReward = standardReward;
        showFormMessage(loyaltySettingsStatus, "Settings saved successfully!", 'success');
    } catch (error) {
        console.error("Error saving loyalty settings:", error);
        showFormMessage(loyaltySettingsStatus, `Error: ${error.message}`, 'error');
    } finally {
        saveLoyaltySettingsBtn.disabled = false;
    }
}
async function handleManualStamp(event) {
    event.preventDefault();
    const shortIdToFind = manualStampUserIdInput.value.trim();
    if (!shortIdToFind || !/^[0-9]{4}$/.test(shortIdToFind)) {
        showFormMessage(manualStampStatus, "Please enter a valid 4-digit Loyalty ID.", 'error');
        return;
    }
    grantStampBtn.disabled = true;
    showFormMessage(manualStampStatus, `Looking up ID: ${shortIdToFind}...`, 'submitting');

    try {
        const lookupRef = db.ref(`shortId_lookup/${shortIdToFind}`);
        const snapshot = await lookupRef.once('value');
        if (!snapshot.exists()) {
            throw new Error(`No user found with Loyalty ID "${shortIdToFind}".`);
        }
        const userIdToStamp = snapshot.val();
        console.log(`Found user ${userIdToStamp} for shortId ${shortIdToFind}.`);

        showFormMessage(manualStampStatus, `Granting stamp to user...`, 'submitting');
        const userLoyaltyCardRef = db.ref(`user_loyalty_cards/${userIdToStamp}/${currentBusinessId}`);
        const userProfileRef = db.ref(`userProfiles/${userIdToStamp}`);

        const { committed } = await userLoyaltyCardRef.transaction(cardData => {
            if (cardData === null) {
                return { stampCount: 1, hasClaimedFirstReward: false };
            } else {
                cardData.stampCount = (cardData.stampCount || 0) + 1;
                return cardData;
            }
        });

        if (committed) {
            const newCardSnapshot = await userLoyaltyCardRef.once('value');
            const newCardData = newCardSnapshot.val();
            const hasClaimedFirst = newCardData.hasClaimedFirstReward === true;
            const goal = hasClaimedFirst ? 10 : 5;

            if (newCardData.stampCount >= goal) {
                // --- USER HAS WON! ---
                const prizeDesc = hasClaimedFirst ? currentBusinessData.loyaltyStandardReward : currentBusinessData.loyaltyFirstReward;
                const userProfileSnap = await userProfileRef.once('value');
                const username = userProfileSnap.val()?.username || 'Valued Customer';

                // ========================================================
                // ===== THIS IS THE CORRECTED ORDER OF OPERATIONS ======
                // ========================================================
                
                // 1. Create the new win record FIRST.
                const newWinRef = db.ref('loyalty_wins').push();
                await newWinRef.set({
                    userId: userIdToStamp,
                    businessId: currentBusinessId,
                    username: username,
                    claimedAt: firebase.database.ServerValue.TIMESTAMP,
                    prizeDescription: prizeDesc
                });

                // 2. Now that newWinRef exists, we can use its key to build the URL.
                const prizeUrl = `../wins/loyalty-card.html?id=${newWinRef.key}`;
                
                // 3. Notify the cashier with the correct URL.
                prompt(
                    `SUCCESS! ${username} just won a prize!`,
                    `You can share this link with them: ${window.location.origin}${prizeUrl.substring(2)}`
                );

                // 4. Finally, reset the user's card.
                await userLoyaltyCardRef.set({
                    stampCount: 0,
                    hasClaimedFirstReward: true
                });
                
                showFormMessage(manualStampStatus, `Stamp granted. ${username} won a prize!`, 'success');

            } else {
                showFormMessage(manualStampStatus, "Stamp granted successfully!", 'success');
            }
            manualStampForm.reset();
        } else {
            throw new Error("Transaction aborted. Could not grant stamp.");
        }
    } catch (error) {
        console.error("Error granting manual stamp:", error);
        showFormMessage(manualStampStatus, `Error: ${error.message}`, 'error');
    } finally {
        grantStampBtn.disabled = false;
    }
}
// --- Analytics Functions ---
async function fetchAndDisplayAnalytics() {
    if (!currentBusinessId) {
        if (noAnalyticsDataEl) noAnalyticsDataEl.style.display = 'block';
        if (analyticsChartsContainerEl) analyticsChartsContainerEl.style.display = 'none';
        return;
    }
    if (noAnalyticsDataEl) noAnalyticsDataEl.style.display = 'none';
    if (analyticsChartsContainerEl) analyticsChartsContainerEl.style.display = 'none';
    const elementsToLoad = [analyticsTotalReviewsEl, analyticsAvgRatingEl, analyticsAvgFoodRatingEl, analyticsAvgServiceRatingEl, analyticsAvgEnvRatingEl, analyticsAvgPriceRatingEl, analyticsAvgDeliveryTimeEl];
    elementsToLoad.forEach(el => { if (el) el.textContent = "Loading..."; });
    try {
        const reviewsSnapshot = await db.ref('reviews').orderByChild('businessId').equalTo(currentBusinessId).once('value');
        if (!reviewsSnapshot.exists() || reviewsSnapshot.numChildren() === 0) {
            if (noAnalyticsDataEl) noAnalyticsDataEl.style.display = 'block';
            if (analyticsTotalReviewsEl) analyticsTotalReviewsEl.textContent = "0";
            elementsToLoad.slice(1).forEach(el => { if (el) el.textContent = "N/A"; });
            destroyCharts();
            return;
        }
        const reviews = [];
        reviewsSnapshot.forEach(childSnapshot => reviews.push(childSnapshot.val()));
        calculateAndPopulateAnalytics(reviews);
    } catch (error) {
        console.error("Error fetching reviews for analytics:", error);
        if (noAnalyticsDataEl) {
            noAnalyticsDataEl.innerHTML = `<p>Error loading analytics: ${error.message}</p>`;
            noAnalyticsDataEl.style.display = 'block';
        }
        elementsToLoad.forEach(el => { if (el) el.textContent = "Error"; });
        destroyCharts();
    }
}
function calculateAndPopulateAnalytics(reviews) {
    if (!reviews || reviews.length === 0) {
        if (analyticsTotalReviewsEl) analyticsTotalReviewsEl.textContent = "0";
        const naElements = [analyticsAvgRatingEl, analyticsAvgFoodRatingEl, analyticsAvgServiceRatingEl, analyticsAvgEnvRatingEl, analyticsAvgPriceRatingEl, analyticsAvgDeliveryTimeEl];
        naElements.forEach(el => { if (el) el.textContent = "N/A"; });
        if (noAnalyticsDataEl) noAnalyticsDataEl.style.display = 'block';
        destroyCharts();
        return;
    }
    if (noAnalyticsDataEl) noAnalyticsDataEl.style.display = 'none';
    let validReviews = reviews.filter(r => r.status === true || r.status === undefined);
    let totalValidReviews = 0, sumRating = 0, countRating = 0, sumFoodRating = 0, countFoodRating = 0, sumServiceRating = 0, countServiceRating = 0, sumEnvRating = 0, countEnvRating = 0, sumPriceRating = 0, countPriceRating = 0, sumDeliveryTime = 0, countDeliveryTime = 0;
    const overallRatingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    validReviews.forEach(review => {
        totalValidReviews++;
        if (typeof review.rating === 'number') { sumRating += review.rating; countRating++; if (overallRatingCounts.hasOwnProperty(Math.round(review.rating))) overallRatingCounts[Math.round(review.rating)]++; }
        if (typeof review.ratingFood === 'number') { sumFoodRating += review.ratingFood; countFoodRating++; }
        if (typeof review.ratingService === 'number') { sumServiceRating += review.ratingService; countServiceRating++; }
        if (typeof review.ratingEnvironment === 'number') { sumEnvRating += review.ratingEnvironment; countEnvRating++; }
        if (typeof review.ratingPrice === 'number') { sumPriceRating += review.ratingPrice; countPriceRating++; }
        if (typeof review.deliveryTime === 'number') { sumDeliveryTime += review.deliveryTime; countDeliveryTime++; }
    });
    const formatAvg = (sum, count) => count > 0 ? (sum / count).toFixed(1) : "N/A";
    if (analyticsTotalReviewsEl) analyticsTotalReviewsEl.textContent = totalValidReviews;
    if (analyticsAvgRatingEl) analyticsAvgRatingEl.textContent = formatAvg(sumRating, countRating);
    if (analyticsAvgFoodRatingEl) analyticsAvgFoodRatingEl.textContent = formatAvg(sumFoodRating, countFoodRating);
    if (analyticsAvgServiceRatingEl) analyticsAvgServiceRatingEl.textContent = formatAvg(sumServiceRating, countServiceRating);
    if (analyticsAvgEnvRatingEl) analyticsAvgEnvRatingEl.textContent = formatAvg(sumEnvRating, countEnvRating);
    if (analyticsAvgPriceRatingEl) analyticsAvgPriceRatingEl.textContent = formatAvg(sumPriceRating, countPriceRating);
    if (analyticsAvgDeliveryTimeEl) analyticsAvgDeliveryTimeEl.textContent = formatAvg(sumDeliveryTime, countDeliveryTime);
    if (totalValidReviews > 0) {
        if (analyticsChartsContainerEl) analyticsChartsContainerEl.style.display = 'grid';
        const avgFood = countFoodRating > 0 ? (sumFoodRating / countFoodRating) : 0;
        const avgService = countServiceRating > 0 ? (sumServiceRating / countServiceRating) : 0;
        const avgEnv = countEnvRating > 0 ? (sumEnvRating / countEnvRating) : 0;
        const avgPrice = countPriceRating > 0 ? (sumPriceRating / countPriceRating) : 0;
        createAverageRatingsChart({ avgFood, avgService, avgEnv, avgPrice });
        createOverallRatingDistributionChart(overallRatingCounts, countRating);
    } else {
        destroyCharts();
        if (noAnalyticsDataEl) noAnalyticsDataEl.style.display = 'block';
    }
}

function createOverallRatingDistributionChart(ratingCounts, totalOverallRatings) {
    if (overallRatingDistributionChartInstance) overallRatingDistributionChartInstance.destroy();
    if (!overallRatingDistributionChartCanvas) return;
    const ctx = overallRatingDistributionChartCanvas.getContext('2d');
    const hasData = totalOverallRatings > 0;
    if (overallRatingDistributionChartMessageEl) overallRatingDistributionChartMessageEl.style.display = hasData ? 'none' : 'block';
    if (overallRatingDistributionChartMessageEl) overallRatingDistributionChartMessageEl.textContent = hasData ? '' : 'Not enough data for overall rating distribution.';
    if (overallRatingDistributionChartCanvas) overallRatingDistributionChartCanvas.style.display = hasData ? 'block' : 'none';
    if (!hasData) return;
    overallRatingDistributionChartInstance = new Chart(ctx, { type: 'bar', data: { labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'], datasets: [{ label: '# of Reviews', data: [ratingCounts[1], ratingCounts[2], ratingCounts[3], ratingCounts[4], ratingCounts[5]], backgroundColor: 'rgba(153, 102, 255, 0.6)', borderColor: 'rgba(153, 102, 255, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { display: false } } } });
}
function createAverageRatingsChart(data) {
    if (averageRatingsChartInstance) averageRatingsChartInstance.destroy();
    if (!averageRatingsChartCanvas) return;
    const ctx = averageRatingsChartCanvas.getContext('2d');
    const { avgFood, avgService, avgEnv, avgPrice } = data;
    const subRatingsData = [avgFood, avgService, avgEnv, avgPrice];
    const hasData = subRatingsData.some(val => val > 0);
    if (averageRatingsChartMessageEl) averageRatingsChartMessageEl.style.display = hasData ? 'none' : 'block';
    if (averageRatingsChartMessageEl) averageRatingsChartMessageEl.textContent = hasData ? '' : 'Not enough data for sub-ratings chart.';
    if (averageRatingsChartCanvas) averageRatingsChartCanvas.style.display = hasData ? 'block' : 'none';
    if (!hasData) return;
    averageRatingsChartInstance = new Chart(ctx, { type: 'bar', data: { labels: ['Food', 'Service', 'Environment', 'Price'], datasets: [{ label: 'Average Rating (out of 5)', data: subRatingsData, backgroundColor: ['rgba(211, 35, 35, 0.6)', 'rgba(255, 159, 64, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(54, 162, 235, 0.6)'], borderColor: ['rgba(211, 35, 35, 1)', 'rgba(255, 159, 64, 1)', 'rgba(75, 192, 192, 1)', 'rgba(54, 162, 235, 1)'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, suggestedMax: 5, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } } });
}

function destroyCharts() {
    if (averageRatingsChartInstance) averageRatingsChartInstance.destroy();
    if (overallRatingDistributionChartInstance) overallRatingDistributionChartInstance.destroy();
    averageRatingsChartInstance = null;
    overallRatingDistributionChartInstance = null;
    if (averageRatingsChartCanvas) averageRatingsChartCanvas.style.display = 'none';
    if (averageRatingsChartMessageEl) { averageRatingsChartMessageEl.textContent = 'No data available for chart.'; averageRatingsChartMessageEl.style.display = 'block'; }
    if (overallRatingDistributionChartCanvas) overallRatingDistributionChartCanvas.style.display = 'none';
    if (overallRatingDistributionChartMessageEl) { overallRatingDistributionChartMessageEl.textContent = 'No data available for chart.'; overallRatingDistributionChartMessageEl.style.display = 'block'; }
}

// --- UI State & Helper Functions ---
function handleNavClick(e) {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href')?.substring(1);
    if (!targetId || !document.getElementById(targetId)) {
        showContentSection('overview');
        sidebarLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('.dashboard-sidebar a[href="#overview"]')?.classList.add('active');
        return;
    }
    sidebarLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`.dashboard-sidebar a[href="#${targetId}"]`)?.classList.add('active');
    showContentSection(targetId);
}

function showLoadingScreen() {
    if(loadingDashboard) loadingDashboard.style.display = 'flex';
    if(dashboardErrorContainer) dashboardErrorContainer.style.display = 'none';
    if(noBusinessAssociatedPrompt) noBusinessAssociatedPrompt.style.display = 'none';
    if(dashboardAppContent) dashboardAppContent.style.display = 'none';
}
function showErrorScreen(message) {
    if(loadingDashboard) loadingDashboard.style.display = 'none';
    if(dashboardErrorContainer && dashboardError) { dashboardError.textContent = message; dashboardErrorContainer.style.display = 'block'; }
    if(noBusinessAssociatedPrompt) noBusinessAssociatedPrompt.style.display = 'none';
    if(dashboardAppContent) dashboardAppContent.style.display = 'none';
}
function showAuthRequiredScreen() {
    if(loadingDashboard) loadingDashboard.style.display = 'none';
    if(dashboardErrorContainer) dashboardErrorContainer.style.display = 'none';
    if(noBusinessAssociatedPrompt) noBusinessAssociatedPrompt.style.display = 'none';
    if(dashboardAppContent) dashboardAppContent.style.display = 'none';
    console.log("Dashboard.js: Auth required. App content hidden.");
}
function showNoBusinessAssociatedScreen() {
    if(loadingDashboard) loadingDashboard.style.display = 'none';
    if(dashboardErrorContainer) dashboardErrorContainer.style.display = 'none';
    if(dashboardAppContent) dashboardAppContent.style.display = 'none';
    if (noBusinessAssociatedPrompt) {
        noBusinessAssociatedPrompt.style.display = 'block';
        if (noBusinessUserEmail && currentUser) noBusinessUserEmail.textContent = currentUser.email;
    }
}
function showAppContent() {
    if(loadingDashboard) loadingDashboard.style.display = 'none';
    if(dashboardErrorContainer) dashboardErrorContainer.style.display = 'none';
    if(noBusinessAssociatedPrompt) noBusinessAssociatedPrompt.style.display = 'none';
    if(dashboardAppContent) dashboardAppContent.style.display = 'flex';
}
function showContentSection(sectionId) {
    contentSections.forEach(section => {
        section.style.display = section.id === sectionId ? 'block' : 'none';
    });
}
function capitalizeFirstLetter(string) { if (!string) return ''; return string.charAt(0).toUpperCase() + string.slice(1); }
function showFormMessage(element, message, type = 'submitting') {
    if (!element) return;
    element.textContent = message;
    element.className = 'form-message';
    if (type === 'success') element.classList.add('success');
    else if (type === 'error') element.classList.add('error');
    else element.classList.add('submitting');
    element.style.display = 'block';
    if (type !== 'submitting') {
        setTimeout(() => {
            if (element.textContent === message) {
                element.style.display = 'none';
                element.textContent = '';
                element.className = 'form-message';
            }
        }, 4000);
    }
}
function showEditInfoStatus(message, isSuccess) {
    const type = isSuccess === true ? 'success' : (isSuccess === false ? 'error' : 'submitting');
    showFormMessage(editInfoStatus, message, type);
}
function resetDashboardUI() {
    showLoadingScreen();
    currentBusinessId = null; currentBusinessData = null;
    if (sidebarBusinessName) sidebarBusinessName.textContent = "Your Business";
    if (sidebarCurrentPlan) sidebarCurrentPlan.textContent = "Basic";
    if (editInfoForm) editInfoForm.reset();
    if (editBusinessPhotoPreview) { editBusinessPhotoPreview.src="#"; editBusinessPhotoPreview.style.display = 'none';}
    const analyticsElementsToReset = [analyticsTotalReviewsEl, analyticsAvgRatingEl, analyticsAvgFoodRatingEl, analyticsAvgServiceRatingEl, analyticsAvgEnvRatingEl, analyticsAvgPriceRatingEl, analyticsAvgDeliveryTimeEl];
    analyticsElementsToReset.forEach(el => { if (el) el.textContent = "Loading..."; });
    if (noAnalyticsDataEl) noAnalyticsDataEl.style.display = 'none';
    if (analyticsChartsContainerEl) analyticsChartsContainerEl.style.display = 'none';
    destroyCharts();
    contentSections.forEach(s => s.style.display = 'none');
}
async function handleToggleStreakProgram() {
    if (!currentBusinessId) return;
    const currentlyEnabled = currentBusinessData.streakChallengeEnabled === true;
    const wantToEnable = !currentlyEnabled;
    if (!wantToEnable && !confirm("Are you sure you want to disable the Weekly Streak Challenge?")) return;
    toggleStreakBtn.disabled = true;
    try {
        await db.ref(`businesses/${currentBusinessId}/streakChallengeEnabled`).set(wantToEnable);
        currentBusinessData.streakChallengeEnabled = wantToEnable;
        populateLoyaltySection(); // <--- CORRECTED FUNCTION CALL
    } catch (error) {
        alert("Failed to update the program status. Please try again.");
    } finally {
        toggleStreakBtn.disabled = false;
    }
}


