import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import styled from 'styled-components';

const Page = styled.div`
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
`;

const Card = styled.div`
  background: white;
  border-radius: 10px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  margin-bottom: 1rem;
`;

const Row = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const Field = styled.div<{ flex?: number }>`
  flex: ${p => p.flex || 1};
`;

const Label = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 3px;
`;

const Input = styled.input`
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
`;

const Btn = styled.button<{ color?: string }>`
  padding: 8px 18px;
  background: ${p => p.color || '#4f46e5'};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  &:hover { opacity: 0.9; }
`;

const Badge = styled.span<{ bg: string; color: string }>`
  background: ${p => p.bg};
  color: ${p => p.color};
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
`;

const getAllItems = (entry: any) => {
    const inspections = entry?.lotAllotment?.physicalInspections || [];
    return inspections
        .filter((i: any) => i?.inventoryData)
        .map((i: any, idx: number) => ({
            inspection: i,
            inventory: i.inventoryData,
            financial: i.inventoryData?.financialCalculation || null,
            index: idx
        }));
};

const ManagerFinancialPage: React.FC = () => {
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ lfinRate: 0, lfinUnit: 'PER_BAG', hamaliRate: 0, hamaliUnit: 'PER_BAG' });

    useEffect(() => { loadEntries(); }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const [r1, r2] = await Promise.all([
                sampleEntryApi.getSampleEntriesByRole({ status: 'OWNER_FINANCIAL' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'MANAGER_FINANCIAL' })
            ]);
            const map = new Map();
            [...(r1.data.entries || []), ...(r2.data.entries || [])].forEach((e: any) => map.set(e.id, e));
            setEntries(Array.from(map.values()));
        } catch { showNotification('Failed to load', 'error'); }
        finally { setLoading(false); }
    };

    const openEntry = (e: any) => {
        setSelected(e);
        const items = getAllItems(e);
        const first = items.find((i: any) => i.financial) || items[0];
        setActiveItem(first);
        if (first?.financial) {
            setForm({
                lfinRate: first.financial.lfinRate || 0,
                lfinUnit: first.financial.lfinUnit || 'PER_BAG',
                hamaliRate: first.financial.hamaliRate || 0,
                hamaliUnit: first.financial.hamaliUnit || 'PER_BAG'
            });
        }
    };

    const selectItem = (item: any) => {
        setActiveItem(item);
        if (item?.financial) {
            setForm({
                lfinRate: item.financial.lfinRate || 0,
                lfinUnit: item.financial.lfinUnit || 'PER_BAG',
                hamaliRate: item.financial.hamaliRate || 0,
                hamaliUnit: item.financial.hamaliUnit || 'PER_BAG'
            });
        }
    };

    const handleSubmit = async () => {
        try {
            if (!activeItem?.financial) throw new Error('Owner financial not found');
            await sampleEntryApi.createManagerFinancialCalculation(selected.id, {
                ...activeItem.financial, ...form,
                inventoryDataId: activeItem.inventory.id
            });
            showNotification('Saved!', 'success');
            setSelected(null); setActiveItem(null);
            loadEntries();
        } catch (err: any) {
            showNotification(err.response?.data?.error || err.message || 'Failed', 'error');
        }
    };

    const fc = activeItem?.financial;
    const items = selected ? getAllItems(selected) : [];

    // === LISTING ===
    if (!selected) {
        return (
            <Page>
                <h2 style={{ marginBottom: '1rem' }}>📊 Manager Financial</h2>
                <Card>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Date</th>
                                <th style={{ padding: '10px' }}>Party</th>
                                <th style={{ padding: '10px' }}>Variety</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Lorries</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Owner Total</th>
                                <th style={{ padding: '10px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</td></tr> :
                                entries.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No pending entries</td></tr> :
                                    entries.map(e => {
                                        const items = getAllItems(e);
                                        const total = items.reduce((s: number, i: any) => s + Number(i.financial?.totalAmount || 0), 0);
                                        return (
                                            <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '10px' }}>{new Date(e.entryDate).toLocaleDateString()}</td>
                                                <td style={{ padding: '10px', fontWeight: 600 }}>{e.partyName}</td>
                                                <td style={{ padding: '10px' }}>{e.variety}</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>{items.length}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>₹{total.toLocaleString()}</td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                                    <Btn onClick={() => openEntry(e)} style={{ padding: '5px 14px', fontSize: '12px' }}>Review</Btn>
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </Card>
            </Page>
        );
    }

    // === DETAIL ===
    return (
        <Page>
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={() => { setSelected(null); setActiveItem(null); }}
                    style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    ← Back
                </button>
                <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontSize: '13px' }}>
                    {selected.partyName} • {selected.variety}
                </span>
            </div>

            {/* Lorry tabs */}
            {items.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {items.map((item: any, idx: number) => (
                        <button key={item.inspection.id}
                            onClick={() => selectItem(item)}
                            style={{
                                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                border: activeItem?.inspection.id === item.inspection.id ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                                background: activeItem?.inspection.id === item.inspection.id ? '#e0e7ff' : '#fff',
                                color: '#1f2937'
                            }}>
                            Lorry {idx + 1} {item.financial ? '✅' : '⚠️'}
                        </button>
                    ))}
                </div>
            )}

            {/* Info bar */}
            {activeItem && (
                <Card style={{ background: '#f8fafc', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '13px', flexWrap: 'wrap' }}>
                        <div><span style={{ color: '#6b7280' }}>Lorry:</span> <strong>{activeItem.inspection.lorryNumber || '-'}</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Bags:</span> <strong>{activeItem.inventory.bags}</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Net Wt:</span> <strong>{activeItem.inventory.netWeight} kg</strong></div>
                    </div>
                </Card>
            )}

            {!fc ? (
                <Card style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                    Owner financial not done yet for this lorry.
                </Card>
            ) : (
                <>
                    {/* Owner summary */}
                    <Card>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Owner Submitted</div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px', flexWrap: 'wrap' }}>
                            <div>Sute: ₹{Number(fc.totalSute || 0).toLocaleString()}</div>
                            <div>Base: ₹{Number(fc.baseRateTotal || 0).toLocaleString()}</div>
                            <div>Brok: ₹{Number(fc.brokerageTotal || 0).toLocaleString()}</div>
                            <div>EGB: ₹{Number(fc.egbTotal || 0).toLocaleString()}</div>
                            <div style={{ fontWeight: 700 }}>Total: ₹{Number(fc.totalAmount || 0).toLocaleString()}</div>
                        </div>
                    </Card>

                    {/* Manager form */}
                    <Card>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>Manager: LF & Hamali</div>
                        <Row>
                            <Field>
                                <Label>LF (Freight) Rate</Label>
                                <Input type="number" value={form.lfinRate} onChange={e => setForm({ ...form, lfinRate: Number(e.target.value) })} />
                            </Field>
                            <Field>
                                <Label>Unit</Label>
                                <select style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                                    value={form.lfinUnit} onChange={e => setForm({ ...form, lfinUnit: e.target.value })}>
                                    <option value="PER_BAG">Per Bag</option><option value="PER_QUINTAL">Per Quintal</option>
                                </select>
                            </Field>
                        </Row>
                        <Row>
                            <Field>
                                <Label>Hamali Rate</Label>
                                <Input type="number" value={form.hamaliRate} onChange={e => setForm({ ...form, hamaliRate: Number(e.target.value) })} />
                            </Field>
                            <Field>
                                <Label>Unit</Label>
                                <select style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                                    value={form.hamaliUnit} onChange={e => setForm({ ...form, hamaliUnit: e.target.value })}>
                                    <option value="PER_BAG">Per Bag</option><option value="PER_QUINTAL">Per Quintal</option>
                                </select>
                            </Field>
                        </Row>

                        {/* Preview totals */}
                        {(() => {
                            const inv = activeItem.inventory;
                            const lf = form.lfinUnit === 'PER_BAG' ? form.lfinRate * inv.bags : (inv.netWeight / 100) * form.lfinRate;
                            const ham = form.hamaliUnit === 'PER_BAG' ? form.hamaliRate * inv.bags : (inv.netWeight / 100) * form.hamaliRate;
                            const ownerBase = Number(fc.totalSute) + Number(fc.baseRateTotal) + Number(fc.brokerageTotal) + Number(fc.egbTotal || 0);
                            const total = ownerBase + lf + ham;
                            const avg = Number(fc.suteNetWeight) > 0 ? total / Number(fc.suteNetWeight) : 0;
                            return (
                                <div style={{ background: '#f0f4ff', padding: '10px', borderRadius: '8px', marginTop: '8px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#6b7280' }}>LF Total</span><strong>₹{lf.toFixed(2)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#6b7280' }}>Hamali Total</span><strong>₹{ham.toFixed(2)}</strong>
                                    </div>
                                    <div style={{ borderTop: '1px solid #c7d2fe', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                        <span>GRAND TOTAL</span><span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>
                                        Avg: ₹{avg.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })()}

                        <Btn onClick={handleSubmit} style={{ width: '100%', marginTop: '12px', padding: '10px' }}>
                            ✓ Submit & Move to Final Review
                        </Btn>
                        <button onClick={() => { setSelected(null); setActiveItem(null); }}
                            style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', color: '#6b7280', marginTop: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            Cancel
                        </button>
                    </Card>
                </>
            )}
        </Page>
    );
};

export default ManagerFinancialPage;
