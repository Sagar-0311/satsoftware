// src/trackingService.js
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase"; // apni firebase config वाली फाइल import

const COLLECTION = "trackingCards"; // या "kanbanTracking" जैसा आपको पसंद हो

export async function fetchAllTracking() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveTracking(card) {
  await addDoc(collection(db, COLLECTION), card);
}

export async function updateTracking(id, card) {
  await updateDoc(doc(db, COLLECTION, id), card);
}

export async function deleteTracking(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
