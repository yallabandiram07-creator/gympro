const API = "http://localhost:5000";

let memberQrScanner = null;

function safeHide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

function safeShow(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}

function memberLogin() {
  const phone = document.getElementById("memberPhone").value.trim();
  const password = document.getElementById("memberPassword").value.trim();

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
    alert("Member login failed. Check server terminal.");
  });
}

function memberLogout() {
  localStorage.removeItem("memberToken");
  window.location.href = "member-login.html";
}

function showMemberTab(tab) {
  safeHide("memberOverviewTab");
  safeHide("memberScanTab");
  safeHide("memberAttendanceTab");
  safeHide("memberWorkoutTab");
  safeHide("memberDietTab");
  safeHide("memberPaymentsTab");

  document.querySelectorAll(".member-sidebar .nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  if (tab === "overview") {
    safeShow("memberOverviewTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[0]?.classList.add("active");
  }

  if (tab === "scan") {
    safeShow("memberScanTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[1]?.classList.add("active");
  }

  if (tab === "attendance") {
    safeShow("memberAttendanceTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[2]?.classList.add("active");
  }

  if (tab === "workout") {
    safeShow("memberWorkoutTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[3]?.classList.add("active");
  }

  if (tab === "diet") {
    safeShow("memberDietTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[4]?.classList.add("active");
  }

  if (tab === "payments") {
    safeShow("memberPaymentsTab");
    document.querySelectorAll(".member-sidebar .nav-btn")[5]?.classList.add("active");
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
    const payments = data.payments || [];

    const expiryDate = new Date(member.expiryDate || member.expiry);
    const today = new Date();
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    document.getElementById("mName").textContent = member.name || "-";
    document.getElementById("mPhone").textContent = member.phone || "-";
    document.getElementById("mPlan").textContent = member.plan || "0";
    document.getElementById("mFees").textContent = member.fees || "0";
    document.getElementById("mExpiry").textContent = member.expiry || "-";
    document.getElementById("mPoints").textContent = member.points || 0;
    document.getElementById("mDaysLeft").textContent = daysLeft > 0 ? daysLeft : 0;
    document.getElementById("mTotalAttendance").textContent = attendance.length;

    const workoutText = document.getElementById("memberWorkoutText");
    const dietText = document.getElementById("memberDietText");

    if (workoutText) {
      workoutText.textContent = member.workoutPlan || "Trainer has not added workout plan yet.";
    }

    if (dietText) {
      dietText.textContent = member.dietPlan || "Trainer has not added diet plan yet.";
    }

    const status = document.getElementById("membershipStatus");
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

    const attendanceList = document.getElementById("memberAttendanceList");

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

    const paymentList = document.getElementById("paymentHistoryList");

    if (paymentList) {
      paymentList.innerHTML = "";

      if (payments.length === 0) {
        paymentList.innerHTML = "<li>No payments yet.</li>";
      }

      payments.forEach(p => {
        paymentList.innerHTML += `
          <li>
            <strong>₹${p.amount}</strong>
            <span>Days: ${p.days}</span>
            <span>Status: ${p.status}</span>
            <span>Date: ${new Date(p.date).toLocaleDateString()}</span>
          </li>
        `;
      });
    }
  })
  .catch(err => {
    console.log(err);
    alert("Member dashboard loading failed");
  });
}

function startRenewalPayment() {
  const token = localStorage.getItem("memberToken");

  const days = document.getElementById("renewDays").value;
  const amount = document.getElementById("renewAmount").value;

  if (!days || !amount) {
    alert("Enter renewal days and amount");
    return;
  }

  fetch(API + "/razorpay-key", {
    method: "GET",
    headers: {
      Authorization: token
    }
  })
  .then(res => res.json())
  .then(keyData => {
    if (!keyData.key) {
      alert(keyData.message || "Razorpay key not found");
      return;
    }

    fetch(API + "/create-renewal-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ days, amount })
    })
    .then(res => res.json())
    .then(orderData => {
      if (!orderData.orderId) {
        alert(orderData.message || "Payment order failed");
        return;
      }

      const options = {
        key: keyData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "GymPro",
        description: "Membership Renewal",
        order_id: orderData.orderId,
        prefill: {
          name: orderData.name,
          contact: orderData.phone
        },
        handler: function(response) {
          fetch(API + "/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token
            },
            body: JSON.stringify(response)
          })
          .then(res => res.json())
          .then(data => {
            alert(data.message);
            loadMemberDashboard();
            showMemberTab("overview");
          });
        }
      };

      const razorpay = new Razorpay(options);
      razorpay.open();
    });
  });
}

function startMemberQRScanner() {
  const result = document.getElementById("memberQrResult");

  if (memberQrScanner) {
    result.textContent = "Scanner already running";
    return;
  }

  memberQrScanner = new Html5Qrcode("member-qr-reader");

  memberQrScanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: 250
    },
    qrCodeMessage => {
      markMemberQRAttendance(qrCodeMessage);
    },
    errorMessage => {}
  )
  .catch(err => {
    result.textContent = "Camera error: " + err;
  });
}

function stopMemberQRScanner() {
  const result = document.getElementById("memberQrResult");

  if (!memberQrScanner) {
    if (result) result.textContent = "Scanner is not running";
    return;
  }

  memberQrScanner.stop().then(() => {
    memberQrScanner.clear();
    memberQrScanner = null;
    if (result) result.textContent = "Scanner stopped";
  });
}

function markMemberQRAttendance(qrData) {
  const token = localStorage.getItem("memberToken");

  fetch(API + "/member-qr-attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ qrData })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("memberQrResult").textContent = data.message;
    alert(data.message);
    stopMemberQRScanner();
    loadMemberDashboard();
  });
}

if (window.location.pathname.includes("member-dashboard.html")) {
  loadMemberDashboard();
}