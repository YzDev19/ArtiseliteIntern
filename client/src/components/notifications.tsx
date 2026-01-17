import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const NotificationModal = ({ isOpen, onClose, title, message, type = 'info' }: NotificationModalProps) => {
  if (!isOpen) return null;

  // Choose icon based on type
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;
  const colorClass = type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-blue-600';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 transform transition-all scale-100">
        
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full bg-gray-50 ${colorClass}`}>
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {/* whitespace-pre-line ensures your \n newlines in CSV stats show up correctly */}
            <p className="text-sm text-gray-500 mt-2 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition shadow-sm"
          >
            Okay, Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;