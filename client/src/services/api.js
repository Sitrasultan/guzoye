import axios from 'axios';
import catalog from '../../../shared/catalog.json';
export const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock';
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 12000,
  withCredentials: true
});
http.interceptors.response.use(response => response, error => {
  const message = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Cannot reach Guzoye. Check the API connection and try again.');
  const normalized = new Error(message);
  normalized.status = error.response?.status;
  normalized.fields = error.response?.data?.errors || {};
  if (normalized.status === 401 && !error.config?.url?.startsWith('/auth/')) window.dispatchEvent(new Event('guzoye:session-expired'));
  return Promise.reject(normalized);
});
// Fetch a fresh signed, session-bound CSRF token before every write. No JWT is
// exposed to JavaScript, localStorage, or the JSON response.
async function mutate(method, url, body = {}) {
  const response = await http.get('/auth/csrf');
  return (await http.request({ method, url, data: body, headers: { 'X-CSRF-Token': response.data.data.csrfToken } })).data;
}
export const authApi = {
  me: async () => (await http.get('/auth/me')).data.data.user,
  login: async data => (await mutate('post', '/auth/login', data)).data.user,
  register: async data => (await mutate('post', '/auth/register', data)).data.user,
  logout: () => mutate('post', '/auth/logout')
};
export const adminApi = {
  applications: async (page = 1) => (await http.get('/admin/guides', { params: { status: 'pending', page, limit: 10 } })).data,
  approve: id => mutate('patch', `/admin/guides/${id}/approve`)
};
export const dashboardApi = {
  summary: async role => (await http.get(`/dashboard/${role}`)).data.data,
  workspace: async () => (await http.get('/dashboard/guide/workspace')).data.data
};
const pause = () => new Promise(resolve => setTimeout(resolve, 350));
function mockList(resource, params = {}) {
  let data = [...catalog[resource]];
  if (params.search || params.q) { const term = (params.q || params.search).toLowerCase(); data = data.filter(x => `${x.title || x.user?.name || x.name} ${x.description || ''} ${x.destination?.name || ''}`.toLowerCase().includes(term)); }
  if (params.region) data = data.filter(x => x.destination?.region === params.region);
  if (params.maxPrice) data = data.filter(x => x.price <= Number(params.maxPrice));
  if (params.duration) data = data.filter(x => x.duration <= Number(params.duration));
  if (params.difficulty) data = data.filter(x => x.difficulty === params.difficulty);
  if (resource === 'guides') { data = data.map(guide => ({ ...guide, coveredPlaces: catalog.destinations.filter(destination => (guide.coveredDestinations || []).includes(destination._id) || catalog.tours.some(tour => tour.guide._id === guide._id && tour.destination._id === destination._id)) })); if (params.destination) data = data.filter(guide => guide.coveredPlaces.some(place => place._id === params.destination)); if (params.minRating) data = data.filter(guide => guide.rating >= Number(params.minRating)); }
  if (params.language) data = data.filter(x => x.languages?.includes(params.language));
  if (params.guide) data = data.filter(x => x.guide?._id === params.guide);
  if (params.featured === 'true') data = data.filter(x => x.featured);
  if (resource === 'guides' && params.sort === 'name') data.sort((a,b) => a.user.name.localeCompare(b.user.name));
  else if (resource === 'guides' && params.sort === 'experience') data.sort((a,b) => b.yearsExperience-a.yearsExperience);
  else if (params.sort === 'price-asc') data.sort((a, b) => a.price - b.price);
  else if (params.sort === 'price-desc') data.sort((a, b) => b.price - a.price);
  else data.sort((a, b) => (b.rating || 0) - (a.rating || 0) || a._id.localeCompare(b._id));
  const total = data.length, limit = Number(params.limit || 8), page = Number(params.page || 1);
  return { data: data.slice((page - 1) * limit, page * limit), pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
}
export const api = {
  async list(resource, params = {}) { if (!isMock) return (await http.get(`/${resource}`, { params })).data; await pause(); return mockList(resource, params); },
  async detail(resource, id) { if (!isMock) return (await http.get(`/${resource}/${id}`)).data; await pause(); const item = catalog[resource].find(x => x._id === id); if (!item) throw new Error('This item could not be found.'); return { data: item }; },
  async reviews(id) { if (!isMock) return (await http.get(`/tours/${id}/reviews`)).data; await pause(); return { data: catalog.reviews.filter(x => x.tour === id) }; }
};
