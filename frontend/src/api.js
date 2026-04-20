const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function getToken() {
  return localStorage.getItem("oktiq-token");
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(getToken() ? { Authorization: `Token ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Ошибка запроса" }));
    throw new Error(error.detail || "Ошибка запроса");
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

export async function login(phone, password) {
  const data = await request("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  localStorage.setItem("oktiq-token", data.token);
  return data;
}

export async function register(phone, password, passwordRepeat) {
  const data = await request("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ phone, password, password_repeat: passwordRepeat }),
  });
  localStorage.setItem("oktiq-token", data.token);
  return data;
}

export async function fetchDashboard() {
  return await request("/dashboard/");
}

export async function fetchProfile() {
  return await request("/profile/");
}

export async function fetchSchedule() {
  return await request("/schedule/");
}

export async function fetchTutors(params = {}) {
  const query = new URLSearchParams();
  if (params.subject && params.subject !== "all") query.set("subject", params.subject);
  if (params.minPrice) query.set("min_price", String(params.minPrice));
  if (params.maxPrice) query.set("max_price", String(params.maxPrice));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return await request(`/tutors/${suffix}`);
}

export async function fetchReviews() {
  return await request("/reviews/");
}

export async function fetchNotifications() {
  return await request("/notifications/");
}

export async function createPayment(payload) {
  return await request("/payments/create/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createWithdrawal(payload) {
  return await request("/payments/withdraw/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createReview(payload) {
  return await request("/reviews/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchReviewCollections() {
  return await request("/reviews/collections/");
}

export async function createBooking(payload) {
  return await request("/bookings/create/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLesson(lessonId, payload) {
  return await request(`/lessons/${lessonId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function cancelLesson(lessonId) {
  return await request(`/lessons/${lessonId}/cancel/`, {
    method: "POST",
  });
}

export async function deleteNotification(notificationId) {
  await request(`/notifications/${notificationId}/`, {
    method: "DELETE",
  });
}

export async function updateProfile(payload) {
  const formData = new FormData();
  if (payload.full_name !== undefined) {
    formData.append("full_name", payload.full_name);
  }
  if (payload.role !== undefined) {
    formData.append("role", payload.role);
  }
  if (payload.is_onboarded !== undefined) {
    formData.append("is_onboarded", String(payload.is_onboarded));
  }
  if (payload.publish_profile !== undefined) {
    formData.append("publish_profile", String(payload.publish_profile));
  }
  if (payload.teacher_bio !== undefined) {
    formData.append("teacher_bio", payload.teacher_bio);
  }
  if (payload.teacher_education !== undefined) {
    formData.append("teacher_education", payload.teacher_education);
  }
  if (payload.teacher_experience_years !== undefined) {
    formData.append("teacher_experience_years", String(payload.teacher_experience_years));
  }
  if (payload.teacher_grade_level !== undefined) {
    formData.append("teacher_grade_level", payload.teacher_grade_level);
  }
  if (payload.teacher_subjects !== undefined) {
    formData.append("teacher_subjects", JSON.stringify(payload.teacher_subjects));
  }
  if (payload.teacher_availabilities !== undefined) {
    formData.append("teacher_availabilities", JSON.stringify(payload.teacher_availabilities));
  }
  if (payload.avatar) {
    formData.append("avatar", payload.avatar);
  }
  return await request("/profile/", {
    method: "PATCH",
    body: formData,
  });
}
