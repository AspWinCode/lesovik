import { BrowserRouter, Route, Routes } from "react-router-dom";

export function RuntimeApp() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/" element={<div style={{ padding: 32 }}>Runtime — Sprint 0 Placeholder</div>} />
      </Routes>
    </BrowserRouter>
  );
}
