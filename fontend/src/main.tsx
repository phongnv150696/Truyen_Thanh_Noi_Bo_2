import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { BrowserRouter } from 'react-router-dom'

window.onerror = (msg, url, line, col, error) => {
  console.error('GLOBAL ERROR:', { msg, url, line, col, error });
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 2rem; color: #ef4444; font-family: sans-serif;">
      <h2>Lỗi nghiêm trọng hệ thống</h2>
      <pre>${msg}</pre>
      <p>Vui lòng chụp ảnh màn hình này gửi cho hỗ trợ viên.</p>
    </div>`;
  }
};

window.onunhandledrejection = (event) => {
  console.error('UNHANDLED REJECTION:', event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
