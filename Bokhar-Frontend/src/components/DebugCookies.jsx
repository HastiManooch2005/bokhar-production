// DebugCookies.jsx
import { useState } from 'react';
import api from '../api';

const DebugCookies = () => {
  const [debugInfo, setDebugInfo] = useState(null);

  const checkCookies = async () => {
    try {
      const res = await api.get("/debug-cookies/");
      setDebugInfo(res.data);
      console.log("🍪 Cookie debug info:", res.data);
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>Debug Cookies</h3>
      <button onClick={checkCookies}>Check Cookies</button>
      {debugInfo && (
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      )}
    </div>
  );
};

export default DebugCookies;