'use client';

import { useState, useEffect, useContext } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { EcoConnectContext } from '@/context/EcoConnect';

export default function RegistrationRequiredModal({ isOpen, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hasSufficientFunds, setHasSufficientFunds] = useState(null);
  const [estimatedGas, setEstimatedGas] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const { registerUser, currentAccount, wasteVanContract, provider, setShowInsufficientFundsModal } = useContext(EcoConnectContext);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      checkFunds();
    } else {
      // Add a small delay before hiding to allow for animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Reset states when modal is closed
        setHasSufficientFunds(null);
        setEstimatedGas(null);
        setUserBalance(null);
        setChecking(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const checkFunds = async () => {
    if (!currentAccount || !wasteVanContract || !provider) return;

    setChecking(true);
    try {
      // Get user's balance
      const balance = await provider.getBalance(currentAccount);
      setUserBalance(balance);

      // Estimate gas for registration
      let gasEstimate;
      try {
        gasEstimate = await wasteVanContract.registerUser.estimateGas();
        // Add a buffer for gas price fluctuations (50% more)
        gasEstimate = gasEstimate * BigInt(15) / BigInt(10);
      } catch (gasError) {
        console.error('Failed to estimate gas:', gasError);
        // Fallback estimate - 0.01 ETH should be more than enough for most transactions
        gasEstimate = ethers.parseEther('0.01');
      }

      setEstimatedGas(gasEstimate);

      // Check if user has enough balance
      setHasSufficientFunds(balance >= gasEstimate);
    } catch (error) {
      console.error('Error checking funds:', error);
      setHasSufficientFunds(false);
    } finally {
      setChecking(false);
    }
  };

  const handleRegisterNow = async () => {
    if (!hasSufficientFunds) {
      // Show insufficient funds modal
      onClose();
      setShowInsufficientFundsModal(true);
      return;
    }

    try {
      await registerUser();
      onClose();
      // Show success message
      alert('Registration completed successfully! You can now report waste.');
    } catch (error) {
      console.error('Failed to register:', error);

      // Check if error is due to insufficient funds
      if (error.message && error.message.includes('insufficient funds')) {
        onClose();
        setShowInsufficientFundsModal(true);
      } else {
        alert('Registration failed: ' + error.message);
      }
    }
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
          <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 flex items-center">
            <AlertCircle className="w-6 h-6 mr-2" />
            Registration Required
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
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
            <p className="text-amber-800 dark:text-amber-300 font-medium">
              You need to complete your blockchain registration before reporting waste.
            </p>
          </div>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            While your account exists in our system, you need to register on the blockchain to access all features, including waste reporting.
          </p>

          {currentAccount && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your wallet address:</p>
              <p className="font-mono text-sm break-all">{currentAccount}</p>
            </div>
          )}

          {/* Funds Status */}
          {checking ? (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center">
              <Loader2 className="h-5 w-5 mr-2 animate-spin text-amber-500" />
              <p className="text-gray-700 dark:text-gray-300">Checking your wallet balance...</p>
            </div>
          ) : hasSufficientFunds === false ? (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800">
              <p className="text-red-800 dark:text-red-300 font-medium flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Insufficient funds for registration
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Your wallet needs some Sepolia ETH to complete registration.
                Current balance: {userBalance ? ethers.formatEther(userBalance).substring(0, 8) : '0'} ETH
                <br />
                Estimated required: {estimatedGas ? ethers.formatEther(estimatedGas).substring(0, 8) : '0.01'} ETH
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Click "Register Now" to be redirected to get Sepolia ETH.
              </p>
            </div>
          ) : hasSufficientFunds === true ? (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-800">
              <p className="text-green-800 dark:text-green-300 font-medium">
                Your wallet has sufficient funds for registration!
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                Current balance: {userBalance ? ethers.formatEther(userBalance).substring(0, 8) : '0'} ETH
              </p>
            </div>
          ) : null}

          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">What happens next:</h4>
            <ol className="list-decimal pl-5 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Click the "Register Now" button below</li>
              {hasSufficientFunds === false ? (
                <li>You'll be redirected to get Sepolia testnet ETH</li>
              ) : (
                <li>Confirm the transaction in your wallet</li>
              )}
              <li>Once confirmed, you'll be able to report waste</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleRegisterNow}
            disabled={checking || hasSufficientFunds === null}
            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasSufficientFunds === false
              ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
            } ${(checking || hasSufficientFunds === null) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {checking ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </span>
            ) : hasSufficientFunds === false ? (
              'Get Sepolia ETH'
            ) : (
              'Register Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
