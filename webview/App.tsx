import { useEffect } from 'react';

import { useVscodeApi } from '@/hooks/useVscodeApi';
import { Dashboard } from '@/views/Dashboard';

import './index.css';

function App() {
  const api = useVscodeApi();

  // Tell the extension we're ready so it can restore state.
  useEffect(() => {
    api.postMessage({ type: 'webview/ready' });
  }, [api]);

  return <Dashboard />;
}

export default App;
