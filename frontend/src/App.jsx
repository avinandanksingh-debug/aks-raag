import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBase } from './config';
import './App.css';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import Player from './components/Player';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety fallback: Unblock loading state after 6 seconds if network/server is slow to respond
    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 6000);

    // Check if user is logged in
    axios.get(`${getApiBase()}/api/auth/me`, { withCredentials: true, timeout: 5000 })
      .then(response => {
        if (mounted && response.data?.loggedIn) {
          setLoggedIn(true);
        }
      })
      .catch(error => {
        console.warn("Auth check failed or server sleeping:", error?.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
        clearTimeout(timer);
      });

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#121212', gap: '16px' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1ed760' }}>Aks Raag</div>
        <div style={{ fontSize: '14px', color: '#b3b3b3' }}>Connecting to server...</div>
      </div>
    );
  }

  if (!loggedIn) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <div className="main-layout">
        <Sidebar />
        <MainContent />
      </div>
      <Player />
    </div>
  );
}

export default App;
