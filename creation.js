// creation.js (Electron + Offline file storage)
import { fetchAllCards, saveCard, updateCard, deleteCard } from './src/kanbanCardService.js';
let cards = []; // global
let filteredCards = []; // global (ADD THIS)
let currentPage = 1;
const rowsPerPage = 15;

function populateDropdown(id, options) {
  const select = document.getElementById(id);
  select.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

function setDropdowns() {
  populateDropdown("productGroup", ["CASTING","FABRICATION ITEMS", "FLAT - POLISH MS", "HARDWARE", "HEX BAR", "L ANGLE - POLISH MS", "LASER CUTTING", "MACHINING", "PLASTIC - MOULDING",	"POLISH R.B.",	"ROUGH R.B.",	"ROUND PIPE - SEAMLESS MS",	"ROUND PIPE - WELDED MS",	"SP. BOUGHT-OUT",	"SQUARE BAR - POLISH MS",	"SQURE PIPE - POLISH MS",	"TOOLS"]);
  populateDropdown("itemCategory", ["SEMI FINISH GOODS", "RAW MATERIALS"]);
  populateDropdown("supplier", ["AhmP/MOE1", "AhmP/MOE2", "AhmP/PUR1", "AhmP/PUR2","AhmP/LOG2", "AhmP/LOG1"]);
  populateDropdown("cardOwner", ["AhmP/MOE1", "AhmP/MOE2", "AhmP/PUR1", "AhmP/PUR2","AhmP/LOG2", "AhmP/LOG1"]);
  populateDropdown("customer", ["AhmP/MOE1", "AhmP/MOE2", "AhmP/PUR1", "AhmP/PUR2","AhmP/LOG2", "AhmP/LOG1"]);
  populateDropdown("boardName", ["FABRICATION", "MACHINING", "LASER CUTTING", "PURCHASE", "BANDSAW"]);
  populateDropdown("machine", ["WLD ST-1", "WLD ST-2", "WLD ST-3", "WLD ST-4", "ROBOT", "LATHE-1", "LATHE-2", "LATHE-3", "CNC-1", "CNC-2", "BANDSAW-1", "BANDSAW-2","BANDSAW-3","LASER CUTTING", "DRILL-1", "DRILL-2", "MILLING", "DIAMOND CUTTER"]);
}

function getFormData() {
  return {
    cardNumber: parseInt(document.getElementById("cardNumber").value),
    partNo: document.getElementById("partNo").value,
    itemName: document.getElementById("itemName").value,
    location: document.getElementById("location").value,
    binQty: document.getElementById("binQty").value,
    uom: document.getElementById("uom").value,
    cutting: document.getElementById("cutting").value,
    numOfBin: document.getElementById("numOfBin").value,
    card: document.getElementById("card").value,
    finishGoods: document.getElementById("finishGoods").value,
    productGroup: document.getElementById("productGroup").value,
    itemCategory: document.getElementById("itemCategory").value,
    supplier: document.getElementById("supplier").value,
    cardOwner: document.getElementById("cardOwner").value,
    customer: document.getElementById("customer").value,
    boardName: document.getElementById("boardName").value,
    poToGrnLeadTime: document.getElementById("poToGrnLeadTime").value,
    cardLeadTime: document.getElementById("cardLeadTime").value,
    machine: document.getElementById("machine").value,
  }
}
console.log("Cards loaded:", cards);
async function loadCards(page = 1) {
  cards = await fetchAllCards();
  console.log("Loaded cards:", cards); // <-- Add this
  cards.sort((a, b) => a.cardNumber - b.cardNumber);
  filteredCards = cards; // Default, no filter
  renderTable(page);
  renderPagination();
}
function renderTable(page) {
  const table = document.getElementById("cardTableBody");
  table.innerHTML = "";
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedCards = filteredCards.slice(start, end);

  paginatedCards.forEach(d => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d.cardNumber}</td><td>${d.partNo}</td><td>${d.itemName}</td><td>${d.location}</td>
      <td>${d.binQty}</td><td>${d.uom}</td><td>${d.cutting}</td><td>${d.numOfBin}</td><td>${d.card}</td>
      <td>${d.finishGoods}</td><td>${d.productGroup}</td><td>${d.itemCategory}</td>
      <td>${d.supplier}</td><td>${d.cardOwner}</td><td>${d.customer}</td>
      <td>${d.boardName}</td><td>${d.poToGrnLeadTime}</td>
      <td>${d.cardLeadTime}</td><td>${d.machine}</td>`;

row.ondblclick = () => {
  for (const key in d) {
    const el = document.getElementById(key);
    if (el) el.value = d[key];
  }
  document.getElementById("docId").value = d.cardNumber;
  // (optionally store d.id somewhere for update/delete)
};
    table.appendChild(row);
  });
}


function renderPagination() {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;

  const totalRows = filteredCards.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  let html = '';

  if (totalPages > 1) {
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="gotoPage(${currentPage - 1})">&lt; Prev</button> `;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      html += `<button onclick="gotoPage(1)">1</button>`;
      if (startPage > 2) html += `<span style="margin:0 2px;">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button ${currentPage === i ? 'style="font-weight:bold;background:#ffd600;color:#222;"' : ''} onclick="gotoPage(${i})">${i}</button> `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="margin:0 2px;">...</span>`;
      html += `<button onclick="gotoPage(${totalPages})">${totalPages}</button>`;
    }

    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="gotoPage(${currentPage + 1})">Next &gt;</button>`;
  }
  pagination.innerHTML = html;
}



window.gotoPage = function(page) {
  const totalPages = Math.ceil(filteredCards.length / rowsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTable(page);
  renderPagination();
}

function generateCardNumber() {
  const max = cards.reduce((acc, item) => Math.max(acc, item.cardNumber), 0);
  const nextCard = max + 1;
  const cardNumberField = document.getElementById("cardNumber");
  cardNumberField.value = nextCard;
  cardNumberField.readOnly = true;
}

async function addCardHandler() {
  const data = getFormData();
  if (cards.some(card => card.cardNumber === data.cardNumber)) {
    alert("⚠️ Card number already exists. Please reset.");
    return;
  }
  document.querySelectorAll("button").forEach(btn => btn.disabled = true);
  document.getElementById("loader").style.display = "block";
  setTimeout(async () => {
   await saveCard(data);
alert("✅ Card Added Successfully");
resetFormHandler();
await loadCards();
generateCardNumber();
document.querySelectorAll("button").forEach(btn => btn.disabled = false);
document.getElementById("loader").style.display = "none";

    alert("✅ Card Added Successfully");
    resetFormHandler();
    await loadCards();
    generateCardNumber();
    document.querySelectorAll("button").forEach(btn => btn.disabled = false);
    document.getElementById("loader").style.display = "none";
  }, 300);
}

async function updateCardHandler() {
  const id = parseInt(document.getElementById("docId").value);
  if (!id) return alert("Please double-click a card to select for update.");
  const data = getFormData();
  const cardToUpdate = cards.find(card => card.cardNumber === id);
  if (cardToUpdate && cardToUpdate.id) {
    await updateCard(cardToUpdate.id, data);
    alert("✅ Card Updated Successfully");
    resetFormHandler();
    await loadCards();
    generateCardNumber();
  } else {
    alert("Card not found for update.");
  }
}

async function deleteCardHandler() {
  const id = parseInt(document.getElementById("docId").value);
  if (!id) return alert("Please double-click a card to select for delete.");
  if (!confirm("Are you sure you want to delete this card?")) return;
  const cardToDelete = cards.find(card => card.cardNumber === id);
  if (cardToDelete && cardToDelete.id) {
    await deleteCard(cardToDelete.id);
    alert("Card Deleted Successfully");
    resetFormHandler();
    await loadCards();
    generateCardNumber();
  } else {
    alert("Card not found for delete.");
  }
}


function resetFormHandler() {
  document.querySelectorAll("input, select").forEach(el => {
    if (el.id !== "cardNumber") {
      el.value = "";
      el.removeAttribute("readonly");
    }
  });
  generateCardNumber();
  document.getElementById("cardNumber").readOnly = true;
  document.getElementById("docId").value = "";
  setTimeout(() => {
    document.querySelectorAll("input, select").forEach(el => el.disabled = false);
  }, 300);
}

function searchColumn() {
  const inputs = document.querySelectorAll("thead input");
  const filters = Array.from(inputs).map(input => input.value.trim().toLowerCase());

  filteredCards = cards.filter(card => {
    return filters.every((filter, colIndex) => {
      if (!filter) return true;
      const values = [
        card.cardNumber, card.partNo, card.itemName, card.location, card.binQty, card.uom,
        card.cutting, card.numOfBin, card.card, card.finishGoods, card.productGroup,
        card.itemCategory, card.supplier, card.cardOwner, card.customer, card.boardName,
        card.poToGrnLeadTime, card.cardLeadTime, card.machine
      ];
      return (values[colIndex] || '').toString().toLowerCase().includes(filter);
    });
  });
  currentPage = 1;
  renderTable(currentPage);
  renderPagination();
}



function parseCardNumbers(input) {
  let result = new Set();
  input.split(",").forEach(token => {
    if (token.includes("-")) {
      let [start, end] = token.split("-").map(x => parseInt(x.trim(), 10));
      if (start && end && start <= end) {
        for (let i = start; i <= end; i++) result.add(i);
      }
    } else {
      let num = parseInt(token.trim(), 10);
      if (!isNaN(num)) result.add(num);
    }
  });
  return Array.from(result);
}

// Yeh function aapke sare cards ke liye ek-ek table block banayega
function getKanbanCardTable(card) {
  return `
  <table style="width:100%; border-collapse:collapse; border:2.5px solid #000; margin-bottom:25px; font-family:Arial, 'Arial Black', Impact, sans-serif; font-size:15px;">
    <tr>
      <!-- Vertical Card No -->
      <td rowspan="7" style="border:2.5px solid #000; width:20px; text-align:center; font-weight:bold; font-size:8px; vertical-align:middle; letter-spacing:2px; writing-mode:vertical-lr; text-orientation:mixed; text-transform:uppercase;">CARD NO</td>
      <td rowspan="7" style="border:2.5px solid #000; width:60px; text-align:center; font-weight:bold; font-size:26px; vertical-align:middle; writing-mode:vertical-lr;">${card.cardNumber || ''}</td>
      <!-- Vertical Part No -->
      <td rowspan="7" style="border:2.5px solid #000; width:32px; text-align:center; font-weight:bold; font-size:13px; vertical-align:middle; letter-spacing:1px; writing-mode:vertical-lr; text-orientation:mixed; text-transform:uppercase;">PART NO</td>
      <td rowspan="7" style="border:2.5px solid #000; width:37px; text-align:center; font-weight:bold; font-size:19px; vertical-align:middle; writing-mode:vertical-lr;">${card.partNo || ''}</td>
      <!-- Vertical Location -->
      <td rowspan="7" style="border:2.5px solid #000; width:32px; text-align:center; font-weight:bold; font-size:13px; vertical-align:middle; letter-spacing:1px; writing-mode:vertical-lr; text-orientation:mixed; text-transform:uppercase;">LOCATION</td>
      <td rowspan="7" style="border:2.5px solid #000; width:37px; text-align:center; font-weight:bold; font-size:19px; vertical-align:middle; writing-mode:vertical-lr;">${card.location || ''}</td>
      <!-- Main Table -->
      <td colspan="4" style="border:2.5px solid #000; font-weight:bold; font-size:14px; text-align:center; text-transform:uppercase;">ITEM NAME</td>
    </tr>
    <tr>
      <td colspan="4" style="border:2.5px solid #000; font-weight:bold; font-size:21px; text-align:center;">${card.itemName || ''}</td>
    </tr>
    <tr>
      <td colspan="4" style="border:2.5px solid #000; font-size:13px; font-weight:bold; text-align:center; text-transform:uppercase;">FINISH GOODS</td>
    </tr>
    <tr>
      <td colspan="4" style="border:2.5px solid #000; font-size:16px; text-align:center; font-weight:400;">${card.finishGoods || ''}</td>
    </tr>
    <tr>
      <td style="border:2.5px solid #000; font-size:13px; font-weight:bold; text-align:center; text-transform:uppercase;">BIN QTY</td>
      <td style="border:2.5px solid #000; font-size:17px; font-weight:bold; text-align:center;">${card.binQty || ''} ${card.uom || ''}</td>
      <td style="border:2.5px solid #000; font-size:13px; font-weight:bold; text-align:center; text-transform:uppercase;">CUTTING LENGTH</td>
      <td style="border:2.5px solid #000; font-size:17px; font-weight:bold; text-align:center;">${card.cutting || ''}</td>
    </tr>
    <tr>
      <td style="border:2.5px solid #000; font-size:13px; font-weight:bold; text-align:center; text-transform:uppercase;">PRODUCT GROUP</td>
      <td style="border:2.5px solid #000; font-size:16px; font-weight:bold; text-align:center;">${card.productGroup || ''}</td>
      <td style="border:2.5px solid #000; font-size:13px; font-weight:bold; text-align:center; text-transform:uppercase;">CARD</td>
      <td style="border:2.5px solid #000; font-size:16px; font-weight:bold; text-align:center;">${card.card || ''}</td>
    </tr>
    <tr>
      <td style="border:2.5px solid #000; font-size:13px; font-weight:bold; text-align:center; text-transform:uppercase;">BOARD NAME</td>
      <td style="border:2.5px solid #000; font-size:16px; font-weight:400; text-align:center;">${card.boardName || ''}</td>
      <td style="border:2.5px solid #000; font-size:13px; font-weight:bold; text-align:center; text-transform:uppercase;">CARD OWNER</td>
      <td style="border:2.5px solid #000; font-size:16px; font-weight:400; text-align:center;">${card.cardOwner || ''}</td>
    </tr>
  </table>
  `;
}


window.generateCardPDFPreview = function () {
  const input = document.getElementById("printCardNumbers").value.trim();
  if (!input) return alert("Enter card numbers!");

  const cardNumbers = parseCardNumbers(input).map(Number);
  if (!cardNumbers.length) return alert("No valid card numbers entered!");

  const selectedCards = cards.filter(card => cardNumbers.includes(card.cardNumber));
  if (!selectedCards.length) return alert("No matching cards found!");

  // Start preview HTML
  let html = `
    <html>
    <head>
      <title>Print Preview</title>
      <style>
        body { background: #fff; font-family: Arial, 'Arial Black', Impact, sans-serif; margin: 0; padding: 18px;}
        #downloadBtn { margin: 24px 0 32px 0; padding: 12px 26px; font-size:18px; background:#6a1b9a; color:#fff; border:none; border-radius:6px; cursor:pointer;}
        @media print { #downloadBtn {display:none;} }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    </head>
    <body>
      <button id="downloadBtn" onclick="downloadAsPDF()">Convert to PDF</button>
      <div id="previewCards" style="width:100vw;max-width:780px;background:#fff;margin:0 auto;box-sizing:border-box;">
  `;

  selectedCards.forEach((card, i) => {
    html += getKanbanCardTable(card);
    // 5 per page, then page-break
    if ((i + 1) % 5 === 0 && i < selectedCards.length - 1)
      html += '<div style="page-break-after:always"></div>';
  });

  html += `
      </div>
      <script>
         function downloadAsPDF() {
         const printArea = document.getElementById('previewCards');
           const opt = {
            margin: [8, 8, 8, 8], // NO extra margin!
            filename: 'KanbanCards_Print.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#fff", width: 780 },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
            };
            window.html2pdf().from(printArea).set(opt).save();
        }
      </script>
    </body></html>
  `;

  // Open new window
  const win = window.open("", "_blank");
  win.document.open();
  win.document.write(html);
  win.document.close();
};

window.exportExcel = function () {
  if (!filteredCards.length) {
    alert("No filtered data to export!");
    return;
  }

  // Prepare export data (all filtered rows)
  const exportData = filteredCards.map(card => ({
    cardNumber: card.cardNumber,
    partNo: card.partNo,
    itemName: card.itemName,
    location: card.location,
    binQty: card.binQty,
    uom: card.uom,
    cutting: card.cutting,
    numOfBin: card.numOfBin,
    card: card.card,
    finishGoods: card.finishGoods,
    productGroup: card.productGroup,
    itemCategory: card.itemCategory,
    supplier: card.supplier,
    cardOwner: card.cardOwner,
    customer: card.customer,
    boardName: card.boardName,
    poToGrnLeadTime: card.poToGrnLeadTime,
    cardLeadTime: card.cardLeadTime,
    machine: card.machine
  }));

  // Export
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "FilteredKanbanCards");

  // Download Excel file directly in browser (no require needed)
  XLSX.writeFile(wb, "KanbanCards_Filtered.xlsx");
  alert('Exported filtered data as KanbanCards_Filtered.xlsx');
};

window.importExcel = async function () {
  const fileInput = document.getElementById("excelFile");
  if (!fileInput.files.length) return alert("Select an Excel file to import!");

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let added = 0, updated = 0;
    for (const row of rows) {
      if (!row.cardNumber) continue; // Card number required!
      row.cardNumber = parseInt(row.cardNumber);

      // Search for existing card in your cloud data
      const existing = cards.find(c => c.cardNumber === row.cardNumber);
      if (existing && existing.id) {
        // Update existing card
        await updateCard(existing.id, row);
        updated++;
      } else {
        // Add new card
        await saveCard(row);
        added++;
      }
    }

    alert(`Imported! Added: ${added}, Updated: ${updated}`);
    await loadCards();
    fileInput.value = "";
  };
  reader.readAsArrayBuffer(file);
};


function goBack() {
  window.location.href = "menu.html";
}

window.onload = async function () {
  setDropdowns();
  await loadCards(1);
  generateCardNumber();
};
window.addCard = addCardHandler;
window.updateCard = updateCardHandler;
window.deleteCard = deleteCardHandler;
window.resetForm = resetFormHandler;
window.searchColumn = searchColumn;
window.importExcel = importExcel;
window.goBack = goBack;
window.generateCardPDFPreview = generateCardPDFPreview;
window.exportExcel = exportExcel;