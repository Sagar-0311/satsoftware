// src/dataService.js

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import CryptoJS from "https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/+esm"; // CDN से CryptoJS ESM import
import { db } from "./firebase.js";

const COLLECTION = "kanbanCards";
const SECRET = "YOUR_SECRET_KEY"; // प्रोडक्शन में इसे env में रखें

export async function saveCard(card) {
  const cipher = CryptoJS.AES.encrypt(JSON.stringify(card), SECRET).toString();
  await addDoc(collection(db, COLLECTION), { data: cipher });
}

export async function fetchAllCards() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(d => {
    const bytes = CryptoJS.AES.decrypt(d.data().data, SECRET);
    return { id: d.id, ...JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) };
  });
}

export async function updateCard(id, card) {
  const cipher = CryptoJS.AES.encrypt(JSON.stringify(card), SECRET).toString();
  await updateDoc(doc(db, COLLECTION, id), { data: cipher });
}

export async function deleteCard(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
