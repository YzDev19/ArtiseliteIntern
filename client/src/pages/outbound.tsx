import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/layout';
import NotificationModal from '../components/notifications';
import { Upload, Plus, Trash2, Send, UserPlus, X } from 'lucide-react';
import Papa from 'papaparse';

const Outbound = () => {
  // Dropdown data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  // Form & File state
  const [formData, setFormData] = useState({
    reference: '', dateShipped: '', customerId: '', warehouseId: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([]);

  // UI States (Notifications & Modals)
  const [notification, setNotification] = useState({
    isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info'
  });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  // Notification helper
  const showNotify = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [custRes, prodRes, wareRes] = await Promise.all([
        axios.get('http://localhost:3000/api/outbound/customers', { headers }),
        axios.get('http://localhost:3000/api/products', { headers }),
        axios.get('http://localhost:3000/api/warehouses', { headers })
      ]);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
      setWarehouses(wareRes.data);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  // Item List Handlers
  const handleAddItem = () => setItems([...items, { productId: '', quantity: 0 }]);
  
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Main Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('reference', formData.reference);
    data.append('dateShipped', formData.dateShipped);
    data.append('customerId', formData.customerId);
    data.append('warehouseId', formData.warehouseId);
    data.append('items', JSON.stringify(items));
    if (file) data.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/outbound', data, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      showNotify('Dispatch Successful', 'Stock has been deducted from inventory.', 'success');
      
      // Reset form
      setItems([]);
      setFormData({ reference: '', dateShipped: '', customerId: '', warehouseId: '' });
      setFile(null);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.error || 'Failed to process shipment.';
      showNotify('Dispatch Failed', errorMsg, 'error');
    }
  };

  // Create New Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/outbound/customers', { name: newCustomerName }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsCustomerModalOpen(false);
      setNewCustomerName('');
      showNotify('Customer Added', `${newCustomerName} created successfully.`, 'success');
      fetchData();
    } catch (error) {
      showNotify('Error', 'Could not create customer.', 'error');
    }
  }

  // Bulk CSV Upload
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post('http://localhost:3000/api/outbound/bulk', results.data, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const stats = res.data.results;
          const msg = `Success: ${stats.success}\nFailed: ${stats.failed}\n\n${stats.errors.length > 0 ? "Errors:\n" + stats.errors.join('\n') : ''}`;

          showNotify('Import Complete', msg, stats.failed > 0 ? 'info' : 'success');
          fetchData(); 
        } catch (error) {
          showNotify('Upload Failed', 'Server error during import.', 'error');
        }
      }
    });
  };

  return (
    <Layout title="Outbound Shipping">
      
      {/* Notifications */}
      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800">Add New Customer</h3>
               <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
             </div>
             <form onSubmit={handleCreateCustomer} className="p-6">
               <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
               <input 
                  autoFocus
                  type="text" 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Tech Corp Inc."
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
               />
               <div className="mt-6 flex justify-end gap-2">
                 <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Save Customer</button>
               </div>
             </form>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Dispatch Stock</h2>
            <p className="text-sm text-gray-500">Create a manual entry or upload a CSV file.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Bulk Upload */}
            <input type="file" id="bulkOutbound" className="hidden" accept=".csv" onChange={handleBulkUpload} />
            <label 
              htmlFor="bulkOutbound" 
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 cursor-pointer text-sm font-medium transition shadow-sm"
            >
              <Upload size={16} /> Bulk Import CSV
            </label>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            {/* New Customer Button */}
            <button 
              onClick={() => setIsCustomerModalOpen(true)} 
              className="text-blue-600 font-medium hover:bg-blue-50 px-3 py-2 rounded-lg transition text-sm flex items-center gap-1"
            >
              <UserPlus size={16} /> New Customer
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select required className="w-full p-2 border rounded-lg" 
                value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                <option value="">Select Customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Warehouse</label>
              <select required className="w-full p-2 border rounded-lg"
                 value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})}>
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SO Reference #</label>
              <input required type="text" className="w-full p-2 border rounded-lg" placeholder="SO-2024-001"
                 value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Shipped</label>
              <input required type="date" className="w-full p-2 border rounded-lg"
                 value={formData.dateShipped} onChange={e => setFormData({...formData, dateShipped: e.target.value})} />
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer relative">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Upload className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500 mb-2">
                {file ? file.name : "Click to Attach Signed DO (Optional)"}
            </span>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">Items to Ship</h3>
              <button type="button" onClick={handleAddItem} className="text-sm flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800">
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
               <div className="col-span-8">Product</div>
               <div className="col-span-2">Quantity</div>
               <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <div className="col-span-8">
                    <select required className="w-full p-2 border rounded-lg text-sm"
                      value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)}>
                      <option value="">Select Product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock: {p.stockLevel || '?'})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input required type="number" placeholder="Qty" className="w-full p-2 border rounded-lg text-sm"
                      value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2 text-right">
                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition">
                        <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md transition">
              <Send size={20} /> Dispatch Stock
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Outbound;