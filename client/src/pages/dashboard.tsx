import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/layout';
import { 
  Package, DollarSign, AlertTriangle, Activity, 
  TrendingUp,BarChart3, Zap, RefreshCcw,
  ArrowDownLeft, ArrowUpRight, Plus
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  totalStock: number;
  totalValue: string;
  lowStockCount: number;
  recentActivity: {
    id: number;
    action: string;
    details: string;
    createdAt: string;
    user: { name: string };
  }[];
  topProducts: { name: string; sku: string; count: number }[];
  activityBreakdown: { action: string; count: number }[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getTotalActions = () => {
    return stats?.activityBreakdown.reduce((acc, curr) => acc + curr.count, 0) || 1;
  };

  if (loading && !stats) {
    return (
      <Layout title="Dashboard">
        <div className="flex h-96 items-center justify-center text-gray-400 animate-pulse">
          Loading analytics...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Overview">
      
      {/* Header Actions */}
      <div className="flex justify-end mb-6 gap-3">
        <button 
          onClick={fetchStats} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm"
        >
          <RefreshCcw size={14} /> Refresh Data
        </button>
      </div>

      {/* 1. Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Inventory Value */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Inventory Value</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">${Number(stats?.totalValue).toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign size={24} /></div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
            <TrendingUp size={14} className="mr-1" /> Asset Estimate
          </div>
        </div>

        {/* Total Stock */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Items</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats?.totalStock.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package size={24} /></div>
          </div>
          <div className="mt-4 text-xs text-gray-400">Across {stats?.totalWarehouses} Locations</div>
        </div>

        {/* Low Stock Alert */}
        <div className={`p-6 rounded-xl shadow-sm border transition hover:shadow-md ${stats?.lowStockCount ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`${stats?.lowStockCount ? 'text-red-600' : 'text-gray-500'} text-sm font-medium`}>Low Stock Alerts</p>
              <h3 className={`text-2xl font-bold mt-1 ${stats?.lowStockCount ? 'text-red-700' : 'text-gray-800'}`}>{stats?.lowStockCount}</h3>
            </div>
            <div className={`p-3 rounded-lg ${stats?.lowStockCount ? 'bg-white text-red-600' : 'bg-orange-50 text-orange-600'}`}><AlertTriangle size={24} /></div>
          </div>
          {stats?.lowStockCount ? (
             <Link to="/inventory" className="mt-4 inline-block text-xs font-bold text-red-600 hover:underline">Restock Needed &rarr;</Link>
          ) : (<div className="mt-4 text-xs text-gray-400">Healthy levels</div>)}
        </div>

        {/* Quick Actions (Replaces static Product Count) */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-700 text-white">
          <p className="text-gray-300 text-sm font-medium mb-3">Quick Actions</p>
          <div className="flex gap-2">
            <Link to="/inbound" className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg flex flex-col items-center justify-center text-xs transition">
              <ArrowDownLeft size={16} className="mb-1 text-green-400" /> Receive
            </Link>
            <Link to="/outbound" className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg flex flex-col items-center justify-center text-xs transition">
              <ArrowUpRight size={16} className="mb-1 text-blue-400" /> Dispatch
            </Link>
            <Link to="/inventory" className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg flex flex-col items-center justify-center text-xs transition">
              <Plus size={16} className="mb-1 text-purple-400" /> Add
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Most Active Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Zap className="text-amber-500" size={20} /> Most Active Items
          </h3>
          <div className="space-y-4">
            {stats?.topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No activity yet.</p>
            ) : (
                stats?.topProducts.map((p, i) => (
                    <div key={i} className="flex justify-between items-center group cursor-default">
                        <div>
                            <div className="font-medium text-gray-800 text-sm group-hover:text-blue-600 transition">{p.name}</div>
                            <div className="text-xs text-gray-400">{p.sku}</div>
                        </div>
                        <div className="bg-amber-50 text-amber-700 text-xs font-bold px-2 py-1 rounded-full border border-amber-100">
                            {p.count} Actions
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* System Traffic Bars */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6">
            <BarChart3 className="text-blue-600" size={20} /> System Traffic
          </h3>
          <div className="space-y-4">
            {stats?.activityBreakdown.map((item, i) => {
                const percent = (item.count / getTotalActions()) * 100;
                return (
                    <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700">{item.action.replace('_', ' ')}</span>
                            <span className="text-gray-500">{item.count} events ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-2.5 rounded-full transition-all duration-500 ${
                                    item.action === 'TRANSFER' ? 'bg-purple-500' :
                                    item.action.includes('CREATE') ? 'bg-green-500' :
                                    item.action.includes('UPDATE') ? 'bg-blue-500' : 'bg-gray-500'
                                }`} 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                )
            })}
             {stats?.activityBreakdown.length === 0 && <p className="text-gray-400 text-sm">No traffic recorded yet.</p>}
          </div>
        </div>
      </div>

      {/* 3. Recent Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Activity className="text-blue-600" size={20} /> Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {stats?.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No recent activity recorded.</div>
          ) : (
            stats?.recentActivity.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold shrink-0 border border-gray-200">
                  {log.user?.name ? log.user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <p className="text-sm text-gray-800">
                    <span className="font-bold text-gray-900">{log.user?.name || 'System'}</span> 
                    <span className="text-gray-600"> {log.action.replace('_', ' ').toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;