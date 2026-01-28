import './App.css'
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
      </Route>
      {/* Redirect qualsiasi rotta sconosciuta alla home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App
