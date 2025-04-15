'use client';

import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AgentApprovalNotification({ isOpen, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Add a small delay before hiding to allow for animation
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  const handleGoToLogin = () => {
    if (onClose) onClose();
    router.push('/loginRegister');
  };
  
  if (!isVisible) return null;
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full transform ${isOpen ? 'scale-100' : 'scale-95'} transition-transform duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-green-600 dark:text-green-400 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2" />
            Agent Account Approved
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
            <p className="text-green-800 dark:text-green-300 font-medium">
              Congratulations! Your agent account has been approved.
            </p>
          </div>
          
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            You can now log in with your wallet and start collecting waste. Thank you for joining our waste management network!
          </p>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
          <button
            onClick={handleGoToLogin}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
