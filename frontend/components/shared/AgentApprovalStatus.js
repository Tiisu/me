'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AgentApprovalStatus({ status, onClose }) {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    // Auto-hide after 10 seconds if status is approved or rejected
    if (status === 'approved' || status === 'rejected') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);
  
  const handleGoToLogin = () => {
    router.push('/loginRegister');
  };
  
  if (!isVisible) return null;
  
  // Determine the styling and content based on status
  let icon, title, message, bgColor, textColor, borderColor;
  
  switch (status) {
    case 'approved':
      icon = <CheckCircle className="h-6 w-6" />;
      title = "Agent Account Approved";
      message = "Your agent account has been approved! You can now log in and start collecting waste.";
      bgColor = "bg-green-50";
      textColor = "text-green-800";
      borderColor = "border-green-200";
      break;
    case 'rejected':
      icon = <XCircle className="h-6 w-6" />;
      title = "Agent Account Rejected";
      message = "Your agent application has been rejected. Please contact support for more information.";
      bgColor = "bg-red-50";
      textColor = "text-red-800";
      borderColor = "border-red-200";
      break;
    case 'pending':
    default:
      icon = <Clock className="h-6 w-6" />;
      title = "Agent Account Pending Approval";
      message = "Your agent account is pending approval from administrators. You'll be notified once your account is approved.";
      bgColor = "bg-yellow-50";
      textColor = "text-yellow-800";
      borderColor = "border-yellow-200";
  }
  
  return (
    <div className={`fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg border ${bgColor} ${borderColor} ${textColor}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-lg">{title}</h3>
          <p className="mt-1">{message}</p>
          
          <div className="mt-3 flex space-x-3">
            {status === 'approved' && (
              <button
                onClick={handleGoToLogin}
                className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Go to Login
              </button>
            )}
            <button
              onClick={() => {
                setIsVisible(false);
                if (onClose) onClose();
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
