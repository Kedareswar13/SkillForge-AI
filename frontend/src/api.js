import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const signup = (data) => API.post('/auth/signup', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Profile
export const getProfile = () => API.get('/profile');
export const updateProfile = (data) => API.put('/profile', data);

// Resume
export const uploadResume = (formData) => API.post('/resume/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 120000
});

// JD
export const processJD = (data) => {
  if (data instanceof FormData) {
    return API.post('/jd/process', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return API.post('/jd/process', data);
};

// Analysis
export const runAnalysis = () => API.post('/analyze');

// Assessment
export const startAssessment = () => API.post('/assessment/start');
export const submitAnswer = (data) => API.post('/assessment/answer', data);
export const getAssessmentHistory = () => API.get('/assessment/history');

// Learning Plan
export const getLearningPlan = () => API.get('/learning-plan');
export const generateLearningPlan = () => API.post('/learning-plan/generate');
export const updateProgress = (index, progress) => API.put(`/learning-plan/${index}/progress`, { progress });
export const getValidationQuestion = (index, resourceIndex) => API.post(`/learning-plan/${index}/validate/question`, { resourceIndex });
export const submitValidationAnswer = (index, data) => API.post(`/learning-plan/${index}/validate/answer`, data);

// Mock Interview
export const startMockInterview = (data) => API.post('/mock-interview/start', data);
export const evaluateMockAnswer = (data) => API.post('/mock-interview/evaluate', data);

export default API;
