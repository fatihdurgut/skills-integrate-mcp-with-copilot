document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  const userInfo = document.getElementById("user-info");
  const teacherName = document.getElementById("teacher-name");
  const logoutBtn = document.getElementById("logout-btn");
  const teacherNotice = document.getElementById("teacher-only-notice");
  const studentNotice = document.getElementById("student-notice");

  // State management
  let isTeacherLoggedIn = false;
  let authToken = null;

  // Check for existing auth token
  const savedToken = localStorage.getItem("teacherToken");
  const savedTeacherName = localStorage.getItem("teacherName");
  if (savedToken && savedTeacherName) {
    authToken = savedToken;
    setTeacherLoggedIn(savedTeacherName);
  }

  // Authentication functions
  function setTeacherLoggedIn(name) {
    isTeacherLoggedIn = true;
    teacherName.textContent = `Welcome, ${name}`;
    loginBtn.classList.add("hidden");
    userInfo.classList.remove("hidden");
    teacherNotice.classList.remove("hidden");
    studentNotice.classList.add("hidden");
    signupForm.style.display = "block";
  }

  function setTeacherLoggedOut() {
    isTeacherLoggedIn = false;
    authToken = null;
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherName");
    loginBtn.classList.remove("hidden");
    userInfo.classList.add("hidden");
    teacherNotice.classList.add("hidden");
    studentNotice.classList.remove("hidden");
    signupForm.style.display = "none";
  }

  // Modal event listeners
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
      loginForm.reset();
      loginMessage.classList.add("hidden");
    }
  });

  logoutBtn.addEventListener("click", () => {
    setTeacherLoggedOut();
    fetchActivities(); // Refresh to remove delete buttons
  });

  // Login form handler
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        authToken = result.token;
        localStorage.setItem("teacherToken", authToken);
        localStorage.setItem("teacherName", result.teacher_name);
        setTeacherLoggedIn(result.teacher_name);
        loginModal.classList.add("hidden");
        loginForm.reset();
        fetchActivities(); // Refresh to show delete buttons
      } else {
        loginMessage.textContent = result.message;
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });
  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Clear activity select options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons only for teachers
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacherLoggedIn 
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ''
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if teacher is logged in)
      if (isTeacherLoggedIn) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality (Teacher only)
  async function handleUnregister(event) {
    if (!isTeacherLoggedIn) {
      showMessage("Only teachers can unregister students", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities(); // Refresh activities list
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission (Teacher only)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isTeacherLoggedIn) {
      showMessage("Only teachers can register students", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities(); // Refresh activities list
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to register student. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Helper function to show messages
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Initialize app
  fetchActivities();
  
  // Set initial state based on login status
  if (!isTeacherLoggedIn) {
    setTeacherLoggedOut();
  }
});
