export const API_URL = process.env.API_URL
  ? `${process.env.API_URL}/api`
  : "http://localhost:5000/api";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/signin",
    REGISTER: "/signup",
    FORGOT_PASSWORD: "/forgot",
    RESET_PASSWORD: "/reset",
    ACTIVATE_ACCOUNT: "/activate",
  },
};

export const getHeaders = (token = null) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = token;
  }

  return headers;
};
