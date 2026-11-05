import axios from 'axios';
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const http = axios.create({ baseURL, withCredentials: true, timeout: 20000 });
http.interceptors.response.use(response => response, error => {
  const problem = new Error(error.response?.data?.message || 'Traveler request failed. Please try again.');
  problem.status = error.response?.status; problem.fields = error.response?.data?.errors || {};
  if (problem.status === 401) window.dispatchEvent(new Event('guzoye:session-expired'));
  return Promise.reject(problem);
});
async function write(method, url, body = {}) {
  const token = (await http.get('/auth/csrf')).data.data.csrfToken;
  return (await http.request({ method, url, data: body, headers: { 'X-CSRF-Token': token } })).data;
}
export const travelerApi = {
  overview: async () => (await http.get('/account/overview')).data.data,
  profile: async () => (await http.get('/account/profile')).data.data,
  updateProfile: body => write('patch', '/account/profile', body),
  changePassword: body => write('patch', '/account/password', body),
  wishlist: async () => (await http.get('/wishlist')).data.data,
  addWishlist: tourId => write('post', '/wishlist', { tourId }),
  removeWishlist: tourId => write('delete', '/wishlist', { tourId }),
  reviews: async () => (await http.get('/account/reviews')).data.data,
  createReview: body => write('post', '/reviews', body),
  updateReview: (id, body) => write('patch', `/reviews/${id}`, body),
  deleteReview: id => write('delete', `/reviews/${id}`),
  uploadAvatar: file => {
    const data = new FormData(); data.append('photo', file);
    return (async () => {
      const token = (await http.get('/auth/csrf')).data.data.csrfToken;
      return (await http.post('/account/avatar', data, { headers: { 'X-CSRF-Token': token } })).data;
    })();
  }
};
