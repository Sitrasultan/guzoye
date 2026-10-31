import { useEffect, useState } from 'react';
// Ignore stale responses when a filter changes or a route unmounts.
export function useResource(loader, key) {
  const [state,setState] = useState({ data: null, loading: true, error: '' });
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ data:null, loading:true, error:'' });
    loader().then(data => { if(active) setState({ data, loading:false, error:'' }); }).catch(error => { if(active) setState({ data:null, loading:false, error:error.message }); });
    return () => { active = false; };
    // The explicit key represents the loader's parameters, not its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key,attempt]);
  return { ...state, retry: () => setAttempt(x => x+1) };
}
