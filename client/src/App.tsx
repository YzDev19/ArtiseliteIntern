import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/register';
import Dashboard from './pages/dashboard'; 
import Inventory from './pages/inventory';
import Transactions from './pages/transaction';
import Warehouses from './pages/warehouse';
import Inbound from './pages/inbound';
import Outbound from './pages/outbound';
import Users from './pages/role';
import Reports from './pages/report';

// Component wrapper to enforce authentication checks
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  
  // Redirect unauthenticated users to the login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Render the protected content if a token is present
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Secure Application Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/inventory" element={
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      } />

      <Route path="/transactions" element={
        <ProtectedRoute>
          <Transactions />
        </ProtectedRoute>
      } />

      <Route path="/warehouses" element={
        <ProtectedRoute>
          <Warehouses />
        </ProtectedRoute>
      } />

      <Route path="/inbound" element={
        <ProtectedRoute>
          <Inbound />
        </ProtectedRoute>
      } />

      <Route path="/outbound" element={
        <ProtectedRoute>
          <Outbound />
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      
      {/* Default Redirection Logic */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Fallback for undefined routes */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;