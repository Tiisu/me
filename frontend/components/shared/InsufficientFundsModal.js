'use client';

import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

export default function InsufficientFundsModal({ isOpen, onClose, walletAddress }) {
  const [isVisible, setIsVisible] = useState(false);

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

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full transform ${isOpen ? 'scale-100' : 'scale-95'} transition-transform duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
            <XCircle className="w-6 h-6 mr-2" />
            Insufficient Funds for Registration
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
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
            <p className="text-red-800 dark:text-red-300 font-medium">
              Your registration could not be completed because your wallet doesn't have enough Sepolia ETH.
            </p>
          </div>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            To register on our platform, you need a small amount of Sepolia testnet ETH to pay for blockchain transaction fees. Your wallet has been disconnected and you'll need to try again after getting some ETH.
          </p>

          {walletAddress && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your wallet address:</p>
              <p className="font-mono text-sm break-all">{walletAddress}</p>
            </div>
          )}

          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Follow these steps:</h4>
            <ol className="list-decimal pl-5 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Visit a Sepolia faucet like <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">sepoliafaucet.com</a> or <a href="https://sepolia-faucet.pk910.de/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Sepolia PoW Faucet</a></li>
              <li>Request some Sepolia ETH by entering your wallet address</li>
              <li>Wait for the ETH to arrive in your wallet (usually takes a few minutes)</li>
              <li>Return to our site and try registering again</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
          <a
            href="https://sepoliafaucet.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Get Testnet ETH
          </a>
        </div>
      </div>
    </div>
  );
}
