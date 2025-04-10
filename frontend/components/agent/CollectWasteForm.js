'use client';

import React, { useState, useContext } from 'react';
import { Loader2, AlertCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EcoConnectContext } from '@/context/EcoConnect';

export default function CollectWasteForm() {
  const { collectWaste, loading: contextLoading } = useContext(EcoConnectContext);
  
  const [qrCodeHash, setQrCodeHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading || contextLoading) return;
    
    // Validate form
    if (!qrCodeHash) {
      setError('Please enter a QR code hash');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Call the contract function
      await collectWaste(qrCodeHash);
      
      setSuccess(true);
      setQrCodeHash('');
      
    } catch (error) {
      console.error('Failed to collect waste:', error);
      setError(error.message || 'Failed to collect waste. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Collect Waste</h2>
        <p className="text-gray-600">
          Scan or enter the QR code hash to collect waste
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
          <AlertDescription className="text-green-700">
            Waste collected successfully! Rewards have been distributed to the user.
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">QR Code Hash</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter QR code hash"
              value={qrCodeHash}
              onChange={(e) => setQrCodeHash(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" className="flex-shrink-0">
              <QrCode className="h-4 w-4 mr-2" />
              Scan
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Enter the QR code hash or scan the QR code provided by the user
          </p>
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={loading || contextLoading}
        >
          {loading || contextLoading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Collecting...
            </span>
          ) : (
            "Collect Waste"
          )}
        </Button>
      </form>
    </div>
  );
}
