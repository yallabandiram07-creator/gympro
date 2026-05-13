const API = "https://gympro-mzx0.onrender.com";

let currentMember = null;

function getMemberToken() {
  return localStorage.getItem("memberToken");
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");
}

async function loadMemberDashboard() {
  const token = getMemberToken();

  if (!token) {
    window.location.href = "member-login.html";
    return;
  }

  try {
    const res = await fetch(API + "/member-profile", {
      headers: {
        Authorization: token
      }
    });

    const data = await res.json();

    if (!data.member) {
      alert("Session expired. Please login again.");
      logout();
      return;
    }

    currentMember = data.member;

    document.getElementById("memberName").innerText = data.member.name || "";
    document.getElementById("memberPhone").innerText = data.member.phone || "";
    document.getElementById("memberPlan").innerText = data.member.plan || "";
    document.getElementById("memberFees").innerText = data.member.fees || "";
    document.getElementById("memberExpiry").innerText = data.member.expiry || "";
    document.getElementById("memberPoints").innerText = data.member.points || 0;

    document.getElementById("workoutPlan").innerText =
      data.member.workoutPlan || "No workout plan assigned yet.";

    document.getElementById("dietPlan").innerText =
      data.member.dietPlan || "No diet plan assigned yet.";

    document.getElementById("payMemberName").innerText = data.member.name || "";
    document.getElementById("payExpiry").innerText = data.member.expiry || "";

    document.getElementById("renewAmount").value = data.member.fees || "";
    document.getElementById("renewDays").value = data.member.plan || "";

    renderAttendance(data.attendance || []);
    renderPayments(data.payments || []);
    renderDietLogs(data.dietLogs || []);

  } catch (err) {
    alert("Server waking up. Please refresh after 10 seconds.");
  }
}

function renderAttendance(attendance) {
  const box = document.getElementById("attendanceList");

  if (!attendance.length) {
    box.innerHTML = "No attendance history yet.";
    return;
  }

  box.innerHTML = attendance.map(a => `
    <div class="list-item">
      <b>${a.date}</b> - ${a.time || ""}
    </div>
  `).join("");
}

function renderPayments(payments) {
  const box = document.getElementById("paymentHistory");

  if (!payments.length) {
    box.innerHTML = "No payments yet.";
    return;
  }

  box.innerHTML = payments.map(p => `
    <div class="list-item">
      <b>₹${p.amount}</b> - ${p.days} days - ${p.status}
    </div>
  `).join("");
}

function renderDietLogs(logs) {
  const box = document.getElementById("dietLogs");

  if (!logs.length) {
    box.innerHTML = "No diet logs yet.";
    return;
  }

  box.innerHTML = logs.map(log => `
    <div class="list-item">
      <b>${log.date}</b><br>
      Weight: ${log.weight} kg<br>
      Calories: ${log.calories}<br>
      Protein: ${log.protein} g<br>
      Water: ${log.water} L<br>
      Notes: ${log.notes || ""}
    </div>
  `).join("");
}

async function addDietLog() {
  const token = getMemberToken();

  const body = {
    weight: document.getElementById("weight").value,
    calories: document.getElementById("calories").value,
    protein: document.getElementById("protein").value,
    water: document.getElementById("water").value,
    notes: document.getElementById("notes").value
  };

  const res = await fetch(API + "/member-diet-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  alert(data.message);
  loadMemberDashboard();
}

async function renewMembership() {
  const token = getMemberToken();

  const amount = document.getElementById("renewAmount").value;
  const days = document.getElementById("renewDays").value;

  if (!amount || !days) {
    alert("Enter amount and days");
    return;
  }

  try {
    const keyRes = await fetch(API + "/razorpay-key", {
      headers: {
        Authorization: token
      }
    });

    const keyData = await keyRes.json();

    if (!keyData.key) {
      alert(keyData.message || "Razorpay key not found");
      return;
    }

    const orderRes = await fetch(API + "/create-renewal-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ amount, days })
    });

    const orderData = await orderRes.json();

    if (!orderData.orderId) {
      alert(orderData.message || "Order creation failed");
      return;
    }

    const options = {
      key: keyData.key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "GymPro Membership",
      description: "Membership Renewal",
      order_id: orderData.orderId,
      handler: async function (response) {
        const verifyRes = await fetch(API + "/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token
          },
          body: JSON.stringify(response)
        });

        const verifyData = await verifyRes.json();
        alert(verifyData.message);
        loadMemberDashboard();
        showSection("overview");
      },
      prefill: {
        name: currentMember?.name || "",
        contact: currentMember?.phone || ""
      },
      theme: {
        color: "#4f46e5"
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    alert("Payment error. Try again.");
  }
}

function logout() {
  localStorage.removeItem("memberToken");
  window.location.href = "member-login.html";
}
function checkMembershipStatus(member) {
  const expiryDate = new Date(member.expiryDate || member.expiry);
  const today = new Date();

  if (expiryDate < today) {
    alert("Your membership is expired. Please renew to continue.");

    showSection("payment");

    const attendanceBtn = document.querySelector("button[onclick=\"showSection('attendance')\"]");
    const workoutBtn = document.querySelector("button[onclick=\"showSection('workout')\"]");
    const dietBtn = document.querySelector("button[onclick=\"showSection('diet')\"]");

    if (attendanceBtn) attendanceBtn.disabled = true;
    if (workoutBtn) workoutBtn.disabled = true;
    if (dietBtn) dietBtn.disabled = true;
  }
}