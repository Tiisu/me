'use client';

import React, { useState, useContext, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, QrCode, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EcoConnectContext } from '@/context/EcoConnect';
import { PlasticType } from '@/context/Constants';
import api from '@/services/api';

export default function ReportWasteForm() {
  const {
    reportWaste,
    loading: contextLoading,
    wasteVanContract,
    currentAccount,
    isRegistered,
    connectWallet
  } = useContext(EcoConnectContext);

  const [formData, setFormData] = useState({
    plasticType: '',
    quantity: '',
    qrCodeHash: '',
    location: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [images, setImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Check if contract is initialized
  const isContractInitialized = Boolean(wasteVanContract);
  const canReportWaste = isContractInitialized && currentAccount && isRegistered;

  // Debug log for wallet connection status and auto-connect if needed
  useEffect(() => {
    console.log('ReportWasteForm - Wallet Status:', {
      currentAccount,
      isRegistered,
      isContractInitialized,
      canReportWaste
    });

    // If user is registered but wallet is not connected, try to auto-connect
    // This handles the case where a user has registered but the wallet connection was lost
    if (!currentAccount && !loading && !contextLoading) {
      console.log('User registered but wallet not connected, attempting to auto-connect...');
      // Check if MetaMask is available
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' })
          .then(accounts => {
            if (accounts.length > 0) {
              console.log('Found connected account, reconnecting wallet...');
              connectWallet()
                .then(() => {
                  console.log('Wallet auto-connected successfully');
                })
                .catch(error => {
                  console.error('Failed to auto-connect wallet:', error);
                });
            }
          })
          .catch(error => {
            console.error('Failed to check connected accounts:', error);
          });
      }
    }
  }, [currentAccount, isRegistered, isContractInitialized, canReportWaste, connectWallet, loading, contextLoading]);

  // Get user's location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadError('');

    // Validate files
    const invalidFiles = files.filter(file => {
      // Check file type
      if (!file.type.match('image.*')) {
        return true;
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return true;
      }
      return false;
    });

    if (invalidFiles.length > 0) {
      setUploadError('Please upload only images under 5MB');
      return;
    }

    // Create preview URLs and prepare for upload
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreview([...imagePreview, ...newPreviews]);
    setImages([...images, ...files]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    // Remove from preview and files arrays
    const newPreviews = [...imagePreview];
    const newImages = [...images];

    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index]);

    newPreviews.splice(index, 1);
    newImages.splice(index, 1);

    setImagePreview(newPreviews);
    setImages(newImages);
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

    // Check if contract is initialized
    if (!isContractInitialized) {
      setError('Wallet not connected or blockchain not available. Please connect your wallet first.');
      return;
    }

    // Check if user is registered
    if (!isRegistered) {
      setError('You need to register before reporting waste.');
      return;
    }

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
    setQrCodeUrl('');

    try {
      console.log('Reporting waste with contract:', wasteVanContract ? 'initialized' : 'not initialized');

      // Generate QR code hash if not provided
      const qrCodeHash = formData.qrCodeHash || generateQRCodeHash();

      // Prepare data for backend
      // Create form data for file upload
      const formDataForUpload = new FormData();
      formDataForUpload.append('plasticType', parseInt(formData.plasticType));
      formDataForUpload.append('quantity', parseInt(formData.quantity));
      formDataForUpload.append('qrCodeHash', qrCodeHash);
      formDataForUpload.append('walletAddress', currentAccount);
      formDataForUpload.append('description', formData.description || 'Plastic waste collection');

      // Add location if available
      if (userLocation) {
        formDataForUpload.append('location[latitude]', userLocation.latitude);
        formDataForUpload.append('location[longitude]', userLocation.longitude);
      }

      // Add images if any
      images.forEach(image => {
        formDataForUpload.append('images', image);
      });

      // Show a message to the user that the operation is in progress
      console.log('Starting waste report operation...');

      // First save to backend and blockchain in parallel
      const backendPromise = api.waste.reportWasteWithImages(formDataForUpload)
        .then(response => {
          console.log('Backend waste report created:', response);

          // Get QR code URL if available
          if (response.qrCodeUrl) {
            setQrCodeUrl(response.qrCodeUrl);
          }

          // Log report ID for reference
          if (response.report && response.report._id) {
            console.log('Report ID:', response.report._id);
          }

          return response;
        })
        .catch(backendError => {
          console.error('Failed to save waste report to backend:', backendError);
          // Don't throw, we'll continue with blockchain transaction even if backend fails
          return null;
        });

      // Call the contract function
      const blockchainPromise = reportWaste(
        parseInt(formData.plasticType),
        parseInt(formData.quantity),
        qrCodeHash
      ).catch(blockchainError => {
        console.error('Failed to report waste on blockchain:', blockchainError);
        throw blockchainError; // Re-throw to be caught by the outer catch
      });

      // Wait for both operations to complete
      await Promise.all([backendPromise, blockchainPromise]);

      setSuccess(true);
      setFormData({
        plasticType: '',
        quantity: '',
        qrCodeHash: '',
        location: '',
        description: ''
      });

      // Clear images
      setImages([]);
      setImagePreview([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Failed to report waste:', error);
      if (error.message.includes('Contract not initialized')) {
        setError('Wallet connection issue. Please reconnect your wallet and try again.');
      } else if (error.message.includes('User not registered')) {
        setError('You need to register before reporting waste.');
      } else if (error.message.includes('user rejected transaction')) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(error.message || 'Failed to report waste. Please try again.');
      }

      // Reset form on user rejection to avoid confusion
      if (error.message.includes('user rejected transaction')) {
        setFormData({
          plasticType: '',
          quantity: '',
          qrCodeHash: '',
          location: '',
          description: ''
        });
        setImages([]);
        setImagePreview([]);
      }
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
            <div className="flex flex-col items-center">
              <p className="mb-2">Waste reported successfully! A QR code has been generated for this waste collection.</p>
              {qrCodeUrl && (
                <div className="mt-4 flex flex-col items-center">
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mb-2" />
                  <a
                    href={qrCodeUrl}
                    download="waste-qr-code.png"
                    className="text-green-600 hover:text-green-800 flex items-center"
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    Download QR Code
                  </a>
                </div>
              )}
            </div>
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Description (optional)</label>
          <Input
            type="text"
            placeholder="Brief description of the waste"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <div className="text-sm text-gray-500">
            {userLocation ? (
              <span className="text-green-600">✓ Location detected</span>
            ) : (
              <span className="text-yellow-600">Location not available. Please enable location services.</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Images (Optional)</label>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Images
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <span className="ml-2 text-xs text-gray-500">
                Max 5 images, 5MB each
              </span>
            </div>

            {uploadError && (
              <p className="text-red-500 text-xs">{uploadError}</p>
            )}

            {imagePreview.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {imagePreview.map((src, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={src}
                      alt={`Preview ${index}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!canReportWaste && (
          <Alert className="mb-4 bg-yellow-50 border-yellow-200">
            <div className="flex flex-col space-y-2">
              <AlertDescription className="text-yellow-700">
                {!currentAccount
                  ? 'Please connect your wallet to report waste. If you already registered, your wallet will be automatically connected.'
                  : !isRegistered
                    ? 'You need to register before reporting waste. Please go to the registration page.'
                    : 'Blockchain connection issue. Please refresh the page.'}
              </AlertDescription>

              {!currentAccount && (
                <Button
                  type="button"
                  variant="outline"
                  className="bg-yellow-100 border-yellow-300 hover:bg-yellow-200 text-yellow-800"
                  onClick={async () => {
                    try {
                      console.log('Manually connecting wallet...');
                      await connectWallet();
                      console.log('Wallet connected successfully');
                    } catch (error) {
                      console.error('Failed to connect wallet:', error);
                      setError('Failed to connect wallet. Please try again.');
                    }
                  }}
                >
                  Connect Wallet
                </Button>
              )}

              {!isRegistered && currentAccount && (
                <div className="text-sm text-yellow-700 mt-2">
                  You need to complete registration before reporting waste.
                </div>
              )}
            </div>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || contextLoading || !canReportWaste}
        >
          {loading || contextLoading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reporting...
            </span>
          ) : !canReportWaste ? (
            !currentAccount ? "Connect Wallet First" : !isRegistered ? "Register First" : "Blockchain Connection Issue"
          ) : (
            "Report Waste"
          )}
        </Button>
      </form>
    </div>
  );
}
