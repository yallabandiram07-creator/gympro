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
  if (section === "attendance") { loadMembers(); loadAttendance(); }
  if (section === "qr") { stopQRAutoRefresh(); startQRAutoRefresh(); }
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
  fetch(API + "/attendance/today", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(attendance => {
      const count = document.getElementById("todayAttendance");
      const list = document.getElementById("todayAttendanceList");
      const total = allMembersData.length || 1;
      const present = attendance.length;
      const absent = Math.max(total - present, 0);
      const pct = Math.round((present / total) * 100);
 
      if (count) count.textContent = present;
      if (document.getElementById("presentCount")) document.getElementById("presentCount").textContent = present;
      if (document.getElementById("absentCount")) document.getElementById("absentCount").textContent = absent;
      if (document.getElementById("attendanceDonutLabel")) document.getElementById("attendanceDonutLabel").innerHTML = pct + '%<br><small>Avg. Attendance</small>';
 
      if (list) {
        list.innerHTML = "";
        if (!attendance.length) { list.innerHTML = "<li><span>No attendance marked today.</span></li>"; return; }
        attendance.forEach(a => {
          list.innerHTML += `<li><strong>${a.memberName}</strong><span>📅 ${a.date} | ⏰ ${a.time}</span></li>`;
        });
      }
      updateAttendanceChart(present, absent);
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
      if (!trainers.length) { list.innerHTML = "<li><span>No trainers added yet.</span></li>"; return; }
      trainers.forEach(t => {
        list.innerHTML += `<li><strong>${t.name}</strong><span>📞 ${t.phone}</span><span>✉️ ${t.email}</span></li>`;
      });
    });
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
  const plans = [
    { name: document.getElementById("plan1Name").value, price: Number(document.getElementById("plan1Price").value), days: Number(document.getElementById("plan1Days").value) },
    { name: document.getElementById("plan2Name").value, price: Number(document.getElementById("plan2Price").value), days: Number(document.getElementById("plan2Days").value) },
    { name: document.getElementById("plan3Name").value, price: Number(document.getElementById("plan3Price").value), days: Number(document.getElementById("plan3Days").value) }
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
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  showToast(data.message);
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

updateNotificationCount(alertCount);
 
    const expiringBox = document.getElementById("expiringMembersList");
    if (!expiringBox) return;
 
    if (!data.expiringMembers || data.expiringMembers.length === 0) {
        document.getElementById("notificationDropdown").innerHTML = `
  <div class="dropdown-title">Notifications</div>
  <div class="dropdown-item">
    <strong>No urgent alerts</strong>
    <span>All memberships are safe for now.</span>
  </div>
`;
      expiringBox.innerHTML = `<li class="empty-state"><strong>No expiring members</strong><span>All memberships are safe for now.</span></li>`;
    } else {
        document.getElementById("notificationDropdown").innerHTML = `
  <div class="dropdown-title">Notifications</div>
  ${data.expiringMembers.slice(0, 5).map(m => `
    <div class="dropdown-item">
      <strong>${m.name}</strong>
      <span>Membership expires in ${m.daysLeft} days</span>
    </div>
  `).join("")}
`;
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
        password: document.getElementById("trainerPasswordInput").value
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

  if (!dropdown.classList.contains("hidden")) {
    markNotificationsRead();
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