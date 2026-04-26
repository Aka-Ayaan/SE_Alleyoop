export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://YOUR_LOCAL_IP:5000';

export const endpoints = {
  login: `${API_BASE_URL}/auth/validate`,
  signup: `${API_BASE_URL}/auth/signup`,
  resendVerification: `${API_BASE_URL}/auth/resend-verification`,
  requestPasswordReset: `${API_BASE_URL}/auth/request-password-reset`,
  verify: `${API_BASE_URL}/auth/verify`,
  verifyMobile: `${API_BASE_URL}/auth/verify-mobile`,
  arenasList: `${API_BASE_URL}/arena/get`,
  arenaDetails: (arenaId) => `${API_BASE_URL}/arena/get/${arenaId}`,
  courtTypes: `${API_BASE_URL}/court-types`,
  createBooking: `${API_BASE_URL}/bookings`,
  playerBookings: (userId) => `${API_BASE_URL}/bookings/${userId}`,
  publicBookingsLobby: `${API_BASE_URL}/bookings/lobby/open`,
  joinPublicBooking: (bookingId) => `${API_BASE_URL}/bookings/${bookingId}/join`,
};
