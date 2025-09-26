// firebase-config/indexfirebaseConfig.js

// Use the compat libraries to initialize
// Ensure these SDKs are loaded in index.html *before* this script

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDWFhqEejBa7mnxZxwuzOLocNoAd4toMVs",
  authDomain: "yelpsomaliav1.firebaseapp.com",
  databaseURL: "https://yelpsomaliav1-default-rtdb.firebaseio.com",
  projectId: "yelpsomaliav1",
  storageBucket: "yelpsomaliav1.firebasestorage.app",
  messagingSenderId: "419406893306",
  appId: "1:419406893306:web:636a0e028da5a973f9f943",
  measurementId: "G-96CGLR7TJH"
};

// Initialize Firebase using the compat libraries
firebase.initializeApp(firebaseConfig);

// Get the Auth and Database services using the compat namespace
const auth = firebase.auth(); // Compat version
const db = firebase.database(); // Compat version

// Export the initialized services for other modules to use
export { auth, db };

// --- DO NOT export specific functions like browserLocalPersistence from here ---
// --- Other modules will import those directly from the compat SDKs if needed ---

console.log("Firebase Initialized (Compat Mode)"); // Debug log