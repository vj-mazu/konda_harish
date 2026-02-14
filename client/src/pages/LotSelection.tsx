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
  qualityParameters?: {
    moisture: number;
    cutting1: number;
    cutting2: number;
    bend: number;
    mixS: number;
    mixL: number;
    mix: number;
    kandu: number;
    oil: number;
    sk: number;
    grainsCount: number;
    wbR: number;
    wbBk: number;
    wbT: number;
    paddyWb: number;
    uploadFileUrl?: string;
    reportedBy: string;
  };
}

const LotSelection: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/sample-entries/by-role?status=QUALITY_CHECK`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries((response.data as any).entries || []);
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (entryId: string, decision: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${entryId}/lot-selection`,
        { decision },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let message = '';
      if (decision === 'PASS_WITHOUT_COOKING') {
        message = 'Entry passed and moved to Final Report';
      } else if (decision === 'PASS_WITH_COOKING') {
        message = 'Entry passed and moved to Cooking Report';
      } else if (decision === 'FAIL') {
        message = 'Entry marked as failed';
      }

      showNotification(message, 'success');
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to process decision', 'error');
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
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Moisture</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Cutting</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Bend</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Mix S</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Mix L</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Mix</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Kandu</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Oil</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>SK</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Grains</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>WB(R)</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>WB(BK)</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>WB(T)</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Paddy WB</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Image</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Reported By</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={23} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={23} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries pending review</td></tr>
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
                    {entry.qualityParameters?.moisture || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>
                    {entry.qualityParameters?.cutting1 && entry.qualityParameters?.cutting2
                      ? `${entry.qualityParameters.cutting1} x ${entry.qualityParameters.cutting2}`
                      : (entry.qualityParameters?.cutting1 || entry.qualityParameters?.cutting2 || '-')}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.bend || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.mixS || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.mixL || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.mix || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.kandu || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.oil || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.sk || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.grainsCount || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.wbR || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.wbBk || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.wbT || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>
                    {entry.qualityParameters?.paddyWb || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>
                    {entry.qualityParameters?.uploadFileUrl ? (
                      <a href={entry.qualityParameters.uploadFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4a90e2', textDecoration: 'none' }}>
                        📷 View
                      </a>
                    ) : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>
                    {entry.qualityParameters?.reportedBy || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleDecision(entry.id, 'PASS_WITHOUT_COOKING')}
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Pass (No Cooking)
                      </button>
                      <button
                        onClick={() => handleDecision(entry.id, 'PASS_WITH_COOKING')}
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Pass (With Cooking)
                      </button>
                      <button
                        onClick={() => handleDecision(entry.id, 'FAIL')}
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Fail
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LotSelection;
