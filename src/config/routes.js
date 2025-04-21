import { API_URL } from "./constants";

// Rutas de autenticación
export const AUTH_ROUTES = {
  LOGIN: `${API_URL}/signin`,
  REGISTER: `${API_URL}/signup`,
  FORGOT_PASSWORD: `${API_URL}/forgot`,
  RESET_PASSWORD: `${API_URL}/reset`,
  ACTIVATE_ACCOUNT: `${API_URL}/activate`,
};

// Rutas de encuestas
export const SURVEY_ROUTES = {
  BASE: `${API_URL}/survey`,
  BY_ID: (id) => `${API_URL}/survey/${id}`,
  BY_USER_ID: `${API_URL}/surveyByUserId`,
  DELETE: (id) => `${API_URL}/delete-survey/${id}`,
  GET: (id) => `${API_URL}/surveyById/${id}`,
  ANSWERS: (id) => `${API_URL}/answerBySurveyId/${id}`,
  CREATE: `${API_URL}/create-survey`,
};

// Rutas de respuestas
export const ANSWER_ROUTES = {
  SAVE: `${API_URL}/insert-answer`,
  BY_SURVEY_ID: (id) => `${API_URL}/answerBySurveyId/${id}`,
  DELETE: (id) => `${API_URL}/answer-delete/${id}`,
};

// Rutas de usuarios
export const USER_ROUTES = {
  GET_ALL: `${API_URL}/getUsers`,
  GET_POLLSTERS: `${API_URL}/getpollsters`,
  GET_SUPERVISORS: `${API_URL}/getsupervisors`,
  GET_BY_ID: (id) => `${API_URL}/getUserById/${id}`,
  DELETE: (id) => `${API_URL}/deleteUser/${id}`,
};
