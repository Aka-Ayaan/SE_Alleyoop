export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://YOUR_LOCAL_IP:5000';

export const endpoints = {
  login: `${API_BASE_URL}/auth/validate`,
  signup: `${API_BASE_URL}/auth/signup`,
  verify: `${API_BASE_URL}/auth/verify`,
  verifyMobile: `${API_BASE_URL}/auth/verify-mobile`,

  Arenas: `${API_BASE_URL}/arenas`,
  sellerProducts: `${API_BASE_URL}/products`,
  sellerOrders: `${API_BASE_URL}/orders/seller`,

};
