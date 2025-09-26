// ../js/auth.js (Adapted for Business Dashboard Modals & Header)

import { auth, db } from "../firebase-config/indexfirebaseConfig.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Auth.js for Dashboard: DOM loaded. Setting up Auth.");

    // --- Dashboard Specific Auth DOM Elements (Targeting `dashboard-` prefixed IDs) ---
    const authContainerPlaceholder = document.getElementById('auth-container-placeholder');
    const dashboardUserLoggedInDiv = document.getElementById('dashboard-user-logged-in');
    const dashboardUserLoggedOutDiv = document.getElementById('dashboard-user-logged-out');
    const dashboardUserEmailSpan = document.getElementById('dashboard-user-email-display');

    const showLoginModalButton = document.getElementById('dashboard-show-login-modal-button');
    const showSignupModalButton = document.getElementById('dashboard-show-signup-modal-button');

    const loginModal = document.getElementById('dashboard-login-modal');
    const loginForm = document.getElementById('dashboard-login-form');
    const loginEmailInput = document.getElementById('dashboard-login-email');
    const loginPasswordInput = document.getElementById('dashboard-login-password');
    const loginErrorP = document.getElementById('dashboard-login-error');
    const loginSubmitButton = document.getElementById('dashboard-login-submit-button');
    const forgotPasswordLink = document.getElementById('dashboard-forgot-password-link');

    const signupModal = document.getElementById('dashboard-signup-modal');
    const signupForm = document.getElementById('dashboard-signup-form');
    const signupUsernameInput = document.getElementById('dashboard-signup-username');
    const signupEmailInput = document.getElementById('dashboard-signup-email');
    const signupPasswordInput = document.getElementById('dashboard-signup-password');
    const signupErrorP = document.getElementById('dashboard-signup-error');
    const signupSubmitButton = document.getElementById('dashboard-signup-submit-button');

    const forgotPasswordModal = document.getElementById('dashboard-forgot-password-modal');
    const forgotPasswordForm = document.getElementById('dashboard-forgot-password-form');
    const forgotEmailInput = document.getElementById('dashboard-forgot-email');
    const forgotStatusP = document.getElementById('dashboard-forgot-status');
    const forgotSubmitButton = document.getElementById('dashboard-forgot-submit-button');

    const authModalCloseButtons = document.querySelectorAll('.auth-modal-close-button');

    // Check if essential modal triggers exist
    if (!showLoginModalButton) console.warn("Dashboard Auth: Login show button not found.");
    if (!showSignupModalButton) console.warn("Dashboard Auth: Signup show button not found.");


    // --- Auth State Listener (for header UI update primarily) ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Auth.js (Dashboard): User logged in - ", user.displayName || user.email);
            if (dashboardUserEmailSpan) dashboardUserEmailSpan.textContent = user.displayName || user.email;
            if (dashboardUserLoggedInDiv) dashboardUserLoggedInDiv.style.display = 'flex';
            if (dashboardUserLoggedOutDiv) dashboardUserLoggedOutDiv.style.display = 'none';
            hideAllAuthModals();
        } else {
            console.log("Auth.js (Dashboard): User logged out");
            if (dashboardUserLoggedInDiv) dashboardUserLoggedInDiv.style.display = 'none';
            if (dashboardUserLoggedOutDiv) dashboardUserLoggedOutDiv.style.display = 'flex';
            if (dashboardUserEmailSpan) dashboardUserEmailSpan.textContent = '';
        }
    });

    // --- Modal Control ---
    function hideAllAuthModals() {
        if (loginModal) loginModal.style.display = 'none';
        if (signupModal) signupModal.style.display = 'none';
        if (forgotPasswordModal) forgotPasswordModal.style.display = 'none';
        if (loginErrorP) loginErrorP.textContent = '';
        if (signupErrorP) signupErrorP.textContent = '';
        if (forgotStatusP) { forgotStatusP.textContent = ''; forgotStatusP.className = 'form-message'; }
    }

    authModalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId;
            if (modalId) {
                const modalToClose = document.getElementById(modalId);
                if (modalToClose) modalToClose.style.display = 'none';
            }
        });
    });

    if (showLoginModalButton && loginModal) {
        showLoginModalButton.addEventListener('click', () => {
            hideAllAuthModals();
            loginModal.style.display = 'flex';
            if (loginForm) loginForm.reset();
            if (loginEmailInput) loginEmailInput.focus();
        });
    }
    if (showSignupModalButton && signupModal) {
        showSignupModalButton.addEventListener('click', () => {
            hideAllAuthModals();
            signupModal.style.display = 'flex';
            if (signupForm) signupForm.reset();
            if (signupEmailInput) signupEmailInput.focus();
        });
    }
    if (forgotPasswordLink && forgotPasswordModal && loginModal) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllAuthModals();
            forgotPasswordModal.style.display = 'flex';
            if (forgotPasswordForm) forgotPasswordForm.reset();
            if (forgotEmailInput) forgotEmailInput.focus();
        });
    }

    // --- Form Submissions ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            if (loginErrorP) loginErrorP.textContent = '';
            if (loginSubmitButton) { loginSubmitButton.disabled = true; loginSubmitButton.textContent = "Logging in...";}

            try {
                await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                await auth.signInWithEmailAndPassword(email, password);
                // onAuthStateChanged will close modal and update UI
            } catch (error) {
                console.error("Dashboard Login Error:", error.code, error.message);
                if (loginErrorP) loginErrorP.textContent = error.message.replace('Firebase: ','');
            } finally {
                if (loginSubmitButton) { loginSubmitButton.disabled = false; loginSubmitButton.textContent = "Login"; }
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = signupUsernameInput.value.trim();
            const email = signupEmailInput.value;
            const password = signupPasswordInput.value;

            if (password.length < 6) {
                if(signupErrorP) signupErrorP.textContent = "Password must be at least 6 characters.";
                return;
            }
            if (signupErrorP) signupErrorP.textContent = '';
            if (signupSubmitButton) { signupSubmitButton.disabled = true; signupSubmitButton.textContent = "Signing up...";}

            try {
                await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const newUser = userCredential.user;
                
                const displayName = username || `User-${newUser.uid.substring(0,5)}`;
                await newUser.updateProfile({ displayName: displayName });

                const userProfileRef = db.ref('userProfiles/' + newUser.uid); // Ensure this path is correct
                await userProfileRef.set({
                    username: displayName,
                    email: newUser.email,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                // onAuthStateChanged will close modal and update UI
            } catch (error) {
                console.error("Dashboard Signup Error:", error.code, error.message);
                if (signupErrorP) signupErrorP.textContent = error.message.replace('Firebase: ','');
            } finally {
                if (signupSubmitButton) { signupSubmitButton.disabled = false; signupSubmitButton.textContent = "Sign Up"; }
            }
        });
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = forgotEmailInput.value;
            if (!email) {
                if(forgotStatusP) { forgotStatusP.textContent = "Please enter your email."; forgotStatusP.className = 'form-message error';}
                return;
            }
            if (forgotStatusP) { forgotStatusP.textContent = 'Sending link...'; forgotStatusP.className = 'form-message';}
            if (forgotSubmitButton) forgotSubmitButton.disabled = true;

            try {
                await auth.sendPasswordResetEmail(email);
                if(forgotStatusP) { forgotStatusP.textContent = 'Password reset email sent! Check your inbox.'; forgotStatusP.className = 'form-message success';}
            } catch (error) {
                if(forgotStatusP) { forgotStatusP.textContent = error.message.replace('Firebase: ',''); forgotStatusP.className = 'form-message error';}
            } finally {
                if (forgotSubmitButton) forgotSubmitButton.disabled = false;
            }
        });
    }
    console.log("Auth.js (Dashboard): Event Listeners for Modals setup complete.");
});