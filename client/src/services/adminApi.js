import axios from 'axios';
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const http = axios.create({ baseURL, withCredentials: true, timeout: 20000 });
http.interceptors.response.use(response => response, error => {
  const problem = new Error(error.response?.data?.message || 'Request failed. Please try again.');
  problem.status = error.response?.status; problem.fields = error.response?.data?.errors || {};
  if (problem.status === 401) window.dispatchEvent(new Event('guzoye:session-expired'));
  return Promise.reject(problem);
});
let queue = Promise.resolve();
async function mutate(method, url, data = {}) {
  const job = queue.catch(() => {}).then(async () => {
    const token = (await http.get('/auth/csrf')).data.data.csrfToken;
    return (await http.request({ method, url, data, headers: { 'X-CSRF-Token': token } })).data;
  });
  queue = job; return job;
}
export const adminApi = {
  overview: async params => (await http.get('/admin/overview', { params })).data.data,
  activity: async params => (await http.get('/admin/activity', { params })).data.data,
  guideRequests: async params => (await http.get('/admin/guide-requests', { params })).data,
  decideGuideRequest: (id, action, payload) => mutate('patch', `/admin/guide-requests/${id}/${action}`, payload),
  uploadTourImage: (tourId, file, onProgress) => {
    const job = queue.catch(() => {}).then(async () => {
      const token = (await http.get('/auth/csrf')).data.data.csrfToken;
      const data = new FormData(); data.append('photo', file);
      return (await http.post(`/admin/tours/${tourId}/images`, data, { headers: { 'X-CSRF-Token': token }, onUploadProgress: event => { if (event.total) onProgress?.(Math.round(event.loaded / event.total * 100)); } })).data;
    });
    queue = job; return job;
  },
  removeTourImage: id => mutate('delete', `/admin/media/${id}`),
  exportUrl: resource => `${baseURL}/admin/exports/${resource}.csv`
};
