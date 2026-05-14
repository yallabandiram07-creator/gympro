const API = "https://gympro-mzx0.onrender.com"

let qrInterval = null;
let qrCountdown = 10;

function hideAllSections() {
  [
    "dashboardSection",
    "analyticsSection",
    "attendanceSection",
    "qrSection",
    "trainersSection",
    "paymentsSection",
    "whatsappSection",
    "rewardsSection"
    
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function showOnly(id) {
  hideAllSections();
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}

function setActive(btn) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
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

  const activeSection = document.getElementById(section + "Section");
  if (activeSection) {
    activeSection.style.display = "block";
  }

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.remove("active");
  });

  if (btn) {
    btn.classList.add("active");
  }

  if (section === "dashboard") {
    loadMembers();
  }

  if (section === "attendance") {
    loadAttendanceMembers();
    loadTodayAttendance();
  }

  if (section === "qr") {
    loadDynamicQR();
  }

  if (section === "trainers") {
    loadTrainers();
  }

  if (section === "payments") {
    loadOwnerPaymentSettings();
  }

  if (section === "whatsapp") {
    loadWhatsAppSettings();
  }

  if (section === "rewards") {
    loadRewards();
  }
}

function tokenOrLogin() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return null;
  }
  return token;
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
        revenue += Number(m.fees || 0);

        if (memberList) {
          memberList.innerHTML += `
            <li>
              <strong>${m.name}</strong>
              <span>Phone: ${m.phone}</span>
              <span>Plan: ${m.plan} days</span>
              <span>Fees: ₹${m.fees}</span>
              <span>Expiry: ${m.expiry}</span>
              <span>Points: ${m.points || 0}</span>
            </li>
          `;
        }

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

      const totalMembers = document.getElementById("totalMembers");
      const totalRevenue = document.getElementById("totalRevenue");

      if (totalMembers) totalMembers.textContent = members.length;
      if (totalRevenue) totalRevenue.textContent = revenue;
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

function loadAnalytics() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/admin-analytics", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
      const active = document.getElementById("activeMembers");
      const expired = document.getElementById("expiredMembers");
      const soon = document.getElementById("expiringSoon");
      const list = document.getElementById("expiringMembersList");

      if (active) active.textContent = data.activeMembers || 0;
      if (expired) expired.textContent = data.expiredMembers || 0;
      if (soon) soon.textContent = data.expiringSoon || 0;

      if (list) {
        list.innerHTML = "";

        if (!data.expiringMembers || data.expiringMembers.length === 0) {
          list.innerHTML = "<li>No members expiring soon.</li>";
        } else {
          data.expiringMembers.forEach(m => {
            list.innerHTML += `
              <li>
                <strong>${m.name}</strong>
                <span>Phone: ${m.phone}</span>
                <span>Expiry: ${m.expiry}</span>
                <span>Days Left: ${m.daysLeft}</span>
              </li>
            `;
          });
        }
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
      if (box) {
        box.innerHTML = `
          <img src="${data.qr}" class="qr-img">
          <p>This QR is valid for 10 seconds only.</p>
        `;
      }
    });
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

if (window.location.pathname.includes("dashboard.html")) {
  showOnly("dashboardSection");
  checkOwnerSubscription();
  loadMembers();
  loadAttendance();
}
function checkOwnerSubscription() {
  const token = localStorage.getItem("token");

  fetch(API + "/owner-subscription", {
    headers: {
      Authorization: token
    }
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
      info.textContent =
        `Current Plan: ${data.planName} | Members: ${data.memberCount}/${data.memberLimit}`;
    }

    if (limitInfo) {
      limitInfo.textContent =
        `Member Limit: ${data.memberCount}/${data.memberLimit}`;
    }
  })
  .catch(err => {
    console.log(err);
  });
}
function loadWhatsAppSettings() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/whatsapp-settings", {
    headers: {
      Authorization: token
    }
  })
  .then(res => res.json())
  .then(data => {

    const phoneInput =
      document.getElementById("waPhoneNumberId");

    const templateInput =
      document.getElementById("waTemplateName");

    const langInput =
      document.getElementById("waLanguageCode");

    const status =
      document.getElementById("waSettingsStatus");

    if (phoneInput)
      phoneInput.value = data.phoneNumberId || "";

    if (templateInput)
      templateInput.value = data.templateName || "hello_world";

    if (langInput)
      langInput.value = data.languageCode || "en_US";

    if (status) {
      status.textContent = data.hasToken
        ? "Access token saved."
        : "Access token not added yet.";
    }
  });
}

function saveWhatsAppSettings() {
  const token = tokenOrLogin();
  if (!token) return;

  const phoneNumberId =
    document.getElementById("waPhoneNumberId").value;

  const accessToken =
    document.getElementById("waAccessToken").value;

  const templateName =
    document.getElementById("waTemplateName").value;

  const languageCode =
    document.getElementById("waLanguageCode").value;

  fetch(API + "/whatsapp-settings", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },

    body: JSON.stringify({
      phoneNumberId,
      accessToken,
      templateName,
      languageCode
    })
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

  const result =
    document.getElementById("waReminderResult");

  if (result)
    result.textContent = "Sending reminders...";

  fetch(API + "/send-expiry-reminders", {
    method: "POST",

    headers: {
      Authorization: token
    }
  })
  .then(res => res.json())
  .then(data => {

    if (result)
      result.textContent = data.message;

    alert(data.message);
  })
  .catch(err => {
    console.log(err);

    if (result)
      result.textContent = "Failed to send reminders";
  });
}
async function loadGymProfileOnDashboard() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(API + "/gym-profile", {
      headers: {
        Authorization: token
      }
    });

    const profile = await res.json();

    if (profile.gymName) {
      document.getElementById("dashboardGymName").innerText = "Welcome to " + profile.gymName;
    }

    if (profile.ownerName) {
      document.getElementById("dashboardOwnerInfo").innerText = "Owner: " + profile.ownerName;
    }

    let info = "";

    if (profile.phone) info += "Phone: " + profile.phone + " | ";
    if (profile.timings) info += "Timings: " + profile.timings + " | ";
    if (profile.address) info += "Address: " + profile.address;

    document.getElementById("dashboardGymInfo").innerText = info;

  } catch (err) {
    console.log("Gym profile load error:", err);
  }
}
window.addEventListener("load", () => {
  loadGymProfileOnDashboard();
});
let savedGymPlans = [];

async function loadGymPlansForMemberForm() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(API + "/gym-profile", {
      headers: {
        Authorization: token
      }
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
window.addEventListener("load", () => {
  loadGymPlansForMemberForm();
});