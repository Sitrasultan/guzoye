import axios from 'axios';
import catalog from '../../../shared/catalog.json';
export const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock';
const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 12000 });
http.interceptors.response.use(response => response, error => {
  const message = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Cannot reach Wondu. Check the API connection and try again.');
  return Promise.reject(new Error(message));
});
const pause = () => new Promise(resolve => setTimeout(resolve, 350));
function mockList(resource, params = {}) {
  let data = [...catalog[resource]];
  if (params.search) { const term = params.search.toLowerCase(); data = data.filter(x => `${x.title || x.user?.name || x.name} ${x.description || ''} ${x.destination?.name || ''}`.toLowerCase().includes(term)); }
  if (params.region) data = data.filter(x => x.destination?.region === params.region);
  if (params.maxPrice) data = data.filter(x => x.price <= Number(params.maxPrice));
  if (params.duration) data = data.filter(x => x.duration <= Number(params.duration));
  if (params.difficulty) data = data.filter(x => x.difficulty === params.difficulty);
  if (params.language) data = data.filter(x => x.languages?.includes(params.language));
  if (params.guide) data = data.filter(x => x.guide?._id === params.guide);
  if (params.featured === 'true') data = data.filter(x => x.featured);
  if (params.sort === 'price-asc') data.sort((a,b) => a.price-b.price);
  else if (params.sort === 'price-desc') data.sort((a,b) => b.price-a.price);
  else data.sort((a,b) => (b.rating || 0)-(a.rating || 0) || a._id.localeCompare(b._id));
  const total = data.length, limit = Number(params.limit || 8), page = Number(params.page || 1);
  return { data: data.slice((page-1)*limit,page*limit), pagination: { total, page, limit, pages: Math.ceil(total/limit) } };
}
export const api = {
  async list(resource, params = {}) { if (!isMock) return (await http.get(`/${resource}`, { params })).data; await pause(); return mockList(resource,params); },
  async detail(resource,id) { if (!isMock) return (await http.get(`/${resource}/${id}`)).data; await pause(); const item = catalog[resource].find(x => x._id === id); if (!item) throw new Error('This item could not be found.'); return { data: item }; },
  async reviews(id) { if (!isMock) return (await http.get(`/tours/${id}/reviews`)).data; await pause(); return { data: catalog.reviews.filter(x => x.tour === id) }; }
};
