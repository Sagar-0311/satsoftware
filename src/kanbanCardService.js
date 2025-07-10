// src/kanbanService.js
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from "./firebase.js";


const COLLECTION = "kanbanCards";

export async function fetchAllCards() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveCard(card) {
  await addDoc(collection(db, COLLECTION), card);
}

export async function updateCard(id, card) {
  await updateDoc(doc(db, COLLECTION, id), card);
}

export async function deleteCard(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
