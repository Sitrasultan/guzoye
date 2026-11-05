import axios from 'axios';
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const http = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000
});
http.interceptors.response.use(response => {
  if (typeof response.data === 'string') {
    throw new Error('The API returned HTML/text instead of JSON. Check VITE_API_URL and restart Vite.');
  }
  return response;
}, error => {
  const problem = new Error(error.response?.data?.message || 'Request failed. Please try again.');
  problem.status = error.response?.status;
  problem.fields = error.response?.data?.errors || {};
  if (problem.status === 401) window.dispatchEvent(new Event('guzoye:session-expired'));
  return Promise.reject(problem);
});
let queue = Promise.resolve();
async function mutate(method, url, data = {}) {
  const job = queue.catch(() => {}).then(async () => {
    const token = (await http.get('/auth/csrf')).data.data.csrfToken;
    return (await http.request({
      method,
      url,
      data,
      headers: {
        'X-CSRF-Token': token
      }
    })).data;
  });
  queue = job;
  return job;
}
async function getAll(url, params = {}) {
  const rows = [];
  let page = 1;
  let result;
  do {
    result = (await http.get(url, {
      params: {
        ...params,
        page,
        limit: 50
      }
    })).data;
    if (!Array.isArray(result.data)) throw new Error('Invalid list response from ' + url);
    rows.push(...result.data);
    page += 1;
  } while (page <= (result.pagination?.pages || 1));
  return {
    data: rows,
    pagination: {
      total: rows.length,
      page: 1,
      limit: rows.length || 50,
      pages: rows.length ? 1 : 0
    }
  };
}
export const adminApi = {
  overview: async params => (await http.get('/admin/overview', {
    params
  })).data.data,
  activity: async params => (await http.get('/admin/activity', {
    params
  })).data.data,
  guideRequests: async params => (await http.get('/admin/guide-requests', {
    params
  })).data,
  decideGuideRequest: (id, action, payload) => mutate('patch', `/admin/guide-requests/${id}/${action}`, payload),
  tours: params => getAll('/admin/tours', params),
  destinations: () => getAll('/destinations'),
  tourGuides: async () => (await http.get('/admin/guides')).data.data,
  createTour: async body => {
    const result = await mutate('post', '/admin/tours', body);
    // Existing createTour does not honor requested status: explicitly set draft on creation.
    if (body.status === 'draft') await mutate('patch', `/admin/tours/${result.data._id}/status`, {
      status: 'draft'
    });
    return result.data;
  },
  addDeparture: async (id, body) => (await mutate('post', `/admin/tours/${id}/departures`, body)).data,
  removeDeparture: async (id, departureId) => (await mutate('delete', `/admin/tours/${id}/departures/${departureId}`)).data,
  updateTour: async (id, body) => (await mutate('patch', `/admin/tours/${id}`, body)).data,
  setTourStatus: async (id, status) => (await mutate('patch', `/admin/tours/${id}/status`, {
    status
  })).data,
  assignGuides: async (id, guideIds) => (await mutate('patch', `/admin/tours/${id}/assigned-guides`, {
    guideIds
  })).data,
  createDestination: body => mutate('post', '/admin/destinations', body),
  uploadTourImageFile: file => {
    const job = queue.catch(() => {}).then(async () => {
      const token = (await http.get('/auth/csrf')).data.data.csrfToken;
      const data = new FormData();
      data.append('photo', file);
      return (await http.post('/admin/tour-images', data, {
        headers: {
          'X-CSRF-Token': token
        }
      })).data;
    });
    queue = job;
    return job;
  },
  users: async params => (await http.get('/admin/users', {
    params
  })).data,
  deactivateUser: async (id, reason) => (await mutate('patch', `/admin/users/${id}/deactivate`, {
    reason
  })).data,
  audit: async params => (await http.get('/admin/audit', {
    params
  })).data,
  guides: async (params = {}) => {
    // adminTourRoutes handles this URL before adminRoutes and returns approved guides only.
    if (params.status && params.status !== 'approved') {
      throw new Error('This server exposes approved guides only at /admin/guides. Pending/rejected applications are blocked by a duplicate server route; no server changes are included in this UI patch.');
    }
    const result = (await http.get('/admin/guides')).data;
    const rows = result.data || [];
    const page = params.page || 1;
    const limit = params.limit || 10;
    return {
      data: rows.slice((page - 1) * limit, page * limit),
      pagination: {
        total: rows.length,
        page,
        limit,
        pages: Math.ceil(rows.length / limit)
      }
    };
  },
  decideGuide: async (id, action, payload) => (await mutate('patch', `/admin/guides/${id}/${action}`, payload)).data
};
