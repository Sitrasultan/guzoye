import axios from 'axios';
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, timeout: 15000
});
http.interceptors.response.use(response => response, error => {
  const problem = new Error(error.response?.data?.message || 'Cannot confirm the result. Check My Bookings and refresh availability before retrying; your request may have reached the server.');
  problem.status = error.response?.status;
  problem.fields = error.response?.data?.errors || {};
  if (problem.status === 401) window.dispatchEvent(new Event('guzoye:session-expired'));
  return Promise.reject(problem);
});
// Same signed CSRF-cookie + JSON token + X-CSRF-Token flow as Phase 3 auth.
async function write(method, url, data = {}) {
  const token = (await http.get('/auth/csrf')).data.data.csrfToken;
  return (await http.request({ method, url, data, headers: { 'X-CSRF-Token': token } })).data;
}
export const bookingsApi = {
  create: data => write('post', '/bookings', data),
  mine: async params => (await http.get('/bookings/mine', { params })).data,
  cancel: id => write('patch', `/bookings/${id}/cancel`),
  guide: async params => (await http.get('/guide/bookings', { params })).data,
  status: (id, status) => write('patch', `/bookings/${id}/status`, { status }),
  admin: async params => (await http.get('/admin/bookings', { params })).data
};
export const formatDeparture = value => new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Addis_Ababa'
}).format(new Date(value));
export const formatMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
