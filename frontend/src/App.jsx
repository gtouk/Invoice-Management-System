import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard/SuperAdminDashboard';
import SuperAdminCompanies from './pages/SuperAdminCompanies/SuperAdminCompanies';

import Login from './pages/Auth/Login';
import RegisterCompany from './pages/Auth/RegisterCompany';

import Dashboard from './pages/Dashboard/Dashboard';
import Clients from './pages/Clients/Clients';
import Items from './pages/Items/Items';
import Invoices from './pages/Invoices/Invoices';
import Payments from './pages/Payments/Payments';
import BankStatements from './pages/BankStatements/BankStatements';
import Commissions from './pages/Commissions/Commissions';
import Reports from './pages/Reports/Reports';
import Users from './pages/Users/Users';
import CompanySettings from './pages/CompanySettings/CompanySettings';
import InvoiceReminderSettings from './pages/InvoiceReminders/InvoiceReminderSettings';

import ClientDashboard from './pages/ClientDashboard/ClientDashboard';
import ClientProfile from './pages/ClientProfile/ClientProfile';
import ClientInvoices from './pages/ClientInvoices/ClientInvoices';
import ClientPayments from './pages/ClientPayments/ClientPayments';
import ClientHistory from './pages/ClientHistory/ClientHistory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register-company" element={<RegisterCompany />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'employee', 'company_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id/history" element={<ClientHistory />} />
          <Route path="items" element={<Items />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="payments" element={<Payments />} />
          <Route path="bank-statements" element={<BankStatements />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="company-settings" element={<CompanySettings />} />
          <Route path="invoice-reminders" element={<InvoiceReminderSettings />} />
        </Route>

        <Route
          path="/client"
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/client/dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="profile" element={<ClientProfile />} />
          <Route path="invoices" element={<ClientInvoices />} />
          <Route path="payments" element={<ClientPayments />} />
        </Route>

<Route
  path="/super-admin"
  element={
    <ProtectedRoute allowedRoles={['super_admin']}>
      <SuperAdminLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
  <Route path="dashboard" element={<SuperAdminDashboard />} />
  <Route path="companies" element={<SuperAdminCompanies />} />
</Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}