const API = "https://gympro-mzxo.onrender.com";

function trainerLogout() {
  localStorage.removeItem("trainerToken");
  window.location.href = "trainer-login.html";
}

function loadTrainerDashboard() {
  const token = localStorage.getItem("trainerToken");

  if (!token) {
    window.location.href = "trainer-login.html";
    return;
  }

  fetch(API + "/trainer-profile", {
    headers: { Authorization: token }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.trainer) {
      alert("Please login again");
      trainerLogout();
      return;
    }

    document.getElementById("trainerName").textContent = data.trainer.name;
    document.getElementById("trainerTotalMembers").textContent = data.members.length;

    const list = document.getElementById("trainerMemberList");
    list.innerHTML = "";

    let updatedCount = 0;

    data.members.forEach(member => {
      if (member.workoutPlan || member.dietPlan) updatedCount++;

      list.innerHTML += `
        <li>
          <strong>${member.name}</strong>
          <span>Phone: ${member.phone}</span>
          <span>Plan: ${member.plan} days</span>
          <span>Expiry: ${member.expiry}</span>
          <span>Points: ${member.points || 0}</span>

          <h3>Workout Plan</h3>
          <textarea id="workout-${member._id}" placeholder="Enter workout plan">${member.workoutPlan || ""}</textarea>

          <h3>Diet Plan</h3>
          <textarea id="diet-${member._id}" placeholder="Enter diet plan">${member.dietPlan || ""}</textarea>

          <button onclick="updateMemberPlan('${member._id}')">
            Save Workout & Diet
          </button>
        </li>
      `;
    });

    document.getElementById("plansUpdated").textContent = updatedCount;
  })
  .catch(err => {
    console.log(err);
    alert("Trainer dashboard failed");
  });
}

function updateMemberPlan(memberId) {
  const token = localStorage.getItem("trainerToken");

  const workoutPlan = document.getElementById("workout-" + memberId).value;
  const dietPlan = document.getElementById("diet-" + memberId).value;

  fetch(API + "/trainer/update-member-plan/" + memberId, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      workoutPlan,
      dietPlan
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    loadTrainerDashboard();
  })
  .catch(err => {
    console.log(err);
    alert("Plan update failed");
  });
}

if (window.location.pathname.includes("trainer-dashboard.html")) {
  loadTrainerDashboard();
}