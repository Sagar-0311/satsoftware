// tracking-firebase.js
import { db } from './src/firebase.js';  // path adjust karo agar zarurat ho
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Global Variables ---
let cardDataList = [];
let selectedRowIndex = null;
let selectedDocId = null;
let currentPage = 1;
const rowsPerPage = 15;
let filteredData = []; // For search/filter/pagination

// --- MACHINE DROPDOWN (unchanged) ---
const machineList = [
  "WLD ST-1", "WLD ST-2", "WLD ST-3", "WLD ST-4", "WLD ST-5", "WLD ST-6", "ROBOT",
  "LATHE-1", "LATHE-2", "LATHE-3", "CNC-1", "CNC-2",
  "BANDSAW-1", "BANDSAW-2", "BANDSAW-3", "LASER CUTTING",
  "DRILL-1", "DRILL-2", "MILLING", "DIAMOND CUTTER"
];

function populateDropdown(dropdownId, optionsArr) {
  const dropdown = document.getElementById(dropdownId);
  dropdown.innerHTML = '<option value="">-- SELECT MACHINE --</option>';
  optionsArr.forEach(opt => {
    dropdown.innerHTML += `<option value="${opt}">${opt}</option>`;
  });
}

// --- FORMAT DATE ---
function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
  }
  return dateStr;
}

function convertToInputDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return dateStr;
}

// --- TOAST ---
function showToast(message) {
  const toast = document.getElementById("toast");
  const msgSpan = document.getElementById("toast-message");
  const okBtn = document.getElementById("toast-ok");
  msgSpan.textContent = message;
  toast.style.display = "block";
  okBtn.focus();
  okBtn.onclick = () => {
    toast.style.display = "none";
  };
}



// --- TABLE RENDER ---
function renderTrackingTable(page = 1, dataArr = filteredData.length ? filteredData : cardDataList) {
  const tbody = document.getElementById("trackingTableBody");
  tbody.innerHTML = "";
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedData = dataArr.slice(start, end);

  paginatedData.forEach((d, idx) => {
    const row = document.createElement("tr");
    row.setAttribute("data-card-number", d.cardNumber); // <<-- Add this line
    row.innerHTML = `
      <td>${start + idx + 1}</td>
      <td>${d.cardNumber || ""}</td>
      <td>${d.partNo || ""}</td>
      <td>${d.itemName || ""}</td>
      <td>${d.location || ""}</td>
      <td>${d.binQty || ""}</td>
      <td>${d.card || ""}</td>
      <td>${d.boardName || ""}</td>
      <td>${d.machine || ""}</td>
      <td>${d.status || ""}</td>
      <td>${formatDateDMY(d.receivedDate) || ""}</td>
      <td>${formatDateDMY(d.cardEDC) || ""}</td>
      <td>${formatDateDMY(d.dispatchDate) || ""}</td>
      <td>${d.productionOrder || ""}</td>
    `;
     row.ondblclick = () => fillFormFromRow(row); // <<-- Update, index mat bhejo
     tbody.appendChild(row);
  });

  renderPaginationControls((dataArr || []).length, page);
  setTimeout(() => { toggleDispatchedFilter(); }, 100);
}
function renderPaginationControls(totalRows, page) {
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const container = document.getElementById('pagination');
  container.innerHTML = '';

  if (totalPages <= 1) return;

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = page === 1;
  prevBtn.onclick = () => { gotoPage(page - 1); };
  container.appendChild(prevBtn);

  // Page numbers
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, page + 2);
  if (startPage > 1) {
  let btn = document.createElement('button');
  btn.textContent = 1;
  btn.onclick = () => gotoPage(1);
  container.appendChild(btn);
  if (startPage > 2) {
    let span = document.createElement('span');
    span.style.margin = '0 2px';
    span.textContent = '...';
    container.appendChild(span);
  }
}
for (let i = startPage; i <= endPage; i++) {
  let btn = document.createElement('button');
  btn.textContent = i;
  if (i === page) btn.style.fontWeight = 'bold';
  btn.onclick = () => gotoPage(i);
  container.appendChild(btn);
}
if (endPage < totalPages) {
  if (endPage < totalPages - 1) {
    let span = document.createElement('span');
    span.style.margin = '0 2px';
    span.textContent = '...';
    container.appendChild(span);
  }
  let btn = document.createElement('button');
  btn.textContent = totalPages;
  btn.onclick = () => gotoPage(totalPages);
  container.appendChild(btn);
}


  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.disabled = page === totalPages;
  nextBtn.onclick = () => { gotoPage(page + 1); };
  container.appendChild(nextBtn);
}

// --- PAGINATION WINDOW FUNCTION ---
window.gotoPage = function(page) {
  const dataArr = filteredData.length ? filteredData : cardDataList;
  const totalPages = Math.ceil(dataArr.length / rowsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTrackingTable(page, dataArr);
};


// --- FILTER SHOW DISPATCHED ---
function toggleDispatchedFilter() {
  const showDispatched = document.getElementById("showDispatched").checked;
  const rows = document.querySelectorAll("#trackingTableBody tr");
  rows.forEach(row => {
    const statusCell = row.children[9];
    if (!statusCell) return;
    const statusValue = statusCell.textContent.trim().toUpperCase();
    if (showDispatched) {
      row.style.display = statusValue === "DISPATCHED" ? "" : "none";
    } else {
      row.style.display = statusValue === "DISPATCHED" ? "none" : "";
    }
  });
}
window.toggleDispatchedFilter = toggleDispatchedFilter;


// --- SEARCH (per column) ---
window.searchColumn = function() {
  const inputs = document.querySelectorAll("thead input");
  const filters = Array.from(inputs).map(input => input.value.trim().toLowerCase());
  const showDispatched = document.getElementById("showDispatched")?.checked;
  filteredData = cardDataList.filter((card, index) => {
    let show = true;
    filters.forEach((filter, colIndex) => {
      if (filter) {
        const values = [
          "", // SR NO: table index, skip for filter
          (card.cardNumber || '').toString().toLowerCase(),
          (card.partNo || '').toLowerCase(),
          (card.itemName || '').toLowerCase(),
          (card.location || '').toLowerCase(),
          (card.binQty || '').toString().toLowerCase(),
          (card.card || '').toLowerCase(),
          (card.boardName || '').toLowerCase(),
          (card.machine || '').toLowerCase(),
          (card.status || '').toLowerCase(),
          (card.receivedDate || '').toLowerCase(),
          (card.cardEDC || '').toLowerCase(),
          (card.dispatchDate || '').toLowerCase(),
          (card.productionOrder || '').toLowerCase()
        ];
        // Only Card No filter is exact
        if (colIndex === 1) {
          if (values[colIndex] !== filter) show = false;
        } else if (colIndex !== 0) {
          if (!values[colIndex].includes(filter)) show = false;
        }
        // colIndex 0 (SR NO) filter skip (or: implement as index+1 if needed)
      }
    });
    if (!showDispatched && card.status && card.status.toUpperCase() === "DISPATCHED") show = false;
    return show;
  });
  currentPage = 1;
  renderTrackingTable(currentPage, filteredData);
};




// --- TABLE SORTING (on column header click) ---
document.addEventListener("DOMContentLoaded", () => {
  const headers = document.querySelectorAll("#kanbanTable th");
  let sortStates = Array(headers.length).fill(true);
  headers.forEach((header, index) => {
    header.addEventListener("click", () => {
      const rows = Array.from(document.querySelectorAll("#trackingTableBody tr"));
      sortStates[index] = !sortStates[index];
      const ascending = sortStates[index];
      rows.sort((a, b) => {
        const aText = a.children[index]?.innerText || "";
        const bText = b.children[index]?.innerText || "";
        return ascending
          ? aText.localeCompare(bText, undefined, { numeric: true })
          : bText.localeCompare(aText, undefined, { numeric: true });
      });
      const body = document.getElementById("trackingTableBody");
      body.innerHTML = "";
      rows.forEach(row => body.appendChild(row));
    });
  });
});

// --- FIRESTORE CRUD ---
// Only trackingCards show in table
async function loadTable() {
  cardDataList = [];
  const q = collection(db, "trackingCards");
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data._docId = docSnap.id;
    cardDataList.push(data);
  });
  filteredData = []; // Reset filter
  currentPage = 1;
  renderTrackingTable(currentPage, cardDataList);
}

window.addCard = async () => {
  const cardNumber = parseInt(document.getElementById("cardNumber").value.trim());
  const status = document.getElementById("status").value;
  const receivedDate = document.getElementById("receivedDate").value;
  const cardEDC = document.getElementById("cardEDC").value;
  const dispatchDate = document.getElementById("dispatchDate").value;
  const productionOrder = document.getElementById("productionOrder").value;
  let machine = document.getElementById("machine").value;

  if (!cardNumber || !status || !receivedDate) {
    showToast("Please fill Card Number, Status and Received Date!");
    return;
  }
  const existCard = cardDataList.find(d => d.cardNumber == cardNumber && d.status !== "DISPATCHED");
  if (existCard) {
    showToast("This card already exists and its not DISPATCHED");
    return;
  }

  // --- Master data fetch from kanbanCards collection ---
  let masterData = {};
  const masterQuery = query(collection(db, "kanbanCards"), where("cardNumber", "==", cardNumber));
  const masterSnap = await getDocs(masterQuery);
  masterSnap.forEach((doc) => {
    masterData = doc.data();
  });
  if (!masterData || !masterData.cardNumber) {
    showToast("Card Number not found in Master Data!");
    return;
  }

  if (masterData.machine) machine = masterData.machine;
  if (status === "WIP" && document.getElementById("machine").value) {
    machine = document.getElementById("machine").value;
  }
  const serialNumber = (Math.max(0, ...cardDataList.map(d => d.serialNumber || 0)) + 1);

  const newCard = {
    serialNumber,
    cardNumber,
    partNo: masterData.partNo || "",
    itemName: masterData.itemName || "",
    location: masterData.location || "",
    binQty: masterData.binQty || "",
    card: masterData.card || "",
    boardName: masterData.boardName || "",
    machine: machine || "",
    status,
    receivedDate,
    cardEDC,
    dispatchDate,
    productionOrder
  };

  await addDoc(collection(db, "trackingCards"), newCard);
  showToast("Card Added Successfully");
  resetForm();
  await loadTable();
}

window.updateCard = async () => {
  if (!selectedDocId) {
      alert("Please double click a row to select it first.");
      return;
  }

  const status = document.getElementById("status").value;
  const receivedDate = document.getElementById("receivedDate").value;
  const cardEDC = document.getElementById("cardEDC").value;
  const dispatchDate = document.getElementById("dispatchDate").value;
  const productionOrder = document.getElementById("productionOrder").value;
  let machine = document.getElementById("machine").value;

  if (status === "DISPATCHED" && !dispatchDate) {
    showToast("Please enter DISPATCH DATE!");
    return;
  }

  if (status === "WIP" && document.getElementById("machine").value) {
    machine = document.getElementById("machine").value;
  }

  const docRef = doc(db, "trackingCards", selectedDocId);

  // --- यहीं से नई logic डालनी है ---
  // अगर status DISPATCHED है तो frozenPlans से card delete करना है
  if (status === "DISPATCHED") {
    // CardNumber field ले लो (form से या selectedDocId से)
    const cardNumber = document.getElementById("cardNumber").value.trim();

    // Firestore में frozenPlans collection में ये cardNumber ढूंढो
    const frozenPlansQuery = query(collection(db, "frozenPlans"), where("cardNumber", "==", Number(cardNumber)));
    const frozenPlansSnap = await getDocs(frozenPlansQuery);
    for (const planDoc of frozenPlansSnap.docs) {
      await deleteDoc(doc(db, "frozenPlans", planDoc.id));
      // Optional: showToast(`Deleted from frozenPlans: Card ${cardNumber}`);
    }
  }
  // --- नई logic खत्म ---

  await updateDoc(docRef, {
    status,
    receivedDate,
    cardEDC,
    dispatchDate,
    productionOrder,
    machine
  });

  showToast("Card Updated Successfully");
  selectedRowIndex = null;
  selectedDocId = null;
  resetForm();
  await loadTable();
}


window.deleteCard = async () => {
  if (!selectedDocId) {
      alert("Please double click a row to select it first.");
      return;
  }

  // Step 1: Generate OTP and send to backend
  showToast("Sending OTP to your registered email...");
  // (disable OK while sending)
  const okBtn = document.getElementById("toast-ok");
  okBtn.disabled = true;
  okBtn.style.opacity = 0.6;
  okBtn.style.cursor = "not-allowed";

  // Step 2: Call backend (serverless function or your API)
  // --------- START: OTP SEND -----------
  try {
      const otpRes = await fetch('https://sat-otp-server.onrender.com/send-otp', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "sagar@sunidhiagrotech.com" })
    });
    const data = await otpRes.json();
    if(data.success){
      serverOtp = data.otp; // or use token if you want (recommended)
      closeOtpModal(); // ensure no previous modal
      document.getElementById("otpModal").style.display = "flex";
      document.getElementById("otpInput").focus();
    } else {
      showToast("Failed to send OTP: " + (data.message || "Try again!"));
      okBtn.disabled = false;
      okBtn.style.opacity = 1;
      okBtn.style.cursor = "pointer";
      return;
    }
  } catch(e){
    showToast("Network error! Could not send OTP.");
    okBtn.disabled = false;
    okBtn.style.opacity = 1;
    okBtn.style.cursor = "pointer";
    return;
  }
  // --------- END: OTP SEND -----------

  okBtn.disabled = false;
  okBtn.style.opacity = 1;
  okBtn.style.cursor = "pointer";

  // Step 3: Handle OTP Verify & Final Delete
  document.getElementById("otpVerifyBtn").onclick = async function() {
    const userOtp = document.getElementById("otpInput").value.trim();
    document.getElementById("otpErr").textContent = "";
    if (!userOtp) {
      document.getElementById("otpErr").textContent = "Please enter OTP.";
      return;
    }
    // OPTIONAL: Use backend validation for best security!
    if (userOtp !== serverOtp) {
      document.getElementById("otpErr").textContent = "Invalid OTP. Please try again.";
      return;
    }
    // OTP Verified!
    closeOtpModal();

    // -- Proceed with delete as usual --
    const cardNumber = document.getElementById("cardNumber").value.trim();
    // 1. Delete from trackingCards
    const docRef = doc(db, "trackingCards", selectedDocId);
    await deleteDoc(docRef);

    // 2. Delete from frozenPlans (if exists)
    const frozenPlansQuery = query(collection(db, "frozenPlans"), where("cardNumber", "==", Number(cardNumber)));
    const frozenPlansSnap = await getDocs(frozenPlansQuery);
    for (const planDoc of frozenPlansSnap.docs) {
      await deleteDoc(doc(db, "frozenPlans", planDoc.id));
    }

    showToast("Card Deleted Successfully");
    selectedRowIndex = null;
    selectedDocId = null;
    resetForm();
    await loadTable();
  }
};


window.fillFormFromRow = function(row) {
  const cardNumber = row.getAttribute("data-card-number");
  // Find from filteredData (if active) or cardDataList
  let dataArr = (filteredData.length ? filteredData : cardDataList);
  const d = dataArr.find(cd => String(cd.cardNumber) === String(cardNumber));
  if (!d) return; // extra safety

  selectedDocId = d._docId || null;
  document.getElementById("cardNumber").value = d.cardNumber || "";
  document.getElementById("status").value = d.status || "";
  document.getElementById("receivedDate").value = convertToInputDateFormat(d.receivedDate) || "";
  document.getElementById("cardEDC").value = convertToInputDateFormat(d.cardEDC) || "";
  document.getElementById("dispatchDate").value = convertToInputDateFormat(d.dispatchDate) || "";
  document.getElementById("productionOrder").value = d.productionOrder || "";
  document.getElementById("machine").value = d.machine || "";

  document.getElementById("cardNumber").disabled = true;
  document.querySelector(".btn.green").disabled = true;
  document.getElementById("cardEDC").disabled = false;
  document.getElementById("dispatchDate").disabled = false;
  document.querySelector(".btn.yellow").disabled = false;
  document.querySelector(".btn.red").disabled = false;

  if (d.status === "DISPATCHED") {
    document.getElementById("dispatchDate").disabled = false;
  } else {
    document.getElementById("dispatchDate").disabled = true;
    document.getElementById("dispatchDate").value = "";
  }
  if (d.status === "WIP") {
    document.getElementById("productionOrder").disabled = false;
    document.getElementById("machine").disabled = false;
  } else {
    document.getElementById("productionOrder").disabled = true;
    document.getElementById("machine").disabled = true;
  }
}


window.resetForm = () => {
  document.getElementById("cardNumber").value = "";
  document.getElementById("status").value = "";
  document.getElementById("receivedDate").value = "";
  document.getElementById("cardEDC").value = "";
  document.getElementById("dispatchDate").value = "";
  document.getElementById("productionOrder").value = "";
  document.getElementById("machine").value = "";

  selectedRowIndex = null;
  selectedDocId = null;

  document.getElementById("cardNumber").disabled = false;
  document.getElementById("status").disabled = false;
  document.getElementById("receivedDate").disabled = false;
  document.getElementById("cardEDC").disabled = true;
  document.querySelector(".btn.green").disabled = false;
  document.querySelector(".btn.yellow").disabled = true;
  document.querySelector(".btn.red").disabled = true;
  document.getElementById("dispatchDate").disabled = true;
  document.getElementById("productionOrder").disabled = true;
  document.getElementById("machine").disabled = true;
}

// --- EXPORT TO EXCEL (Filtered Table Only) ---
window.exportToExcel = () => {
  // 1. Decide: Filtered data or all data?
  const exportData = (filteredData.length ? filteredData : cardDataList);

  if (!exportData.length) {
    alert("No data to export!");
    return;
  }

  // 2. Header row (match table header)
  const headers = [
    "SR NO", "CARD NO", "PART NO", "ITEM NAME", "LOCATION", "BIN QTY",
    "CARD", "BOARD NAME", "MACHINE", "STATUS", "RECEIVED DATE",
    "CARD EDC", "DISPATCH DATE", "PRODUCTION ORDER"
  ];

  // 3. Prepare CSV rows
  let csv = [];
  csv.push(headers.map(h => `"${h}"`).join(','));

  exportData.forEach((d, idx) => {
    csv.push([
      `"${idx + 1}"`,
      `"${d.cardNumber || ""}"`,
      `"${d.partNo || ""}"`,
      `"${d.itemName || ""}"`,
      `"${d.location || ""}"`,
      `"${d.binQty || ""}"`,
      `"${d.card || ""}"`,
      `"${d.boardName || ""}"`,
      `"${d.machine || ""}"`,
      `"${d.status || ""}"`,
      `"${d.receivedDate || ""}"`,
      `"${d.cardEDC || ""}"`,
      `"${d.dispatchDate || ""}"`,
      `"${d.productionOrder || ""}"`
    ].join(','));
  });

  // 4. Download as CSV
  const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(csvFile);
  a.download = "kanban_tracking_export.csv";
  a.click();
  showToast("File Exported");
};


// --- IMPORT CSV (Firestore Write) ---
window.importCSV = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  showToast("Please wait, importing CSV...");
  const okBtn = document.getElementById("toast-ok");
  okBtn.disabled = true;
  okBtn.style.opacity = 0.6;
  okBtn.style.cursor = "not-allowed";

  const text = await file.text();
  const rows = text.split("\n").map(r => r.trim()).filter(r => r);
  const headers = rows[0].split(",").map(h => h.replace(/"/g, '').trim());
  let importedData = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(",");
    if (values.length < 2) continue;
    const data = {};
    headers.forEach((header, index) => {
      const key = header;
      const val = values[index]?.replace(/"/g, '').trim() || "";
      data[key] = val;
    });
    importedData.push(data);
  }

  // --- COUNT VARIABLES ---
  let updateCount = 0;
  let addCount = 0;

  for (let data of importedData) {
    const cardNumber = data["CARD NO"] || data["cardNumber"];
    if (!cardNumber) continue;
    const q = query(collection(db, "trackingCards"), where("cardNumber", "==", cardNumber));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docId = snap.docs[0].id;
      await updateDoc(doc(db, "trackingCards", docId), {
        serialNumber: Number(data["SR NO"] || data["serialNumber"] || 0),
        cardNumber,
        partNo: data["PART NO"] || "",
        itemName: data["ITEM NAME"] || "",
        location: data["LOCATION"] || "",
        binQty: data["BIN QTY"] || "",
        card: data["CARD"] || "",
        boardName: data["BOARD NAME"] || "",
        machine: data["MACHINE"] || "",
        status: data["STATUS"] || "",
        receivedDate: data["RECEIVED DATE"] || "",
        cardEDC: data["CARD EDC"] || "",
        dispatchDate: data["DISPATCH DATE"] || "",
        productionOrder: data["PRODUCTION ORDER"] || ""
      });
      updateCount++;
    } else {
      await addDoc(collection(db, "trackingCards"), {
        serialNumber: Number(data["SR NO"] || data["serialNumber"] || 0),
        cardNumber,
        partNo: data["PART NO"] || "",
        itemName: data["ITEM NAME"] || "",
        location: data["LOCATION"] || "",
        binQty: data["BIN QTY"] || "",
        card: data["CARD"] || "",
        boardName: data["BOARD NAME"] || "",
        machine: data["MACHINE"] || "",
        status: data["STATUS"] || "",
        receivedDate: data["RECEIVED DATE"] || "",
        cardEDC: data["CARD EDC"] || "",
        dispatchDate: data["DISPATCH DATE"] || "",
        productionOrder: data["PRODUCTION ORDER"] || ""
      });
      addCount++;
    }
  }

  showToast(`Successfully! Updated Cards: ${updateCount}, New Added: ${addCount}`);

  okBtn.disabled = false;
  okBtn.style.opacity = 1;
  okBtn.style.cursor = "pointer";

  await loadTable();
};


// --- EMAIL TABLE ---
window.emailTable = function() {
  const table = document.getElementById("kanbanTable");
  const headerCells = table.querySelectorAll("thead tr:first-child th");
  let headers = [];
  headerCells.forEach(cell => headers.push(cell.innerText.trim()));
  const visibleRows = Array.from(document.querySelectorAll("#trackingTableBody tr"))
    .filter(row => row.style.display !== "none");
  let tableText = headers.join('\t') + '\n';
  visibleRows.forEach(row => {
    let cols = row.querySelectorAll("td");
    let rowData = [];
    cols.forEach(col => rowData.push(col.innerText.trim()));
    tableText += rowData.join('\t') + '\n';
  });
  if (tableText.length > 1800) {
    tableText = tableText.slice(0, 1800) + "\n[Data truncated due to size]";
  }
  const subject = encodeURIComponent("Kanban Card Tracking Table");
  const body = encodeURIComponent(tableText);

  // Change email address here if you want a specific recipient:
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// --- WHATSAPP CARD ---
window.whatsappCard = function() {
  if (selectedRowIndex === null) {
    showToast("Please double click in row and select a card.");
    return;
  }
  document.getElementById('waMobileInput').value = '';
  document.getElementById('whatsappModal').style.display = 'flex';
}
window.closeWhatsappModal = function() {
  document.getElementById('whatsappModal').style.display = 'none';
}
window.submitMobileForWhatsapp = function() {
  const mob = document.getElementById('waMobileInput').value.replace(/\D/g, '');
  if (mob.length < 10) {
    showToast("Invalid mobile number.");
    return;
  }
  const card = cardDataList[selectedRowIndex];
  let msg =
    `*KANBAN CARD DETAILS*%0A` +
    `Card No: ${card.cardNumber || ""}%0A` +
    `Part No: ${card.partNo || ""}%0A` +
    `Item Name: ${card.itemName || ""}%0A` +
    `Location: ${card.location || ""}%0A` +
    `Bin Qty: ${card.binQty || ""}%0A` +
    `Card: ${card.card || ""}%0A` +
    `Board Name: ${card.boardName || ""}%0A` +
    `Machine: ${card.machine || ""}%0A` +
    `Status: ${card.status || ""}%0A` +
    `Received Date: ${formatDateDMY(card.receivedDate) || ""}%0A` +
    `Card EDC: ${formatDateDMY(card.cardEDC) || ""}%0A` +
    `Dispatch Date: ${formatDateDMY(card.dispatchDate) || ""}%0A` +
    `Production Order: ${card.productionOrder || ""}`;
  let url = `https://wa.me/${mob}?text=${msg}`;
  closeWhatsappModal();
  window.open(url, "_blank");
}

// --- STATUS CHANGE EVENT ---
document.getElementById("status").addEventListener("change", () => {
  const status = document.getElementById("status").value;
  if (status === "DISPATCHED") {
    document.getElementById("dispatchDate").disabled = false;
  } else {
    document.getElementById("dispatchDate").value = "";
    document.getElementById("dispatchDate").disabled = true;
  }
  if (status === "WIP") {
    document.getElementById("productionOrder").disabled = false;
    document.getElementById("machine").disabled = false;
  } else {
    document.getElementById("productionOrder").disabled = true;
    document.getElementById("machine").disabled = true;
  }
});

// --- INIT ---
document.addEventListener("DOMContentLoaded", async () => {
  populateDropdown("machine", machineList);
  resetForm();
  await loadTable();
  setTimeout(() => { toggleDispatchedFilter(); }, 300);
});

document.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    const toast = document.getElementById("toast");
    if (toast.style.display === "block") {
      toast.style.display = "none";
    }
  }
});

window.reloadPage = function() {
  showToast("Reloading page...");
  setTimeout(() => {
    location.reload();
  }, 500);
};
let serverOtp = ""; // OTP ko yaha store rakhenge

window.closeOtpModal = function() {
  document.getElementById("otpModal").style.display = "none";
  document.getElementById("otpInput").value = "";
  document.getElementById("otpErr").textContent = "";
};

