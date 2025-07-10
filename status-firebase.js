import { db } from './src/firebase.js';
import { collection, getDocs, doc, updateDoc, query, where, getDocs as getDocs2 } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const COLUMNS = [
  "cardNumber", "partNo", "itemName", "binQty", "card", "cardLeadTime",
  "machine", "workingHours", "status", "productionOrder", "startDate", "startTime", "endDate", "endTime",
  "at10am", "rk1", "at1f", "rk2", "at04", "rk3", "at07", "rk4", "at10", "rk5", "at01", "rk6", "at04b", "rk1b", "at07b", "rk1c"
];

const tableBody = document.querySelector('#statusTable tbody');
const machineSelect = document.getElementById('machineSelect');
const searchInputs = Array.from(document.querySelectorAll('#statusTable thead tr:nth-child(2) input'));
const modalClearBtn = document.getElementById('modalClearBtn');

let allRows = []; // All data from Firebase
let filteredRows = []; // Machine filtered + search filtered

async function loadTableData() {
  const querySnapshot = await getDocs(collection(db, "frozenPlans"));
  allRows = [];
  querySnapshot.forEach((doc) => {
    allRows.push(doc.data());
  });
  filterAndRender();
}

function filterAndRender() {
  // 1. Filter by machine dropdown
  let rows = allRows;
  const selectedMachine = machineSelect.value;
  if (selectedMachine && selectedMachine !== "ALL") {
    rows = rows.filter(row => (row.machine || '').toUpperCase() === selectedMachine.toUpperCase());
  }
  // 2. Filter by search inputs
  searchInputs.forEach((input, idx) => {
    const value = input.value.trim().toLowerCase();
    if (value !== "") {
      const colName = COLUMNS[idx];
      if (idx === 0) {
        // Card Number: exact match only
        rows = rows.filter(row =>
          ((row[colName] || "") + "").toLowerCase() === value
        );
      } else {
        // Others: partial match
        rows = rows.filter(row =>
          ((row[colName] || "") + "").toLowerCase().includes(value)
        );
      }
    }
  });
  filteredRows = rows;
  renderTable(filteredRows);
}


// Call this whenever filter changes
function renderTable(dataRows) {
  const sortedRows = sortTableRows(dataRows);
  tableBody.innerHTML = "";
  sortedRows.forEach(data => {
    const row = document.createElement('tr');
    COLUMNS.forEach(col => {
      const td = document.createElement('td');
      td.textContent = (data[col] !== undefined && data[col] !== null) ? data[col] : "";
      row.appendChild(td);
    });
    // Attach double-click event for popup
    row.addEventListener('dblclick', () => openModal(data));
    tableBody.appendChild(row);
  });
}

// --- SORT LOGIC (unchanged) ---
function sortTableRows(rows) {
  return rows.slice().sort((a, b) => {
    // 1. MACHINE
    const machA = (a.machine || '').toUpperCase();
    const machB = (b.machine || '').toUpperCase();
    if (machA < machB) return -1;
    if (machA > machB) return 1;
    // 2. START DATE
    const dateA = normalizeDate(a.startDate);
    const dateB = normalizeDate(b.startDate);
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    // 3. START TIME
    const timeA = normalizeTime(a.startTime);
    const timeB = normalizeTime(b.startTime);
    if (timeA < timeB) return -1;
    if (timeA > timeB) return 1;
    return 0;
  });
}
function normalizeDate(dateStr) {
  if (!dateStr) return new Date(0);
  let d;
  if (dateStr.includes('/')) {
    const [d1, m1, y1] = dateStr.split('/');
    d = new Date(`${y1}-${m1}-${d1}`);
  } else if (dateStr.includes('-')) {
    d = new Date(dateStr);
  } else {
    d = new Date(dateStr);
  }
  return isNaN(d) ? new Date(0) : d;
}
function normalizeTime(timeStr) {
  if (!timeStr) return 0;
  let h = 0, m = 0;
  const pm = /PM/i.test(timeStr);
  const match = timeStr.match(/(\d+):(\d+)/);
  if (match) {
    h = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  return h * 60 + m;
}

// ---- EVENTS: search + dropdown ----
machineSelect.addEventListener('change', filterAndRender);
searchInputs.forEach(input => input.addEventListener('input', filterAndRender));

// For legacy support (onkeyup in HTML):
window.searchColumn = filterAndRender;

window.addEventListener('DOMContentLoaded', loadTableData);
// ==== MODAL elements ====
const modal = document.getElementById('editModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalCardNo = document.getElementById('modalCardNo');
const modalPartNo = document.getElementById('modalPartNo');
const modalItemName = document.getElementById('modalItemName');
const modalBinQty = document.getElementById('modalBinQty');
const modalMachine = document.getElementById('modalMachine');
const modalTimeField = document.getElementById('modalTimeField');
const modalQty = document.getElementById('modalQty');
const modalTag = document.getElementById('modalTag');
const modalUpdateBtn = document.getElementById('modalUpdateBtn');

let modalCurrentRow = null;
let modalDocId = null;

// Modal open logic
async function openModal(row) {
  modalCurrentRow = row;
  modalDocId = null;

  modalCardNo.textContent = row.cardNumber || '';
  modalPartNo.textContent = row.partNo || '';
  modalItemName.textContent = row.itemName || '';
  modalBinQty.textContent = row.binQty || '';
  modalMachine.textContent = row.machine || '';

  modalTimeField.value = '';
  modalQty.value = '';
  modalTag.value = '';
  modalQty.disabled = true;
  modalTag.disabled = true;
  modalUpdateBtn.disabled = true;
  modal.style.display = 'flex';
}

modalTimeField.addEventListener('change', function() {
  if (modalTimeField.value) {
    modalQty.disabled = false;
    modalTag.disabled = false;
    modalUpdateBtn.disabled = false;
    modalClearBtn.disabled = false;   // <<== add this line

    // ---- autofill code yaha hai ----
    const qtyFieldKey = modalTimeField.value; // e.g. "at04"
    const rkFieldKey = rkFieldMap[qtyFieldKey] || "";

    modalQty.value = '';
    modalTag.value = '';

    if (modalCurrentRow) {
      if (modalCurrentRow[qtyFieldKey] !== undefined && modalCurrentRow[qtyFieldKey] !== null) {
        modalQty.value = modalCurrentRow[qtyFieldKey];
      }
      if (rkFieldKey && modalCurrentRow[rkFieldKey] !== undefined && modalCurrentRow[rkFieldKey] !== null) {
        modalTag.value = modalCurrentRow[rkFieldKey];
      }
    }
    // ---- End autofill ----

  } else {
    modalQty.disabled = true;
    modalTag.disabled = true;
    modalUpdateBtn.disabled = true;
    modalClearBtn.disabled = true; // <<== add this line
    modalQty.value = '';
    modalTag.value = '';
  }
});


modalTag.addEventListener('input', function() {
  this.value = this.value.toUpperCase();
});

closeModalBtn.onclick = () => { modal.style.display = 'none'; };
modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

// Firestore update logic
modalUpdateBtn.onclick = async function() {
  const fieldKey = modalTimeField.value;
  const rkField = rkFieldMap[fieldKey] || "";
  const qty = modalQty.value;
  const tag = modalTag.value;

  if (!fieldKey || qty === "" || tag === "") {
    alert("All fields required!");
    return;
  }

  // Find Firestore document by cardNumber
const q = query(collection(db, "frozenPlans"), where("cardNumber", "==", modalCurrentRow.cardNumber));
const docsnap = await getDocs(q);
let docId = null;
docsnap.forEach(doc => { docId = doc.id; });

  if (!docId) {
    alert("Card not found in database!");
    return;
  }
  // Build update object
  let updateObj = {};
  updateObj[fieldKey] = qty;
  if (rkField) updateObj[rkField] = tag;

  // Update Firestore
  await updateDoc(doc(collection(db, "frozenPlans"), docId), updateObj);

  // Update data in UI (in-memory)
  modalCurrentRow[fieldKey] = qty;
  if (rkField) modalCurrentRow[rkField] = tag;

  // Refresh table, close modal
  filterAndRender();
  modal.style.display = 'none';
};

// Map time field key to RK column
const rkFieldMap = {
  "at10am": "rk1",
  "at1f": "rk2",
  "at04": "rk3",
  "at07": "rk4",
  "at10": "rk5",
  "at01": "rk6",
  "at04b": "rk1b",
  "at07b": "rk1c"
};
modalClearBtn.onclick = async function() {
  const fieldKey = modalTimeField.value;
  const rkField = rkFieldMap[fieldKey] || "";
  if (!fieldKey) return;

  // Firestore se bhi clear karna hai
  const q = query(collection(db, "frozenPlans"), where("cardNumber", "==", modalCurrentRow.cardNumber));
  const docsnap = await getDocs(q);
  let docId = null;
  docsnap.forEach(doc => { docId = doc.id; });
  if (!docId) {
    alert("Card not found in database!");
    return;
  }

  let updateObj = {};
  updateObj[fieldKey] = ""; // blank
  if (rkField) updateObj[rkField] = "";

  await updateDoc(doc(collection(db, "frozenPlans"), docId), updateObj);

  // UI me bhi blank karo
  modalCurrentRow[fieldKey] = "";
  if (rkField) modalCurrentRow[rkField] = "";

  // Fields clear karo, table refresh karo
  modalQty.value = '';
  modalTag.value = '';
  filterAndRender();
};
