const API = "https://gympro-mzx0.onrender.com";


async function wakeServer() {
  try {
    await fetch(API + "/");
  } catch (e) {}
}

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const btn = document.querySelector("button");
  btn.innerText = "Connecting... please wait";
  btn.disabled = true;

  await wakeServer();

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
      btn.innerText = "Login";
      btn.disabled = false;
    }
  })
  .catch(() => {
    alert("Server is waking up, please try again in 10 seconds.");
    btn.innerText = "Login";
    btn.disabled = false;
  });
}

async function register() {
  const gymName = document.getElementById("gymName").value.trim();
  const ownerName = document.getElementById("ownerName").value.trim();
  const username = document.getElementById("ruser").value.trim();
  const password = document.getElementById("rpass").value.trim();

  if (!gymName || !ownerName || !username || !password) {
    alert("Please fill all fields");
    return;
  }

  const btn = document.querySelector("button");
  btn.innerText = "Connecting... please wait";
  btn.disabled = true;

  await wakeServer();

  fetch(API + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gymName,
      ownerName,
      username,
      password
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    if (data.message.includes("success")) {
      window.location.href = "index.html";
    } else {
      btn.innerText = "Register";
      btn.disabled = false;
    }
  })
  .catch(() => {
    alert("Server is waking up, please try again in 10 seconds.");
    btn.innerText = "Register";
    btn.disabled = false;
  });
}

async function memberLogin() {
  const phone = document.getElementById("memberPhone").value.trim();
  const password = document.getElementById("memberPassword").value.trim();

  const btn = document.querySelector("button");
  btn.innerText = "Connecting... please wait";
  btn.disabled = true;

  await wakeServer();

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
      btn.innerText = "Member Login";
      btn.disabled = false;
    }
  })
  .catch(() => {
    alert("Server is waking up, please try again in 10 seconds.");
    btn.innerText = "Member Login";
    btn.disabled = false;
  });
}

async function trainerLogin() {
  const phone = document.getElementById("trainerPhone").value.trim();
  const password = document.getElementById("trainerPassword").value.trim();

  const btn = document.querySelector("button");
  btn.innerText = "Connecting... please wait";
  btn.disabled = true;

  await wakeServer();

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
      btn.innerText = "Trainer Login";
      btn.disabled = false;
    }
  })
  .catch(() => {
    alert("Server is waking up, please try again in 10 seconds.");
    btn.innerText = "Trainer Login";
    btn.disabled = false;
  });
}
