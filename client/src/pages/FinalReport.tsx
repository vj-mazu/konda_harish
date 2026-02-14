import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface SampleEntry {
  id: string;
  entryDate: string;
  brokerName: string;
  variety: string;
  partyName: string;
  location: string;
  bags: number;
  workflowStatus: string;
  offeringPrice?: number;
  priceType?: string;
  finalPrice?: number;
}

const FinalReport: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
  const [priceData, setPriceData] = useState({
    offeringPrice: '',
    priceType: 'BAGS',
    finalPrice: '',
    remarks: ''
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/sample-entries/by-role?status=FINAL_REPORT`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries((response.data as any).entries || []);
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (entry: SampleEntry) => {
    setSelectedEntry(entry);
    setShowModal(true);
    setPriceData({
      offeringPrice: entry.offeringPrice?.toString() || '',
      priceType: entry.priceType || 'BAGS',
      finalPrice: entry.finalPrice?.toString() || '',
      remarks: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${selectedEntry.id}/offering-price`,
        {
          offeringPrice: parseFloat(priceData.offeringPrice),
          priceType: priceData.priceType,
          finalPrice: priceData.finalPrice ? parseFloat(priceData.finalPrice) : null,
          remarks: priceData.remarks
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showNotification('Offering price set successfully', 'success');
      setShowModal(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to set offering price', 'error');
    }
  };

  return (
    <div>
      <div style={{ 
        overflowX: 'auto',
        backgroundColor: 'white',
        border: '1px solid #ddd'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Broker</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Variety</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Party</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Location</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Bags</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Offering Price</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Price Type</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Final Price</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries pending final report</td></tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={entry.id} style={{ 
                  backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                }}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>
                    {new Date(entry.entryDate).toLocaleDateString()}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.brokerName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.variety}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.partyName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.location}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>{entry.bags}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.offeringPrice ? `₹${entry.offeringPrice}` : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>
                    {entry.priceType || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.finalPrice ? `₹${entry.finalPrice}` : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenModal(entry)}
                      style={{
                        fontSize: '10px',
                        padding: '4px 8px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      {entry.offeringPrice ? 'Edit Price' : 'Set Price'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Offering Price Modal */}
      {showModal && selectedEntry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '80px 20px 20px 20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '4px',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '15px', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#333',
              borderBottom: '2px solid #4a90e2',
              paddingBottom: '10px'
            }}>
              Set Offering Price
            </h3>

            <div style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px', 
              marginBottom: '15px',
              fontSize: '12px'
            }}>
              <div><strong>Broker:</strong> {selectedEntry.brokerName}</div>
              <div><strong>Variety:</strong> {selectedEntry.variety}</div>
              <div><strong>Bags:</strong> {selectedEntry.bags}</div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>
                  Offering Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={priceData.offeringPrice}
                  onChange={(e) => setPriceData({ ...priceData, offeringPrice: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>
                  Price Type *
                </label>
                <select
                  value={priceData.priceType}
                  onChange={(e) => setPriceData({ ...priceData, priceType: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                  required
                >
                  <option value="BAGS">Bags</option>
                  <option value="LOOSE">Loose</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>
                  Final Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={priceData.finalPrice}
                  onChange={(e) => setPriceData({ ...priceData, finalPrice: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                  placeholder="Enter final price (optional)"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>
                  Remarks
                </label>
                <textarea
                  value={priceData.remarks}
                  onChange={(e) => setPriceData({ ...priceData, remarks: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px',
                    minHeight: '60px'
                  }}
                  placeholder="Enter remarks..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    backgroundColor: 'white',
                    fontSize: '13px',
                    color: '#666'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    backgroundColor: '#4CAF50',
                    color: 'white', 
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalReport;
