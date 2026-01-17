import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/layout';
import NotificationModal from '../components/notifications';
import ConfirmModal from '../components/modal';
import { Users as UsersIcon, Shield, ShieldCheck, User } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State for Modals
  const [notification, setNotification] = useState({
    isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info'
  });
  
  // State to track which user is being modified
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ id: number; newRole: string } | null>(null);

  // Notification helper
  const showNotify = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, title, message, type });
  };

  // Retrieve the list of registered users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load users");
      setLoading(false);
    }
  };

  // Staging function: opens the confirmation modal before API call
  const requestRoleChange = (userId: number, newRole: string) => {
    setRoleChangeTarget({ id: userId, newRole });
  };

  // Execution function: runs only after the admin confirms the action
  const executeRoleChange = async () => {
    if (!roleChangeTarget) return;

    const { id, newRole } = roleChangeTarget;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/users/${id}/role`, 
        { role: newRole }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Optimistically update the local state to reflect changes immediately
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      
      showNotify("Role Updated", `User permissions have been changed to ${newRole}.`, "success");
    } catch (error) {
      showNotify("Update Failed", "Could not change user role. Please try again.", "error");
    } finally {
      setRoleChangeTarget(null); // Close modal
    }
  };

  return (
    <Layout title="User Management">
      
      {/* Notifications */}
      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Role Change Confirmation */}
      <ConfirmModal 
        isOpen={!!roleChangeTarget}
        onClose={() => setRoleChangeTarget(null)}
        onConfirm={executeRoleChange}
        title="Change User Access?"
        message={`Are you sure you want to change this user's role to ${roleChangeTarget?.newRole}? This will affect their ability to manage system data.`}
        isDestructive={false}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header Statistics */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <UsersIcon className="text-blue-600" size={20} /> System Users
          </h3>
          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
            {users.length} Active Accounts
          </span>
        </div>

        {/* User List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-gray-500 font-semibold text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Role / Access Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-400">Loading users...</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm
                        ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}
                    `}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {user.name}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{user.email}</td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="relative inline-block w-48">
                      <div className="absolute left-2 top-2.5 pointer-events-none text-gray-500">
                        {user.role === 'ADMIN' ? <ShieldCheck size={14} /> : user.role === 'MANAGER' ? <Shield size={14} /> : <User size={14} />}
                      </div>
                      <select 
                        value={user.role}
                        onChange={(e) => requestRoleChange(user.id, e.target.value)}
                        className={`
                          w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-bold border-none ring-1 ring-inset outline-none cursor-pointer transition-all
                          ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 ring-purple-200 hover:ring-purple-300' : 
                            user.role === 'MANAGER' ? 'bg-blue-50 text-blue-700 ring-blue-200 hover:ring-blue-300' : 
                            'bg-green-50 text-green-700 ring-green-200 hover:ring-green-300'}
                        `}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="OPERATOR">OPERATOR</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Users;