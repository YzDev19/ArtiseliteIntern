import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/layout';
import NotificationModal from '../components/notifications';
import { Upload, Plus, Trash2, Save, X, UserPlus, ArrowDownLeft } from 'lucide-react';
import Papa from 'papaparse';

// Define types for clear data handling
interface Supplier { id: number; name: string; }
interface Product { id: number; sku: string; name: string; }
interface Warehouse { id: number; name: string; }
interface Item { productId: string; quantity: string; unitCost: string; }

const Inbound = () => {
  // Dropdown Data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    reference: '', 
    dateReceived: new Date().toISOString().split('T')[0], // Default to today
    supplierId: '', 
    warehouseId: ''
  });
  
  // Line Items
  const [items, setItems] = useState<Item[]>([{ productId: '', quantity: '', unitCost: '' }]);

  // UI State
  const [file, setFile] = useState<File | null>(null);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' as any });
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Initial Data Load
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [supRes, prodRes, wareRes] = await Promise.all([
        axios.get('http://localhost:3000/api/inbound/suppliers', { headers }), //
        axios.get('http://localhost:3000/api/products', { headers }),
        axios.get('http://localhost:3000/api/warehouses', { headers })
      ]);
      setSuppliers(supRes.data);
      setProducts(prodRes.data);
      setWarehouses(wareRes.data);
    } catch (error) {
      console.error("Error loading lists", error);
    }
  };

  // Helper: Show Notification
  const showNotify = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, title, message, type });
  };

  // --- Item Handlers ---
  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: '', unitCost: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof Item, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // --- Submission Logic ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    // 1. Validation
    if (!formData.warehouseId || !formData.supplierId) {
        showNotify('Error', 'Please select a Warehouse and Supplier.', 'error');
        return;
    }
    if (items.some(i => !i.productId || !i.quantity || Number(i.quantity) <= 0)) {
        showNotify('Error', 'Please ensure all items have a product and valid quantity.', 'error');
        return;
    }

    // 2. Format Payload (Convert Strings to Numbers)
    const payload = {
        reference: formData.reference,
        dateReceived: new Date(formData.dateReceived),
        warehouseId: parseInt(formData.warehouseId),
        supplierId: parseInt(formData.supplierId),
        items: items.map(item => ({
            productId: parseInt(item.productId),
            quantity: parseInt(item.quantity),
            unitCost: parseFloat(item.unitCost) || 0
        }))
    };

    try {
      // 3. Send as JSON (Not FormData) to match the Backend Controller
      await axios.post('http://localhost:3000/api/inbound', payload, {
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json' 
        }
      });

      showNotify('Success', 'Stock received successfully.', 'success');
      
      // Reset Form
      setFormData({ ...formData, reference: '', supplierId: '' });
      setItems([{ productId: '', quantity: '', unitCost: '' }]);
      setFile(null);
    } catch (error: any) {
      console.error("Submit Error:", error);
      showNotify('Error', error.response?.data?.error || 'Failed to process inbound.', 'error');
    }
  };

  // --- Create Supplier Logic ---
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/inbound/suppliers', { name: newSupplierName }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setIsSupplierModalOpen(false);
      setNewSupplierName('');
      showNotify('Success', 'Supplier added.', 'success');
      fetchData(); // Refresh list
    } catch (error) {
      showNotify('Error', 'Could not create supplier.', 'error');
    }
  };

  // --- Bulk CSV Logic ---
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post('http://localhost:3000/api/inbound/bulk', results.data, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const stats = res.data.results;
          const msg = `Success: ${stats.success}, Failed: ${stats.failed}`;
          showNotify('Import Complete', msg, stats.failed > 0 ? 'info' : 'success');
          fetchData();
        } catch (error) {
          showNotify('Error', 'Bulk upload failed.', 'error');
        }
      }
    });
  };

  return (
    <Layout title="Inbound Receiving">
      
      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* --- Add Supplier Modal --- */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800">Add New Supplier</h3>
               <button onClick={() => setIsSupplierModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
             </div>
             <form onSubmit={handleCreateSupplier} className="p-6">
               <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name</label>
               <input 
                 autoFocus type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="e.g. Acme Corp" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)}
               />
               <div className="mt-6 flex justify-end gap-2">
                 <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Save</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <ArrowDownLeft size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-800">Receive Stock</h2>
                <p className="text-sm text-gray-500">Manual entry or CSV upload.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input type="file" id="bulkInbound" className="hidden" accept=".csv" onChange={handleBulkUpload} />
            <label htmlFor="bulkInbound" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 cursor-pointer text-sm font-medium transition shadow-sm">
              <Upload size={16} /> Bulk Import
            </label>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button onClick={() => setIsSupplierModalOpen(true)} className="text-blue-600 font-medium hover:bg-blue-50 px-3 py-2 rounded-lg transition text-sm flex items-center gap-1">
              <UserPlus size={16} /> New Supplier
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                <option value="">Select Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Warehouse</label>
              <select required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                 value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})}>
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Invoice #</label>
              <input required type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="INV-2024-001"
                 value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
              <input required type="date" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                 value={formData.dateReceived} onChange={e => setFormData({...formData, dateReceived: e.target.value})} />
            </div>
          </div>

          {/* File Attachment UI (Visual only for now as API expects JSON) */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer relative">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Upload className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500 mb-2">
                {file ? file.name : "Click to Attach Invoice or DO (Optional)"}
            </span>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">Items Received</h3>
              <button type="button" onClick={handleAddItem} className="text-sm flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800">
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
               <div className="col-span-5">Product</div>
               <div className="col-span-2">Quantity</div>
               <div className="col-span-3">Unit Cost ($)</div>
               <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <div className="col-span-5">
                    <select required className="w-full p-2 border rounded-lg text-sm outline-none focus:border-blue-500"
                      value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)}>
                      <option value="">Select Product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input required type="number" placeholder="Qty" className="w-full p-2 border rounded-lg text-sm outline-none focus:border-blue-500"
                      value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-3 relative">
                      <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                      <input type="number" step="0.01" placeholder="0.00" className="w-full pl-6 p-2 border rounded-lg text-sm outline-none focus:border-blue-500"
                         value={item.unitCost} onChange={e => handleItemChange(index, 'unitCost', e.target.value)} />
                  </div>
                  <div className="col-span-2 text-right">
                    {items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition">
                            <Trash2 size={18} />
                        </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md transition">
              <Save size={20} /> Process Inbound Shipment
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Inbound;