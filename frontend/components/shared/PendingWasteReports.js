'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MapPin, Clock, User, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import api from '@/services/api';

export default function WasteReportsList({ onWasteCollected, isAgent = true }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collectingId, setCollectingId] = useState(null);

  // Fetch pending waste reports
  useEffect(() => {
    fetchPendingReports();

    // Set up auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing pending waste reports...');
      fetchPendingReports();
    }, 10000);

    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchPendingReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching ALL waste reports');
      const response = await api.waste.getWasteReports({
        limit: 100 // Get a larger number of reports
      });

      console.log('API response:', response);

      if (response && response.reports) {
        console.log(`Fetched ${response.reports.length} total waste reports`);

        // Log all reports for debugging
        response.reports.forEach((report, index) => {
          console.log(`Report ${index + 1}:`, {
            id: report._id,
            status: report.status,
            plasticType: report.plasticType,
            quantity: report.quantity,
            createdAt: report.createdAt
          });
        });

        // Set all reports for now - we'll display them based on status in the UI
        setReports(response.reports);
      } else {
        console.log('No reports property in response or it is empty');
      }
    } catch (error) {
      console.error('Failed to fetch pending waste reports:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to load pending waste reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle waste collection
  const handleCollectWaste = async (reportId) => {
    try {
      setCollectingId(reportId);
      console.log(`Collecting waste report with ID: ${reportId}`);

      // Call the API to collect waste
      const response = await api.waste.collectWaste(reportId);

      if (response && response.success) {
        console.log('Waste collected successfully:', response);

        // Remove the report from the list
        setReports(prev => prev.filter(r => r._id !== reportId));

        // Notify parent component about the collection
        if (onWasteCollected) {
          onWasteCollected(reportId);
        }

        // Show success message
        alert('Waste collected successfully!');
      }
    } catch (error) {
      console.error('Failed to collect waste:', error);
      alert(`Failed to collect waste: ${error.message || 'Unknown error'}`);
    } finally {
      setCollectingId(null);
    }
  };

  // Format time
  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Filter reports by status
  const reportedWaste = reports.filter(report => report.status === 'reported');
  const collectedWaste = reports.filter(report => report.status === 'collected');
  const processedWaste = reports.filter(report => report.status === 'processed');

  // Render a single waste report card
  const renderWasteReportCard = (report, showCollectButton = true) => (
    <div key={report._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all mb-3">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="font-medium text-lg">{report.plasticType} - {report.quantity}g</div>
          <div className="text-sm text-gray-600 flex items-center mt-1">
            <Clock className="h-3 w-3 mr-1" />
            Reported {formatTime(report.createdAt)}
          </div>
          {report.location && report.location.coordinates && (
            <div className="text-xs text-gray-500 flex items-center mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              {report.location.address || 'Location available'}
            </div>
          )}
          {report.user && (
            <div className="text-xs text-gray-500 flex items-center mt-1">
              <User className="h-3 w-3 mr-1" />
              Reported by: {report.user.username || report.walletAddress || 'Unknown user'}
            </div>
          )}
          <div className="text-xs mt-1 inline-block px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor:
                report.status === 'reported' ? 'rgba(59, 130, 246, 0.1)' :
                report.status === 'collected' ? 'rgba(245, 158, 11, 0.1)' :
                'rgba(16, 185, 129, 0.1)',
              color:
                report.status === 'reported' ? 'rgb(37, 99, 235)' :
                report.status === 'collected' ? 'rgb(217, 119, 6)' :
                'rgb(5, 150, 105)'
            }}
          >
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </div>
        </div>

        <div className="flex space-x-2 self-end md:self-start">
          <Link href={`/wasteReport/${report._id}`}>
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
              View Details
            </Button>
          </Link>

          {isAgent && showCollectButton && report.status === 'reported' && (
            <Button
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleCollectWaste(report._id)}
              disabled={collectingId === report._id}
            >
              {collectingId === report._id ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Collecting...
                </>
              ) : (
                'Collect Waste'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <Package className="h-5 w-5 mr-2 text-orange-500" />
          Waste Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No waste reports found</p>
        ) : (
          <div className="space-y-6">
            {/* Reported Waste Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                Pending Reports ({reportedWaste.length})
              </h3>
              {reportedWaste.length === 0 ? (
                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No pending waste reports</p>
              ) : (
                <div className="space-y-2">
                  {reportedWaste.map(report => renderWasteReportCard(report, true))}
                </div>
              )}
            </div>

            {/* Collected Waste Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                Collected Reports ({collectedWaste.length})
              </h3>
              {collectedWaste.length === 0 ? (
                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No collected waste reports</p>
              ) : (
                <div className="space-y-2">
                  {collectedWaste.map(report => renderWasteReportCard(report, false))}
                </div>
              )}
            </div>

            {/* Processed Waste Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                Processed Reports ({processedWaste.length})
              </h3>
              {processedWaste.length === 0 ? (
                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No processed waste reports</p>
              ) : (
                <div className="space-y-2">
                  {processedWaste.map(report => renderWasteReportCard(report, false))}
                </div>
              )}
            </div>

            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPendingReports}
                className="text-gray-600"
              >
                Refresh Reports
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
