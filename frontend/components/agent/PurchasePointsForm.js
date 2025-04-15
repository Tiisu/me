'use client';

import React, { useState, useContext, useEffect } from 'react';
import { Loader2, AlertCircle, Coins, Info, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EcoConnectContext } from '@/context/EcoConnect';
import { ethers } from 'ethers';

export default function PurchasePointsForm({ onPointsPurchased }) {
  const { purchasePoints, getPointCost, loading: contextLoading } = useContext(EcoConnectContext);

  const [ethAmount, setEthAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pointCost, setPointCost] = useState(null);
  const [estimatedPoints, setEstimatedPoints] = useState(0);
  const [loadingPointCost, setLoadingPointCost] = useState(true);

  // Function to ensure wallet is connected
  const ensureWalletConnected = async () => {
    try {
      setError('');
      console.log('Ensuring wallet is connected...');

      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError('MetaMask is not installed. Please install MetaMask to continue.');
        return false;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Connected accounts:', accounts);

      if (accounts && accounts.length > 0) {
        // Wallet is connected
        return true;
      } else {
        setError('Failed to connect to MetaMask. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setError('Failed to connect to wallet: ' + (error.message || 'Unknown error'));
      return false;
    }
  };

  // Fetch the current point cost when component mounts
  useEffect(() => {
    const fetchPointCost = async () => {
      try {
        setLoadingPointCost(true);

        // Check if getPointCost is available
        if (typeof getPointCost !== 'function') {
          console.error('getPointCost is not a function:', getPointCost);
          setError('Contract initialization error. Please refresh the page.');
          return;
        }

        console.log('Fetching point cost...');
        const cost = await getPointCost();

        // Validate the cost
        if (!cost) {
          console.error('Received null or undefined point cost');
          setError('Failed to fetch point cost. Please try again later.');
          return;
        }

        console.log('Point cost received:', cost.toString());
        setPointCost(cost);
        console.log('Point cost:', ethers.formatEther(cost), 'ETH');
      } catch (error) {
        console.error('Failed to fetch point cost:', error);
        setError('Failed to fetch point cost. Please try again later.');
      } finally {
        setLoadingPointCost(false);
      }
    };

    fetchPointCost();
  }, [getPointCost]);

  // Calculate estimated points when ETH amount changes
  useEffect(() => {
    if (pointCost && ethAmount && !isNaN(ethAmount)) {
      try {
        // Make sure pointCost is not zero to avoid division by zero
        if (pointCost.toString() === '0') {
          console.warn('Point cost is zero, cannot calculate points');
          setEstimatedPoints(0);
          return;
        }

        const weiAmount = ethers.parseEther(ethAmount);
        console.log('Calculating points:', {
          weiAmount: weiAmount.toString(),
          pointCost: pointCost.toString()
        });

        // Handle BigInt division properly
        const pointsBigInt = weiAmount / pointCost;
        console.log('Calculated points (BigInt):', pointsBigInt.toString());

        // Convert BigInt to number safely
        const pointsNumber = Number(pointsBigInt.toString());
        console.log('Converted to number:', pointsNumber);

        setEstimatedPoints(pointsNumber);
      } catch (error) {
        console.error('Error calculating points:', error);
        setEstimatedPoints(0);
      }
    } else {
      console.log('Cannot calculate points, missing data:', {
        hasPointCost: !!pointCost,
        ethAmount,
        isValidAmount: !isNaN(ethAmount)
      });
      setEstimatedPoints(0);
    }
  }, [ethAmount, pointCost]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || contextLoading) return;

    // Validate form
    if (!ethAmount || isNaN(ethAmount) || parseFloat(ethAmount) <= 0) {
      setError('Please enter a valid ETH amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Ensure wallet is connected before proceeding
      const isConnected = await ensureWalletConnected();
      if (!isConnected) {
        setLoading(false);
        return;
      }

      console.log('Attempting to purchase points with ETH amount:', ethAmount);

      // Call the contract function
      const result = await purchasePoints(ethAmount);
      console.log('Purchase points result:', result);

      setSuccess(true);
      setEthAmount('');

      // Notify parent component about the points purchase
      if (onPointsPurchased) {
        console.log('Calling onPointsPurchased callback');
        onPointsPurchased();
      }

    } catch (error) {
      console.error('Failed to purchase points:', error);

      // Check for specific error messages
      if (error.message && error.message.includes('Agent not approved')) {
        setError('Your agent account is not approved yet. Please wait for admin approval.');
      } else if (error.message && error.message.includes('user rejected transaction')) {
        setError('Transaction was rejected. Please try again.');
      } else if (error.message && error.message.includes('Not an approved agent')) {
        setError('Your agent account is not approved yet. Please wait for admin approval.');
      } else if (error.message && error.message.includes('Contract not initialized')) {
        setError('Wallet connection issue. Please reconnect your wallet and try again.');
      } else if (error.message && error.message.includes('insufficient funds')) {
        setError('Insufficient funds in your wallet to complete this transaction.');
      } else if (error.code && error.code === 'ACTION_REJECTED') {
        setError('Transaction was rejected in your wallet. Please try again.');
      } else {
        // Log the full error for debugging
        console.log('Detailed error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        setError(error.message || 'Failed to purchase points. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Purchase Points</h2>
        <p className="text-gray-600">
          Buy points to reward users for their waste collections
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <div className="flex items-center">
            <Coins className="h-4 w-4 text-green-600 mr-2" />
            <AlertDescription className="text-green-600">
              Points purchased successfully! Your point balance has been updated.
              {estimatedPoints > 0 && (
                <span className="block mt-1 font-semibold">
                  You purchased approximately {estimatedPoints} points.
                </span>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Point Cost Information</h3>
            {loadingPointCost ? (
              <p className="text-blue-600 text-sm mt-1">Loading point cost...</p>
            ) : pointCost ? (
              <div className="text-blue-600 text-sm mt-1">
                <p>Current rate: 1 point = {ethers.formatEther(pointCost)} ETH</p>
                <p className="mt-1">Points are used to reward users for their waste collections.</p>
              </div>
            ) : (
              <p className="text-blue-600 text-sm mt-1">Failed to load point cost. Please refresh the page.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <Button
          type="button"
          onClick={ensureWalletConnected}
          className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
        <p className="text-xs text-center text-gray-500">
          Click the button above to ensure your wallet is connected before purchasing points
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ethAmount" className="block text-sm font-medium text-gray-700 mb-1">
            ETH Amount
          </label>
          <Input
            id="ethAmount"
            type="number"
            step="0.001"
            min="0.001"
            placeholder="0.1"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            disabled={loading || contextLoading}
            className="w-full"
          />
          {estimatedPoints > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              You will receive approximately {estimatedPoints} points
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading || contextLoading || loadingPointCost}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loading || contextLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Coins className="mr-2 h-4 w-4" />
              Purchase Points
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
