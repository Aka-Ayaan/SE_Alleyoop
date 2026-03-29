export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://YOUR_LOCAL_IP:5000';

export const endpoints = {
  login: `${API_BASE_URL}/auth/validate`,
  signup: `${API_BASE_URL}/auth/signup`,
};
