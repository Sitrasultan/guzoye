import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  // Prevent a stale initial /me response from overwriting a later login/logout.
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const currentRevision = ++revision.current;
    setLoading(true); setSessionError('');
    try {
      const current = await authApi.me();
      if (currentRevision === revision.current) setUser(current);
      return current;
    } catch (error) {
      if (currentRevision === revision.current) { setUser(null); if (error.status !== 401) setSessionError(error.message); }
      return null;
    } finally { if (currentRevision === revision.current) setLoading(false); }
  }, []);
  useEffect(() => { refresh(); return () => { revision.current += 1; }; }, [refresh]);
  useEffect(() => {
    const expired = () => { revision.current += 1; setUser(null); setLoading(false); setSessionError(''); };
    window.addEventListener('guzoye:session-expired', expired);
    return () => window.removeEventListener('guzoye:session-expired', expired);
  }, []);
  async function authenticate(action, values) {
    revision.current += 1;
    const current = await action(values);
    revision.current += 1;
    setUser(current); setLoading(false); setSessionError('');
    return current;
  }
  async function logout() {
    revision.current += 1;
    try { await authApi.logout(); }
    catch (error) { if (error.status !== 401) throw error; }
    revision.current += 1;
    setUser(null); setLoading(false); setSessionError('');
  }
  return <AuthContext.Provider value={{ user, loading, sessionError, refresh, login: values => authenticate(authApi.login, values), register: values => authenticate(authApi.register, values), logout }}>{children}</AuthContext.Provider>;
}
