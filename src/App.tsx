import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import AdminPortal from './pages/AdminPortal';
import NewRequest from './pages/NewRequest';
import NewClaim from './pages/NewClaim';
import RequestDetails from './pages/RequestDetails';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="admin" element={<AdminPortal />} />
          <Route path="requests/new" element={<NewRequest />} />
          <Route path="claims/new" element={<NewClaim />} />
          <Route path="requests/:id" element={<RequestDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

