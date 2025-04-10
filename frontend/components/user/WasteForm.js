'use client';

import { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { WASTE_TYPES } from '@/utils/constants';

export default function WasteForm() {
  const { contract, provider } = useWeb3();
  const [formData, setFormData] = useState({
    wasteType: WASTE_TYPES.PlasticBags,
    weight: '',
    imageHashes: [''] // In a real app, you'd handle IPFS upload
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const signer = provider.getSigner();
      const tx = await contract.connect(signer).reportWaste(
        formData.wasteType,
        formData.weight,
        formData.imageHashes
      );
      await tx.wait();
      alert('Waste report submitted successfully!');
      setFormData({
        wasteType: WASTE_TYPES.PlasticBags,
        weight: '',
        imageHashes: ['']
      });
    } catch (error) {
      console.error('Error submitting waste report:', error);
      alert('Error submitting waste report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Report Waste</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Waste Type</label>
        <select
          value={formData.wasteType}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            wasteType: parseInt(e.target.value)
          }))}
          className="w-full p-2 border rounded"
        >
          {Object.entries(WASTE_TYPES).map(([type, value]) => (
            <option key={value} value={value}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Weight (kg)</label>
        <input
          type="number"
          value={formData.weight}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            weight: e.target.value
          }))}
          className="w-full p-2 border rounded"
          min="0"
          step="0.1"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
      >
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
}