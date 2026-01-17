import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/layout';
import NotificationModal from '../components/notifications';
import { Plus, MapPin, Package, Building2, X, Eye } from 'lucide-react';

interface Warehouse {
  id: number;
  name: string;
  location: string;
  inventory?: { quantity: number }[]; // Used for total item count calculation
}

interface InventoryItem {
  quantity: number;
  product: {
    sku: string;
    name: string;
    category: string;
  };
}

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  // UI State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });
  
  // Controls the "View Contents" modal
  const [selectedWarehouse, setSelectedWarehouse] = useState<{ name: string, items: InventoryItem[] } | null>(null);

  // Controls notifications
  const [notification, setNotification] = useState({
    isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info'
  });

  const showNotify = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    fetchWarehouses();
    
    // Extract role for permission checks
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role); 
      } catch (e) {}
    }
  }, []);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      // Include inventory relation to calculate stock totals
      const response = await axios.get('http://localhost:3000/api/warehouses?include=inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouses(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load warehouses");
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/warehouses', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsCreateModalOpen(false);
      setFormData({ name: '', location: '' });
      showNotify("Success", "New warehouse location added.", "success");
      fetchWarehouses();
    } catch (error) {
      showNotify("Error", "Failed to create warehouse.", "error");
    }
  };

  const viewContents = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/warehouses/${id}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedWarehouse({
        name: res.data.name,
        items: res.data.inventory
      });
    } catch (error) {
      showNotify("Error", "Could not load warehouse contents.", "error");
    }
  };

  return (
    <Layout title="Warehouse Locations">
      
      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Top Action Bar */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500">Manage your physical storage locations.</p>
        
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition font-medium"
          >
            <Plus size={20} /> Add Warehouse
          </button>
        )}
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500 col-span-3 text-center py-10">Loading locations...</p>
        ) : warehouses.map((wh) => {
           // Calculate total stock count for this location
           const totalItems = wh.inventory?.reduce((sum, item) => sum + item.quantity, 0) || 0;

           return (
            <div key={wh.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col justify-between h-full">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Building2 size={24} />
                  </div>
                  {wh.id === 1 && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                      DEFAULT
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-1">{wh.name}</h3>
                <div className="flex items-center text-gray-500 text-sm mb-4 gap-2">
                  <MapPin size={16} />
                  {wh.location}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm mt-2">
                <div>
                    <span className="text-gray-500 block text-xs">Total Stock</span>
                    <div className="flex items-center gap-1 font-bold text-gray-800 text-lg">
                        <Package size={18} />
                        {totalItems}
                    </div>
                </div>
                <button 
                    onClick={() => viewContents(wh.id)}
                    className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                    <Eye size={14} /> View Contents
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Warehouse Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Add New Warehouse</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name</label>
                <input required placeholder="e.g. West Coast Distribution" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Address</label>
                <input required placeholder="e.g. 123 Industrial Park, CA" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md mt-2">
                Create Warehouse
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Contents Modal */}
      {selectedWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div>
                  <h3 className="font-bold text-gray-800">{selectedWarehouse.name}</h3>
                  <p className="text-xs text-blue-600 font-medium">Inventory Manifest</p>
              </div>
              <button onClick={() => setSelectedWarehouse(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
                {selectedWarehouse.items.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                        <Package size={48} className="mb-2 opacity-20" />
                        <p>This warehouse is empty.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                            <tr>
                                <th className="p-3">Product Name</th>
                                <th className="p-3">SKU</th>
                                <th className="p-3 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {selectedWarehouse.items.map((item, i) => (
                                <tr key={i}>
                                    <td className="p-3 font-medium text-gray-800">{item.product.name}</td>
                                    <td className="p-3 font-mono text-gray-500 text-xs">{item.product.sku}</td>
                                    <td className="p-3 text-right font-bold text-blue-600">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                <button 
                    onClick={() => setSelectedWarehouse(null)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Warehouses;