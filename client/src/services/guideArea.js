import axios from 'axios';
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const http = axios.create({ baseURL, withCredentials: true, timeout: 20000 });
http.interceptors.response.use(response => response, error => {
  const problem = new Error(error.response?.data?.message || 'Guide request failed. Please try again.');
  problem.status = error.response?.status;
  problem.fields = error.response?.data?.errors || {};
  if (problem.status === 401) window.dispatchEvent(new Event('guzoye:session-expired'));
  return Promise.reject(problem);
});
async function write(method, url, body = {}) {
  const token = (await http.get('/auth/csrf')).data.data.csrfToken;
  return (await http.request({ method, url, data: body, headers: { 'X-CSRF-Token': token } })).data;
}
export const guideAreaApi = {
  overview: async () => (await http.get('/guide/overview')).data.data,
  schedule: async () => (await http.get('/guide/schedule')).data.data,
  blockDate: date => write('post', '/guide/schedule/blocked-dates', { date }),
  unblockDate: date => write('delete', '/guide/schedule/blocked-dates', { date }),
  feedback: async () => (await http.get('/guide/feedback')).data.data,
  performance: async () => (await http.get('/guide/performance')).data.data,
  requests: async params => (await http.get('/guide/requests', { params })).data,
  createRequest: body => write('post', '/guide/requests', body),
  cancelRequest: id => write('delete', `/guide/requests/${id}`),
  publicPerformance: async id => (await http.get(`/guides/${id}/performance`)).data.data,
  ranking: async params => (await http.get('/guides/ranking', { params })).data
};
export const adminGuideAreaApi = {
  guides: async params => (await http.get('/admin/guides', { params })).data,
  suspend: (id, reason) => write('patch', `/admin/guides/${id}/suspend`, { reason }),
  reactivate: id => write('patch', `/admin/guides/${id}/reactivate`)
};
