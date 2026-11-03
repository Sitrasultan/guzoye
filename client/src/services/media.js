import axios from 'axios';
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const http = axios.create({ baseURL, withCredentials: true, timeout: 60000 });
http.interceptors.response.use(response => response, error => {
  const problem = new Error(error.response?.data?.message || 'Image request failed. Check your connection and refresh before retrying.');
  problem.status = error.response?.status;
  if (problem.status === 401) window.dispatchEvent(new Event('guzoye:session-expired'));
  return Promise.reject(problem);
});
// Serialize this service's mutations so rotating the double-submit cookie does not
// race another image request in the same tab. Existing auth flow is unchanged.
let queue = Promise.resolve();
function mutate(method, url, data, onUploadProgress) {
  const job = queue.catch(() => {}).then(async () => {
    const token = (await http.get('/auth/csrf')).data.data.csrfToken;
    return (await http.request({ method, url, data, headers: { 'X-CSRF-Token': token }, onUploadProgress })).data;
  });
  queue = job; return job;
}
export const mediaApi = {
  upload: (file, kind, onProgress) => {
    const data = new FormData(); data.append('photo', file);
    return mutate('post', kind === 'avatar' ? '/guide/profile/photo' : '/guide/media', data, event => { if (event.total) onProgress?.(Math.round(event.loaded / event.total * 100)); });
  },
  removePhoto: () => mutate('delete', '/guide/profile/photo', {}),
  removeDraft: id => mutate('delete', `/guide/media/${id}`, {}),
  library: async () => (await http.get('/guide/media')).data
};
export function mediaUrl(value) {
  if (!value) return '';
  return value.startsWith('/uploads/') ? `${new URL(baseURL, window.location.origin).origin}${value}` : value;
}
