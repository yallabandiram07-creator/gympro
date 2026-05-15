const API = "https://gympro-mzx0.onrender.com";

let qrInterval = null;
let qrCountdown = 10;
let savedGymPlans = [];
let allMembersData = [];

function tokenOrLogin() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return null;
  }
  return token;
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

function showSection(section, btn) {
  const sections = [
    "dashboardSection",
    "gymProfileSection",
    "attendanceSection",
    "qrSection",
    "trainersSection",
    "paymentsSection",
    "whatsappSection",
    "rewardsSection"
  ];

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  if (section !== "qr") stopQRAutoRefresh();

  const activeSection = document.getElementById(section + "Section");
  if (activeSection) activeSection.style.display = "block";

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.remove("active");
  });

  if (btn) btn.classList.add("active");

  if (section === "dashboard") {
    loadMembers();
    loadAttendance();
    loadDashboardAlerts();
    loadRecentPayments();
  }

  if (section === "attendance") {
    loadMembers();
    loadAttendance();
  }

  if (section === "qr") {
    stopQRAutoRefresh(); 
    startQRAutoRefresh();
  }

  if (section === "trainers") loadTrainers();
  if (section === "payments") loadOwnerPaymentSettings();
  if (section === "whatsapp") loadWhatsAppSettings();
  if (section === "rewards") loadMembers();
}

function loadMembers() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/members", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(members => {
      const memberList = document.getElementById("memberList");
      const attendanceList = document.getElementById("attendanceMemberList");
      const rewardList = document.getElementById("rewardList");

      if (memberList) memberList.innerHTML = "";
      if (attendanceList) attendanceList.innerHTML = "";
      if (rewardList) rewardList.innerHTML = "";

      let revenue = 0;

      members.forEach(m => {
        allMembersData = members;
        revenue += Number(m.fees || 0);
        
        const expiryDate = new Date(m.expiryDate || m.expiry);

const today = new Date();

const daysLeft = Math.ceil(
  (expiryDate - today) / (1000 * 60 * 60 * 24)
);

let statusText = "Active";
let statusClass = "active-status";

if (daysLeft <= 0) {
  statusText = "Expired";
  statusClass = "expired-status";
}
else if (daysLeft <= 3) {
  statusText = "Expiring Soon";
  statusClass = "soon-status";
}

        memberList.innerHTML += `
  <li class="member-card">
    <strong>${m.name}</strong>

    <span class="${statusClass}">
  ${statusText}
</span>

    <span>Phone: ${m.phone}</span>
    <span>Plan: ${m.plan} days</span>
    <span>Fees: ₹${m.fees}</span>
    <span>Expiry: ${m.expiry}</span>
    <span>Points: ${m.points || 0}</span>

    <div style="display:flex;gap:10px;margin-top:10px;">
    <button onclick="editMember('${m._id}', '${m.name}', '${m.phone}', '${m.plan}', '${m.fees}', '${m.expiry}')" class="primary-btn">
  Edit
</button>
      <button onclick="deleteMember('${m._id}')" class="danger-btn">
        Delete
      </button>
    </div>
  </li>
`;

        if (attendanceList) {
          attendanceList.innerHTML += `
            <li>
              <strong>${m.name}</strong>
              <span>${m.phone}</span>
              <button onclick="markAttendance('${m._id}')">Mark Attendance</button>
            </li>
          `;
        }

        if (rewardList) {
          rewardList.innerHTML += `
            <li>
              <strong>${m.name}</strong>
              <span>Points: ${m.points || 0}</span>
            </li>
          `;
        }
      });

      if (document.getElementById("totalMembers")) {
        document.getElementById("totalMembers").textContent = members.length;
      }

      if (document.getElementById("totalRevenue")) {
        document.getElementById("totalRevenue").textContent = revenue;
      }
    });
}

function markAttendance(memberId) {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/attendance/" + memberId, {
    method: "POST",
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadMembers();
      loadAttendance();
    });
}

function loadAttendance() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/attendance/today", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(attendance => {
      const count = document.getElementById("todayAttendance");
      const list = document.getElementById("todayAttendanceList");

      if (count) count.textContent = attendance.length;

      if (list) {
        list.innerHTML = "";

        if (!attendance.length) {
          list.innerHTML = "<li>No attendance marked today.</li>";
          return;
        }

        attendance.forEach(a => {
          list.innerHTML += `
            <li>
              <strong>${a.memberName}</strong>
              <span>Date: ${a.date}</span>
              <span>Time: ${a.time}</span>
            </li>
          `;
        });
      }
    });
}

function loadTrainers() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/trainers", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(trainers => {
      const list = document.getElementById("trainerList");
      if (!list) return;

      list.innerHTML = "";

      if (!trainers.length) {
        list.innerHTML = "<li>No trainers added yet.</li>";
        return;
      }

      trainers.forEach(t => {
        list.innerHTML += `
          <li>
            <strong>${t.name}</strong>
            <span>Phone: ${t.phone}</span>
            <span>Email: ${t.email}</span>
          </li>
        `;
      });
    });
}

function startQRAutoRefresh() {
  generateDynamicQR();
  qrCountdown = 10;
  updateTimer();

  qrInterval = setInterval(() => {
    qrCountdown--;
    updateTimer();

    if (qrCountdown <= 0) {
      generateDynamicQR();
      qrCountdown = 10;
      updateTimer();
    }
  }, 1000);
}

function stopQRAutoRefresh() {
  if (qrInterval) {
    clearInterval(qrInterval);
    qrInterval = null;
  }
}

function updateTimer() {
  const timer = document.getElementById("qrTimer");
  if (timer) timer.textContent = qrCountdown;
}

function generateDynamicQR() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/dynamic-qr", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
      const box = document.getElementById("dynamicQrBox");
      if (!box) return;

      if (data.qr) {
        box.innerHTML = `
          <img src="${data.qr}" class="qr-img" style="width:250px;height:250px;">
          <p>This QR is valid for 10 seconds only.</p>
        `;
      } else {
        box.innerHTML = `<p>${data.message || "QR loading failed"}</p>`;
      }
    });
}

function loadOwnerPaymentSettings() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/owner-payment-settings", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
      const keyInput = document.getElementById("ownerRazorpayKeyId");
      const status = document.getElementById("paymentSettingsStatus");

      if (keyInput) keyInput.value = data.razorpayKeyId || "";
      if (status) status.textContent = data.hasSecret ? "Secret key saved." : "Secret key not added.";
    });
}

function saveOwnerPaymentSettings() {
  const token = tokenOrLogin();
  if (!token) return;

  const razorpayKeyId = document.getElementById("ownerRazorpayKeyId").value;
  const razorpayKeySecret = document.getElementById("ownerRazorpayKeySecret").value;

  fetch(API + "/owner-payment-settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ razorpayKeyId, razorpayKeySecret })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      document.getElementById("ownerRazorpayKeySecret").value = "";
      loadOwnerPaymentSettings();
    });
}

function loadWhatsAppSettings() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/whatsapp-settings", {
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(data => {
      if (document.getElementById("waPhoneNumberId")) {
        document.getElementById("waPhoneNumberId").value = data.phoneNumberId || "";
      }

      if (document.getElementById("waTemplateName")) {
        document.getElementById("waTemplateName").value = data.templateName || "hello_world";
      }

      if (document.getElementById("waLanguageCode")) {
        document.getElementById("waLanguageCode").value = data.languageCode || "en_US";
      }

      if (document.getElementById("waSettingsStatus")) {
        document.getElementById("waSettingsStatus").textContent = data.hasToken
          ? "Access token saved."
          : "Access token not added yet.";
      }
    });
}

function saveWhatsAppSettings() {
  const token = tokenOrLogin();
  if (!token) return;

  const body = {
    phoneNumberId: document.getElementById("waPhoneNumberId").value,
    accessToken: document.getElementById("waAccessToken").value,
    templateName: document.getElementById("waTemplateName").value,
    languageCode: document.getElementById("waLanguageCode").value
  };

  fetch(API + "/whatsapp-settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      document.getElementById("waAccessToken").value = "";
      loadWhatsAppSettings();
    });
}

function sendExpiryReminders() {
  const token = tokenOrLogin();
  if (!token) return;

  const result = document.getElementById("waReminderResult");
  if (result) result.textContent = "Sending reminders...";

  fetch(API + "/send-expiry-reminders", {
    method: "POST",
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(data => {
      if (result) result.textContent = data.message;
      alert(data.message);
    })
    .catch(() => {
      if (result) result.textContent = "Failed to send reminders";
    });
}

async function saveGymProfile() {
  const token = tokenOrLogin();
  if (!token) return;

  const plans = [
    {
      name: document.getElementById("plan1Name").value,
      price: Number(document.getElementById("plan1Price").value),
      days: Number(document.getElementById("plan1Days").value)
    },
    {
      name: document.getElementById("plan2Name").value,
      price: Number(document.getElementById("plan2Price").value),
      days: Number(document.getElementById("plan2Days").value)
    },
    {
      name: document.getElementById("plan3Name").value,
      price: Number(document.getElementById("plan3Price").value),
      days: Number(document.getElementById("plan3Days").value)
    }
  ].filter(p => p.name && p.price && p.days);

  const body = {
    gymName: document.getElementById("gymName").value,
    ownerName: document.getElementById("ownerName").value,
    phone: document.getElementById("gymPhone").value,
    address: document.getElementById("gymAddress").value,
    timings: document.getElementById("gymTimings").value,
    plans
  };

  const res = await fetch(API + "/gym-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  alert(data.message);

  loadGymProfileOnDashboard();
  loadGymPlansForMemberForm();
}

async function loadGymProfileOnDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(API + "/gym-profile", {
      headers: { Authorization: token }
    });

    const profile = await res.json();

    if (document.getElementById("dashboardGymName") && profile.gymName) {
      document.getElementById("dashboardGymName").innerText = "Welcome to " + profile.gymName;
    }

    if (document.getElementById("dashboardOwnerInfo") && profile.ownerName) {
      document.getElementById("dashboardOwnerInfo").innerText = "Owner: " + profile.ownerName;
    }

    let info = "";
    if (profile.phone) info += "Phone: " + profile.phone + " | ";
    if (profile.timings) info += "Timings: " + profile.timings + " | ";
    if (profile.address) info += "Address: " + profile.address;

    if (document.getElementById("dashboardGymInfo")) {
      document.getElementById("dashboardGymInfo").innerText = info;
    }

    if (document.getElementById("gymName")) document.getElementById("gymName").value = profile.gymName || "";
    if (document.getElementById("ownerName")) document.getElementById("ownerName").value = profile.ownerName || "";
    if (document.getElementById("gymPhone")) document.getElementById("gymPhone").value = profile.phone || "";
    if (document.getElementById("gymAddress")) document.getElementById("gymAddress").value = profile.address || "";
    if (document.getElementById("gymTimings")) document.getElementById("gymTimings").value = profile.timings || "";

    const plans = profile.plans || [];

    if (plans[0]) {
      document.getElementById("plan1Name").value = plans[0].name || "";
      document.getElementById("plan1Price").value = plans[0].price || "";
      document.getElementById("plan1Days").value = plans[0].days || "";
    }

    if (plans[1]) {
      document.getElementById("plan2Name").value = plans[1].name || "";
      document.getElementById("plan2Price").value = plans[1].price || "";
      document.getElementById("plan2Days").value = plans[1].days || "";
    }

    if (plans[2]) {
      document.getElementById("plan3Name").value = plans[2].name || "";
      document.getElementById("plan3Price").value = plans[2].price || "";
      document.getElementById("plan3Days").value = plans[2].days || "";
    }

  } catch (err) {
    console.log("Gym profile load error:", err);
  }
}

async function loadGymPlansForMemberForm() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(API + "/gym-profile", {
      headers: { Authorization: token }
    });

    const profile = await res.json();
    savedGymPlans = profile.plans || [];

    const select = document.getElementById("memberPlanSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Select Membership Plan</option>`;

    savedGymPlans.forEach((plan, index) => {
      select.innerHTML += `
        <option value="${index}">
          ${plan.name} - ₹${plan.price} / ${plan.days} days
        </option>
      `;
    });

  } catch (err) {
    console.log("Plan loading error:", err);
  }
}

function applySelectedPlan() {
  const index = document.getElementById("memberPlanSelect").value;
  if (index === "") return;

  const selectedPlan = savedGymPlans[index];

  document.getElementById("plan").value = selectedPlan.days;
  document.getElementById("fees").value = selectedPlan.price;
}

async function loadDashboardAlerts() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(API + "/admin-analytics", {
      headers: { Authorization: token }
    });

    const data = await res.json();
    const expiringBox = document.getElementById("expiringMembersList");

    if (!expiringBox) return;

    if (!data.expiringMembers || data.expiringMembers.length === 0) {
      expiringBox.innerHTML = "<li>No members expiring soon.</li>";
    } else {
      expiringBox.innerHTML = data.expiringMembers.map(m => `
        <li>
          <b>${m.name}</b><br>
          Phone: ${m.phone}<br>
          Expiry: ${m.expiry}<br>
          Days left: ${m.daysLeft}
        </li>
      `).join("");
    }

  } catch (err) {
    console.log("Dashboard alerts error:", err);
  }
}

async function loadRecentPayments() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(API + "/recent-payments", {
      headers: { Authorization: token }
    });

    const payments = await res.json();
    const box = document.getElementById("recentPaymentsList");

    if (!box) return;

    if (!payments.length) {
      box.innerHTML = "<li>No recent payments yet.</li>";
      return;
    }

    box.innerHTML = payments.map(p => `
      <li>
        <b>${p.memberName}</b><br>
        ₹${p.amount} - ${p.days} days<br>
        Status: ${p.status}
      </li>
    `).join("");

  } catch (err) {
    console.log("Recent payments load error:", err);
  }
}

const memberForm = document.getElementById("memberForm");

if (memberForm) {
  memberForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const token = tokenOrLogin();
    if (!token) return;

    fetch(API + "/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        password: document.getElementById("memberPass").value,
        plan: document.getElementById("plan").value,
        fees: document.getElementById("fees").value
      })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        memberForm.reset();
        loadMembers();
        loadAttendance();
        loadGymPlansForMemberForm();
      });
  });
}

const trainerForm = document.getElementById("trainerForm");

if (trainerForm) {
  trainerForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const token = tokenOrLogin();
    if (!token) return;

    fetch(API + "/trainers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        name: document.getElementById("trainerNameInput").value,
        phone: document.getElementById("trainerPhoneInput").value,
        email: document.getElementById("trainerEmailInput").value,
        password: document.getElementById("trainerPasswordInput").value
      })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        trainerForm.reset();
        loadTrainers();
      });
  });
}

function checkOwnerSubscription() {
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch(API + "/owner-subscription", {
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(data => {
      const info = document.getElementById("subscriptionInfo");
      const limitInfo = document.getElementById("memberLimitInfo");
      const app = document.getElementById("dashboardApp");
      const lock = document.getElementById("dashboardLock");

      if (data.locked) {
        if (app) app.style.display = "none";
        if (lock) lock.style.display = "flex";
        return;
      }

      if (app) app.style.display = "flex";
      if (lock) lock.style.display = "none";

      if (info) {
        info.textContent = `Current Plan: ${data.planName} | Members: ${data.memberCount}/${data.memberLimit}`;
      }

      if (limitInfo) {
        limitInfo.textContent = `Member Limit: ${data.memberCount}/${data.memberLimit}`;
      }
    });
}

window.addEventListener("load", () => {
  if (window.location.pathname.includes("dashboard.html")) {
    showSection("dashboard", document.querySelector(".nav-btn"));
    checkOwnerSubscription();
    loadGymProfileOnDashboard();
    loadGymPlansForMemberForm();
    loadDashboardAlerts();
    loadRecentPayments();
    loadMembers();
    loadAttendance();
  }
});
async function clearTodayAttendance() {
  const confirmClear = confirm("Are you sure you want to clear today attendance?");
  if (!confirmClear) return;

  const token = localStorage.getItem("token");

  const res = await fetch(API + "/attendance/clear-today", {
    method: "DELETE",
    headers: {
      Authorization: token
    }
  });

  const data = await res.json();
  alert(data.message);

  loadAttendance();
  loadMembers();
}
async function deleteMember(memberId) {
  const confirmDelete = confirm("Delete this member?");
  if (!confirmDelete) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(API + "/members/" + memberId, {
      method: "DELETE",
      headers: {
        Authorization: token
      }
    });

    const data = await res.json();

    alert(data.message);

    loadMembers();
    loadAttendance();

  } catch (err) {
    alert("Delete failed");
  }
}
async function editMember(id, oldName, oldPhone, oldPlan, oldFees, oldExpiry) {
  const name = prompt("Member name:", oldName);
  if (name === null) return;

  const phone = prompt("Phone:", oldPhone);
  if (phone === null) return;

  const plan = prompt("Plan days:", oldPlan);
  if (plan === null) return;

  const fees = prompt("Fees:", oldFees);
  if (fees === null) return;

  const expiry = prompt("Expiry date:", oldExpiry);
  if (expiry === null) return;

  const token = localStorage.getItem("token");

  const res = await fetch(API + "/members/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      name,
      phone,
      plan,
      fees,
      expiry
    })
  });

  const data = await res.json();
  alert(data.message);

  loadMembers();
  loadAttendance();
}
function filterMembers() {
  const search = document
    .getElementById("memberSearch")
    .value
    .toLowerCase();

  const filtered = allMembersData.filter(m =>
    m.name.toLowerCase().includes(search) ||
    m.phone.toLowerCase().includes(search)
  );

  const memberList = document.getElementById("memberList");

  memberList.innerHTML = "";

  filtered.forEach(m => {
    memberList.innerHTML += `
      <li class="member-card">
        <strong>${m.name}</strong>

        <span>Phone: ${m.phone}</span>
        <span>Plan: ${m.plan} days</span>
        <span>Fees: ₹${m.fees}</span>
        <span>Expiry: ${m.expiry}</span>
        <span>Points: ${m.points || 0}</span>

        <div style="display:flex;gap:10px;margin-top:10px;">
          <button onclick="editMember('${m._id}', '${m.name}', '${m.phone}', '${m.plan}', '${m.fees}', '${m.expiry}')" class="primary-btn">
            Edit
          </button>

          <button onclick="deleteMember('${m._id}')" class="danger-btn">
            Delete
          </button>
        </div>
      </li>
    `;
  });
}