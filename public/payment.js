async function payNow(planName, amount, durationDays) {
  const member = JSON.parse(localStorage.getItem("member"));

  if (!member) {
    alert("Please login as member first");
    window.location.href = "member-login.html";
    return;
  }

  const orderResponse = await fetch("http://localhost:5000/api/payments/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      memberId: member._id,
      memberName: member.name,
      planName,
      amount,
      durationDays
    })
  });

  const orderData = await orderResponse.json();

  if (!orderData.success) {
    alert("Payment order failed");
    return;
  }

  const options = {
    key: orderData.key,
    amount: orderData.order.amount,
    currency: "INR",
    name: "Gym App",
    description: planName,
    order_id: orderData.order.id,

    prefill: {
      name: member.name,
      email: member.email || "",
      contact: member.phone || ""
    },

    handler: async function (response) {
      const verifyResponse = await fetch("http://localhost:5000/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memberId: member._id,
          paymentDbId: orderData.payment._id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        alert("Payment successful. Membership renewed.");
        window.location.href = "member-dashboard.html";
      } else {
        alert("Payment verification failed");
      }
    },

    theme: {
      color: "#111827"
    }
  };

  const razorpay = new Razorpay(options);
  razorpay.open();
}