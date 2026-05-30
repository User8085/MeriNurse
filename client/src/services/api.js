import axios from 'axios';

// Use relative path so Vite's proxy handles it — eliminates CORS completely.
// In production set VITE_API_URL to your deployed API base.
const API_BASE = import.meta.env.VITE_API_URL || 'https://merinurse.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medivault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('medivault_token');
      localStorage.removeItem('medivault_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Medical Records
export const recordsAPI = {
  getAll: (params) => api.get('/records', { params }),
  getOne: (id) => api.get(`/records/${id}`),
  create: (formData) => api.post('/records', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/records/${id}`, data),
  delete: (id) => api.delete(`/records/${id}`),
  analyze: (id) => api.post(`/records/${id}/analyze`),
};

// Prescriptions
export const prescriptionsAPI = {
  getAll: (params) => api.get('/prescriptions', { params }),
  create: (formData) => api.post('/prescriptions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/prescriptions/${id}`, data),
  delete: (id) => api.delete(`/prescriptions/${id}`),
};

// Allergies
export const allergiesAPI = {
  getAll: (params) => api.get('/allergies', { params }),
  create: (data) => api.post('/allergies', data),
  update: (id, data) => api.put(`/allergies/${id}`, data),
  delete: (id) => api.delete(`/allergies/${id}`),
};

// Chat
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  createConversation: (data) => api.post('/chat/conversations', data),
  sendMessage: (id, message) => api.post(`/chat/conversations/${id}/messages`, { message }),
  quickChat: (message, context) => api.post('/chat/quick', { message, context }),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
};

// Doctor Access
export const accessAPI = {
  getMyDoctors: () => api.get('/access/my-doctors'),
  getMyPatients: () => api.get('/access/my-patients'),
  getAllPatients: (q) => api.get('/access/all-patients', { params: q ? { q } : {} }),
  grantAccess: (data) => api.post('/access/grant', data),
  updateAccess: (id, data) => api.put(`/access/${id}`, data),
  revokeAccess: (id) => api.delete(`/access/${id}`),
  searchDoctors: (q) => api.get('/access/doctors/search', { params: { q } }),
  searchPatients: (q) => api.get('/access/patients/search', { params: { q } }),
};

// Drug Info
export const drugAPI = {
  search: (name) => api.get('/drugs/search', { params: { name } }),
  adverseEvents: (name) => api.get('/drugs/adverse-events', { params: { name } }),
  checkInteractions: (drugNames) => api.post('/drugs/interactions', { drugNames }),
  suggest: (q) => api.get('/drugs/suggest', { params: { q } }),
  getClass: (rxcui) => api.get(`/drugs/class/${rxcui}`),
};

// Appointments
export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  create: (data) => api.post('/appointments', data),
  confirm: (id, data) => api.put(`/appointments/${id}/confirm`, data),
  decline: (id, data) => api.put(`/appointments/${id}/decline`, data),
  cancel: (id) => api.delete(`/appointments/${id}`),
};

export default api;
