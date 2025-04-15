'use client';

import React, { useState, useContext, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EcoConnectContext } from '@/context/EcoConnect';
import { WasteStatus } from '@/context/Constants';

export default function ProcessWasteForm({ onWasteProcessed }) {
  const { processWaste, getWasteReportsByStatus, loading: contextLoading } = useContext(EcoConnectContext);

  const [reportId, setReportId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingReports, setFetchingReports] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [collectedReports, setCollectedReports] = useState([]);

  // Fetch collected waste reports
  useEffect(() => {
    const fetchCollectedReports = async () => {
      try {
        setFetchingReports(true);
        const reports = await getWasteReportsByStatus(WasteStatus.Collected, 10, 0);
        setCollectedReports(reports);
      } catch (error) {
        console.error('Failed to fetch collected reports:', error);
      } finally {
        setFetchingReports(false);
      }
    };

    fetchCollectedReports();
  }, [getWasteReportsByStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || contextLoading) return;

    // Validate form
    if (!reportId || isNaN(reportId) || parseInt(reportId) <= 0) {
      setError('Please enter a valid report ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Call the contract function
      await processWaste(parseInt(reportId));

      setSuccess(true);
      setReportId('');

      // Refresh the list of collected reports
      const reports = await getWasteReportsByStatus(WasteStatus.Collected, 10, 0);
      setCollectedReports(reports);

      // Notify parent component about the waste processing
      if (onWasteProcessed) {
        console.log('Calling onWasteProcessed callback');
        onWasteProcessed();
      }

    } catch (error) {
      console.error('Failed to process waste:', error);
      setError(error.message || 'Failed to process waste. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Process Waste</h2>
        <p className="text-gray-600">
          Mark collected waste as processed
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
            Waste processed successfully!
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Report ID</label>
          <Input
            type="number"
            placeholder="Enter report ID"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
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
              Processing...
            </span>
          ) : (
            "Process Waste"
          )}
        </Button>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Collected Waste Reports</h3>

        {fetchingReports ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : collectedReports.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No collected waste reports found</p>
        ) : (
          <div className="space-y-4">
            {collectedReports.map((report) => (
              <div
                key={report.id.toString()}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setReportId(report.id.toString())}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Report #{report.id.toString()}</p>
                    <p className="text-sm text-gray-600">
                      Quantity: {report.quantity.toString()} grams
                    </p>
                    <p className="text-sm text-gray-600">
                      Collected: {new Date(report.collectionTime * 1000).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportId(report.id.toString());
                      handleSubmit(e);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Process
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
