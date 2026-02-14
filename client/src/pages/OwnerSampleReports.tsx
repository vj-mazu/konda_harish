import React, { useState } from 'react';
import LotSelection from './LotSelection';
import CookingReport from './CookingReport';
import FinalReport from './FinalReport';

const OwnerSampleReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lot-selection' | 'cooking-report' | 'final-report'>('lot-selection');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '20px' }}>Owner Sample Reports</h2>
      
      {/* Sub-tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #ddd',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setActiveTab('lot-selection')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            backgroundColor: activeTab === 'lot-selection' ? '#4a90e2' : '#e0e0e0',
            color: activeTab === 'lot-selection' ? 'white' : '#666',
            transition: 'all 0.3s ease'
          }}
        >
          ✅ Lot Selection
        </button>
        <button
          onClick={() => setActiveTab('cooking-report')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            backgroundColor: activeTab === 'cooking-report' ? '#4a90e2' : '#e0e0e0',
            color: activeTab === 'cooking-report' ? 'white' : '#666',
            transition: 'all 0.3s ease'
          }}
        >
          🍚 Cooking Report
        </button>
        <button
          onClick={() => setActiveTab('final-report')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            backgroundColor: activeTab === 'final-report' ? '#4a90e2' : '#e0e0e0',
            color: activeTab === 'final-report' ? 'white' : '#666',
            transition: 'all 0.3s ease'
          }}
        >
          💰 Final Report
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'lot-selection' && <LotSelection />}
        {activeTab === 'cooking-report' && <CookingReport />}
        {activeTab === 'final-report' && <FinalReport />}
      </div>
    </div>
  );
};

export default OwnerSampleReports;
