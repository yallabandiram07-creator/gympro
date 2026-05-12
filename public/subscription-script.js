const API = "http://localhost:5000";

function loadCurrentSubscription() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  fetch(API + "/owner-subscription", {
    headers: {
      Authorization: token
    }
  })
  .then(res => res.json())
  .then(data => {

    document.getElementById("currentPlan").textContent =
      data.planName || "Free";

    document.getElementById("currentStatus").textContent =
      data.status || "active";

    document.getElementById("currentExpiry").textContent =
      data.expiryDate
        ? new Date(data.expiryDate).toDateString()
        : "No expiry";
  })
  .catch(err => {
    console.log(err);
    alert("Failed to load subscription");
  });
}

function buyPlan(planName, price, duration) {
  const token = localStorage.getItem("token");

  fetch(API + "/buy-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      planName,
      price,
      duration
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    loadCurrentSubscription();
  })
  .catch(err => {
    console.log(err);
    alert("Subscription failed");
  });
}

loadCurrentSubscription();