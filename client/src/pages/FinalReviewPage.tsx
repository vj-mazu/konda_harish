import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
  background-color: #f8fafc;
  min-height: 100vh;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 1000px;
  margin: 0 auto;
`;

const Section = styled.div`
  margin-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
`;

const DataItem = styled.div`
  div:first-child {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  div:last-child {
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
  }
`;

const CompleteButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover { transform: scale(1.01); }
`;

const Td = styled.td`
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid #eee;
`;

const ReviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 13px;
  
  th {
    text-align: left;
    padding: 10px;
    background: #f8fafc;
    color: #64748b;
    font-weight: 600;
    width: 30%;
    border: 1px solid #e2e8f0;
  }
  
  td {
    padding: 10px;
    color: #1e293b;
    border: 1px solid #e2e8f0;
  }
`;

const RoleBadge = styled.span<{ role: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
        switch (props.role) {
            case 'Staff': return '#e0f2fe';
            case 'Quality': return '#fef3c7';
            case 'Physical': return '#dcfce7';
            case 'Financial': return '#f3e8ff';
            default: return '#f1f5f9';
        }
    }};
  color: ${props => {
        switch (props.role) {
            case 'Staff': return '#0369a1';
            case 'Quality': return '#92400e';
            case 'Physical': return '#166534';
            case 'Financial': return '#6b21a8';
            default: return '#475569';
        }
    }};
  margin-right: 8px;
`;

const FinalReviewPage: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [readOnly, setReadOnly] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const id = queryParams.get('id');

        if (id) {
            loadSingleEntry(id);
        } else {
            loadEntries();
        }
    }, []);

    const loadSingleEntry = async (id: string) => {
        try {
            setLoading(true);
            const response = await sampleEntryApi.getSampleEntryById(id as any);
            setSelectedEntry(response.data);
            if (response.data.workflowStatus !== 'FINAL_REVIEW') {
                setReadOnly(true);
            }
        } catch (error) {
            showNotification('Failed to load entry details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadEntries = async () => {
        try {
            setLoading(true);
            const response = await sampleEntryApi.getSampleEntriesByRole({ status: 'FINAL_REVIEW' });
            setEntries(response.data.entries || []);
            setReadOnly(false);
        } catch (error) {
            showNotification('Failed to load pending reviews', 'error');
        } finally {
            setLoading(false);
        }
    };

    const findFinancialCalculation = (entry: any) => {
        // Aggregate totals from ALL financial calculations across all inspections
        const inspections = entry?.lotAllotment?.physicalInspections || [];
        const allFCs = inspections
            .filter((i: any) => i?.inventoryData?.financialCalculation)
            .map((i: any) => i.inventoryData.financialCalculation);

        if (allFCs.length === 0) return null;
        if (allFCs.length === 1) return allFCs[0];

        // Aggregate for multi-entry lots
        const totalAmount = allFCs.reduce((sum: number, fc: any) => sum + Number(fc.totalAmount || 0), 0);
        const totalNetWeight = inspections
            .filter((i: any) => i?.inventoryData)
            .reduce((sum: number, i: any) => sum + Number(i.inventoryData.netWeight || 0), 0);
        const average = totalNetWeight > 0 ? (totalAmount / totalNetWeight * 100) : 0;

        return { ...allFCs[0], totalAmount, average };
    };

    const handleComplete = async () => {
        try {
            await sampleEntryApi.completeSampleEntry(selectedEntry.id);
            showNotification('Purchase workflow completed successfully!', 'success');
            setSelectedEntry(null);
            loadEntries();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to complete', 'error');
        }
    };

    if (!selectedEntry) {
        return (
            <Container>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ margin: 0 }}>✅ Financial Final Approval</h2>
                        <div style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                            {entries.length} Pending Approvals
                        </div>
                    </div>
                    <Card style={{ padding: '1rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>Party / Variety</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>Broker</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>Bags</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>Lorries</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>Avg Rate</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px' }}>Total Amount</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr> :
                                    entries.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No entries pending review</td></tr> :
                                        entries.map(e => {
                                            const fc = findFinancialCalculation(e);
                                            const lorryCount = (e?.lotAllotment?.physicalInspections || []).filter((i: any) => i?.inventoryData).length;
                                            return (
                                                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <Td style={{ textAlign: 'left' }}>{new Date(e.entryDate).toLocaleDateString()}</Td>
                                                    <Td style={{ textAlign: 'left' }}>
                                                        <div style={{ fontWeight: 600 }}>{e.partyName}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{e.variety}</div>
                                                    </Td>
                                                    <td style={{ padding: '12px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>{e.brokerName}</td>
                                                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>{e.bags}</td>
                                                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <span style={{ background: lorryCount > 1 ? '#dbeafe' : '#f1f5f9', color: lorryCount > 1 ? '#1e40af' : '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, fontSize: '11px' }}>
                                                            {lorryCount} lorr{lorryCount === 1 ? 'y' : 'ies'}
                                                        </span>
                                                    </td>
                                                    <Td>₹{Number(fc?.average || 0).toFixed(2)}</Td>
                                                    <Td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                        ₹{Number(fc?.totalAmount || 0).toLocaleString()}
                                                    </Td>
                                                    <Td style={{ textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => setSelectedEntry(e)}
                                                            style={{
                                                                padding: '6px 16px',
                                                                background: '#2563eb',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                                fontWeight: 600
                                                            }}>
                                                            Review Details
                                                        </button>
                                                    </Td>
                                                </tr>
                                            );
                                        })}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </Container>
        );
    }

    const qp = selectedEntry.qualityParameters;
    const allot = selectedEntry.lotAllotment;
    const inspections = allot?.physicalInspections || [];
    // Get aggregated data for preview in inspection section
    const totalActualBags = inspections.reduce((sum: number, i: any) => sum + (i.bags || 0), 0);

    // Collect ALL inventory data and financial calculations across all inspections
    const allInventoryAndFinancials = inspections
        .filter((i: any) => i.inventoryData)
        .map((i: any, idx: number) => ({
            tripIndex: idx + 1,
            inspection: i,
            inventory: i.inventoryData,
            financial: i.inventoryData?.financialCalculation || null
        }));

    // Calculate grand totals from all financial calculations
    const grandTotalAmount = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.financial?.totalAmount || 0), 0);
    const grandTotalSute = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.financial?.totalSute || 0), 0);
    const grandTotalBrokerage = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.financial?.brokerageTotal || 0), 0);
    const grandTotalEgb = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.financial?.egbTotal || 0), 0);
    const grandTotalLfin = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.financial?.lfinTotal || 0), 0);
    const grandTotalHamali = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.financial?.hamaliTotal || 0), 0);
    const grandTotalNetWeight = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.inventory?.netWeight || 0), 0);
    const grandTotalBags = allInventoryAndFinancials.reduce((sum: number, item: any) => sum + Number(item.inventory?.bags || 0), 0);
    const grandAvgRate = grandTotalNetWeight > 0 ? (grandTotalAmount / grandTotalNetWeight * 100) : 0;

    return (
        <Container>
            <div style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setSelectedEntry(null)} style={{ color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>←</span> Back to selection
                </button>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    Lot Ref: {selectedEntry.partyName.substring(0, 3).toUpperCase()}-{selectedEntry.variety.substring(0, 3).toUpperCase()}
                </div>
            </div>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#0f172a' }}>Workflow Audit Summary</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Comprehensive record of all role activities for this purchase</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>STATUS</div>
                        <div style={{
                            background: selectedEntry.workflowStatus === 'COMPLETED' ? '#dcfce7' : selectedEntry.workflowStatus === 'FAILED' ? '#fee2e2' : '#fef3c7',
                            color: selectedEntry.workflowStatus === 'COMPLETED' ? '#166534' : selectedEntry.workflowStatus === 'FAILED' ? '#991b1b' : '#92400e',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            marginTop: '4px'
                        }}>
                            {selectedEntry.workflowStatus}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <SectionTitle><RoleBadge role="Staff" /> 1. Sample Entry Detail</SectionTitle>
                        <ReviewTable>
                            <tbody>
                                <tr><th>Entry Date</th><td>{new Date(selectedEntry.entryDate).toLocaleDateString()}</td></tr>
                                <tr><th>Staff / Creator</th><td>{selectedEntry.creator?.username || 'System'}</td></tr>
                                <tr><th>Party Name</th><td>{selectedEntry.partyName}</td></tr>
                                <tr><th>Broker</th><td>{selectedEntry.brokerName}</td></tr>
                                <tr><th>Variety</th><td>{selectedEntry.variety}</td></tr>
                                <tr><th>Est. Bags / Lorry</th><td>{selectedEntry.bags} Bags / {selectedEntry.lorryNumber || 'N/A'}</td></tr>
                            </tbody>
                        </ReviewTable>

                        <SectionTitle><RoleBadge role="Owner" /> 1b. Lot Selection Decision</SectionTitle>
                        <ReviewTable>
                            <tbody>
                                <tr><th>Party Name</th><td>{selectedEntry.partyName}</td></tr>
                                <tr><th>Broker Name</th><td>{selectedEntry.brokerName}</td></tr>
                                <tr><th>Variety</th><td>{selectedEntry.variety}</td></tr>
                                <tr><th>Est. Bags</th><td>{selectedEntry.bags}</td></tr>
                                <tr><th>Decision</th><td>
                                    {selectedEntry.lotSelectionDecision === 'PASS_WITHOUT_COOKING' ? (
                                        <span style={{ color: '#2e7d32', fontWeight: 700 }}>✅ PASS (Direct Allotment)</span>
                                    ) : selectedEntry.lotSelectionDecision === 'PASS_WITH_COOKING' ? (
                                        <span style={{ color: '#ed6c02', fontWeight: 700 }}>🍚 PASS (With Cooking)</span>
                                    ) : selectedEntry.lotSelectionDecision === 'FAIL' ? (
                                        <span style={{ color: '#d32f2f', fontWeight: 700 }}>❌ FAILED</span>
                                    ) : 'No explicit decision recorded'}
                                </td></tr>
                                <tr><th>Decided By</th><td>{selectedEntry.lotSelectionByUser?.username || 'Owner/Admin'}</td></tr>
                                <tr><th>Decided At</th><td>{selectedEntry.lotSelectionAt ? new Date(selectedEntry.lotSelectionAt).toLocaleString() : 'N/A'}</td></tr>
                            </tbody>
                        </ReviewTable>

                        {selectedEntry.cookingReport && (
                            <>
                                <SectionTitle><RoleBadge role="Quality" /> 1c. Cooking Report Details</SectionTitle>
                                <ReviewTable>
                                    <tbody>
                                        <tr><th>Cooking Status</th><td>
                                            <span style={{
                                                fontWeight: 700,
                                                color: selectedEntry.cookingReport.status === 'PASS' ? '#2e7d32' :
                                                    selectedEntry.cookingReport.status === 'FAIL' ? '#d32f2f' : '#ed6c02'
                                            }}>
                                                {selectedEntry.cookingReport.status}
                                            </span>
                                        </td></tr>
                                        <tr><th>Remarks</th><td>{selectedEntry.cookingReport.remarks || 'No remarks'}</td></tr>
                                        <tr><th>Report Date</th><td>{selectedEntry.cookingReport.createdAt ? new Date(selectedEntry.cookingReport.createdAt).toLocaleString() : 'N/A'}</td></tr>
                                    </tbody>
                                </ReviewTable>
                            </>
                        )}

                        <SectionTitle><RoleBadge role="Quality" /> 2. Quality Parameters</SectionTitle>
                        <ReviewTable>
                            <tbody>
                                <tr><th>Supervisor</th><td>{qp?.reportedByUser?.username || 'N/A'}</td></tr>
                                <tr><th>Moisture</th><td>{qp?.moisture}%</td></tr>
                                <tr><th>Cutting (Merged)</th><td><strong>{qp?.cutting1 && qp?.cutting2 ? `${qp?.cutting1} x ${qp?.cutting2}` : (qp?.cutting1 || qp?.cutting2 || 'N/A')}</strong></td></tr>
                                <tr><th>Mix / SK / Kandu</th><td>{qp?.mix}% / {qp?.sk}% / {qp?.kandu}%</td></tr>
                                <tr><th>Grains Count</th><td>{qp?.grainsCount}</td></tr>
                                <tr><th>Weight Bridge (R/Bk/T)</th><td>{qp?.wbR} / {qp?.wbBk} / {qp?.wbT}</td></tr>
                            </tbody>
                        </ReviewTable>
                    </div>

                    <div>
                        <SectionTitle><RoleBadge role="Physical" /> 3. Physical Inspection</SectionTitle>
                        <ReviewTable>
                            <tbody>
                                <tr><th>Supervisor</th><td>{inspections[0]?.reportedBy?.username || allot?.supervisor?.username || 'N/A'}</td></tr>
                                <tr><th>Allotted Bags</th><td style={{ fontWeight: 600, color: '#2563eb' }}>{allot?.allottedBags || selectedEntry.bags} Bags</td></tr>
                                <tr><th>Inspected Bags</th><td style={{ fontWeight: 600, color: '#16a34a' }}>{totalActualBags > 0 ? `${totalActualBags} Bags` : '0 Bags'}</td></tr>
                                <tr><th>Remaining</th><td style={{ fontWeight: 600, color: (allot?.allottedBags || selectedEntry.bags) - totalActualBags === 0 ? '#16a34a' : '#ea580c' }}>
                                    {(allot?.allottedBags || selectedEntry.bags) - totalActualBags} Bags
                                </td></tr>
                                <tr><th>Progress</th><td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, height: '16px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${Math.min(100, (totalActualBags / (allot?.allottedBags || selectedEntry.bags || 1)) * 100)}%`,
                                                backgroundColor: totalActualBags >= (allot?.allottedBags || selectedEntry.bags) ? '#16a34a' : '#f59e0b',
                                                borderRadius: '8px',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '40px' }}>
                                            {((totalActualBags / (allot?.allottedBags || selectedEntry.bags || 1)) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </td></tr>
                                <tr><th>Inspection Trips</th><td>{inspections.length} Trip(s)</td></tr>
                                <tr><th>Lorry Number(s)</th><td>{inspections.map((i: any) => i.lorryNumber).filter(Boolean).join(', ') || 'N/A'}</td></tr>
                            </tbody>
                        </ReviewTable>

                        {/* Individual inspection trip breakdown */}
                        {inspections.length > 0 && (
                            <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    📋 Inspection Trip Details
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                        <tr style={{ background: '#f0fdf4' }}>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'center' }}>#</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '6px' }}>Date</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '6px' }}>Lorry</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>Bags</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>Cutting</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'right' }}>Bend</th>
                                            <th style={{ border: '1px solid #e2e8f0', padding: '6px' }}>By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inspections.map((trip: any, idx: number) => (
                                            <tr key={trip.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '5px' }}>
                                                    {trip.inspectionDate ? new Date(trip.inspectionDate).toLocaleDateString() : '-'}
                                                </td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '5px' }}>{trip.lorryNumber || '-'}</td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '5px', textAlign: 'right', fontWeight: 600 }}>{trip.bags}</td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '5px', textAlign: 'right' }}>
                                                    {trip.cutting1} x {trip.cutting2 ?? '-'}
                                                </td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '5px', textAlign: 'right' }}>{trip.bend}</td>
                                                <td style={{ border: '1px solid #e2e8f0', padding: '5px' }}>{trip.reportedBy?.username || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ==================== INVENTORY & FINANCIAL DETAILS PER LORRY ==================== */}
                <div style={{ marginTop: '1.5rem' }}>
                    <SectionTitle>
                        <span><RoleBadge role="Financial" /> 4. Inventory & Financial Calculations ({allInventoryAndFinancials.length} Entr{allInventoryAndFinancials.length === 1 ? 'y' : 'ies'})</span>
                    </SectionTitle>

                    {allInventoryAndFinancials.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                            No inventory data recorded yet
                        </div>
                    ) : (
                        <>
                            {/* Per-lorry details */}
                            {allInventoryAndFinancials.map((item: any, idx: number) => (
                                <div key={item.inspection.id} style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '1rem 1.5rem',
                                    marginBottom: '1rem',
                                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ background: '#2563eb', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                                Lorry #{idx + 1}
                                            </span>
                                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                                                🚛 {item.inspection.lorryNumber || 'N/A'}
                                            </span>
                                        </div>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                            background: item.financial ? '#dcfce7' : '#fef3c7',
                                            color: item.financial ? '#166534' : '#92400e'
                                        }}>
                                            {item.financial ? '✅ Financial Done' : '⏳ Financial Pending'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {/* Inventory Details */}
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>📦 Inventory Data</div>
                                            <ReviewTable>
                                                <tbody>
                                                    <tr><th>Bags</th><td style={{ fontWeight: 600 }}>{item.inventory.bags || '-'}</td></tr>
                                                    <tr><th>WB Number</th><td>{item.inventory.wbNumber || 'N/A'}</td></tr>
                                                    <tr><th>Gross Weight</th><td>{item.inventory.grossWeight || 0} Kg</td></tr>
                                                    <tr><th>Tare Weight</th><td>{item.inventory.tareWeight || 0} Kg</td></tr>
                                                    <tr><th>Net Weight</th><td style={{ fontWeight: 700, color: '#0f172a' }}>{item.inventory.netWeight || 0} Kg</td></tr>
                                                    <tr><th>Location</th><td>
                                                        {item.inventory.location === 'DIRECT_KUNCHINITTU' ? (
                                                            <span style={{ color: '#2563eb', fontWeight: 600 }}>📦 Direct Kunchinittu</span>
                                                        ) : item.inventory.location === 'DIRECT_OUTTURN_PRODUCTION' ? (
                                                            <span style={{ color: '#7c3aed', fontWeight: 600 }}>🏭 Direct Outturn</span>
                                                        ) : item.inventory.location === 'WAREHOUSE' ? (
                                                            <span style={{ color: '#059669', fontWeight: 600 }}>🏬 Warehouse</span>
                                                        ) : 'N/A'}
                                                    </td></tr>
                                                    {item.inventory.kunchinittu && (
                                                        <tr><th>Kunchinittu</th><td style={{ fontWeight: 600, color: '#2563eb' }}>
                                                            {item.inventory.kunchinittu.name} {item.inventory.kunchinittu.variety ? `(${item.inventory.kunchinittu.variety.name})` : ''}
                                                        </td></tr>
                                                    )}
                                                    {item.inventory.outturn && (
                                                        <tr><th>Outturn</th><td style={{ fontWeight: 600, color: '#7c3aed' }}>
                                                            {item.inventory.outturn.outturnNumber || item.inventory.outturn.code || `OUT-${item.inventory.outturn.id}`} {item.inventory.outturn.allottedVariety ? `(${item.inventory.outturn.allottedVariety})` : ''}
                                                        </td></tr>
                                                    )}
                                                </tbody>
                                            </ReviewTable>
                                        </div>

                                        {/* Financial Calculation Details */}
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>💰 Financial Calculation</div>
                                            {item.financial ? (
                                                <ReviewTable>
                                                    <tbody>
                                                        <tr><th>Owner Prep</th><td>{item.financial.owner?.username || 'N/A'}</td></tr>
                                                        <tr><th>Manager Review</th><td>{item.financial.manager?.username || 'N/A'}</td></tr>
                                                        <tr><th>Base Rate</th><td>
                                                            <div style={{ fontWeight: 600 }}>₹{Number(item.financial.baseRateValue || 0).toLocaleString()}</div>
                                                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                                {item.financial.baseRateType === 'PD_LOOSE' ? 'PD Loose' : item.financial.baseRateType === 'PD_WB' ? 'PD WB' : item.financial.baseRateType === 'MD_LOOSE' ? 'MD Loose' : item.financial.baseRateType === 'MD_WB' ? 'MD WB' : item.financial.baseRateType || 'N/A'}
                                                                {item.financial.customDivisor ? ` (Divisor: ${item.financial.customDivisor})` : ''}
                                                            </div>
                                                        </td></tr>
                                                        <tr><th>Sute</th><td>₹{Number(item.financial.totalSute || 0).toLocaleString()} ({item.financial.suteRate || 0} {item.financial.suteType === 'PER_BAG' ? 'per bag' : item.financial.suteType === 'PER_TON' ? 'per ton' : item.financial.suteType || ''})</td></tr>
                                                        <tr><th>LF / Hamali</th><td>LF: ₹{Number(item.financial.lfinTotal || 0).toLocaleString()} / Ham: ₹{Number(item.financial.hamaliTotal || 0).toLocaleString()}</td></tr>
                                                        <tr><th>Brokerage / EGB</th><td>Brk: ₹{Number(item.financial.brokerageTotal || 0).toLocaleString()} / EGB: ₹{Number(item.financial.egbTotal || 0).toLocaleString()}</td></tr>
                                                        <tr><th>Average Rate</th><td style={{ fontWeight: 700, color: '#059669' }}>₹{Number(item.financial.average || 0).toFixed(2)}</td></tr>
                                                        <tr><th>Total Amount</th><td style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>₹{Number(item.financial.totalAmount || 0).toLocaleString()}</td></tr>
                                                    </tbody>
                                                </ReviewTable>
                                            ) : (
                                                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', background: '#fef3c7', borderRadius: '8px', fontSize: '12px' }}>
                                                    ⏳ Financial calculation not yet completed for this lorry
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Grand Totals Table - only show if more than one entry */}
                            {allInventoryAndFinancials.length > 1 && (
                                <div style={{ marginTop: '0.5rem', border: '2px solid #2563eb', borderRadius: '12px', padding: '1rem 1.5rem', background: '#eff6ff' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', marginBottom: '8px', textTransform: 'uppercase' }}>
                                        📊 Grand Totals (All {allInventoryAndFinancials.length} Lorries)
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ background: '#dbeafe' }}>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'center' }}>#</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px' }}>Lorry</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'right' }}>Bags</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'right' }}>Net Wt (Kg)</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'right' }}>Sute</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'right' }}>LF+Ham</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'right' }}>Brk+EGB</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'right' }}>Avg Rate</th>
                                                <th style={{ border: '1px solid #bfdbfe', padding: '8px', textAlign: 'right' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allInventoryAndFinancials.map((item: any, idx: number) => (
                                                <tr key={item.inspection.id} style={{ background: idx % 2 === 0 ? 'white' : '#f0f9ff' }}>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', fontWeight: 600 }}>{item.inspection.lorryNumber || 'N/A'}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'right' }}>{item.inventory?.bags || 0}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'right' }}>{Number(item.inventory?.netWeight || 0).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'right' }}>₹{Number(item.financial?.totalSute || 0).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'right' }}>₹{(Number(item.financial?.lfinTotal || 0) + Number(item.financial?.hamaliTotal || 0)).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'right' }}>₹{(Number(item.financial?.brokerageTotal || 0) + Number(item.financial?.egbTotal || 0)).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>₹{Number(item.financial?.average || 0).toFixed(2)}</td>
                                                    <td style={{ border: '1px solid #bfdbfe', padding: '6px', textAlign: 'right', fontWeight: 700 }}>₹{Number(item.financial?.totalAmount || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr style={{ background: '#1e40af', color: 'white', fontWeight: 700 }}>
                                                <td colSpan={2} style={{ border: '1px solid #1e3a8a', padding: '8px' }}>GRAND TOTAL</td>
                                                <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'right' }}>{grandTotalBags}</td>
                                                <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'right' }}>{grandTotalNetWeight.toLocaleString()}</td>
                                                <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'right' }}>₹{grandTotalSute.toLocaleString()}</td>
                                                <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'right' }}>₹{(grandTotalLfin + grandTotalHamali).toLocaleString()}</td>
                                                <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'right' }}>₹{(grandTotalBrokerage + grandTotalEgb).toLocaleString()}</td>
                                                <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'right' }}>-</td>
                                                <td style={{ border: '1px solid #1e3a8a', padding: '8px', textAlign: 'right', fontSize: '14px' }}>₹{grandTotalAmount.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Bottom Summary Bar */}
                <div style={{ marginTop: '2.5rem', background: '#1e293b', color: '#fff', padding: '2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '3rem' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL ENTRIES</div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa' }}>{allInventoryAndFinancials.length} <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8' }}>lorr{allInventoryAndFinancials.length === 1 ? 'y' : 'ies'}</span></div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>NET AVG RATE</div>
                            <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>₹{grandAvgRate.toFixed(2)} <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8' }}>/ Q</span></div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>GRAND TOTAL AMOUNT</div>
                            <div style={{ fontSize: '32px', fontWeight: 800 }}>₹{grandTotalAmount.toLocaleString()}</div>
                        </div>
                    </div>
                    {!readOnly && (
                        <div style={{ width: '300px' }}>
                            <CompleteButton onClick={handleComplete}>
                                Approve & Finalize Purchase
                            </CompleteButton>
                        </div>
                    )}
                    {readOnly && (
                        <div style={{ width: '300px', textAlign: 'center', border: '1px dashed #475569', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>READ ONLY SUMMARY</div>
                            <div style={{ fontSize: '14px', marginTop: '4px' }}>Record Processed</div>
                        </div>
                    )}
                </div>

                {!readOnly && (
                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '1.5rem', fontStyle: 'italic' }}>
                        * Approval will lock this record and transfer the paddy stock to inventory.
                    </p>
                )}
            </Card>
        </Container>
    );
};

export default FinalReviewPage;
