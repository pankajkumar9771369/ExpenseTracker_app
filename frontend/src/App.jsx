import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import DsChat from './pages/DsChat';
import PublicReport from './pages/PublicReport';
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/shared/:reportId" element={<PublicReport />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={<PrivateRoute><Dashboard /></PrivateRoute>}
      />
      <Route
        path="/add-expense"
        element={<PrivateRoute><AddExpense /></PrivateRoute>}
      />
      <Route
        path="/ds-chat"
        element={<PrivateRoute><DsChat /></PrivateRoute>}
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
