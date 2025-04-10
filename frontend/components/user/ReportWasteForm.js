'use client';

import React, { useState, useContext } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EcoConnectContext } from '@/context/EcoConnect';
import { PlasticType } from '@/context/Constants';

export default function ReportWasteForm() {
  const { reportWaste, loading: contextLoading } = useContext(EcoConnectContext);
  
  const [formData, setFormData] = useState({
    plasticType: '',
    quantity: '',
    qrCodeHash: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const plasticTypes = [
    { value: PlasticType.PET, label: 'PET (Polyethylene Terephthalate)' },
    { value: PlasticType.HDPE, label: 'HDPE (High-Density Polyethylene)' },
    { value: PlasticType.PVC, label: 'PVC (Polyvinyl Chloride)' },
    { value: PlasticType.LDPE, label: 'LDPE (Low-Density Polyethylene)' },
    { value: PlasticType.PP, label: 'PP (Polypropylene)' },
    { value: PlasticType.PS, label: 'PS (Polystyrene)' },
    { value: PlasticType.Other, label: 'Other Plastics' }
  ];
  
  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  const generateQRCodeHash = () => {
    // Generate a random hash for the QR code
    const timestamp = Date.now().toString();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomString}`;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading || contextLoading) return;
    
    // Validate form
    if (!formData.plasticType) {
      setError('Please select a plastic type');
      return;
    }
    
    if (!formData.quantity || isNaN(formData.quantity) || parseInt(formData.quantity) <= 0) {
      setError('Please enter a valid quantity in grams');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Generate QR code hash if not provided
      const qrCodeHash = formData.qrCodeHash || generateQRCodeHash();
      
      // Call the contract function
      await reportWaste(
        parseInt(formData.plasticType),
        parseInt(formData.quantity),
        qrCodeHash
      );
      
      setSuccess(true);
      setFormData({
        plasticType: '',
        quantity: '',
        qrCodeHash: ''
      });
      
    } catch (error) {
      console.error('Failed to report waste:', error);
      setError(error.message || 'Failed to report waste. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Report Waste Collection</h2>
        <p className="text-gray-600">
          Report your plastic waste collection to earn rewards
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
            Waste reported successfully! A QR code has been generated for this waste collection.
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Plastic Type</label>
          <Select 
            value={formData.plasticType} 
            onValueChange={(value) => handleChange('plasticType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select plastic type" />
            </SelectTrigger>
            <SelectContent>
              {plasticTypes.map((type) => (
                <SelectItem key={type.value} value={type.value.toString()}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Quantity (grams)</label>
          <Input
            type="number"
            placeholder="Enter quantity in grams"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            min="1"
          />
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={loading || contextLoading}
        >
          {loading || contextLoading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reporting...
            </span>
          ) : (
            "Report Waste"
          )}
        </Button>
      </form>
    </div>
  );
}
