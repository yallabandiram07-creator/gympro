const API = "https://gympro-mzx0.onrender.com";

function showPremiumModal(title, message, type, onConfirm) {
  const modal = document.getElementById("premiumModal");
  const modalContent = modal.querySelector("div");
  const iconContainer = document.getElementById("modalIconContainer");
  const icon = document.getElementById("modalIcon");
  const confirmBtn = document.getElementById("modalConfirmBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");

  icon.className = "fa-solid";

  if (type === "confirm") {
    iconContainer.style.background = "rgba(99, 102, 241, 0.08)";
    iconContainer.style.color = "#818cf8";
    icon.classList.add("fa-credit-card");
    cancelBtn.style.display = "block";
    confirmBtn.textContent = "Pay Securely";
    confirmBtn.style.background = "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";
  } else if (type === "success") {
    iconContainer.style.background = "rgba(16, 185, 129, 0.08)";
    iconContainer.style.color = "#34d399";
    icon.classList.add("fa-circle-check");
    cancelBtn.style.display = "none";
    confirmBtn.textContent = "Acknowledge";
    confirmBtn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
  } else if (type === "error") {
    iconContainer.style.background = "rgba(239, 68, 68, 0.08)";
    iconContainer.style.color = "#f87171";
    icon.classList.add("fa-triangle-exclamation");
    cancelBtn.style.display = "none";
    confirmBtn.textContent = "Dismiss";
    confirmBtn.style.background = "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)";
  }

  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMessage").textContent = message;

  modal.style.display = "flex";
  setTimeout(() => {
    modal.style.opacity = "1";
    modalContent.style.transform = "scale(1)";
  }, 15);

  confirmBtn.onclick = function () {
    closePremiumModal();
    if (onConfirm) onConfirm();
  };
}

function closePremiumModal() {
  const modal = document.getElementById("premiumModal");
  const modalContent = modal.querySelector("div");
  modal.style.opacity = "0";
  modalContent.style.transform = "scale(0.85)";
  setTimeout(() => {
    modal.style.display = "none";
  }, 350);
}

function loadCurrentSubscription() {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "index.html"; return; }

  fetch(API + "/owner-subscription", { headers: { Authorization: token } })
    .then(res => res.json())
    .then(data => {
      document.getElementById("currentPlan").textContent = (data.planName || "Free") + " Plan";
      document.getElementById("currentStatus").textContent = data.status || "ACTIVE";
      document.getElementById("currentExpiry").textContent = data.expiryDate ? new Date(data.expiryDate).toDateString() : "Lifetime Access";
    })
    .catch(err => {
      console.error(err);
      document.getElementById("currentPlan").textContent = "Free Plan";
      document.getElementById("currentStatus").textContent = "ACTIVE";
      document.getElementById("currentExpiry").textContent = "Lifetime Access";
    });
}

function buyPlan(planName, price, duration) {
  const token = localStorage.getItem("token");
  if (!token) {
    showPremiumModal("Session Expired", "Please log in again.", "error", () => { window.location.href = "index.html"; });
    return;
  }

  if (price === 0 || price === "0") {
    processDatabaseUpgrade(planName, 0, duration, "FREE_ACTIVATION");
    return;
  }

  showPremiumModal(
    "Confirm Purchase",
    `Would you like to pay ₹${price} for the GymPro ${planName} Plan?`,
    "confirm",
    () => {
      
      // FORCES CONVERSION INTO RAW BALANCED INTEGERS (PAISE)
      const cleanPrice = Math.round(parseFloat(price));
      const finalAmountInPaise = cleanPrice * 100;

      const options = {
        "key": "rzp_test_SvqtMfEw3BdLE3", // ⚠️ MAKE SURE TO PASTE YOUR PERSONAL ACTIVE RAZORPAY KEY HERE
        "amount": finalAmountInPaise, 
        "currency": "INR",
        "name": "GymPro Management System",
        "description": `${planName} License Pack Upgrade`,
        "image": "https://img.icons8.com/fluency/96/gym.png",
        "handler": function (response) {
          const paymentId = response.razorpay_payment_id;
          processDatabaseUpgrade(planName, cleanPrice, duration, paymentId);
        },
        "prefill": {
          "name": "Gym Owner",
          "email": "owner@gympro.com"
        },
        "theme": { "color": "#6366f1" }
      };

      const rzp1 = new Razorpay(options);
      rzp1.on('payment.failed', function (response){
        showPremiumModal("Transaction Failed", response.error.description, "error");
      });
      rzp1.open();
    }
  );
}

function processDatabaseUpgrade(planName, price, duration, paymentId) {
  const token = localStorage.getItem("token");

  document.getElementById("currentPlan").textContent = planName + " Plan";
  document.getElementById("currentStatus").textContent = "ACTIVE";
  let targetExpiry = new Date();
  targetExpiry.setDate(targetExpiry.getDate() + duration);
  document.getElementById("currentExpiry").textContent = targetExpiry.toDateString();

  fetch(API + "/buy-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ planName, price, duration, paymentId })
  })
    .then(res => res.json())
    .then(data => {
      showPremiumModal("Payment Complete", "Transaction verified successfully!", "success", () => {
        loadCurrentSubscription();
      });
    })
    .catch(err => {
      console.error(err);
      showPremiumModal("Sync Failure", "Payment accepted but profile sync is delayed.", "error");
    });
}

document.addEventListener("DOMContentLoaded", loadCurrentSubscription);