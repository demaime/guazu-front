import { API_URL } from "./constants";

// Rutas de autenticación
export const AUTH_ROUTES = {
  LOGIN: `${API_URL}/api/signin`,
  REGISTER: `${API_URL}/api/signup`,
  FORGOT_PASSWORD: `${API_URL}/api/forgot`,
  RESET_PASSWORD: `${API_URL}/api/reset`,
  ACTIVATE_ACCOUNT: `${API_URL}/api/activate`,
};

// Rutas de encuestas
export const SURVEY_ROUTES = {
  BASE: `${API_URL}/api/survey`,
  BY_ID: (id) => `${API_URL}/api/survey/${id}`,
  BY_USER_ID: `${API_URL}/api/surveyByUserId`,
  DELETE: (id) => `${API_URL}/api/delete-survey/${id}`,
  GET: (id) => `${API_URL}/api/surveyById/${id}`,
  ANSWERS: (id) => `${API_URL}/api/answerBySurveyId/${id}`,
  CREATE: `${API_URL}/api/create-survey`,
  GET_DRAFTS: `${API_URL}/api/drafts`,
  PUBLISH_DRAFT: (id) => `${API_URL}/api/publish-draft/${id}`,
  // Rutas de progreso de pollsters
  POLLSTER_PROGRESS: (surveyId, pollsterId) =>
    `${API_URL}/api/survey/${surveyId}/pollster-progress/${pollsterId}`,
  ALL_POLLSTER_PROGRESS: (surveyId) =>
    `${API_URL}/api/survey/${surveyId}/all-pollster-progress`,
  UPDATE_POLLSTER_ASSIGNMENTS: `${API_URL}/api/update-pollster-assignments`,
};

// Rutas de respuestas
export const ANSWER_ROUTES = {
  SAVE: `${API_URL}/api/insert-answer`,
  BY_SURVEY_ID: (id) => `${API_URL}/api/answerBySurveyId/${id}`,
  DELETE: (id) => `${API_URL}/api/answer-delete/${id}`,
};

// Rutas de usuarios
export const USER_ROUTES = {
  GET_ALL: `${API_URL}/api/getUsers`,
  GET_POLLSTERS: `${API_URL}/api/getpollsters`,
  GET_SUPERVISORS: `${API_URL}/api/getsupervisors`,
  GET_PROFILE: `${API_URL}/api/getUserById`,
  GET_BY_ID: (id) => `${API_URL}/api/getUserById/${id}`,
  DELETE_USER: `${API_URL}/api/deleteUser`,
  UPDATE: `${API_URL}/api/update`,
  UPDATE_PASSWORD: `${API_URL}/api/changepassword`,
  UPDATE_IMAGE: `${API_URL}/api/upload-image-user`,
};
