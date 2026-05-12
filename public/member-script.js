const API = "https://gympro-mzxo.onrender.com";

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value;
}

function show(id) {
  const el = byId(id);
  if (el) el.style.display = "block";
}

function hide(id) {
  const el = byId(id);
  if (el) el.style.display = "none";
}

function memberLogin() {
  const phone = byId("memberPhone").value.trim();
  const password = byId("memberPassword").value.trim();

  if (!phone || !password) {
    alert("Enter phone and password");
    return;
  }

  fetch(API + "/member-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ phone, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      localStorage.setItem("memberToken", data.token);
      window.location.href = "member-dashboard.html";
    } else {
      alert(data.message);
    }
  })
  .catch(err => {
    console.log(err);
    alert("Login failed. Check server terminal.");
  });
}

function memberLogout() {
  localStorage.removeItem("memberToken");
  window.location.href = "member-login.html";
}

function showMemberTab(tab) {
  hide("memberOverviewTab");
  hide("memberAttendanceTab");
  hide("memberWorkoutTab");
  hide("memberDietTab");

  document.querySelectorAll(".member-sidebar .nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  if (tab === "overview") {
    show("memberOverviewTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[0]?.classList.add("active");
  }

  if (tab === "attendance") {
    show("memberAttendanceTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[1]?.classList.add("active");
  }

  if (tab === "workout") {
    show("memberWorkoutTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[2]?.classList.add("active");
  }

  if (tab === "diet") {
    show("memberDietTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[3]?.classList.add("active");
    loadDietLogs();
  }
}

function loadMemberDashboard() {
  const token = localStorage.getItem("memberToken");

  if (!token) {
    window.location.href = "member-login.html";
    return;
  }

  fetch(API + "/member-profile", {
    method: "GET",
    headers: {
      Authorization: token
    }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.member) {
      alert("Please login again");
      memberLogout();
      return;
    }

    const member = data.member;
    const attendance = data.attendance || [];
    const dietLogs = data.dietLogs || [];

    const expiryDate = new Date(member.expiryDate || member.expiry);
    const today = new Date();
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    setText("mName", member.name || "-");
    setText("mPhone", member.phone || "-");
    setText("mPlan", member.plan || "0");
    setText("mFees", member.fees || "0");
    setText("mExpiry", member.expiry || "-");
    setText("mPoints", member.points || 0);
    setText("mDaysLeft", daysLeft > 0 ? daysLeft : 0);
    setText("mTotalAttendance", attendance.length);

    setText("memberWorkoutText", member.workoutPlan || "No workout plan added yet.");
    setText("memberDietText", member.dietPlan || "No diet plan added yet.");

    const status = byId("membershipStatus");

    if (status) {
      status.classList.remove("warning", "expired");

      if (daysLeft <= 0) {
        status.textContent = "Expired";
        status.classList.add("expired");
      } else if (daysLeft <= 3) {
        status.textContent = "Expiring Soon";
        status.classList.add("warning");
      } else {
        status.textContent = "Active";
      }
    }

    const attendanceList = byId("memberAttendanceList");

    if (attendanceList) {
      attendanceList.innerHTML = "";

      if (attendance.length === 0) {
        attendanceList.innerHTML = "<li>No attendance history yet.</li>";
      }

      attendance.forEach(a => {
        attendanceList.innerHTML += `
          <li>
            <strong>${a.date}</strong>
            <span>Time: ${a.time}</span>
          </li>
        `;
      });
    }

    renderDietLogs(dietLogs);
  })
  .catch(err => {
    console.log(err);
    alert("Member dashboard loading failed. Check server terminal.");
  });
}

function addDietLog() {
  const token = localStorage.getItem("memberToken");

  const weight = byId("dietWeight").value;
  const calories = byId("dietCalories").value;
  const protein = byId("dietProtein").value;
  const water = byId("dietWater").value;
  const notes = byId("dietNotes").value;

  fetch(API + "/member-diet-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      weight,
      calories,
      protein,
      water,
      notes
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);

    byId("dietWeight").value = "";
    byId("dietCalories").value = "";
    byId("dietProtein").value = "";
    byId("dietWater").value = "";
    byId("dietNotes").value = "";

    loadDietLogs();
  })
  .catch(err => {
    console.log(err);
    alert("Diet log failed");
  });
}

function loadDietLogs() {
  const token = localStorage.getItem("memberToken");

  fetch(API + "/member-diet-logs", {
    method: "GET",
    headers: {
      Authorization: token
    }
  })
  .then(res => res.json())
  .then(logs => {
    renderDietLogs(logs);
  })
  .catch(err => {
    console.log(err);
  });
}

function renderDietLogs(logs) {
  const list = byId("dietLogList");
  if (!list) return;

  list.innerHTML = "";

  if (!logs || logs.length === 0) {
    list.innerHTML = "<li>No diet logs yet.</li>";
    return;
  }

  logs.forEach(log => {
    list.innerHTML += `
      <li>
        <strong>${log.date}</strong>
        <span>Weight: ${log.weight || 0} kg</span>
        <span>Calories: ${log.calories || 0}</span>
        <span>Protein: ${log.protein || 0} g</span>
        <span>Water: ${log.water || 0} L</span>
        <span>Notes: ${log.notes || "-"}</span>
      </li>
    `;
  });
}

if (window.location.pathname.includes("member-dashboard.html")) {
  loadMemberDashboard();
}