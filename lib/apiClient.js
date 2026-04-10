const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

const handleResponse = async (response) => {
  let data;
  const contentType = response.headers.get("content-type");
  data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return { success: false, error: data?.message || "Something went wrong", status: response.status };
  }
  return { success: true, data, status: response.status };
};

const apiClient = {
  get: async (endpoint, options = {}) => {
    const token = getToken();
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      });
      return await handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  post: async (endpoint, body, options = {}) => {
    const token = getToken();
    const isFormData = body instanceof FormData;
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          ...(!isFormData && { "Content-Type": "application/json" }),
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        body: isFormData ? body : JSON.stringify(body),
        ...options,
      });
      return await handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  put: async (endpoint, body, options = {}) => {
    const token = getToken();
    const isFormData = body instanceof FormData;
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "PUT",
        headers: {
          ...(!isFormData && { "Content-Type": "application/json" }),
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        body: isFormData ? body : JSON.stringify(body),
        ...options,
      });
      return await handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  delete: async (endpoint, options = {}) => {
    const token = getToken();
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      });
      return await handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default apiClient;
