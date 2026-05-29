const API = "https://gympro-mzx0.onrender.com";
 
let qrInterval = null;
let qrCountdown = 10;
let savedGymPlans = [];
let allMembersData = [];
 
function tokenOrLogin() {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "index.html"; return null; }
  return token;
}
 
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}
 
function showSection(section, btn) {
  const sections = ["dashboardSection","gymProfileSection","attendanceSection","qrSection","trainersSection","paymentsSection","whatsappSection","rewardsSection","reportsSection","settingsSection"];
  if (section === "reports") updateReports();
  sections.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
  if (section !== "qr") stopQRAutoRefresh();
  const activeSection = document.getElementById(section + "Section");
  if (activeSection) activeSection.style.display = "block";
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
 
  if (section === "dashboard") { loadMembers(); loadAttendance(); loadDashboardAlerts(); loadRecentPayments(); }
  if (section === "attendance") {
  loadMembers();
  loadAttendance();

  setTimeout(() => {
    loadAttendanceAnalytics();
  }, 500);
}
  if (section === "qr") { stopQRAutoRefresh(); startQRAutoRefresh(); }
  if (section === "trainers") loadTrainers();
  if (section === "payments") {
  loadOwnerPaymentSettings();
  loadPaymentCommandCenter();
}
  if (section === "whatsapp") loadWhatsAppSettings();
  if (section === "rewards") {
  loadMembers();
  setTimeout(() => {
    loadPremiumRewardsPage();
    loadOwnerRedemptions();
  }, 500);
}
}
 
function loadMembers() {
  const token = tokenOrLogin();
  if (!token) return;
 
  fetch(API + "/members", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(members => {
      allMembersData = members;
      const memberList = document.getElementById("memberList");
      const attendanceList = document.getElementById("attendanceMemberList");
      const rewardList = document.getElementById("rewardList");
 
      if (memberList) memberList.innerHTML = "";

      if (!members.length) {
  memberList.innerHTML = `
    <tr>
      <td colspan="7">
        <div class="empty-state">
          <strong>No Members Yet</strong>
          <span>Add your first member to get started.</span>
        </div>
      </td>
    </tr>
  `;
}
      if (attendanceList) attendanceList.innerHTML = "";
      if (rewardList) rewardList.innerHTML = "";
 
      let revenue = 0;
      let activeCount = 0, expiredCount = 0;
 
      members.forEach(m => {
        revenue += Number(m.fees || 0);
        const expiryDate = new Date(m.expiryDate || m.expiry);
        const today = new Date();
        const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
 
        let statusText = "Active", statusClass = "active-status";
        if (daysLeft <= 0) { statusText = "Expired"; statusClass = "expired-status"; expiredCount++; }
        else if (daysLeft <= 3) { statusText = "Expiring Soon"; statusClass = "soon-status"; activeCount++; }
        else { activeCount++; }
 
        if (memberList) {
          memberList.innerHTML += `
           <tr class="member-row">
  <td>
    <div class="member-user">
      <div class="member-avatar">
        ${m.name.charAt(0).toUpperCase()}
      </div>

      <div>
        <strong>${m.name}</strong>
        <span>📞 ${m.phone}</span>
      </div>
    </div>
  </td>

  <td>
    <span class="${statusClass}">
      ${statusText}
    </span>
  </td>

  <td>${m.plan} Days</td>

  <td class="fees-cell">
    ₹${m.fees}
  </td>

  <td>${m.expiry}</td>

  <td>
    ⭐ ${m.points || 0}
  </td>

  <td>
    <div class="table-actions">
      <button onclick="editMember('${m._id}','${m.name}','${m.phone}','${m.plan}','${m.fees}','${m.expiry}')" class="primary-btn small-btn">
        Edit
      </button>

      <button onclick="manualPayment('${m._id}','${m.name}')" class="primary-btn small-btn">
        Paid
      </button>

      <button onclick="deleteMember('${m._id}')" class="danger-btn small-btn">
        Delete
      </button>
    </div>
  </td>
</tr>`;
        }
 
        if (attendanceList) {
          attendanceList.innerHTML += `
            <li>
              <strong>${m.name}</strong>
              <span>${m.phone}</span>
              <button onclick="markAttendance('${m._id}')" class="primary-btn small-btn" style="margin-top:8px;">Mark Attendance</button>
            </li>`;
        }
 
        if (rewardList) {
          rewardList.innerHTML += `
            <li>
              <strong>${m.name}</strong>
              <span>⭐ Points: ${m.points || 0}</span>
            </li>`;
        }
      });
 
      if (document.getElementById("totalMembers")) animateValue("totalMembers", 0, members.length);
      if (document.getElementById("totalRevenue")) animateValue("totalRevenue", 0, revenue);
      if (document.getElementById("totalRevenueBig")) animateValue("totalRevenueBig", 0, revenue);
      if (document.getElementById("membersDonutLabel")) document.getElementById("membersDonutLabel").innerHTML = members.length + '<br><small>Total Members</small>';
      if (document.getElementById("activeCount")) document.getElementById("activeCount").textContent = activeCount;
      if (document.getElementById("expiredCount")) document.getElementById("expiredCount").textContent = expiredCount;
      if (document.getElementById("totalLegend")) document.getElementById("totalLegend").textContent = members.length;
 
      updateMembersChart(activeCount, expiredCount);
generateAIInsights();
generateRetentionRisks();
    });
}
 
function markAttendance(memberId) {
  const token = tokenOrLogin();
  if (!token) return;
  fetch(API + "/attendance/" + memberId, { method: "POST", headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
  showToast(data.message);
  logActivity("attendance", "Attendance Marked", "Member attendance was updated");

addNotification(
  "attendance",
  "Attendance Marked",
  "Member attendance was updated"
);
  loadMembers();
  loadAttendance();
});
}
 
function loadAttendance() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/attendance/today", {
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(attendance => {
      const totalMembers = allMembersData.length || 0;
      const present = attendance.length || 0;
      const absent = Math.max(totalMembers - present, 0);
      const rate = totalMembers > 0 ? Math.round((present / totalMembers) * 100) : 0;

      if (document.getElementById("todayAttendance")) {
        document.getElementById("todayAttendance").textContent = present;
      }

      if (document.getElementById("attendanceTotalMembers")) {
        document.getElementById("attendanceTotalMembers").textContent = totalMembers;
      }

      if (document.getElementById("attendancePresentToday")) {
        document.getElementById("attendancePresentToday").textContent = present;
      }

      if (document.getElementById("attendanceAbsentToday")) {
        document.getElementById("attendanceAbsentToday").textContent = absent;
      }

      if (document.getElementById("attendanceRate")) {
        document.getElementById("attendanceRate").textContent = rate + "%";
      }

      const list = document.getElementById("todayAttendanceList");

      if (list) {
        if (!attendance.length) {
          list.innerHTML = `
            <div class="empty-attendance">
              No attendance marked today.
            </div>
          `;
        } else {
          list.innerHTML = attendance.map(a => `
            <div class="today-member-row">
              <div class="today-member-info">
                <div class="today-member-avatar">
                  ${String(a.memberName || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>${a.memberName || "Member"}</strong>
                  <span>${a.date || ""}</span>
                </div>
              </div>

              <div>
                <span style="color:#94a3b8;font-size:12px;margin-right:12px;">
                  ${a.time || ""}
                </span>
                <span class="present-badge">● Present</span>
              </div>
            </div>
          `).join("");
        }
      }

      updateAttendanceChart(present, absent);

      if (typeof generateAIInsights === "function") {
        generateAIInsights();
      }

      loadAttendanceAnalytics();
    });
}
 
let allTrainersData = [];


/* ===== Trainer section ===== */

function loadTrainers() {
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/trainers", {
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(trainers => {
      allTrainersData = trainers || [];
      renderTrainerTable(allTrainersData);
    });
}

function renderTrainerTable(trainers) {
  const list = document.getElementById("trainerList");
  if (!list) return;

  const total = trainers.length;
  const active = trainers.length;
  const inactive = 0;
  const rate = total ? Math.round((active / total) * 100) : 0;

  document.getElementById("totalTrainersCount").textContent = total;
  document.getElementById("activeTrainersCount").textContent = active;
  document.getElementById("inactiveTrainersCount").textContent = inactive;
  document.getElementById("trainerActiveRate").textContent = rate + "%";
  document.getElementById("trainerListCount").textContent = total + " Trainers";

  if (!trainers.length) {
    list.innerHTML = `
      <div style="padding:20px;color:#94a3b8;">
        No trainers added yet.
      </div>
    `;
    return;
  }

  const tags = ["Strength Training", "Bodybuilding", "Yoga", "CrossFit", "Cardio", "Functional"];
  const tagColors = ["purple", "blue", "green", "orange"];

  list.innerHTML = trainers.map((trainer, index) => {
    const initials = String(trainer.name || "T")
      .split(" ")
      .map(word => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return `
      <div class="trainer-premium-row">
        <div class="trainer-main-info">
          <div class="trainer-avatar">${initials}</div>
          <div>
            <div class="trainer-name">${trainer.name || "Trainer"}</div>
            <div class="trainer-email">${trainer.email || "No email added"}</div>
          </div>
        </div>

        <div>
          <span class="trainer-tag ${tagColors[index % tagColors.length]}">
            ${tags[index % tags.length]}
          </span>
        </div>

        <div style="color:#cbd5e1;">${3 + index} Years</div>

        <div style="color:#cbd5e1;font-size:13px;">
          📞 ${trainer.phone || "No phone"}<br>
          ✉️ ${trainer.email || "No email"}
        </div>

        <div>
          <span class="trainer-status active">● Active</span>
        </div>

        <div class="trainer-actions">
          <button class="trainer-action-btn edit-btn" onclick="openTrainerEditModal('${trainer._id}')">✎</button>
          <button class="trainer-action-btn delete-btn" onclick="openTrainerDeleteModal('${trainer._id}')">🗑</button>
        </div>
      </div>
    `;
  }).join("");
}

function filterTrainerList() {
  const search = document.getElementById("trainerSearchInput")?.value.toLowerCase() || "";
  const status = document.getElementById("trainerStatusFilter")?.value || "all";

  let filtered = allTrainersData.filter(t =>
    String(t.name || "").toLowerCase().includes(search) ||
    String(t.phone || "").toLowerCase().includes(search) ||
    String(t.email || "").toLowerCase().includes(search)
  );

  if (status === "inactive") filtered = [];
  renderTrainerTable(filtered);
}

function resetTrainerFilters() {
  document.getElementById("trainerSearchInput").value = "";
  document.getElementById("trainerStatusFilter").value = "all";
  renderTrainerTable(allTrainersData);
}

function scrollToAddTrainer() {
  const box = document.getElementById("addTrainerBox");
  if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
}
 
/* ===== QR ===== */
function startQRAutoRefresh() {
  generateDynamicQR();
  qrCountdown = 10; updateTimer();
  qrInterval = setInterval(() => {
    qrCountdown--;
    updateTimer();
    if (qrCountdown <= 0) { generateDynamicQR(); qrCountdown = 10; updateTimer(); }
  }, 1000);
}
 
function stopQRAutoRefresh() {
  if (qrInterval) { clearInterval(qrInterval); qrInterval = null; }
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
        box.innerHTML = `<img src="${data.qr}" class="qr-img"><p style="color:#64748b;font-size:13px;margin-top:10px;">Valid for 10 seconds only.</p>`;
      } else {
        box.innerHTML = `<p>${data.message || "QR loading failed"}</p>`;
      }
    });
}
 
/* ===== PAYMENT SETTINGS ===== */
function loadOwnerPaymentSettings() {
  const token = tokenOrLogin();
  if (!token) return;
  fetch(API + "/owner-payment-settings", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
      const keyInput = document.getElementById("ownerRazorpayKeyId");
      const status = document.getElementById("paymentSettingsStatus");
      if (keyInput) keyInput.value = data.razorpayKeyId || "";
      if (status) status.textContent = data.hasSecret ? "✅ Secret key saved." : "❌ Secret key not added.";
    });
}
 
function saveOwnerPaymentSettings() {
  const token = tokenOrLogin();
  if (!token) return;
  const razorpayKeyId = document.getElementById("ownerRazorpayKeyId").value;
  const razorpayKeySecret = document.getElementById("ownerRazorpayKeySecret").value;
  fetch(API + "/owner-payment-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ razorpayKeyId, razorpayKeySecret })
  }).then(res => res.json()).then(data => {
    showToast(data.message);
    document.getElementById("ownerRazorpayKeySecret").value = "";
    loadOwnerPaymentSettings();
  });
}
 
/* ===== WHATSAPP ===== */
function loadWhatsAppSettings() {
  const token = tokenOrLogin();
  if (!token) return;
  fetch(API + "/whatsapp-settings", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
      if (document.getElementById("waPhoneNumberId")) document.getElementById("waPhoneNumberId").value = data.phoneNumberId || "";
      if (document.getElementById("waTemplateName")) document.getElementById("waTemplateName").value = data.templateName || "hello_world";
      if (document.getElementById("waLanguageCode")) document.getElementById("waLanguageCode").value = data.languageCode || "en_US";
      if (document.getElementById("waSettingsStatus")) document.getElementById("waSettingsStatus").textContent = data.hasToken ? "✅ Access token saved." : "❌ Access token not added yet.";
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
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(body)
  }).then(res => res.json()).then(data => {
    showToast(data.message);
    document.getElementById("waAccessToken").value = "";
    loadWhatsAppSettings();
  });
}
 
function sendExpiryReminders() {
  const token = tokenOrLogin();
  if (!token) return;
  const result = document.getElementById("waReminderResult");
  if (result) result.textContent = "Sending reminders...";
  fetch(API + "/send-expiry-reminders", { method: "POST", headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
  if (result) result.textContent = data.message;
  showToast(data.message);
  logActivity("reminder", "Reminder Sent", "WhatsApp expiry reminder was sent");

  addNotification(
  "reminder",
  "Reminder Sent",
  "WhatsApp expiry reminder was sent"
);
})
    .catch(() => { if (result) result.textContent = "Failed to send reminders"; });
}
 
/* ===== GYM PROFILE ===== */
async function saveGymProfile() {
  const token = tokenOrLogin();
  if (!token) return;

  const plansSource = typeof dynamicGymPlans !== "undefined" ? dynamicGymPlans : [];

  const plans = plansSource
    .filter(p => p.name && p.price && p.days)
    .map(p => ({
      name: p.name,
      price: Number(p.price),
      days: Number(p.days)
    }));

  const body = {
    gymName: document.getElementById("gymName").value,
    ownerName: document.getElementById("ownerName").value,
    phone: document.getElementById("gymPhone").value,
    address: document.getElementById("gymAddress").value,
    timings: document.getElementById("gymTimings").value,
    plans: plans
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

  showToast(data.message || "Gym profile saved successfully", "success");

  loadGymProfileOnDashboard();
  loadGymPlansForMemberForm();
}
 
async function loadGymProfileOnDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(API + "/gym-profile", { headers: { Authorization: token } });
    const profile = await res.json();
    if (document.getElementById("dashboardGymName") && profile.gymName) {
      document.getElementById("dashboardGymName").innerText = "Welcome back, " + profile.gymName + " 👋";
      // Update profile bubble initials
      const bubble = document.getElementById("profileBubble");
      if (bubble && profile.gymName) bubble.textContent = profile.gymName.slice(0,2).toUpperCase();
    }
    if (document.getElementById("dashboardOwnerInfo") && profile.ownerName) {
      document.getElementById("dashboardOwnerInfo").innerText = "Owner: " + profile.ownerName;
    }
    let info = "";
    if (profile.phone) info += "Phone: " + profile.phone + " | ";
    if (profile.timings) info += "Timings: " + profile.timings + " | ";
    if (profile.address) info += "Address: " + profile.address;
    if (document.getElementById("dashboardGymInfo")) document.getElementById("dashboardGymInfo").innerText = info;
 
    if (document.getElementById("gymName")) document.getElementById("gymName").value = profile.gymName || "";
    if (document.getElementById("ownerName")) document.getElementById("ownerName").value = profile.ownerName || "";
    if (document.getElementById("gymPhone")) document.getElementById("gymPhone").value = profile.phone || "";
    if (document.getElementById("gymAddress")) document.getElementById("gymAddress").value = profile.address || "";
    if (document.getElementById("gymTimings")) document.getElementById("gymTimings").value = profile.timings || "";
 
    const plans = profile.plans || [];
    if (plans[0]) { document.getElementById("plan1Name").value = plans[0].name || ""; document.getElementById("plan1Price").value = plans[0].price || ""; document.getElementById("plan1Days").value = plans[0].days || ""; }
    if (plans[1]) { document.getElementById("plan2Name").value = plans[1].name || ""; document.getElementById("plan2Price").value = plans[1].price || ""; document.getElementById("plan2Days").value = plans[1].days || ""; }
    if (plans[2]) { document.getElementById("plan3Name").value = plans[2].name || ""; document.getElementById("plan3Price").value = plans[2].price || ""; document.getElementById("plan3Days").value = plans[2].days || ""; }
  } catch (err) { console.log("Gym profile load error:", err); }
}
 
async function loadGymPlansForMemberForm() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(API + "/gym-profile", { headers: { Authorization: token } });
    const profile = await res.json();
    savedGymPlans = profile.plans || [];
    const select = document.getElementById("memberPlanSelect");
    if (!select) return;
    select.innerHTML = `<option value="">Select Membership Plan</option>`;
    savedGymPlans.forEach((plan, index) => {
      select.innerHTML += `<option value="${index}">${plan.name} - ₹${plan.price} / ${plan.days} days</option>`;
    });
  } catch (err) { console.log("Plan loading error:", err); }
}
 
function applySelectedPlan() {
  const index = document.getElementById("memberPlanSelect").value;
  if (index === "") return;
  const selectedPlan = savedGymPlans[index];
  document.getElementById("plan").value = selectedPlan.days;
  document.getElementById("fees").value = selectedPlan.price;
}
 
/* ===== DASHBOARD ALERTS ===== */
async function loadDashboardAlerts() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(API + "/admin-analytics", { headers: { Authorization: token } });
    const data = await res.json();
 
    const alertCount = data.expiringSoon || 0;

if (document.getElementById("expiringSoonCount")) {
  document.getElementById("expiringSoonCount").textContent = alertCount;
}

 
    const expiringBox = document.getElementById("expiringMembersList");
    if (!expiringBox) return;
 
    if (!data.expiringMembers || data.expiringMembers.length === 0) {
      
      expiringBox.innerHTML = `<li class="empty-state"><strong>No expiring members</strong><span>All memberships are safe for now.</span></li>`;
    } else {

      const colors = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6"];
      expiringBox.innerHTML = data.expiringMembers.map((m, i) => {
        const initial = m.name.charAt(0).toUpperCase();
        const color = colors[i % colors.length];
        const daysClass = m.daysLeft <= 1 ? "days-red" : m.daysLeft <= 3 ? "days-orange" : "days-green";
        return `
          <li>
            <div class="dash-avatar" style="background:${color}20;color:${color}">${initial}</div>
            <div class="dash-info">
              <strong>${m.name}</strong>
              <span>📞 +91 ${m.phone}</span>
            </div>
            <div class="dash-right">
              <div class="days-left ${daysClass}">${m.daysLeft} Days Left</div>
              <small>${m.expiry}</small>
            </div>
          </li>`;
      }).join("");
    }
  } catch (err) { console.log("Dashboard alerts error:", err); }
}
 
/* ===== RECENT PAYMENTS ===== */
async function loadRecentPayments() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(API + "/recent-payments", { headers: { Authorization: token } });
    const payments = await res.json();
    const box = document.getElementById("recentPaymentsList");
    if (!box) return;
 
    if (!payments.length) {
      box.innerHTML = `<li class="empty-state"><strong>No recent payments</strong><span>Payments will appear here after collection.</span></li>`;
      return;
    }
 
    const colors = ["#22c55e","#3b82f6","#a855f7","#f97316","#ec4899"];
    box.innerHTML = payments.slice(0,5).map((p, i) => {
      const initial = p.memberName.charAt(0).toUpperCase();
      const color = colors[i % colors.length];
      return `
        <li>
          <div class="dash-avatar" style="background:${color}20;color:${color}">${initial}</div>
          <div class="dash-info">
            <strong>${p.memberName}</strong>
            <span>${p.days} Day Plan</span>
          </div>
          <div class="dash-paid-badge">✓</div>
          <div class="dash-amount">
            <strong>₹${p.amount}</strong>
            <small>${new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'})}</small>
          </div>
        </li>`;
    }).join("");
  } catch (err) { console.log("Recent payments load error:", err); }
}
 
/* ===== MEMBER FORM ===== */
const memberForm = document.getElementById("memberForm");

if (memberForm) {
  memberForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const token = tokenOrLogin();
    if (!token) return;

    const memberName = document.getElementById("name").value;

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
      showToast(data.message);

      if (typeof logActivity === "function") {
        logActivity(
          "member_added",
          "Member Added",
          memberName + " was added successfully"
        );
      }

      if (typeof addNotification === "function") {
        addNotification(
          "member",
          "New Member Added",
          memberName + " joined your gym"
        );
      }

      memberForm.reset();

      loadMembers();
      loadAttendance();
      loadGymPlansForMemberForm();
    });
  });
}
 
/* ===== TRAINER FORM ===== */
const trainerForm = document.getElementById("trainerForm");
if (trainerForm) {
  trainerForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const token = tokenOrLogin();
    if (!token) return;
    fetch(API + "/trainers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({
        name: document.getElementById("trainerNameInput").value,
        phone: document.getElementById("trainerPhoneInput").value,
        email: document.getElementById("trainerEmailInput").value,
        password: document.getElementById("trainerPasswordInput").value,
        specialization: document.getElementById("trainerSpecializationInput").value,
        experience: document.getElementById("trainerExperienceInput").value,
      })
    }).then(res => res.json()).then(data => {
      showToast(data.message);

logActivity(
  "trainer_added",
  "Trainer Added",
  document.getElementById("trainerNameInput").value + " was added successfully"
);

addNotification(
  "trainer",
  "Trainer Added",
  document.getElementById("trainerNameInput").value + " was added"
);

trainerForm.reset();
      loadTrainers();
    });
  });
}

function deleteTrainer(id) {
  openTrainerDeleteModal(id);
}

/* ===== SUBSCRIPTION CHECK ===== */
function checkOwnerSubscription() {
  const token = localStorage.getItem("token");
  if (!token) return;
  fetch(API + "/owner-subscription", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
      const info = document.getElementById("subscriptionInfo");
      const limitInfo = document.getElementById("memberLimitInfo");
      const app = document.getElementById("dashboardApp");
      const lock = document.getElementById("dashboardLock");
      if (data.locked) { if (app) app.style.display = "none"; if (lock) lock.style.display = "flex"; return; }
      if (app) app.style.display = "flex";
      if (lock) lock.style.display = "none";
      if (info) info.textContent = `Current Plan: ${data.planName} | Members: ${data.memberCount}/${data.memberLimit}`;
      if (limitInfo) limitInfo.textContent = `Member Limit: ${data.memberCount}/${data.memberLimit}`;
    });
}
 
/* ===== MEMBER ACTIONS ===== */
async function clearTodayAttendance() {
  openModal(
    "Clear Attendance",
    "Do you want to clear today's attendance? This cannot be undone.",
    "Clear",
    async function () {
      const token = localStorage.getItem("token");

      try {
        showLoader();

        const res = await fetch(API + "/attendance/clear-today", {
          method: "DELETE",
          headers: { Authorization: token }
        });

        const data = await res.json();

        hideLoader();

        if (!res.ok) {
          showToast(data.message || "Clear failed", "error");
          return;
        }

        showToast(data.message || "Today attendance cleared", "success");
        loadAttendance();
        loadMembers();

      } catch (err) {
        hideLoader();
        console.log(err);
        showToast("Clear attendance failed", "error");
      }
    }
  );
}
async function deleteMember(memberId) {
  openModal(
    "Delete Member",
    "Are you sure you want to permanently delete this member? This action cannot be undone.",
    "Delete",
    async function () {
      const token = localStorage.getItem("token");

      try {
        showLoader();

        const res = await fetch(API + "/members/" + memberId, {
          method: "DELETE",
          headers: { Authorization: token }
        });

        const data = await res.json();

        hideLoader();

        if (!res.ok) {
          showToast(data.message || "Delete failed", "error");
          return;
        }

        showToast(data.message || "Member deleted successfully", "success");
        logActivity("member_deleted", "Member Deleted", "A member was deleted from the system");

        addNotification(
         "delete",
         "Member Deleted",
         "A member was removed from your gym"
);

        await loadMembers();
        await loadAttendance();
        await loadDashboardAlerts();
        await loadRecentPayments();

      } catch (err) {
        hideLoader();
        console.log(err);
        showToast("Delete failed. Check backend route.", "error");
      }
    }
  );
}

 
function editMember(id, oldName, oldPhone, oldPlan, oldFees, oldExpiry) {
  document.getElementById("editMemberId").value = id;
  document.getElementById("editName").value = oldName;
  document.getElementById("editPhone").value = oldPhone;
  document.getElementById("editPlan").value = oldPlan;
  document.getElementById("editFees").value = oldFees;
  document.getElementById("editExpiry").value = oldExpiry;

  document.getElementById("editMemberModal").classList.remove("hidden");
}

function closeEditMemberModal() {
  document.getElementById("editMemberModal").classList.add("hidden");
}

async function saveEditedMember() {
  const id = document.getElementById("editMemberId").value;

  const body = {
    name: document.getElementById("editName").value,
    phone: document.getElementById("editPhone").value,
    plan: document.getElementById("editPlan").value,
    fees: document.getElementById("editFees").value,
    expiry: document.getElementById("editExpiry").value
  };

  const token = localStorage.getItem("token");

  try {
    showLoader();

    const res = await fetch(API + "/members/" + id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    hideLoader();

    if (!res.ok) {
      showToast(data.message || "Update failed", "error");
      return;
    }

    closeEditMemberModal();
    showToast(data.message || "Member updated successfully", "success");

    loadMembers();
    loadAttendance();
    loadDashboardAlerts();

  } catch (err) {
    hideLoader();
    console.log(err);
    showToast("Update failed", "error");
  }
}
 
function filterMembers() {
  const input = document.getElementById("memberSearch");
  const memberList = document.getElementById("memberList");

  if (!input || !memberList) return;

  const search = input.value.trim().toLowerCase();

  const status = document.getElementById("statusFilter")?.value || "all";
  const filtered = allMembersData.filter(m => {
    const name = String(m.name || "").toLowerCase();
    const phone = String(m.phone || "").toLowerCase();
    const plan = String(m.plan || "").toLowerCase();
    const fees = String(m.fees || "").toLowerCase();
    const expiry = String(m.expiry || "").toLowerCase();
const expiryDate = new Date(m.expiryDate || m.expiry);
const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

if (status === "active" && daysLeft <= 3) return false;

if (status === "expiring" && !(daysLeft > 0 && daysLeft <= 3)) return false;

if (status === "expired" && daysLeft > 0) return false;
    return (
      name.includes(search) ||
      phone.includes(search) ||
      plan.includes(search) ||
      fees.includes(search) ||
      expiry.includes(search)
    );
  });

  memberList.innerHTML = "";

  if (!filtered.length) {
    memberList.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <strong>No matching members</strong>
            <span>Try another name, phone, plan, fees, or expiry date.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(m => {
    const expiryDate = new Date(m.expiryDate || m.expiry);
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

    let statusText = "Active";
    let statusClass = "active-status";

    if (daysLeft <= 0) {
      statusText = "Expired";
      statusClass = "expired-status";
    } else if (daysLeft <= 3) {
      statusText = "Expiring Soon";
      statusClass = "soon-status";
    }

    memberList.innerHTML += `
      <tr class="member-row">
        <td>
          <div class="member-user">
            <div class="member-avatar">${String(m.name || "?").charAt(0).toUpperCase()}</div>
            <div>
              <strong>${m.name || "Unnamed"}</strong>
              <span>📞 ${m.phone || "-"}</span>
            </div>
          </div>
        </td>

        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${m.plan || 0} Days</td>
        <td class="fees-cell">₹${m.fees || 0}</td>
        <td>${m.expiry || "-"}</td>
        <td>⭐ ${m.points || 0}</td>

        <td>
          <div class="table-actions">
            <button onclick="editMember('${m._id}','${m.name || ""}','${m.phone || ""}','${m.plan || ""}','${m.fees || ""}','${m.expiry || ""}')" class="primary-btn small-btn">Edit</button>
            <button onclick="manualPayment('${m._id}','${m.name || ""}')" class="primary-btn small-btn">Paid</button>
            <button onclick="deleteMember('${m._id}')" class="danger-btn small-btn">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
}
 
function manualPayment(memberId, memberName) {
  document.getElementById("paymentMemberId").value = memberId;
  document.getElementById("paymentMemberName").value = memberName;
  document.getElementById("paymentAmount").value = "";
  document.getElementById("paymentDays").value = "";

  document.getElementById("paymentModal").classList.remove("hidden");
}

function closePaymentModal() {
  document.getElementById("paymentModal").classList.add("hidden");
}

async function saveManualPayment() {
  const memberId = document.getElementById("paymentMemberId").value;
  const amount = document.getElementById("paymentAmount").value;
  const days = document.getElementById("paymentDays").value;

  if (!amount || !days) {
    showToast("Please enter amount and days", "error");
    return;
  }

  const token = localStorage.getItem("token");

  try {
    showLoader();

    const res = await fetch(API + "/manual-payment/" + memberId, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ amount, days })
    });

    const data = await res.json();

    hideLoader();

    if (!res.ok) {
      showToast(data.message || "Payment update failed", "error");
      return;
    }

    closePaymentModal();
    showToast(data.message || "Payment marked successfully", "success");
    logActivity("payment", "Payment Collected", "₹" + amount + " payment was recorded");

    addNotification(
  "payment",
  "Payment Collected",
  "₹" + amount + " payment received"
);
    loadMembers();
    loadRecentPayments();
    loadDashboardAlerts();

  } catch (err) {
    hideLoader();
    console.log(err);
    showToast("Payment update failed", "error");
  }
}
 
function exportMembersCSV() {
  if (!allMembersData || allMembersData.length === 0) {
  showToast("No members to export", "error");
  return;
}
  let csv = "Name,Phone,Plan Days,Fees,Expiry,Points\n";
  allMembersData.forEach(m => { csv += `${m.name},${m.phone},${m.plan},${m.fees},${m.expiry},${m.points || 0}\n`; });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "gympro-members.csv"; a.click();
  window.URL.revokeObjectURL(url);
}
/* ===== CHARTS ===== */
let revenueChartObj = null, attendanceChartObj = null, membersChartObj = null;

function getRevenueNumber() {
  return Number(document.getElementById("totalRevenue")?.innerText?.replace(/,/g, "") || 0);
}

function loadPremiumCharts() {
  const revenueCanvas = document.getElementById("revenueChart");
  if (!revenueCanvas || typeof Chart === "undefined") return;

  if (revenueChartObj) {
    revenueChartObj.destroy();
  }

  const ctx = revenueCanvas.getContext("2d");
  const totalRevenue = getRevenueNumber();

  const chartData = totalRevenue > 0
  ? [
      Math.round(totalRevenue * 0.20),
      Math.round(totalRevenue * 0.40),
      Math.round(totalRevenue * 0.62),
      Math.round(totalRevenue * 0.82),
      totalRevenue
    ]
  : [1200, 2400, 4200, 5300, 6500];

  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(124, 60, 255, 0.45)");
  gradient.addColorStop(1, "rgba(37, 99, 235, 0.02)");

  revenueChartObj = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Today"],
      datasets: [{
        label: "Revenue",
        data: chartData,
        borderColor: "#8b5cf6",
        backgroundColor: gradient,
        borderWidth: 4,
        tension: 0.45,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#8b5cf6",
        pointBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000
      },
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255,255,255,0.06)"
          },
          ticks: {
            color: "#94a3b8"
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...chartData) + 1000,
          grid: {
            color: "rgba(255,255,255,0.07)"
          },
          ticks: {
            color: "#94a3b8",
            callback: function(value) {
              return "₹" + value;
            }
          }
        }
      }
    }
  });
}
function updateAttendanceChart(present, absent) {
  const canvas = document.getElementById("attendanceChart");
  if (!canvas) return;

  const total = present + absent || 1;
  const presentPct = Math.round((present / total) * 100);
  const absentPct = Math.round((absent / total) * 100);

  if (document.getElementById("attendanceDonutLabel")) {
    document.getElementById("attendanceDonutLabel").innerHTML =
      presentPct + "%<br><small>Avg. Attendance</small>";
  }

  if (document.getElementById("presentCount")) {
    document.getElementById("presentCount").textContent = `${present} (${presentPct}%)`;
  }

  if (document.getElementById("absentCount")) {
    document.getElementById("absentCount").textContent = `${absent} (${absentPct}%)`;
  }

  if (attendanceChartObj) attendanceChartObj.destroy();

  attendanceChartObj = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent"],
      datasets: [{
        data: [present || 0, absent || 0],
        backgroundColor: ["#16c784", "#ef4444"],
        borderWidth: 0,
        cutout: "72%"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function updateMembersChart(active, expired) {
  const canvas = document.getElementById("membersChart");
  if (!canvas) return;

  const paused = 0;
  const total = active + expired + paused || 1;
  const activePct = Math.round((active / total) * 100);
  const expiredPct = Math.round((expired / total) * 100);

  if (document.getElementById("activeCount")) {
    document.getElementById("activeCount").textContent = `${active} (${activePct}%)`;
  }

  if (document.getElementById("expiredCount")) {
    document.getElementById("expiredCount").textContent = `${expired} (${expiredPct}%)`;
  }

  if (membersChartObj) membersChartObj.destroy();

  membersChartObj = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Active", "Expired", "Paused"],
      datasets: [{
        data: [active || 0, expired || 0, paused],
        backgroundColor: ["#16c784", "#ef4444", "#fbbf24"],
        borderWidth: 0,
        cutout: "72%"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

/* ===== ON LOAD ===== */
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
    updateGreeting();

  setTimeout(() => {
  loadPremiumCharts();
}, 150);
  }
});
function scrollToAddMember() {
  showSection("dashboard", document.querySelector(".nav-btn"));
  setTimeout(() => {
    const nameInput = document.getElementById("name");
    if (nameInput) {
      nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
      nameInput.focus();
    }
  }, 200);
}

function toggleNotifications() {
  const dropdown = document.getElementById("notificationDropdown");
  if (!dropdown) return;

  dropdown.classList.toggle("hidden");

  const profile = document.getElementById("profileDropdown");
  if (profile) profile.classList.add("hidden");

  if (typeof renderNotifications === "function") {
    renderNotifications();
  }

  if (!dropdown.classList.contains("hidden")) {
    if (typeof markNotificationsRead === "function") {
      markNotificationsRead();
    }
  }
}

function toggleProfileMenu() {
  const dropdown = document.getElementById("profileDropdown");

  dropdown.classList.toggle("hidden");

  const notifications = document.getElementById("notificationDropdown");

  if (notifications) {
    notifications.classList.add("hidden");
  }
}

document.addEventListener("click", function (e) {
  if (
    !e.target.closest(".bell-btn") &&
    !e.target.closest("#notificationDropdown")
  ) {
    document.getElementById("notificationDropdown")?.classList.add("hidden");
  }

  if (
    !e.target.closest(".profile-bubble") &&
    !e.target.closest("#profileDropdown")
  ) {
    document.getElementById("profileDropdown")?.classList.add("hidden");
  }
});
function showOwnerProfile() {
  toggleProfileMenu();

  const ownerInfo = document.getElementById("dashboardOwnerInfo")?.innerText || "Owner details not added";
  const gymInfo = document.getElementById("dashboardGymInfo")?.innerText || "Gym details not added";
  const subscription = document.getElementById("subscriptionInfo")?.innerText || "Subscription details not loaded";

  openModal(
    "Owner Profile",
    ownerInfo + "\n\n" + gymInfo + "\n\n" + subscription,
    "Close",
    function () {},
    "primary"
  );
}
function showSettings() {
  toggleProfileMenu();
  showSection("settings", null);
}
function updateNotificationCount(count) {
  const badge = document.getElementById("notificationCount");

  if (!badge) return;

  if (count > 0) {
    badge.style.display = "flex";
    badge.innerText = count;
  } else {
    badge.style.display = "none";
  }
}
updateNotificationCount(0);
function updateGreeting() {
  const title = document.getElementById("dashboardGymName");

  if (!title) return;

  const hour = new Date().getHours();

  let greeting = "Welcome back";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  const current = title.innerText.split(",")[1] || " Gym 👋";

  title.innerText = greeting + "," + current;
}
function updateLiveTime() {
  const timeEl = document.getElementById("liveTime");

  if (!timeEl) return;

  const now = new Date();

  timeEl.innerText = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

updateLiveTime();

setInterval(updateLiveTime, 1000);
function showLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.remove("hidden");
}

function hideLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.add("hidden");
}
function showToast(message, type = "success") {
  let box = document.getElementById("toastBox");

  if (!box) {
    box = document.createElement("div");
    box.id = "toastBox";
    box.className = "toast-box";
    document.body.appendChild(box);
  }

  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.innerText = message;

  box.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.remove("hidden");
}

function hideLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.classList.add("hidden");
}
let modalCallback = null;

function openModal(title, message, confirmText, callback, type = "danger") {
  const modal = document.getElementById("appModal");
  const titleEl = document.getElementById("modalTitle");
  const messageEl = document.getElementById("modalMessage");
  const confirmBtn = document.getElementById("modalConfirmBtn");

  if (!modal || !titleEl || !messageEl || !confirmBtn) return;

  titleEl.innerText = title;
  messageEl.innerText = message;
  confirmBtn.innerText = confirmText;

  confirmBtn.className = type === "danger" ? "danger-btn" : "primary-btn";

  modalCallback = callback;
  modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("appModal");
  if (modal) modal.classList.add("hidden");
  modalCallback = null;
}

function runModalAction() {
  if (typeof modalCallback === "function") {
    modalCallback();
  }
  closeModal();
}
function animateValue(id, start, end, duration = 900) {
  const el = document.getElementById(id);

  if (!el) return;

  let startTime = null;

  function animation(currentTime) {
    if (!startTime) startTime = currentTime;

    const progress = Math.min((currentTime - startTime) / duration, 1);

    const value = Math.floor(progress * (end - start) + start);

    el.textContent = value.toLocaleString("en-IN");

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}
function updateReports() {
  let revenue = 0;
  let active = 0;
  let expired = 0;

  allMembersData.forEach(m => {
    revenue += Number(m.fees || 0);

    const expiryDate = new Date(m.expiryDate || m.expiry);
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) expired++;
    else active++;
  });

  document.getElementById("reportRevenue").innerText = revenue.toLocaleString("en-IN");
  document.getElementById("reportTotalMembers").innerText = allMembersData.length;
  document.getElementById("reportActiveMembers").innerText = active;
  document.getElementById("reportExpiredMembers").innerText = expired;
  document.getElementById("reportTodayAttendance").innerText =
    document.getElementById("todayAttendance")?.innerText || 0;
}
function toggleSidebar() {
  const sidebar = document.getElementById("mobileSidebar");

  if (!sidebar) return;

  sidebar.classList.toggle("mobile-sidebar-open");
}
const ACTIVITY_KEY = "gympro_recent_activity";

function getActivityLogs() {
  return JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
}

function saveActivityLogs(logs) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(logs.slice(0, 20)));
}

function logActivity(type, title, message) {
  const logs = getActivityLogs();

  logs.unshift({
    id: Date.now(),
    type,
    title,
    message,
    time: new Date().toISOString()
  });

  saveActivityLogs(logs);
  renderActivityLog();
}

function getActivityIcon(type) {
  const icons = {
    member_added: "👤",
    member_deleted: "🗑️",
    attendance: "✅",
    payment: "💳",
    trainer_added: "🏋️",
    reminder: "📲"
  };

  return icons[type] || "🔔";
}

function formatActivityTime(time) {
  const activityDate = new Date(time);
  const now = new Date();
  const diffMins = Math.floor((now - activityDate) / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + " mins ago";

  if (activityDate.toDateString() === now.toDateString()) {
    return "today " + activityDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  return activityDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
}

function renderActivityLog() {
  const list = document.getElementById("recentActivityList");
  if (!list) return;

  const logs = getActivityLogs();

  if (!logs.length) {
    list.innerHTML = `<p class="activity-empty">No recent activity yet</p>`;
    return;
  }

  list.innerHTML = logs.slice(0, 20).map(log => `
    <div class="activity-item">
      <div class="activity-icon">${getActivityIcon(log.type)}</div>
      <div class="activity-content">
        <strong>${log.title}</strong>
        <span>${log.message}</span>
      </div>
      <div class="activity-time">${formatActivityTime(log.time)}</div>
    </div>
  `).join("");
}

function clearActivityLog() {
  localStorage.removeItem(ACTIVITY_KEY);
  renderActivityLog();
  showToast("Activity log cleared", "success");
}

document.addEventListener("DOMContentLoaded", renderActivityLog);
setInterval(renderActivityLog, 60000);
const NOTIFICATION_KEY = "gympro_notifications";

function getNotifications() {
  return JSON.parse(localStorage.getItem(NOTIFICATION_KEY)) || [];
}

function saveNotifications(notifications) {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications.slice(0, 20)));
}

function addNotification(type, title, message) {
  const notifications = getNotifications();

  notifications.unshift({
    id: Date.now(),
    type,
    title,
    message,
    read: false,
    time: new Date().toISOString()
  });

  saveNotifications(notifications);
  renderNotifications();
}

function getNotificationClass(type) {
  const classes = {
    payment: "notif-payment",
    expiry: "notif-expiry",
    delete: "notif-delete",
    attendance: "notif-attendance",
    member: "notif-member",
    trainer: "notif-trainer",
    reminder: "notif-reminder"
  };

  return classes[type] || "notif-member";
}

function renderNotifications() {
  const list = document.getElementById("notificationList");
  if (!list) return;

  const notifications = getNotifications();

  if (!notifications.length) {
    list.innerHTML = `
      <div class="dropdown-item">
        <strong>No notifications</strong>
        <span>Your alerts will appear here.</span>
      </div>
    `;
    updateNotificationCount(0);
    return;
  }

  list.innerHTML = notifications.slice(0, 10).map(n => `
    <div class="dropdown-item">
      <strong>
        <span class="notification-dot ${getNotificationClass(n.type)}"></span>
        ${n.title}
      </strong>
      <span>${n.message}</span>
      <span class="notification-time">${formatActivityTime(n.time)}</span>
    </div>
  `).join("");

  const unread = notifications.filter(n => !n.read).length;
  updateNotificationCount(unread);
}

function markNotificationsRead() {
  const notifications = getNotifications().map(n => ({
    ...n,
    read: true
  }));

  saveNotifications(notifications);
  renderNotifications();
}

function clearNotifications() {
  localStorage.removeItem(NOTIFICATION_KEY);
  renderNotifications();
  showToast("Notifications cleared", "success");
}

document.addEventListener("DOMContentLoaded", renderNotifications);
setInterval(renderNotifications, 60000);

function generateAIInsights() {
  const box = document.getElementById("aiInsightsList");
  const summaryBox = document.getElementById("aiSummaryBox");
  const scoreEl = document.getElementById("gymHealthScore");
  const labelEl = document.getElementById("gymHealthLabel");
  const ring = document.querySelector(".health-ring");
  const ringValue = document.getElementById("healthRingValue");

  if (!box) return;

  const members = allMembersData || [];
  const totalMembers = members.length;

  let revenue = 0;
  let active = 0;
  let expired = 0;
  let expiringSoon = 0;

  members.forEach(m => {
    revenue += Number(m.fees || 0);

    const expiryDate = new Date(m.expiryDate || m.expiry);
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      expired++;
    } else {
      active++;
      if (daysLeft <= 3) expiringSoon++;
    }
  });

  const todayAttendance = Number(document.getElementById("todayAttendance")?.innerText || 0);
  const attendanceRate = totalMembers > 0 ? Math.round((todayAttendance / totalMembers) * 100) : 0;
  const activeRate = totalMembers > 0 ? Math.round((active / totalMembers) * 100) : 0;
  const expiryRisk = totalMembers > 0 ? Math.round(((expired + expiringSoon) / totalMembers) * 100) : 0;

  let healthScore = 50;

  healthScore += Math.min(activeRate * 0.3, 30);
  healthScore += Math.min(attendanceRate * 0.25, 25);
  healthScore += revenue > 0 ? 15 : 0;
  healthScore -= Math.min(expiryRisk * 0.4, 25);

  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  let healthLabel = "Needs Attention";
  if (healthScore >= 80) healthLabel = "Excellent Performance";
  else if (healthScore >= 65) healthLabel = "Healthy Business";
  else if (healthScore >= 45) healthLabel = "Needs Improvement";
  else healthLabel = "Critical Attention Needed";

  if (scoreEl) scoreEl.textContent = healthScore;
  if (labelEl) labelEl.textContent = healthLabel;
  if (ringValue) ringValue.textContent = healthScore + "%";
  if (ring) {
    const degree = Math.round((healthScore / 100) * 360);
    ring.style.background = `conic-gradient(#7c3cff ${degree}deg, rgba(255,255,255,0.08) ${degree}deg)`;
  }

  let summary = "Your gym performance is being analyzed.";

  if (totalMembers === 0) {
    summary = "Your dashboard is ready. Add members to unlock full business intelligence.";
  } else if (healthScore >= 80) {
    summary = "Your gym is performing strongly. Active member ratio, revenue, and attendance signals look healthy.";
  } else if (healthScore >= 65) {
    summary = "Your gym is stable. Focus on renewals and attendance consistency to improve growth.";
  } else if (healthScore >= 45) {
    summary = "Your gym needs attention. Expired memberships or low attendance may affect revenue.";
  } else {
    summary = "Critical business risk detected. Focus on renewals, attendance recovery, and member follow-ups immediately.";
  }

  if (summaryBox) summaryBox.textContent = summary;

  const insights = [];

  insights.push({
    title: "Health Score Analysis",
    message: "Current business health score is " + healthScore + "/100 based on members, attendance, revenue, and expiry risk.",
    action: "Track this score daily to monitor gym growth.",
    type: healthScore >= 70 ? "ai-insight-good" : "ai-insight-warning",
    score: healthScore
  });

  if (revenue > 0) {
    insights.push({
      title: "Revenue Performance",
      message: "Your tracked revenue is ₹" + revenue.toLocaleString("en-IN") + ".",
      action: "Add payment history regularly for better forecasting.",
      type: "ai-insight-good",
      score: 85
    });
  } else {
    insights.push({
      title: "Revenue Data Missing",
      message: "No revenue data is available yet.",
      action: "Collect or mark payments to activate revenue intelligence.",
      type: "ai-insight-warning",
      score: 45
    });
  }

  if (expiringSoon > 0) {
    insights.push({
      title: "Renewal Opportunity",
      message: expiringSoon + " member(s) are expiring soon.",
      action: "Send WhatsApp reminders today to improve renewals.",
      type: "ai-insight-warning",
      score: 60
    });
  }

  if (expired > 0) {
    insights.push({
      title: "Churn Risk Detected",
      message: expired + " member(s) have expired memberships.",
      action: "Call expired members or offer a renewal discount.",
      type: "ai-insight-danger",
      score: 35
    });
  }

  if (totalMembers > 0 && attendanceRate < 30) {
    insights.push({
      title: "Low Attendance Warning",
      message: "Today attendance is only " + attendanceRate + "%.",
      action: "Send motivational reminders or start a weekly challenge.",
      type: "ai-insight-warning",
      score: 50
    });
  }

  if (totalMembers > 0 && attendanceRate >= 60) {
    insights.push({
      title: "Strong Attendance",
      message: "Attendance is at " + attendanceRate + "% today.",
      action: "Maintain engagement with consistency rewards.",
      type: "ai-insight-good",
      score: 90
    });
  }

  if (activeRate >= 75) {
    insights.push({
      title: "Strong Member Base",
      message: activeRate + "% of your members are active.",
      action: "Use referral offers to grow faster.",
      type: "ai-insight-good",
      score: 88
    });
  }

  box.innerHTML = insights.slice(0, 6).map(item => `
    <div class="ai-insight-item ${item.type}">
      <span class="ai-insight-score">Score ${item.score}/100</span>
      <strong>${item.title}</strong>
      <span>${item.message}</span>
      <span class="ai-insight-action">Recommended: ${item.action}</span>
    </div>
  `).join("");
}
function generateRetentionRisks() {
  const box = document.getElementById("riskMembersList");
  const countEl = document.getElementById("riskCount");

  if (!box) return;

  const members = allMembersData || [];

  const risks = [];

  members.forEach(m => {
    const expiryDate = new Date(m.expiryDate || m.expiry);

    const daysLeft = Math.ceil(
      (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    let level = "";
    let levelClass = "";
    let action = "";
    let riskScore = 0;

    if (daysLeft <= 0) {
      level = "HIGH";
      levelClass = "risk-high";
      riskScore = 95;
      action = "Contact immediately for renewal.";
    }

    else if (daysLeft <= 3) {
      level = "MEDIUM";
      levelClass = "risk-medium";
      riskScore = 70;
      action = "Send WhatsApp reminder today.";
    }

    else if (daysLeft <= 7) {
      level = "LOW";
      levelClass = "risk-low";
      riskScore = 40;
      action = "Offer renewal plan early.";
    }

    if (level) {
      risks.push({
        name: m.name,
        phone: m.phone,
        expiry: m.expiry,
        daysLeft,
        level,
        levelClass,
        action,
        riskScore
      });
    }
  });

  risks.sort((a, b) => b.riskScore - a.riskScore);

  if (countEl) {
    countEl.textContent = risks.length;
  }

  if (!risks.length) {
    box.innerHTML = `
      <div class="risk-empty">
        No retention risk detected.
      </div>
    `;
    return;
  }

  box.innerHTML = risks.slice(0, 8).map(risk => `
    <div class="risk-member">
      <div class="risk-member-top">
        <strong>${risk.name}</strong>

        <div class="risk-level ${risk.levelClass}">
          ${risk.level}
        </div>
      </div>

      <span>📞 ${risk.phone}</span>

      <span>
        Membership expires in ${risk.daysLeft} day(s)
      </span>

      <span>
        Risk score: ${risk.riskScore}/100
      </span>

      <div class="risk-action">
        Recommended: ${risk.action}
      </div>
    </div>
  `).join("");
}
const SCHEDULE_KEY = "gympro_schedules";

function getSchedules() {
  return JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || [];
}

function saveSchedules(data) {
  localStorage.setItem(
    SCHEDULE_KEY,
    JSON.stringify(data)
  );
}

function openScheduleModal() {
  document
    .getElementById("scheduleModal")
    .classList.remove("hidden");
}

function closeScheduleModal() {
  document
    .getElementById("scheduleModal")
    .classList.add("hidden");
}

function saveSchedule() {
  const title = document.getElementById("scheduleTitle").value.trim();
  let date = document.getElementById("scheduleDate").value;
  const priority = document.getElementById("schedulePriority").value;
  const note = document.getElementById("scheduleNote").value.trim();

  if (!title) {
    showToast("Please enter schedule title", "error");
    return;
  }

  if (!date) {
    showToast("Please select date and time", "error");
    return;
  }

  const schedules = getSchedules();

  schedules.unshift({
    id: Date.now(),
    title,
    date,
    priority,
    note
  });

  saveSchedules(schedules);
  renderSchedules();
  closeScheduleModal();

  showToast("Schedule added successfully", "success");

  if (typeof addNotification === "function") {
    addNotification(
      "member",
      "New Schedule Added",
      title + " scheduled successfully"
    );
  }

  if (typeof logActivity === "function") {
    logActivity(
      "member_added",
      "Schedule Added",
      title + " was added to schedule manager"
    );
  }

  document.getElementById("scheduleTitle").value = "";
  document.getElementById("scheduleDate").value = "";
  document.getElementById("schedulePriority").value = "normal";
  document.getElementById("scheduleNote").value = "";
}

  
function deleteSchedule(id) {
  const schedules = getSchedules().filter(
    s => s.id !== id
  );

  saveSchedules(schedules);

  renderSchedules();

  showToast("Schedule deleted", "success");
}

function renderSchedules() {
  const box = document.getElementById("scheduleList");

  if (!box) return;

  const schedules = getSchedules();

  if (!schedules.length) {
    box.innerHTML = `
      <div class="schedule-empty">
        No schedules added yet.
      </div>
    `;
    return;
  }

  schedules.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  box.innerHTML = schedules.map(schedule => `
    <div class="schedule-item">

      <div class="schedule-top">
        <strong>${schedule.title}</strong>

        <div class="schedule-priority priority-${schedule.priority}">
          ${schedule.priority.toUpperCase()}
        </div>
      </div>

      <div class="schedule-time">
        📅 ${new Date(schedule.date).toLocaleString("en-IN")}
      </div>

      <div class="schedule-note">
        ${schedule.note || "No additional notes"}
      </div>

      <button
        class="schedule-delete"
        onclick="deleteSchedule(${schedule.id})"
      >
        Delete
      </button>

    </div>
  `).join("");
}

document.addEventListener(
  "DOMContentLoaded",
  renderSchedules
);
function updateGymProfilePreview() {
  const gymName = document.getElementById("gymName")?.value.trim() || "Your Gym";
  const ownerName = document.getElementById("ownerName")?.value.trim() || "Owner not added";
  const phone = document.getElementById("gymPhone")?.value.trim() || "Phone not added";
  const timings = document.getElementById("gymTimings")?.value.trim() || "Timings not added";
  const address = document.getElementById("gymAddress")?.value.trim() || "Address not added";

  const avatar = document.getElementById("previewAvatar");
  const previewGym = document.getElementById("previewGymName");
  const previewOwner = document.getElementById("previewOwnerName");
  const previewMeta = document.getElementById("previewGymMeta");
  const previewAddress = document.getElementById("previewAddress");

  if (avatar) avatar.textContent = gymName.slice(0, 2).toUpperCase();
  if (previewGym) previewGym.textContent = gymName;
  if (previewOwner) previewOwner.textContent = "Owner: " + ownerName;
  if (previewMeta) previewMeta.textContent = "📞 " + phone + " • ⏰ " + timings;
  if (previewAddress) previewAddress.textContent = "📍 " + address;

  const fields = ["gymName", "ownerName", "gymPhone", "gymAddress", "gymTimings"];
  let filled = 0;

  fields.forEach(id => {
    if (document.getElementById(id)?.value.trim()) filled++;
  });

  const score = Math.round((filled / fields.length) * 100);

  const scoreEl = document.getElementById("profileCompletionScore");
  const bar = document.getElementById("completionBarFill");
  const steps = document.getElementById("profileCompletionSteps");
  const text = document.getElementById("profileCompletionText");
  const ring = document.querySelector(".gp-ring");

  if (scoreEl) scoreEl.textContent = score;
  if (bar) bar.style.width = score + "%";
  if (steps) steps.textContent = filled + " of " + fields.length + " sections completed";

  if (text) {
    text.textContent = score === 100 ? "Great job! Keep going." : "Complete your profile details.";
  }

  if (ring) {
    const deg = Math.round((score / 100) * 360);
    ring.style.background = `conic-gradient(#7c3cff ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)`;
  }
}

function syncOldPlanInputsFromDynamicPlans() {
  const ids = [
    ["plan1Name", "plan1Price", "plan1Days"],
    ["plan2Name", "plan2Price", "plan2Days"],
    ["plan3Name", "plan3Price", "plan3Days"]
  ];

  ids.forEach((set, index) => {
    const plan = dynamicGymPlans[index] || {};
    if (document.getElementById(set[0])) document.getElementById(set[0]).value = plan.name || "";
    if (document.getElementById(set[1])) document.getElementById(set[1]).value = plan.price || "";
    if (document.getElementById(set[2])) document.getElementById(set[2]).value = plan.days || "";
  });
}

function renderDynamicPlans() {
  const box = document.getElementById("dynamicPlansList");
  if (!box) return;

  if (!dynamicGymPlans.length) {
    dynamicGymPlans = [
      { name: "", price: "", days: "" },
      { name: "", price: "", days: "" },
      { name: "", price: "", days: "" }
    ];
  }

  const icons = ["◆", "☆", "🔥", "⚡", "♟", "♣", "🏆", "💪"];
  const desc = [
    "Our best value plan for serious fitness enthusiasts",
    "Perfect for commitment seekers",
    "Great for getting started",
    "Short term flexibility",
    "Special pricing for students",
    "Special care for senior members",
    "Premium transformation plan",
    "Advanced fitness membership"
  ];

  box.innerHTML = dynamicGymPlans.map((plan, index) => {
    const planName = plan.name || "New Plan";
    const price = Number(plan.price || 0);
    const days = Number(plan.days || 0);
    const months = days >= 30 ? Math.round(days / 30) : days;

    return `
      <div class="gp-plan-row gp-plan-color-${index % 6}">
        <div class="gp-drag">⋮⋮</div>

        <div class="gp-plan-icon">${icons[index % icons.length]}</div>

        <div class="gp-plan-info">
          <strong>
            ${index + 1}. ${planName}
            ${index === 0 ? '<span class="gp-popular-badge">Popular</span>' : ""}
          </strong>
          <span>${desc[index % desc.length]}</span>
        </div>

        <div class="gp-plan-meta gp-plan-duration">
          <span>Duration</span>
          <strong>
            <span class="gp-mini-icon">📅</span>
            ${months} ${days >= 30 ? "Months" : "Days"}
          </strong>
        </div>

        <div class="gp-plan-meta gp-plan-price">
          <span>Price</span>
          <strong>
            <span class="gp-rupee-big">₹</span>
            ${price.toLocaleString("en-IN")}
          </strong>
        </div>

        <div class="gp-feature-list">
          <div><span class="gp-feature-check">✓</span> All Access</div>
          <div><span class="gp-feature-check">✓</span> ${index === 0 ? "Personal Trainer" : index === 1 ? "Group Classes" : index === 4 ? "Student Discount" : index === 5 ? "Health Support" : "Basic Support"}</div>
        </div>

        <button class="gp-plan-edit" onclick="editPlanInline(${index})">✎</button>

        <button class="gp-plan-remove" onclick="deleteDynamicPlan(${index})">🗑</button>

        <div class="gp-toggle"></div>
      </div>
    `;
  }).join("");

  box.innerHTML += `
    <div class="gp-plan-footer">
      <span>ⓘ Drag and drop to reorder plans</span>
      <span>Total Plans: ${dynamicGymPlans.filter(p => p.name && p.price && p.days).length}</span>
    </div>
  `;

  updateDynamicPlanStats();
  syncOldPlanInputsFromDynamicPlans();
}

function updateDynamicPlan(index, field, value) {
  dynamicGymPlans[index][field] = value;
  updateDynamicPlanStats();
  syncOldPlanInputsFromDynamicPlans();
}

function addMembershipPlanBox() {
  dynamicGymPlans.push({
    name: "",
    price: "",
    days: ""
  });

  renderDynamicPlans();
}

function deleteDynamicPlan(index) {
  dynamicGymPlans.splice(index, 1);

  if (!dynamicGymPlans.length) {
    dynamicGymPlans.push({ name: "", price: "", days: "" });
  }

  renderDynamicPlans();
}

function updateDynamicPlanStats() {
  const validPlans = dynamicGymPlans.filter(p => p.name && p.price && p.days);

  const totalEl = document.getElementById("totalPlansCount");
  const avgEl = document.getElementById("averagePlanPrice");
  const popularEl = document.getElementById("popularPlanDuration");

  if (totalEl) totalEl.textContent = validPlans.length;

  if (validPlans.length) {
    const avg = Math.round(
      validPlans.reduce((sum, p) => sum + Number(p.price || 0), 0) / validPlans.length
    );

    if (avgEl) avgEl.textContent = avg.toLocaleString("en-IN");

    const sorted = [...validPlans].sort((a, b) => Number(b.days) - Number(a.days));
    if (popularEl) popularEl.textContent = sorted[0].days + " Days";
  } else {
    if (avgEl) avgEl.textContent = "0";
    if (popularEl) popularEl.textContent = "-";
  }
}

async function saveDynamicPlans() {
  syncOldPlanInputsFromDynamicPlans();
  await saveGymProfile();

  if (typeof showToast === "function") {
    showToast("Membership plans saved", "success");
  }
}

async function loadDynamicPlansFromOldInputs() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch(API + "/gym-profile", {
    headers: { Authorization: token }
  });

  const profile = await res.json();

  dynamicGymPlans = profile.plans && profile.plans.length
    ? profile.plans.map(p => ({
        name: p.name || "",
        price: p.price || "",
        days: p.days || ""
      }))
    : [
        { name: "", price: "", days: "" },
        { name: "", price: "", days: "" },
        { name: "", price: "", days: "" }
      ];

  renderDynamicPlans();
}

setTimeout(loadDynamicPlansFromOldInputs, 800);

function scrollToGymDetails() {
  const input = document.getElementById("gymName");
  if (input) {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus();
  }
}

function scrollToPlans() {
  const plans = document.querySelector(".gp-plans-card");
  if (plans) {
    plans.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function previewGymProfile() {
  updateGymProfilePreview();
  showToast("Profile preview updated", "success");
}
function editPlanInline(index) {
  const plan = dynamicGymPlans[index];

  document.getElementById("editPlanIndex").value = index;
  document.getElementById("editPlanNameModal").value = plan.name || "";
  document.getElementById("editPlanPriceModal").value = plan.price || "";
  document.getElementById("editPlanDaysModal").value = plan.days || "";

  document.getElementById("planEditModal").classList.remove("hidden");
}
function closePlanEditModal() {
  document.getElementById("planEditModal").classList.add("hidden");
}

function saveEditedPlanModal() {
  const index = Number(document.getElementById("editPlanIndex").value);

  const name = document.getElementById("editPlanNameModal").value.trim();
  const price = document.getElementById("editPlanPriceModal").value;
  const days = document.getElementById("editPlanDaysModal").value;

  if (!name || !price || !days) {
    showToast("Please fill all plan details", "error");
    return;
  }

  dynamicGymPlans[index] = {
    name,
    price,
    days
  };

  renderDynamicPlans();
  closePlanEditModal();

  showToast("Plan updated", "success");
}
let attendanceOverviewChartObj = null;

function scrollToAttendanceMembers() {
  const list = document.getElementById("attendanceMemberList");
  if (list) {
    list.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  showToast("Member attendance list is loading", "success");
}

function renderAttendanceOverviewChart(rate = 0) {
  const canvas = document.getElementById("attendanceOverviewChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (attendanceOverviewChartObj) {
    attendanceOverviewChartObj.destroy();
  }

  const base = Math.max(rate, 20);

  const data = [
    Math.max(base - 14, 5),
    Math.max(base - 7, 10),
    base,
    Math.min(base + 8, 100),
    Math.max(base - 4, 5),
    Math.min(base + 12, 100),
    Math.max(base - 2, 5)
  ];

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, "rgba(124,60,255,0.45)");
  gradient.addColorStop(1, "rgba(37,99,235,0.02)");

  attendanceOverviewChartObj = new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"],
      datasets: [{
        data,
        borderColor: "#7c3cff",
        backgroundColor: gradient,
        borderWidth: 4,
        tension: 0.42,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#7c3cff",
        pointBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#94a3b8" }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#94a3b8",
            callback: value => value + "%"
          }
        }
      }
    }
  });
}
function scrollToAttendanceMembers() {
  const panel = document.getElementById("manualAttendancePanel");

  if (panel) {
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
async function loadAttendanceAnalytics() {
  const token = tokenOrLogin();
  if (!token) return;

  try {
    const res = await fetch(API + "/attendance/today", {
      headers: { Authorization: token }
    });

    const attendance = await res.json();

    const totalMembers = allMembersData.length || 0;
    const present = attendance.length || 0;
    const rate = totalMembers > 0 ? Math.round((present / totalMembers) * 100) : 0;

    const labels = ["Today"];
    const chartData = [rate];

    document.getElementById("bestAttendanceDay").innerText = rate + "%";
    document.getElementById("worstAttendanceDay").innerText = rate + "%";
    document.getElementById("totalMarkedAttendance").innerText = present;
    document.getElementById("totalMissedAttendance").innerText = Math.max(totalMembers - present, 0);

    renderRealAttendanceChart(labels, chartData);

  } catch (err) {
    console.log("Attendance analytics failed:", err);
  }
}

function renderRealAttendanceChart(labels, chartData) {
  const canvas = document.getElementById("attendanceOverviewChart");
  if (!canvas || typeof Chart === "undefined") {
    console.log("Chart canvas or Chart.js missing");
    return;
  }

  if (attendanceOverviewChartObj) {
    attendanceOverviewChartObj.destroy();
  }

  const finalLabels = labels.length ? labels : ["No Data"];
  const finalData = chartData.length ? chartData : [0];

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, "rgba(124,60,255,0.45)");
  gradient.addColorStop(1, "rgba(37,99,235,0.02)");

  attendanceOverviewChartObj = new Chart(ctx, {
    type: "line",
    data: {
      labels: finalLabels,
      datasets: [{
        data: finalData,
        borderColor: "#7c3cff",
        backgroundColor: gradient,
        borderWidth: 4,
        tension: 0.42,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#7c3cff",
        pointBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: "#94a3b8",
            callback: value => value + "%"
          },
          grid: { color: "rgba(255,255,255,0.06)" }
        },
        x: {
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(255,255,255,0.05)" }
        }
      }
    }
  });
}
function openTrainerEditModal(id) {
  const trainer = allTrainersData.find(t => t._id === id);
  if (!trainer) return;

  document.getElementById("editTrainerId").value = trainer._id;
  document.getElementById("editTrainerName").value = trainer.name || "";
  document.getElementById("editTrainerPhone").value = trainer.phone || "";
  document.getElementById("editTrainerEmail").value = trainer.email || "";
  document.getElementById("editTrainerSpecialization").value = trainer.specialization || "Strength Training";
  document.getElementById("editTrainerExperience").value = trainer.experience || "";

  document.getElementById("trainerEditModal").classList.remove("hidden");
}

function closeTrainerEditModal() {
  document.getElementById("trainerEditModal").classList.add("hidden");
}

function openTrainerDeleteModal(id) {
  document.getElementById("deleteTrainerId").value = id;
  document.getElementById("trainerDeleteModal").classList.remove("hidden");
}

function closeTrainerDeleteModal() {
  document.getElementById("trainerDeleteModal").classList.add("hidden");
}

function confirmDeleteTrainer() {
  const id = document.getElementById("deleteTrainerId").value;
  const token = tokenOrLogin();
  if (!token) return;

  fetch(API + "/trainers/" + id, {
    method: "DELETE",
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(data => {
      closeTrainerDeleteModal();
      showToast(data.message || "Trainer deleted", "success");
      loadTrainers();
    });
}
function saveTrainerEdit() {
  const id = document.getElementById("editTrainerId").value;
  const token = tokenOrLogin();
  if (!token) return;

  const body = {
    name: document.getElementById("editTrainerName").value.trim(),
    phone: document.getElementById("editTrainerPhone").value.trim(),
    email: document.getElementById("editTrainerEmail").value.trim(),
    specialization: document.getElementById("editTrainerSpecialization").value,
    experience: document.getElementById("editTrainerExperience").value,
    status: "active"
  };

  fetch(API + "/trainers/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(data => {
      closeTrainerEditModal();
      showToast(data.message || "Trainer updated", "success");
      loadTrainers();
    });
}
/* ===== PREMIUM PAYMENT COMMAND CENTER ===== */

let paymentRevenueChartObj = null;
let paymentStatusDonutObj = null;
let paymentCommandData = {
  payments: [],
  monthlyData: []
};

async function loadPaymentCommandCenter() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(API + "/payment-command-center", {
      headers: { Authorization: token }
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Payment analytics failed", "error");
      return;
    }

    paymentCommandData = data;

    setText("payTotalRevenue", Number(data.totalRevenue || 0).toLocaleString("en-IN"));
    setText("payMonthRevenue", Number(data.monthRevenue || 0).toLocaleString("en-IN"));
    setText("payTodayRevenue", Number(data.todayRevenue || 0).toLocaleString("en-IN"));
    setText("payPendingAmount", Number(data.pendingAmount || 0).toLocaleString("en-IN"));
    setText("payExpiredMembers", data.expiredMembers || 0);
    setText("payPendingCount", data.pendingCount || 0);

    setText("payTotalMembersDonut", data.totalMembers || 0);
    setText("paidMembersCount", data.paidMembers || 0);
    setText("unpaidMembersCount", data.unpaidMembers || 0);
    setText("expiredMembersCountPay", data.expiredMembers || 0);

    renderPaymentRevenueChart(data.monthlyData || []);
    renderPaymentDonut(data);
    renderPaymentsTable();
    renderPaymentStatusBars();
    loadRazorpayVisualStatus();

  } catch (err) {
    console.log("Payment command center error:", err);
    showToast("Payment analytics loading failed", "error");
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function renderPaymentRevenueChart(monthlyData) {
  const canvas = document.getElementById("paymentRevenueChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (paymentRevenueChartObj) paymentRevenueChartObj.destroy();

  paymentRevenueChartObj = new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{
        label: "Revenue",
        data: monthlyData,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(124, 60, 255, 0.22)",
        fill: true,
        tension: 0.45,
        borderWidth: 4,
        pointRadius: 5,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#8b5cf6",
        pointBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(255,255,255,0.06)" }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
            callback: value => "₹" + value
          },
          grid: { color: "rgba(255,255,255,0.06)" }
        }
      }
    }
  });
}

function renderPaymentDonut(data) {
  const canvas = document.getElementById("paymentStatusDonut");
  if (!canvas || typeof Chart === "undefined") return;

  if (paymentStatusDonutObj) paymentStatusDonutObj.destroy();

  paymentStatusDonutObj = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Paid", "Unpaid", "Expired"],
      datasets: [{
        data: [
          Number(data.paidMembers || 0),
          Number(data.unpaidMembers || 0),
          Number(data.expiredMembers || 0)
        ],
        backgroundColor: ["#22c55e", "#f59e0b", "#f43f5e"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "74%",
      plugins: { legend: { display: false } }
    }
  });
}

function renderPaymentsTable() {
  const tbody = document.getElementById("paymentHistoryTable");
  if (!tbody) return;

  const search = (document.getElementById("paymentSearchInput")?.value || "").toLowerCase();
  const status = document.getElementById("paymentStatusFilter")?.value || "all";

  let payments = paymentCommandData.payments || [];

  if (status !== "all") {
    payments = payments.filter(p => p.status === status);
  }

  payments = payments.filter(p =>
    String(p.memberName || "").toLowerCase().includes(search) ||
    String(p.phone || "").toLowerCase().includes(search)
  );

  if (!payments.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <strong>No payments found</strong>
            <span>Payments will appear here after collections.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = payments.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div class="pay-member">
          <div class="pay-avatar">${String(p.memberName || "M").charAt(0).toUpperCase()}</div>
          <strong>${p.memberName || "-"}</strong>
        </div>
      </td>
      <td>${p.phone || "-"}</td>
      <td>₹${Number(p.amount || 0).toLocaleString("en-IN")}</td>
      <td>${p.days || 0} Days</td>
      <td><span class="pay-status ${p.status || "created"}">${p.status || "created"}</span></td>
      <td>${p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN") : "-"}</td>
      <td>👁</td>
    </tr>
  `).join("");
}

function renderPaymentStatusBars() {
  const payments = paymentCommandData.payments || [];
  const total = payments.length || 1;

  const paid = payments.filter(p => p.status === "paid").length;
  const pending = payments.filter(p => p.status === "pending").length;
  const created = payments.filter(p => p.status === "created").length;
  const failed = payments.filter(p => p.status === "failed").length;

  updateProgress("paid", paid, total);
  updateProgress("pending", pending, total);
  updateProgress("created", created, total);
  updateProgress("failed", failed, total);
}

function updateProgress(type, value, total) {
  const percent = Math.round((value / total) * 100);

  const bar = document.getElementById(type + "Progress");
  const label = document.getElementById(type + "Percent");

  if (bar) bar.style.width = percent + "%";
  if (label) label.innerText = percent + "%";
}

async function loadRazorpayVisualStatus() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(API + "/owner-payment-settings", {
      headers: { Authorization: token }
    });

    const data = await res.json();

    setText("payRazorpayKeyText", data.razorpayKeyId || "Not Added");
    setText("payRazorpaySecretText", data.hasSecret ? "••••••••••••••" : "Not Added");

  } catch (err) {
    console.log("Razorpay status error:", err);
  }
}

function testRazorpayStatus() {
  showToast("Razorpay settings checked", "success");
}

function openPaymentCommandModal() {
  showSection("dashboard", document.querySelector(".nav-btn"));

  setTimeout(() => {
    const search = document.getElementById("memberSearch");
    if (search) {
      search.focus();
      showToast("Search member and click Paid button to add manual payment", "success");
    }
  }, 300);
}

function exportPaymentsCSV() {
  const payments = paymentCommandData.payments || [];

  if (!payments.length) {
    showToast("No payments to export", "error");
    return;
  }

  let csv = "Member,Phone,Amount,Days,Status,Date\n";

  payments.forEach(p => {
    csv += `${p.memberName || ""},${p.phone || ""},${p.amount || 0},${p.days || 0},${p.status || ""},${p.createdAt || ""}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "gympro-payments.csv";
  a.click();

  window.URL.revokeObjectURL(url);
}

function scrollToRazorpaySettings() {
  const box = document.getElementById("razorpaySettingsBox");
  if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
}
function updateWhatsAppPremiumUI() {
  const hasTokenText = document.getElementById("waSettingsStatus")?.innerText || "";
  const pending = document.getElementById("expiringSoonCount")?.innerText || "0";

  if (document.getElementById("waPendingMembers")) {
    document.getElementById("waPendingMembers").innerText = pending;
  }

  if (document.getElementById("waHistoryRecipients")) {
    document.getElementById("waHistoryRecipients").innerText = pending;
  }

  if (document.getElementById("waApiStatus")) {
    if (hasTokenText.includes("saved")) {
      document.getElementById("waApiStatus").innerText = "Connected";
      document.getElementById("waApiSub").innerText = "Everything is working fine";
    } else {
      document.getElementById("waApiStatus").innerText = "Not Connected";
      document.getElementById("waApiSub").innerText = "Add access token first";
    }
  }
}

const oldLoadWhatsAppSettings = loadWhatsAppSettings;
loadWhatsAppSettings = function () {
  oldLoadWhatsAppSettings();
  setTimeout(updateWhatsAppPremiumUI, 600);
};

const oldSendExpiryReminders = sendExpiryReminders;
sendExpiryReminders = function () {
  oldSendExpiryReminders();
  setTimeout(updateWhatsAppPremiumUI, 800);
};
function loadPremiumRewardsPage() {
  const members = allMembersData || [];
  const totalPoints = members.reduce((sum, m) => sum + Number(m.points || 0), 0);

  const sorted = [...members].sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
  const top = sorted[0];

  setText("rewardTotalPoints", totalPoints.toLocaleString("en-IN"));
  setText("rewardEarnedPoints", totalPoints.toLocaleString("en-IN"));
  setText("rewardRedeemedPoints", "0");
  setText("rewardAvailableShopPoints", totalPoints.toLocaleString("en-IN"));
  setText("rewardTopMember", top ? top.name : "-");
  setText("rewardTopPoints", top ? `${top.points || 0} Points` : "0 Points");

  const progress = Math.min(Math.round((totalPoints / 1500) * 100), 100);
  const fill = document.getElementById("rewardProgressFill");
  if (fill) fill.style.width = progress + "%";
  setText("rewardProgressText", totalPoints.toLocaleString("en-IN"));

  const board = document.getElementById("rewardLeaderboard");
  if (board) {
    board.innerHTML = sorted.slice(0, 5).map((m, i) => `
      <div class="reward-leaderboard-row">
        <div class="reward-rank">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
        <div class="reward-member-name">${m.name}</div>
        <div class="reward-member-points">${m.points || 0} Points</div>
      </div>
    `).join("");
  }
}

function redeemReward(itemName, pointsRequired) {

  const modal = document.getElementById("rewardPreviewModal");

  const name = document.getElementById("previewRewardName");
  const img = document.getElementById("previewRewardImage");
  const text = document.getElementById("previewRewardText");
  const points = document.getElementById("previewRewardPoints");

  const imageMap = {

    "Gym Sticker Pack": "images/sticker-pack.png",
    "Wrist Band": "images/wrist-band.png",
    "Shaker Bottle": "images/shaker.png",
    "Jump Rope": "images/jump-rope.png",
    "Gym Towel": "images/towel.png",
    "Resistance Band": "images/resistance-band.png",
    "Gym Cap": "images/cap.png",
    "Gym Gloves": "images/gloves.png",
    "GymPro T-Shirt": "images/gympro-shirt.png",
    "Gym Bag": "images/gym-bag.png",
    "Creatine 300g": "images/creatine.png",
    "Premium Bottle": "images/premium-bottle.png",
    "Whey Protein 1kg": "images/whey.png",
    "Lifting Belt": "images/lifting-belt.png",
    "Supplement Hamper": "images/supplement-hamper.png"

  };

  name.innerText = itemName;

  img.src =
    imageMap[itemName] || "images/gympro-shirt.png";

  points.innerText =
    pointsRequired.toLocaleString("en-IN");

  text.innerText =
    "Premium GymPro reward product preview.";

  modal.classList.remove("hidden");
}

function closeRewardPreview() {
  document
    .getElementById("rewardPreviewModal")
    .classList.add("hidden");
}

let redemptionsV2 = [];

async function loadOwnerRedemptions() {
  const token = tokenOrLogin();
  if (!token) return;

  const tbody = document.getElementById("redemptionTableBodyV2");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6">
        <div class="redemption-empty">Loading redemptions...</div>
      </td>
    </tr>
  `;

  try {
    const res = await fetch(API + "/owner-redemptions", {
      headers: { Authorization: token }
    });

    const data = await res.json();
    redemptionsV2 = Array.isArray(data) ? data : [];

    updateRedemptionKpis();
    renderRedemptionsV2();

  } catch (err) {
    console.log("Redemption load failed:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="redemption-empty">Failed to load redemptions.</div>
        </td>
      </tr>
    `;
  }
}

function updateRedemptionKpis() {
  setText("totalRedemptionRequests", redemptionsV2.length);
  setText("pendingRedemptionRequests", redemptionsV2.filter(r => String(r.status || "pending").toLowerCase() === "pending").length);
  setText("deliveredRedemptionRequests", redemptionsV2.filter(r => String(r.status || "").toLowerCase() === "delivered").length);
  setText("rejectedRedemptionRequests", redemptionsV2.filter(r => String(r.status || "").toLowerCase() === "rejected").length);
}

function renderRedemptionsV2() {
  const listBox = document.getElementById("redemptionTableBodyV2");
  if (!listBox) return;

  const filter = String(document.getElementById("redemptionStatusFilterV2")?.value || "all").toLowerCase();

  let list = redemptionsV2.map(r => ({
    ...r,
    status: String(r.status || "pending").toLowerCase()
  }));

  if (filter !== "all") {
    list = list.filter(r => r.status === filter);
  }

  if (!list.length) {
    listBox.innerHTML = `<div class="redemption-empty">No reward redemption requests found.</div>`;
    return;
  }

  listBox.innerHTML = list.map(r => {
    const status = String(r.status || "pending").toLowerCase();
    const memberName = r.memberName || "Member";
    const initial = memberName.charAt(0).toUpperCase();

    return `
      <div class="premium-redemption-row">
        <div class="redemption-member">
          <div class="redemption-avatar">${initial}</div>
          <div>
            <strong>${memberName}</strong>
            <span>Member request</span>
          </div>
        </div>

        <div class="redemption-reward">
          <img src="${r.image || "images/gympro-shirt.png"}">
          <div>
            <strong>${r.rewardName || "Reward"}</strong>
            <span>🪙 ${Number(r.points || 0).toLocaleString("en-IN")} Points</span>
          </div>
        </div>

        <div class="redemption-date">
          <strong>${r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "-"}</strong>
          <span>${r.createdAt ? new Date(r.createdAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : ""}</span>
        </div>

        <span class="redemption-badge ${status}">
          ${status.toUpperCase()}
        </span>

        <div class="redemption-actions">
          ${
            status === "pending"
              ? `
                <button class="primary-btn small-btn" onclick="openRedemptionConfirmModal('${r._id}','delivered','${r.rewardName || "Reward"}')">
                  Delivered
                </button>
                <button class="danger-btn small-btn" onclick="openRedemptionConfirmModal('${r._id}','rejected','${r.rewardName || "Reward"}')">
                  Reject
                </button>
              `
              : `<span class="redemption-complete">Completed</span>`
          }
        </div>
      </div>
    `;
  }).join("");
}
function openRecentPaymentsModal() {
  const modal = document.getElementById("recentPaymentsModal");
  const modalList = document.getElementById("recentPaymentsModalList");
  const sourceList = document.getElementById("recentPaymentsList");

  if (!modal || !modalList || !sourceList) return;

  modalList.innerHTML = sourceList.innerHTML || `
    <div class="empty-state">
      <strong>No recent payments</strong>
      <span>Payments will appear here after collection.</span>
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeRecentPaymentsModal() {
  document.getElementById("recentPaymentsModal")?.classList.add("hidden");
}
/* EXPIRING MEMBERS MODAL */

function openExpiringModal() {
  document
    .getElementById("expiringModal")
    .classList.remove("hidden");

  loadExpiringModal();
}

function closeExpiringModal() {
  document
    .getElementById("expiringModal")
    .classList.add("hidden");
}

function loadExpiringModal() {

  const container =
    document.getElementById("expiringModalList");

  if (!container) return;

  const members =
    JSON.parse(localStorage.getItem("members")) || [];

  const today = new Date();

  const expiring = members.filter(member => {

    if (!member.expiryDate) return false;

    const expiry =
      new Date(member.expiryDate);

    const diff =
      Math.ceil(
        (expiry - today) /
        (1000 * 60 * 60 * 24)
      );

    return diff >= 0 && diff <= 7;
  });

  if (expiring.length === 0) {

    container.innerHTML = `
      <div class="dash-payment-item">
        <div class="payment-avatar">✓</div>

        <div>
          <strong>No expiring members</strong>
          <p>All memberships are safe for now.</p>
        </div>

        <div>
          <b>0 Days</b>
        </div>

        <div>
          <span>Gym Stable</span>
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML = expiring.map(member => {

    const expiry =
      new Date(member.expiryDate);

    const diff =
      Math.ceil(
        (expiry - today) /
        (1000 * 60 * 60 * 24)
      );

    return `
      <div class="dash-payment-item">

        <div class="payment-avatar">
          ${member.name.charAt(0)}
        </div>

        <div>
          <strong>${member.name}</strong>
          <p>${member.planName || "Membership Plan"}</p>
        </div>

        <div>
          <b>${diff} Days</b>
          <small>Remaining</small>
        </div>

        <div>
          <span>
            ${expiry.toDateString()}
          </span>
        </div>

      </div>
    `;

  }).join("");
}