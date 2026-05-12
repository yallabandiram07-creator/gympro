const API = "http://localhost:5000";

function loadAIWorkoutMembers() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  fetch(API + "/members", {
    headers: { Authorization: token }
  })
  .then(res => res.json())
  .then(members => {
    const select = document.getElementById("aiMemberSelect");
    select.innerHTML = "";

    if (!members || members.length === 0) {
      select.innerHTML = `<option value="">No members found</option>`;
      return;
    }

    members.forEach(member => {
      select.innerHTML += `
        <option value="${member._id}">
          ${member.name} - ${member.phone}
        </option>
      `;
    });
  })
  .catch(err => {
    console.log(err);
    alert("Failed to load members");
  });
}

function createWorkoutPlan(goal) {
  if (goal === "fat-loss") {
    return `FAT LOSS WORKOUT PLAN

Day 1: Full Body + Cardio
- Squats: 3 sets x 15 reps
- Push-ups: 3 sets x 12 reps
- Lat Pulldown: 3 sets x 12 reps
- Plank: 3 sets x 45 sec
- Treadmill: 20 minutes

Day 2: Cardio + Core
- Cycling: 20 minutes
- Mountain Climbers: 3 sets x 20 reps
- Crunches: 3 sets x 20 reps
- Leg Raises: 3 sets x 15 reps

Day 3: Upper Body
- Chest Press: 3 sets x 12 reps
- Shoulder Press: 3 sets x 12 reps
- Seated Row: 3 sets x 12 reps
- Triceps Pushdown: 3 sets x 15 reps

Day 4: Lower Body + Cardio
- Leg Press: 4 sets x 15 reps
- Lunges: 3 sets x 12 reps
- Hamstring Curl: 3 sets x 15 reps
- Incline Walk: 20 minutes

Note: Maintain calorie deficit and drink 3 litres water daily.`;
  }

  if (goal === "muscle-gain") {
    return `MUSCLE GAIN WORKOUT PLAN

Day 1: Push
- Bench Press: 4 sets x 8 reps
- Incline Dumbbell Press: 4 sets x 10 reps
- Shoulder Press: 3 sets x 10 reps
- Lateral Raises: 3 sets x 15 reps
- Triceps Pushdown: 3 sets x 12 reps

Day 2: Pull
- Lat Pulldown: 4 sets x 10 reps
- Barbell Row: 4 sets x 8 reps
- Seated Cable Row: 3 sets x 12 reps
- Face Pull: 3 sets x 15 reps
- Biceps Curl: 3 sets x 12 reps

Day 3: Legs
- Squats: 4 sets x 8 reps
- Leg Press: 4 sets x 12 reps
- Romanian Deadlift: 3 sets x 10 reps
- Calf Raises: 4 sets x 15 reps

Note: Eat high protein and increase weights slowly every week.`;
  }

  if (goal === "beginner") {
    return `BEGINNER FITNESS WORKOUT PLAN

Day 1: Full Body
- Bodyweight Squat: 3 sets x 12 reps
- Push-ups: 3 sets x 8 reps
- Lat Pulldown: 3 sets x 12 reps
- Dumbbell Shoulder Press: 3 sets x 10 reps
- Walking: 15 minutes

Day 2: Rest or Light Cardio

Day 3: Full Body
- Leg Press: 3 sets x 12 reps
- Chest Press: 3 sets x 12 reps
- Seated Row: 3 sets x 12 reps
- Plank: 3 sets x 30 sec

Day 4: Rest

Day 5: Full Body Repeat

Note: Focus on correct form first.`;
  }

  return `STRENGTH TRAINING WORKOUT PLAN

Day 1: Squat Focus
- Barbell Squat: 5 sets x 5 reps
- Leg Press: 3 sets x 8 reps
- Hamstring Curl: 3 sets x 10 reps
- Plank: 3 sets x 60 sec

Day 2: Bench Focus
- Bench Press: 5 sets x 5 reps
- Incline Press: 3 sets x 8 reps
- Shoulder Press: 3 sets x 8 reps
- Triceps Dips: 3 sets x 10 reps

Day 3: Deadlift Focus
- Deadlift: 5 sets x 5 reps
- Barbell Row: 4 sets x 8 reps
- Lat Pulldown: 3 sets x 10 reps
- Biceps Curl: 3 sets x 10 reps

Note: Rest 2 to 3 minutes between heavy sets.`;
}

function generateAIWorkout() {
  const token = localStorage.getItem("token");
  const memberId = document.getElementById("aiMemberSelect").value;
  const goal = document.getElementById("aiGoal").value;

  if (!memberId) {
    alert("Select member first");
    return;
  }

  const workoutPlan = createWorkoutPlan(goal);

  document.getElementById("aiWorkoutOutput").textContent = workoutPlan;

  fetch(API + "/admin/update-member-workout/" + memberId, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ workoutPlan })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
  })
  .catch(err => {
    console.log(err);
    alert("Workout save failed");
  });
}

loadAIWorkoutMembers();