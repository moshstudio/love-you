const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // We no longer manually handle tokens. NextAuth handles session cookies.

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Auth APIs
export const authApi = {
  // Register still uses manual call, but useAuth handles it via fetch directly now.
  // We keep this for backward compatibility if used elsewhere.
  register: (email: string, username: string, password: string) =>
    apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// Albums APIs
export const albumsApi = {
  list: () => apiCall("/albums", { method: "GET" }),

  get: (id: string) => apiCall(`/albums/${id}`, { method: "GET" }),

  create: (
    title: string,
    description?: string,
    location?: string,
    startDate?: string,
    endDate?: string,
  ) =>
    apiCall("/albums", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        location,
        startDate,
        endDate,
      }),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiCall(`/albums/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiCall(`/albums/${id}`, { method: "DELETE" }),
};

// Photos APIs
export const photosApi = {
  list: (albumId?: string) => {
    const query = albumId ? `?albumId=${albumId}` : "";
    return apiCall(`/photos${query}`, { method: "GET" });
  },

  upload: async (
    file: File,
    albumId: string,
    caption?: string,
    latitude?: number,
    longitude?: number,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("albumId", albumId);
    if (caption) formData.append("caption", caption);
    if (latitude) formData.append("latitude", latitude.toString());
    if (longitude) formData.append("longitude", longitude.toString());

    // No manual token header needed
    const headers: HeadersInit = {};

    const response = await fetch(`${API_BASE}/api/photos`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  delete: (id: string) => apiCall(`/photos/${id}`, { method: "DELETE" }),
};

// Stories APIs
export const storiesApi = {
  list: (albumId?: string) => {
    const query = albumId ? `?albumId=${albumId}` : "";
    return apiCall(`/stories${query}`, { method: "GET" });
  },

  get: (id: string) => apiCall(`/stories/${id}`, { method: "GET" }),

  create: (albumId: string, title: string, content: string) =>
    apiCall("/stories", {
      method: "POST",
      body: JSON.stringify({ albumId, title, content }),
    }),

  update: (id: string, title: string, content: string) =>
    apiCall(`/stories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, content }),
    }),

  delete: (id: string) => apiCall(`/stories/${id}`, { method: "DELETE" }),
};

// Share APIs
export const shareApi = {
  create: (albumId: string, expiresIn?: number) =>
    apiCall("/share", {
      method: "POST",
      body: JSON.stringify({ albumId, expiresIn }),
    }),

  list: (albumId?: string) => {
    const query = albumId ? `?albumId=${albumId}` : "";
    return apiCall(`/share${query}`, { method: "GET" });
  },

  getShared: (token: string) =>
    fetch(`${API_BASE}/api/share/${token}`).then((res) => res.json()),
};
