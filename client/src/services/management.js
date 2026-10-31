import axios from 'axios';
const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', withCredentials: true, timeout: 20000 });
http.interceptors.response.use(response => response, error => {
  const problem = new Error(error.response?.data?.message || 'Cannot reach Wondu. Refresh the page and check the result before retrying a write.');
  problem.status = error.response?.status; problem.fields = error.response?.data?.errors || {};
  if (problem.status === 401) window.dispatchEvent(new Event('wondu:session-expired'));
  return Promise.reject(problem);
});
async function write(method, url, body = {}) {
  const token = (await http.get('/auth/csrf')).data.data.csrfToken;
  return (await http.request({ method, url, data: body, headers: { 'X-CSRF-Token': token } })).data;
}
const get = async (url, params) => (await http.get(url, { params })).data;
export const guideManagement = {
  profile: () => get('/guide/profile'), saveProfile: body => write('patch', '/guide/profile', body), summary: () => get('/guide/summary'),
  tours: params => get('/guide/tours', params), tour: id => get(`/guide/tours/${id}`),
  create: body => write('post', '/guide/tours', body), save: (id, body) => write('patch', `/guide/tours/${id}`, body),
  archive: id => write('patch', `/guide/tours/${id}/archive`),
  addDeparture: (id, body) => write('post', `/guide/tours/${id}/departures`, body),
  removeDeparture: (id, departureId) => write('delete', `/guide/tours/${id}/departures/${departureId}`),
  destinations: () => get('/destinations', { limit: 50 })
};
export const adminManagement = {
  stats: () => get('/admin/stats'), guides: params => get('/admin/guides', params),
  approve: id => write('patch', `/admin/guides/${id}/approve`), reject: (id, reason) => write('patch', `/admin/guides/${id}/reject`, { reason }),
  tours: params => get('/admin/tours', params), archive: id => write('patch', `/admin/tours/${id}/archive`), reassign: (id, guideId) => write('patch', `/admin/tours/${id}/guide`, { guideId }),
  users: params => get('/admin/users', params), deactivate: (id, reason) => write('patch', `/admin/users/${id}/deactivate`, { reason }), audit: params => get('/admin/audit', params)
};
