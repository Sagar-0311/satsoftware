import { db } from './src/firebase.js';
import { 
  collection, getDocs, addDoc, query, where, deleteDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { writeBatch, deleteField } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let frozenData = [];
let filteredCards = [];
let showFrozenPlansMode = false;
// planning-firebase.js ya planning.html me
document.getElementById("startTime").value = "08:00";
const autoStartCheckbox = document.getElementById("autoStartDateTime");
const startDateInput = document.getElementById("startDate");
const startTimeInput = document.getElementById("startTime");

autoStartCheckbox.addEventListener("change", function() {
  if (autoStartCheckbox.checked) {
    startDateInput.value = "";
    startDateInput.disabled = true;
    // startTime ko blank na karo, na lock karo
    startTimeInput.disabled = false;
  } else {
    startDateInput.disabled = false;
    startTimeInput.disabled = false;
  }
});

// Board wise machines
const boardToMachines = {
  "FABRICATION": ["WLD ST-1", "WLD ST-2", "WLD ST-3", "WLD ST-4", "WLD ST-5", "WLD ST-6", "ROBOT"],
  "MACHINING": ["LATHE-1", "LATHE-2", "LATHE-3", "CNC-1", "CNC-2"],
  "LASER CUTTING": ["LASER CUTTING"],
  "BANDSAW": ["BANDSAW-1", "BANDSAW-2", "BANDSAW-3"],
  "DRILL": ["DRILL-1", "DRILL-2"]
};

const boardOptions = ["ALL BOARDS", ...Object.keys(boardToMachines)];

function populateDropdown(id, options) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">Select ' + id.charAt(0).toUpperCase() + id.slice(1) + '</option>' +
    options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

populateDropdown("board", boardOptions);

// Machine dropdown setup (initially blank)
const machineSelect = document.getElementById("machine");
machineSelect.innerHTML = '<option value="">ALL MACHINES</option>';

const boardSelect = document.getElementById("board");
boardSelect.addEventListener("change", function() {
  const board = boardSelect.value;
  let machineList = boardToMachines[board] || [];
  let html = '<option value="">ALL MACHINES</option>';
  if(machineList.length > 0) {
    html += machineList.map(opt => `<option value="${opt}">${opt}</option>`).join('');
  }
  machineSelect.innerHTML = html;
});

// STATUS DROPDOWN
const statusOptions = [ "ALL", "BIN EMPTY", "RM SHORT", "WIP" ];
const statusSelect = document.getElementById("status");
statusSelect.innerHTML = statusOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('');

 async function renderPlanningTable(dataRows) {
  const tbody = document.querySelector("#planningTable tbody");
  tbody.innerHTML = '';

    if (showFrozenPlansMode) {
    const machineOrder = [
      "CNC-1", "CNC-2", "LATHE-1", "LATHE-2", "LATHE-3",
      "DRILL-1", "DRILL-2", "BANDSAW-1", "BANDSAW-2", "BANDSAW-3",
      "WLD ST-1", "WLD ST-2", "WLD ST-3", "WLD ST-4", "WLD ST-5", "WLD ST-6", "ROBOT"
    ];
    dataRows.sort((a, b) => {
      let m1 = machineOrder.indexOf(a.machine);
      let m2 = machineOrder.indexOf(b.machine);
      if (m1 !== m2) return m1 - m2;
      let [d1, mth1, y1] = (a.startDate || "").split("/");
      let [d2, mth2, y2] = (b.startDate || "").split("/");
      let dtA = new Date(`${y1}-${mth1}-${d1}`);
      let dtB = new Date(`${y2}-${mth2}-${d2}`);
      if (dtA - dtB !== 0) return dtA - dtB;
      function parseTime(t) {
        if (!t) return 0;
        let [hm, ampm] = t.split(" ");
        let [h, m] = hm.split(":").map(Number);
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        return h * 60 + m;
      }
      let tA = parseTime(a.startTime);
      let tB = parseTime(b.startTime);
      return tA - tB;
    });
  }

  // Priority logic only for frozen table
  let machinePriorityCount = {};
  let showFrozen = showFrozenPlansMode;

  for(let i=0; i<dataRows.length; i++) {
    let row = dataRows[i];
    

    // Priority calculation ONLY for Show Freeze Plann mode
    let priorityNo = row.priority || "";
    if (showFrozen) {
      // Calculate machine-wise numbering
      if (!machinePriorityCount[row.machine]) machinePriorityCount[row.machine] = 1;
      priorityNo = machinePriorityCount[row.machine];
      machinePriorityCount[row.machine]++;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" data-card="${row.cardNumber}"></td>
      <td>${row.serialNumber}</td>
      <td>${row.cardNumber}</td>
      <td>${row.priority !== undefined && row.priority !== "" ? row.priority : "SET PRIORITY"}</td>
      <td>${row.partNo}</td>
      <td>${row.itemName}</td>
      <td>${row.binQty}</td>
      <td>${row.card}</td>
      <td>${row.cardLeadTime}</td>
      <td>${row.machine}</td>
      <td>${row.workingHours}</td>
      <td>${row.status}</td>
      <td>${row.productionOrder}</td>
      <td>${row.startDate}</td>
      <td>${row.startTime}</td>
      <td>${row.endDate}</td>
      <td>${row.endTime}</td>
    `;
    tr.ondblclick = () => openPlanModal(row); // ADD THIS
    tbody.appendChild(tr);
  }
  if(dataRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="17" style="color:red;text-align:center;">No data found.</td></tr>`;
  }
}


// MAIN PLANNING LOGIC
document.getElementById("startPlanning").addEventListener("click", async function() {
  const selectedBoard = document.getElementById("board").value;
  const selectedMachine = document.getElementById("machine").value;
  const startDate = document.getElementById("startDate").value; // yyyy-mm-dd
  const startTime = document.getElementById("startTime").value; // hh:mm
  const weekoff = document.getElementById("weekoff").value;
  const autoStartChecked = document.getElementById("autoStartDateTime").checked;
let machineToCurrentDateTime = {};

// Agar auto start box tick hai:
if (autoStartChecked) {
  // 1. Freeze data fetch karo (yeh already ho jata hai, lekin yahan phir se latest fetch kar rahe)
  let fSnap = await getDocs(collection(db, "frozenPlans"));
  let frozenRows = fSnap.docs.map(doc => doc.data());

  // 2. Sabhi machines ke last end date/time nikaalo
  const getDateTimeObj = (row) => {
  if (!row.endDate || !row.endTime) return null;
  let [d, m, y] = row.endDate.split("/");
  if (!d || !m || !y) return null;
  let [hm, ampm] = row.endTime.split(" ");
  if (!hm || !ampm) return null;
  let [h, min] = hm.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  let dt = new Date(`${y}-${m}-${d}T${h.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}:00`);
  if (isNaN(dt.getTime())) return null;
  return dt;
};

let machineLatest = {};
for (let row of frozenRows) {
  if (!row.machine) continue;
  let dt = getDateTimeObj(row);
  if (!dt) continue; // skip invalid
  if (!machineLatest[row.machine] || dt > machineLatest[row.machine]) {
    machineLatest[row.machine] = dt;
  }
}

  // Default: agar koi freeze data na ho to abhi ka date/time
  const now = new Date();
  const defaultDate = now.toISOString().slice(0,10); // yyyy-mm-dd
  const defaultTime = "08:00";

  let allMachinesToPlan = [];
  if (selectedMachine === "" || selectedMachine === "ALL MACHINES") {
    allMachinesToPlan = boardToMachines[selectedBoard] || [];
  } else if (selectedMachine) {
    allMachinesToPlan = [selectedMachine];
  }

allMachinesToPlan.forEach(machine => {
  if (machineLatest[machine]) {
    // Freeze plan end date/time se planning shuru karo (user time NA lagao!)
    machineToCurrentDateTime[machine] = new Date(machineLatest[machine]);
  } else {
    // Agar koi freeze nahi hai, tab user ke START TIME ka use karo
    let base = new Date(`${defaultDate}T${defaultTime}:00`);
    if (startTimeInput.value) {
      let [hh, mm] = startTimeInput.value.split(":");
      base.setHours(Number(hh), Number(mm), 0, 0);
    }
    machineToCurrentDateTime[machine] = base;
  }
});

} else {
  // Purana logic (manual)
  let allMachinesToPlan = [];
  if (selectedMachine === "" || selectedMachine === "ALL MACHINES") {
    allMachinesToPlan = boardToMachines[selectedBoard] || [];
  } else if (selectedMachine) {
    allMachinesToPlan = [selectedMachine];
  }
  let dateValue = startDate;
  let timeValue = startTime;
  allMachinesToPlan.forEach(machine => {
    machineToCurrentDateTime[machine] = new Date(`${dateValue}T${timeValue}:00`);
  });
}

if (
    !selectedBoard ||
    (!autoStartChecked && (!startDate || !startTime))
) {
    alert("Please fill/select all fields.");
    return;
}

  // --- Fetch trackingCards & kanbanCards from Firestore ---
  let trackingData = [], kanbanData = [];
  try {
    const tSnap = await getDocs(collection(db, "trackingCards"));
    trackingData = tSnap.docs.map(doc => doc.data());
    const kSnap = await getDocs(collection(db, "kanbanCards"));
    kanbanData = kSnap.docs.map(doc => doc.data());
    // Fetch frozen plans:
    const fSnap = await getDocs(collection(db, "frozenPlans"));
    frozenData = fSnap.docs.map(doc => doc.data());
  } catch(e) {
    alert("Unable to fetch required data from cloud.");
    return;
  }
// Remove frozen cards from trackingData for planning
const frozenCardNumbers = frozenData.map(card => String(card.cardNumber));
trackingData = trackingData.filter(card => !frozenCardNumbers.includes(String(card.cardNumber)));
  // -- Sahi location (trackingData fetch ke baad) --
let machineWorkingHours = {};
allMachineNames.forEach(machine => {
  const inputId = `hours_${machine.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const inputElem = document.getElementById(inputId);
  if (inputElem && !inputElem.disabled) {
    machineWorkingHours[machine] = Number(inputElem.value) || 8;
  }
});



  // ==== Rest of the logic: SAME as before ====
  let selectedStatus = document.getElementById("status").value;

  let allowedMachines = [];
  if(selectedMachine === "" || selectedMachine === "ALL MACHINES") {
    allowedMachines = boardToMachines[selectedBoard] || [];
  }

  function isStatusMatch(card) {
    if(selectedStatus === "" || selectedStatus === "ALL") {
      return card.status !== "JOB-WORK" && card.status !== "DISPATCHED";
    } else {
      return card.status === selectedStatus;
    }
  }

  if(selectedBoard === "ALL BOARDS") {
    filteredCards = trackingData.filter(card =>
      allMachineNames.includes(card.machine) && isStatusMatch(card)
    );
  } else if(selectedMachine === "" || selectedMachine === "ALL MACHINES") {
    filteredCards = trackingData.filter(card =>
      allowedMachines.includes(card.machine) &&
      card.boardName === selectedBoard &&
      isStatusMatch(card)
    );
  } else {
    filteredCards = trackingData.filter(card =>
      card.machine === selectedMachine &&
      card.boardName === selectedBoard &&
      isStatusMatch(card)
    );
  }


  // Sort logic same
  const machineOrder = [
    "CNC-1", "CNC-2", "LATHE-1", "LATHE-2", "LATHE-3",
    "DRILL-1", "DRILL-2", "BANDSAW-1", "BANDSAW-2", "BANDSAW-3",
    "WLD ST-1", "WLD ST-2", "WLD ST-3", "WLD ST-4", "ROBOT"
  ];
  const statusOrder = ["WIP", "RM SHORT", "BIN EMPTY"];
filteredCards.sort((a, b) => {
  let m1 = machineOrder.indexOf(a.machine);
  let m2 = machineOrder.indexOf(b.machine);
  if (m1 !== m2) return m1 - m2;
  let s1 = statusOrder.indexOf(a.status);
  let s2 = statusOrder.indexOf(b.status);
  if (s1 !== s2) return s1 - s2;
  // --- User priority field par sort karo
  let p1 = Number(a.priority) || 999;
  let p2 = Number(b.priority) || 999;
  if (p1 !== p2) return p1 - p2;
  return a.serialNumber - b.serialNumber;
});
  // Merge cardLeadTime from kanbanData using cardNumber (number/string compatible)
  filteredCards = filteredCards.map(card => {
    const leadCard = kanbanData.find(kc => String(kc.cardNumber) === String(card.cardNumber));
    return {
      ...card,
      cardLeadTime: leadCard ? Number(leadCard.cardLeadTime) : 0
    };
  });

  // Scheduling Calculation — same as your code
  let tableRows = [];
  let weekoffIndex = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(weekoff);
  // let machineToCurrentDateTime = {}; // Removed redeclaration to avoid error
if (!autoStartChecked) {
  const allMachines = filteredCards.map(card => card.machine);
  [...new Set(allMachines)].forEach(machine => {
    machineToCurrentDateTime[machine] = new Date(`${startDate}T${startTime}:00`);
  });
}
// Agar autoStartChecked true hai, to kuch mat karo — pehle se set hai!


let machinePriorityCount = {};
for(let i=0; i<filteredCards.length; i++) {
    let row = filteredCards[i];
    let cardStart = new Date(machineToCurrentDateTime[row.machine]);
    let leadTimeHours = Number(row.cardLeadTime);
    if(isNaN(leadTimeHours) || leadTimeHours<=0) leadTimeHours = 1;
    let remHours = leadTimeHours;
    let endDateTime = new Date(cardStart);

    // Change here:
    let thisMachineHours = machineWorkingHours[row.machine] || 8;

    while (remHours > 0) {
      if (endDateTime.getDay() === weekoffIndex) {
        endDateTime.setDate(endDateTime.getDate() + 1);
        endDateTime.setHours(8, 0, 0, 0);
        continue;
      }
      if (thisMachineHours >= 24) {
        endDateTime.setHours(endDateTime.getHours() + remHours);
        remHours = 0;
        continue;
      }
      const shiftStart = 8;
      const shiftEnd = shiftStart + thisMachineHours;
      let hourNow = endDateTime.getHours() + endDateTime.getMinutes() / 60;
      if (hourNow < shiftStart) {
        endDateTime.setHours(shiftStart, 0, 0, 0);
        hourNow = shiftStart;
      }
      let availableToday = shiftEnd - hourNow;
      if (availableToday <= 0) {
        endDateTime.setDate(endDateTime.getDate() + 1);
        endDateTime.setHours(shiftStart, 0, 0, 0);
        continue;
      }
      let useNow = Math.min(availableToday, remHours);
      endDateTime.setHours(Math.floor(hourNow + useNow), Math.round((hourNow + useNow - Math.floor(hourNow + useNow)) * 60), 0, 0);
      remHours -= useNow;
    }

    function fmtDate(d) { return d.toLocaleDateString('en-GB'); }
    function fmtTime(d) {
      let h = d.getHours();
      let m = d.getMinutes();
      let ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      let mm = m < 10 ? '0'+m : m;
      return h + ':' + mm + ' ' + ampm;
    }
        // Priority numbering
    if (!machinePriorityCount[row.machine]) machinePriorityCount[row.machine] = 1;
    let priorityNo = machinePriorityCount[row.machine];
    machinePriorityCount[row.machine]++;

    tableRows.push({
      serialNumber: row.serialNumber,
      cardNumber: row.cardNumber,
      priority: row.priority, // <-- direct user priority, not machine count 
      partNo: row.partNo,
      itemName: row.itemName,
      binQty: row.binQty,
      card: row.card,
      cardLeadTime: row.cardLeadTime,
      machine: row.machine,
      workingHours: thisMachineHours,
      status: row.status,
      productionOrder: row.productionOrder,
      startDate: fmtDate(cardStart),
      startTime: fmtTime(cardStart),
      endDate: fmtDate(endDateTime),
      endTime: fmtTime(endDateTime)
    });

    let shiftStart = 8;
    let shiftEnd = shiftStart + thisMachineHours;
    let nextStart = new Date(endDateTime);
    if (thisMachineHours >= 24) {
      machineToCurrentDateTime[row.machine] = new Date(endDateTime);
    } else {
      let hour = nextStart.getHours();
      let min = nextStart.getMinutes();
      if (
        ((hour === (shiftEnd % 24)) && min === 0) ||
        (hour < shiftStart) || (hour >= shiftEnd)
      ) {
        nextStart.setDate(nextStart.getDate() + 1);
        nextStart.setHours(shiftStart, 0, 0, 0);
      }
      machineToCurrentDateTime[row.machine] = nextStart;
    }
  }
await renderPlanningTable(tableRows);

});

// Export Excel function as is (no change)
document.getElementById('exportExcel').addEventListener('click', function() {
  const table = document.getElementById('planningTable');
  let csv = [];
  const visibleRows = Array.from(table.querySelectorAll("tbody tr")).filter(row => row.style.display !== "none");
  const headerCells = table.querySelectorAll("thead tr:first-child th");
  let headerRow = [];
  headerCells.forEach(cell => headerRow.push('"' + cell.innerText + '"'));
  csv.push(headerRow.join(","));
  for (let row of visibleRows) {
    let cols = row.querySelectorAll("td");
    let rowData = [];
    for (let col of cols) {
      rowData.push('"' + col.innerText + '"');
    }
    csv.push(rowData.join(","));
  }
  if (visibleRows.length === 0) {
    alert("No filtered data to export!");
    return;
  }
  const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(csvFile);
  a.download = "production_planning_export.csv";
  a.click();
});

window.goBack = function() {
  window.location.href = "menu.html";
};
// Yeh sabse upar list bana lo — sabhi machines ka
const allMachineNames = [
  "WLD ST-1", "WLD ST-2", "WLD ST-3", "WLD ST-4", "WLD ST-5", "WLD ST-6", "ROBOT",
  "LATHE-1", "LATHE-2", "LATHE-3", "CNC-1", "CNC-2",
  "LASER CUTTING", "BANDSAW-1", "BANDSAW-2", "BANDSAW-3",
  "DRILL-1", "DRILL-2"
];

// Machine working hours fields render function
function renderMachineHourFields(unlockMachines = []) {
  const container = document.getElementById("machine-hours-fields");
  container.innerHTML = ""; // clear previous
  allMachineNames.forEach(machine => {
    const isUnlocked = unlockMachines.includes(machine) || unlockMachines.length === allMachineNames.length;
    const inputId = `hours_${machine.replace(/[^a-zA-Z0-9]/g, "_")}`;
    container.innerHTML += `
  <div>
    <label>
      <span>${machine}</span>
      <input type="number" id="${inputId}" min="1" max="24" maxlength="2" value="8" style="margin-left:6px;" ${isUnlocked ? "" : "disabled"} />
    </label>
  </div>
`;
  });
}

// On page load, sab disabled dikhaye:
renderMachineHourFields([]);

// Board select change pe unlock/lock kare:
boardSelect.addEventListener("change", function() {
  const board = boardSelect.value;
  if (board === "ALL BOARDS") {
    renderMachineHourFields(allMachineNames); // All unlock
  } else {
    renderMachineHourFields(boardToMachines[board] || []);
  }
});
window.toggleAllRows = function(mainChk) {
  document.querySelectorAll('.row-checkbox').forEach(chk => {
    chk.checked = mainChk.checked;
  });
}

// Plan Freeze Button Click
document.getElementById('planFreezeBtn').addEventListener('click', async function() {
  const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
  if (checkedBoxes.length === 0) {
    alert("Please select at least one card to freeze!");
    return;
  }
  let frozenCount = 0;
  for (let chk of checkedBoxes) {
    const tr = chk.closest('tr');
    const tds = tr.querySelectorAll('td');
    const cardNumber = tds[2].innerText.trim();

    // Extra fields from filteredCards
    const orig = filteredCards.find(card => String(card.cardNumber) === String(cardNumber)) || {};

    // Freeze data object: NEW CORRECT INDEXES
    const freezeObj = {
      serialNumber: tds[1].innerText.trim(),
      cardNumber: tds[2].innerText.trim(),
      partNo: tds[4].innerText.trim(),
      itemName: tds[5].innerText.trim(),
      binQty: tds[6].innerText.trim(),
      card: tds[7].innerText.trim(),
      cardLeadTime: tds[8].innerText.trim(),
      machine: tds[9].innerText.trim(),
      workingHours: tds[10].innerText.trim(),
      status: tds[11].innerText.trim(),
      productionOrder: tds[12].innerText.trim(),
      startDate: tds[13].innerText.trim(),
      startTime: tds[14].innerText.trim(),
      endDate: tds[15].innerText.trim(),
      endTime: tds[16].innerText.trim(),
      boardName: orig.boardName || "",
      location: orig.location || "",
    };

    // Remove undefined fields if any (Firestore doesn't allow undefined)
    Object.keys(freezeObj).forEach(key => {
      if (freezeObj[key] === undefined) freezeObj[key] = "";
    });

    await addDoc(collection(db, "frozenPlans"), freezeObj);
    frozenCount++;
  }
  alert(`${frozenCount} cards frozen successfully!`);
  document.getElementById("startPlanning").click();
});

window.searchColumn = function() {
  const table = document.getElementById("planningTable");
  const inputs = table.querySelectorAll("thead tr:nth-child(2) input");
  const trs = table.querySelectorAll("tbody tr");

  trs.forEach(row => {
    let visible = true;
    const tds = row.querySelectorAll("td");
    inputs.forEach((inp, idx) => {
      // td index is always idx + 1 (because td[0] is the checkbox)
      let tdIndex = idx + 1;

      let filter = inp.value.trim().toLowerCase();
      let val = (tds[tdIndex] || {}).innerText ? tds[tdIndex].innerText.trim().toLowerCase() : "";

      if (filter) {
        // SR. NO (idx 0) or PART NO (idx 2) --> Exact match
        if (idx === 0 || idx === 1 || idx === 4 || idx === 6) {
          if (val !== filter) visible = false;
        } else {
          // Partial match
          if (!val.includes(filter)) visible = false;
        }
      }
    });
    row.style.display = visible ? "" : "none";
  });
};

document.getElementById('showFreezePlans').addEventListener('change', async function() {
  showFrozenPlansMode = this.checked;
   // Yaha pe code add karo:
  document.getElementById("planFreezeBtn").style.display = showFrozenPlansMode ? "none" : "";
  document.getElementById("planUnfreezeBtn").style.display = showFrozenPlansMode ? "" : "none";
  // Aage ka existing code...
  if (showFrozenPlansMode) {
    document.getElementById("loader").style.display = "block";
    try {
      const fSnap = await getDocs(collection(db, "frozenPlans"));
      let frozenRows = fSnap.docs.map(doc => doc.data());
      await renderPlanningTable(frozenRows);
    } catch (e) {
      alert("Failed to load frozen plans!");
    }
    document.getElementById("loader").style.display = "none";
  } else {
    // Yaha pe safe check
    const selectedBoard = document.getElementById("board").value;
    const startDate = document.getElementById("startDate").value;
    const startTime = document.getElementById("startTime").value;
const autoStartChecked = document.getElementById("autoStartDateTime").checked;

if (
    !selectedBoard ||
    (!autoStartChecked && (!startDate || !startTime))
) {
    alert("Please fill/select all fields.");
    return;
}
    document.getElementById("startPlanning").click();
  }
});

document.getElementById('planUnfreezeBtn').addEventListener('click', async function() {
  const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
  if (checkedBoxes.length === 0) {
    alert("Please select at least one card to unfreeze!");
    return;
  }
  let unfreezeCount = 0;
  for (let chk of checkedBoxes) {
    const tr = chk.closest('tr');
    const tds = tr.querySelectorAll('td');
    const cardNumber = tds[2].innerText.trim();
    // Find matching doc in frozenPlans by cardNumber:
    const fSnap = await getDocs(collection(db, "frozenPlans"));
    let foundDoc = fSnap.docs.find(doc => String(doc.data().cardNumber) === cardNumber);
    if (foundDoc) {
      await deleteDoc(doc(db, "frozenPlans", foundDoc.id));
      unfreezeCount++;
    }
  }
  alert(`${unfreezeCount} card(s) unfrozen successfully!`);
  document.getElementById("showFreezePlans").dispatchEvent(new Event('change')); // Refresh table
});

// ========= Modal Open/Close Functions =========
let modalPlanData = null;

window.openPlanModal = function(planRow) {
  modalPlanData = planRow;

  // Machine dropdown fill karo
  const modalMachine = document.getElementById('modalMachine');
  modalMachine.innerHTML = allMachineNames
    .map(name => `<option value="${name}">${name}</option>`).join('');
  modalMachine.value = planRow.machine || '';

  document.getElementById('modalPriority').value = planRow.priority || '';
  document.getElementById('modalWorkingHour').value = planRow.workingHours || '';
  document.getElementById('modalLeadTime').value = planRow.cardLeadTime || '';
  document.getElementById('planModal').style.display = 'flex';
}

window.closePlanModal = function() {
  document.getElementById('planModal').style.display = 'none';
  modalPlanData = null;
}

document.getElementById('modalUpdatePlanBtn').addEventListener('click', async function() {
  if (!modalPlanData) return;
  const cardNumber = modalPlanData.cardNumber;
  const newMachine = document.getElementById('modalMachine').value;
  const newPriority = Number(document.getElementById('modalPriority').value);
  const newWorkingHour = Number(document.getElementById('modalWorkingHour').value);
  const newLeadTime = Number(document.getElementById('modalLeadTime').value);

  // 1. Find doc id in Firestore (trackingCards) using cardNumber
  const tSnap = await getDocs(query(collection(db, "trackingCards"), where("cardNumber", "==", cardNumber)));
  if (tSnap.empty) {
    alert("Card not found in trackingCards!");
    closePlanModal();
    return;
  }
  const docRef = tSnap.docs[0].ref;

  // 2. Update doc with new values
  await updateDoc(docRef, {
    machine: newMachine,
    priority: newPriority,
    workingHours: newWorkingHour,
    cardLeadTime: newLeadTime
  });

  // 3. Update local object as well for instant UI
  modalPlanData.machine = newMachine;
  modalPlanData.priority = newPriority;
  modalPlanData.workingHours = newWorkingHour;
  modalPlanData.cardLeadTime = newLeadTime;

  closePlanModal();

  // 4. Show loader, then re-run planning
  document.getElementById("loader").style.display = "block";
  setTimeout(() => {
    document.getElementById("startPlanning").click(); // Re-run planning logic
    document.getElementById("loader").style.display = "none";
  }, 500);
});
async function clearPriorityFromAllCards() {
  const q = query(collection(db, "trackingCards"));
  const querySnapshot = await getDocs(q);

  const batch = writeBatch(db);
  querySnapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, { priority: deleteField() });
  });
  await batch.commit();
}
document.getElementById('resetPriorityBtn').addEventListener('click', async function() {
  if (!confirm("Are you sure you want to RESET priority for ALL cards? This cannot be undone!")) return;
  document.getElementById("loader").style.display = "block";
  try {
    await clearPriorityFromAllCards();
    alert("All priorities have been RESET (deleted) successfully!");
    document.getElementById("startPlanning").click(); // Table refresh
  } catch(e) {
    alert("Failed to RESET priorities! " + e.message);
  }
  document.getElementById("loader").style.display = "none";
});