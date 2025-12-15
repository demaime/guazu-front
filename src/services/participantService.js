const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3977/api";

/**
 * Get authentication token from localStorage
 */
const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

/**
 * Fetch all pollsters or supervisors
 * @param {string} type - "pollsters" or "supervisors"
 */
export async function getParticipants(type) {
  // Back monta las rutas de user directamente en `/api` (sin prefijo `/user`)
  const endpoint = type === "pollsters" ? "/getpollsters" : "/getsupervisors";
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token || "",
    },
    credentials: "include",
    mode: "cors",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${type}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.validation || data.message || `Error fetching ${type}`);
  }
  
  // Return the array of participants directly
  if (type === "pollsters") {
    return data.pollsters || data.users || [];
  } else {
    return data.supervisors || [];
  }
}

/**
 * Add a user to favorites
 * @param {string} targetUserId - ID of the pollster/supervisor to favorite
 * @param {string} type - "pollsters" or "supervisors"
 */
export async function addToFavorites(targetUserId, type) {
  const token = getToken();

  const response = await fetch(`${API_URL}/favorites/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token || "",
    },
    body: JSON.stringify({ targetUserId, type }),
  });

  if (!response.ok) {
    throw new Error("Failed to add to favorites");
  }

  return await response.json();
}

/**
 * Remove a user from favorites
 * @param {string} targetUserId - ID of the pollster/supervisor to unfavorite
 * @param {string} type - "pollsters" or "supervisors"
 */
export async function removeFromFavorites(targetUserId, type) {
  const token = getToken();

  const response = await fetch(`${API_URL}/favorites/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token || "",
    },
    body: JSON.stringify({ targetUserId, type }),
  });

  if (!response.ok) {
    throw new Error("Failed to remove from favorites");
  }

  return await response.json();
}

/**
 * Get user's favorite pollsters or supervisors
 * @param {string} type - "pollsters" or "supervisors"
 */
export async function getFavorites(type) {
  const token = getToken();

  const response = await fetch(`${API_URL}/favorites/${type}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token || "",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch favorite ${type}`);
  }

  const data = await response.json();
  return data.favorites;
}
