const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Cache token to avoid repeated localStorage reads
let cachedToken = null;
const getToken = () => {
  if (typeof window === "undefined") return null;
  if (!cachedToken) {
    cachedToken = localStorage.getItem("auth_token");
  }
  return cachedToken;
};

// Clear cached token on logout
export const clearTokenCache = () => {
  cachedToken = null;
};

const handleResponse = async (response) => {
  let data;
  const contentType = response.headers.get("content-type");

  try {
    data = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch (error) {
    return { success: false, error: "Failed to parse response", status: response.status };
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearTokenCache();
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return {
      success: false,
      error: data?.message || data?.error || "Something went wrong",
      status: response.status
    };
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

  delete: async (endpoint, body = null, options = {}) => {
    const token = getToken();
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...(body && { body: JSON.stringify(body) }),
        ...options,
      });
      return await handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  upload: async (endpoint, formData, options = {}) => {
    const token = getToken();
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        body: formData,
        ...options,
      });
      return await handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default apiClient;
