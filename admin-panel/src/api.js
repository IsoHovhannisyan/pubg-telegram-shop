// src/api.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// Auth
export const login = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { username, password });
  return response.data;
};

// Orders
export const getOrders = async () => {
  const response = await axios.get(`${API_URL}/admin/orders`);
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await axios.patch(`${API_URL}/admin/orders/${orderId}`, { status });
  return response.data;
};

// Products
export const getProducts = async () => {
  const response = await axios.get(`${API_URL}/admin/products`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await axios.post(`${API_URL}/admin/products`, productData);
  return response.data;
};

export const updateProduct = async (productId, productData) => {
  const response = await axios.put(`${API_URL}/admin/products/${productId}`, productData);
  return response.data;
};

export const deleteProduct = async (productId) => {
  const response = await axios.delete(`${API_URL}/admin/products/${productId}`);
  return response.data;
};

// Settings
export const getSettings = async () => {
  const response = await axios.get(`${API_URL}/admin/settings`);
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await axios.post(`${API_URL}/admin/settings`, settings);
  return response.data;
};

// Stats
export const getStats = async () => {
  const response = await axios.get(`${API_URL}/admin/stats`);
  return response.data;
};

export const getOrderStats = async () => {
  const response = await axios.get(`${API_URL}/admin/orders/stats/summary`);
  return response.data;
};

// UC Codes
export const getUcCodes = async () => {
  const response = await axios.get(`${API_URL}/admin/uc-codes`);
  return response.data;
};

export const createUcCode = async (codeData) => {
  const response = await axios.post(`${API_URL}/admin/uc-codes`, codeData);
  return response.data;
};

export const deleteUcCode = async (codeId) => {
  const response = await axios.delete(`${API_URL}/admin/uc-codes/${codeId}`);
  return response.data;
};

// Referrals
export const getReferrals = async () => {
  const response = await axios.get(`${API_URL}/admin/referrals`);
  return response.data;
};

// Get referral points for a user
export const getReferralPoints = async (userId) => {
  const response = await axios.get(`${API_URL}/admin/referrals/points/${userId}`);
  return response.data;
};

// Add axios interceptor for authentication
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add axios interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
});

