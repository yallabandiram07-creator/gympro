const API = "https://gympro-mzx0.onrender.com";

function getSuperAdminToken() {
  return localStorage.getItem("superAdminToken");
}

async function superAdminLogin() {
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  const res = await fetch(API + "/super-admin-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("superAdminToken", data.token);
    window.location.href = "super-admin-dashboard.html";
  } else {
    alert(data.message);
  }
}

async function loadSuperAdminDashboard() {
  const token = getSuperAdminToken();

  if (!token) {
    window.location.href = "super-admin-login.html";
    return;
  }

  const res = await fetch(API + "/super-admin/stats", {
    headers: {
      Authorization: token
    }
  });

  const data = await res.json();

  if (!data.owners) {
    alert(data.message || "Admin session expired");
    superAdminLogout();
    return;
  }

  document.getElementById("totalOwners").innerText = data.totalOwners;
  document.getElementById("totalMembers").innerText = data.totalMembers;
  document.getElementById("totalTrainers").innerText = data.totalTrainers;
  document.getElementById("totalRevenue").innerText = data.totalRevenue;

  const ownersList = document.getElementById("ownersList");

  if (!data.owners.length) {
    ownersList.innerHTML = "No gym owners registered yet.";
    return;
  }

  ownersList.innerHTML = data.owners.map(owner => `
    <div class="list-item">
      <h3>${owner.username}</h3>
      <p><b>Members:</b> ${owner.totalMembers}</p>
      <p><b>Trainers:</b> ${owner.totalTrainers}</p>
      <p><b>Revenue:</b> ₹${owner.revenue}</p>
      <p><b>Status:</b> ${owner.blocked ? "Blocked" : "Active"}</p>

      ${
        owner.blocked
          ? `<button onclick="unblockOwner('${owner.id}')">Unblock</button>`
          : `<button onclick="blockOwner('${owner.id}')">Block</button>`
      }
    </div>
  `).join("");
}

async function blockOwner(ownerId) {
  const token = getSuperAdminToken();

  const res = await fetch(API + "/super-admin/block-owner/" + ownerId, {
    method: "PUT",
    headers: {
      Authorization: token
    }
  });

  const data = await res.json();
  alert(data.message);
  loadSuperAdminDashboard();
}

async function unblockOwner(ownerId) {
  const token = getSuperAdminToken();

  const res = await fetch(API + "/super-admin/unblock-owner/" + ownerId, {
    method: "PUT",
    headers: {
      Authorization: token
    }
  });

  const data = await res.json();
  alert(data.message);
  loadSuperAdminDashboard();
}

function superAdminLogout() {
  localStorage.removeItem("superAdminToken");
  window.location.href = "super-admin-login.html";
}