// src/userService.js

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from "./firebase.js";

const COLLECTION = "users";

export async function fetchAllUsers() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveUser(user) {
  if (user.id) {
    // update
    const userRef = doc(db, COLLECTION, user.id);
    await updateDoc(userRef, { name: user.name, username: user.username, password: user.password });
  } else {
    // add
    await addDoc(collection(db, COLLECTION), { name: user.name, username: user.username, password: user.password });
  }
}

export async function deleteUserById(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
