// itsm_frontend/src/main.tsx (or index.tsx)
import React from 'react';
import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom'; // <--- REMOVE THIS IMPORT if it's here
import App from './App';
import './index.css'; // Assuming you have a global CSS file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <BrowserRouter> */} {/* <--- REMOVE THIS LINE */}
      <App />
    {/* </BrowserRouter> */} {/* <--- AND THIS LINE */}
  </React.StrictMode>,
);