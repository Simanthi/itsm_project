// itsm_project/itsm_frontend/src/App.tsx
import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/hello/') // Target your Django API
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMessage(data.message);
        console.log(data); // Log the full API response
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        setError("Failed to fetch message from Django API.");
      });
  }, []); // Empty dependency array means this runs once on mount

  return (
    <>
    <div>
<a href="https://vitejs.dev" target="_blank">
<img src={viteLogo} className="logo" alt="Vite logo" />
</a>
<a href="https://react.dev" target="_blank">
<img src={reactLogo} className="logo react" alt="React logo" />
</a>
</div>
<h1>Vite + React</h1>
<div className="card">
{message ? (
<p>Message from Django: <strong>{message}</strong></p>
) : error ? (
<p style={{ color: 'red' }}>Error: {error}</p>
) : (
<p>Loading message from Django...</p>
)}
</div>
<p className="read-the-docs">
Click on the Vite and React logos to learn more
</p>
</>
);
}
    export default App;