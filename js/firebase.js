// firebase.js: Handles all Firebase interactions.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAppData, getAuthState, setAuthState, setAppData, initializeAppState } from './state.js';
import { renderDashboard } from './ui.js';

let db;

export async function initializeFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyBz1r3idn-lJlPzol1V3QfBz_28iJvzbpg",
      authDomain: "options-odssey.firebaseapp.com",
      projectId: "options-odssey",
      storageBucket: "options-odssey.firebasestorage.app",
      messagingSenderId: "684769306457",
      appId: "1:684769306457:web:fa3beccbfd031decaf4e48",
      measurementId: "G-2FLCF4T2JQ"
    };

    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        db = getFirestore(app);
        setLogLevel('debug');
        
        onAuthStateChanged(auth, user => {
            const currentAuth = getAuthState();
            if (currentAuth.unsubscribe) currentAuth.unsubscribe();

            if (user) {
                let storedUserId = localStorage.getItem('optionsOdysseyUserId') || user.uid;
                localStorage.setItem('optionsOdysseyUserId', storedUserId);
                
                const unsubscribe = setupRealtimeListener(storedUserId);
                setAuthState({ isAuthReady: true, dataUserId: storedUserId, unsubscribe, hasInitialized: false });
            } else {
                setAuthState({ isAuthReady: false, dataUserId: null, unsubscribe: null });
            }
        });

        await signInAnonymously(auth);

    } catch (error) {
        console.error("Firebase initialization failed:", error);
        document.body.innerHTML = '<div class="text-center p-8 text-red-400">Failed to initialize.</div>';
    }
}

function setupRealtimeListener(userId) {
    const docRef = doc(db, 'options-odyssey-users', userId);

    return onSnapshot(docRef, (docSnap) => {
        const currentAuth = getAuthState();
        if (docSnap.exists()) {
            setAppData(docSnap.data());
            setAuthState({ hasInitialized: true });
            renderDashboard();
        } else if (!currentAuth.hasInitialized) {
            setAuthState({ hasInitialized: true });
            const localData = localStorage.getItem('optionsOdysseyData');
            if (localData) {
                try {
                    setAppData(JSON.parse(localData));
                    localStorage.removeItem('optionsOdysseyData');
                    saveState();
                } catch (e) {
                    initializeAppState();
                    saveState();
                }
            } else {
                initializeAppState();
                saveState();
            }
        }
    }, (error) => {
        console.error("Firestore listener error:", error);
    });
}

export async function saveState() {
    const { isAuthReady, dataUserId } = getAuthState();
    if (!isAuthReady || !dataUserId) {
        console.warn("Auth not ready. Cannot save state.");
        return;
    }
    
    const docRef = doc(db, 'options-odyssey-users', dataUserId);
    try {
        await setDoc(docRef, getAppData(), { merge: true });
    } catch (error) {
        console.error("Error saving state to Firestore:", error);
    }
}
