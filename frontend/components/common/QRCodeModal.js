'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Share2, X, Loader2 } from 'lucide-react';

export default function QRCodeModal({ isOpen, onClose, qrCodeData, isLoading }) {
  // Function to handle QR code download
  const handleDownload = () => {
    if (!qrCodeData?.qrCodeImage) return;

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = qrCodeData.qrCodeImage;
    link.download = `qrcode-${qrCodeData.qrCodeHash || 'waste'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to handle QR code sharing
  const handleShare = async () => {
    if (!qrCodeData?.qrCodeImage || !navigator.share) return;

    try {
      // Convert data URL to Blob
      const response = await fetch(qrCodeData.qrCodeImage);
      const blob = await response.blob();

      // Create a File from the Blob
      const file = new File([blob], `qrcode-${qrCodeData.qrCodeHash || 'waste'}.png`, { type: 'image/png' });

      // Share the file
      await navigator.share({
        title: 'Waste Collection QR Code',
        text: 'Scan this QR code to collect the waste',
        files: [file]
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(window.location.origin + '/qrcode/' + qrCodeData.qrCodeHash);
      alert('QR code link copied to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <QrCode className="h-5 w-5 mr-2" />
            <h3 className="text-lg font-semibold">Waste Collection QR Code</h3>
          </div>
          <p className="text-sm text-gray-500">
            This QR code can be scanned by waste collection agents.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 w-64">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
              <p className="mt-4 text-sm text-gray-500">Loading QR code...</p>
            </div>
          ) : qrCodeData?.qrCodeImage ? (
            <div className="flex flex-col items-center">
              <div className="border-4 border-white shadow-lg rounded-lg p-2 bg-white">
                <img
                  src={qrCodeData.qrCodeImage}
                  alt="QR Code"
                  className="h-64 w-64 object-contain"
                />
              </div>
              <p className="mt-4 text-sm text-gray-500 text-center break-all">
                <span className="font-semibold">Hash:</span> {qrCodeData.qrCodeHash}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 w-64 border border-dashed border-gray-300 rounded-lg">
              <QrCode className="h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">No QR code available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex items-center"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={!qrCodeData?.qrCodeImage || isLoading}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>

            {typeof navigator !== 'undefined' && navigator.share && (
              <Button
                type="button"
                variant="outline"
                onClick={handleShare}
                disabled={!qrCodeData?.qrCodeImage || isLoading}
                className="flex items-center"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
