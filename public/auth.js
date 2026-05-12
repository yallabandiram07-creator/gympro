const API = "http://localhost:5000";

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    } else {
      alert(data.message);
    }
  })
  .catch(() => alert("Owner login failed"));
}

function register() {
  const username = document.getElementById("ruser").value.trim();
  const password = document.getElementById("rpass").value.trim();

  fetch(API + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    if (data.message.includes("success")) {
      window.location.href = "index.html";
    }
  })
  .catch(() => alert("Register failed"));
}

function memberLogin() {
  const phone = document.getElementById("memberPhone").value.trim();
  const password = document.getElementById("memberPassword").value.trim();

  fetch(API + "/member-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  .catch(() => alert("Member login failed"));
}

function trainerLogin() {
  const phone = document.getElementById("trainerPhone").value.trim();
  const password = document.getElementById("trainerPassword").value.trim();

  fetch(API + "/trainer-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      localStorage.setItem("trainerToken", data.token);
      window.location.href = "trainer-dashboard.html";
    } else {
      alert(data.message);
    }
  })
  .catch(() => alert("Trainer login failed"));
}