import axios from 'axios';

const API_BASE_URL = 'https://ipl-auctiongame-mern-cj.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post('/login', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Network error' };
    }
  },

  signup: async (userData) => {
    try {
      const response = await api.post('/signup', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Network error' };
    }
  },

  test: async () => {
    try {
      const response = await api.get('/test');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Network error' };
    }
  }
};

export default api;
