import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/layout';
import { Clock, User, Activity } from 'lucide-react';

interface Log {
  id: number;
  action: string;
  details: string;
  timestamp: string;
  user?: { name: string; email: string };
}

const Transactions = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  // Retrieve audit history on component mount
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/audit', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(response.data);
      } catch (error) {
        console.error("Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <Layout title="System Activity Logs">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <Activity className="text-blue-600" />
          <h3 className="font-semibold text-gray-800">Real-Time Audit Trail</h3>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-gray-500 font-semibold text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="p-4 w-48">Timestamp</th>
                <th className="p-4 w-48">User</th>
                <th className="p-4 w-32">Action</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading history...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No activity recorded yet.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 text-gray-500 text-sm flex items-center gap-2">
                      <Clock size={14} />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          <User size={12} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {log.user ? log.user.name : 'System/Admin'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {/* Dynamic styling based on action type */}
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                        log.action.includes('CREATE') ? 'bg-green-50 text-green-700 border-green-200' :
                        log.action.includes('UPDATE') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        log.action.includes('ARCHIVE') ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-mono">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Transactions;