// src/firebase.js

// 1) Core SDK और Firestore इम्पोर्ट
// src/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// बाकी code same...


// 2) आपका कॉन्फ़िग (इसीमें वो API key वगैरह)। पहले से कॉपी किया हुआ:

};

// 3) Firebase इनिशियलाइज़
const app = initializeApp(firebaseConfig);

// 4) Firestore इंस्टैंस बनाएं और एक्सपोर्ट करें
const db = getFirestore(app);

// 5) बाहर से इस्तेमाल के लिए एक्सपोर्ट
export { db };
