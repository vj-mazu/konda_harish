import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import { SuteType, BaseRateType, CalculationUnit } from '../types/sampleEntry';
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

const Label = styled.label`
  display: block;
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

const Select = styled.select`
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
`;

const Btn = styled.button<{ color?: string }>`
  padding: 8px 18px;
  background: ${p => p.color || '#2563eb'};
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

// Helpers
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

const OwnerFinancialPage: React.FC = () => {
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        suteRate: 0, suteType: 'PER_BAG' as SuteType,
        baseRateType: 'PD_LOOSE' as BaseRateType,
        baseRateUnit: 'PER_BAG' as CalculationUnit,
        baseRateValue: 0, customDivisor: 100,
        brokerageRate: 0, brokerageUnit: 'PER_BAG' as CalculationUnit,
        egbRate: 0
    });

    const resetForm = () => setForm({
        suteRate: 0, suteType: 'PER_BAG', baseRateType: 'PD_LOOSE',
        baseRateUnit: 'PER_BAG', baseRateValue: 0, customDivisor: 100,
        brokerageRate: 0, brokerageUnit: 'PER_BAG', egbRate: 0
    });

    useEffect(() => { loadEntries(); }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const [r1, r2] = await Promise.all([
                sampleEntryApi.getSampleEntriesByRole({ status: 'INVENTORY_ENTRY' }),
                sampleEntryApi.getSampleEntriesByRole({ status: 'OWNER_FINANCIAL' })
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
        const pending = items.find((i: any) => !i.financial);
        setActiveItem(pending || items[0] || null);
        resetForm();
    };

    const handleSave = async () => {
        try {
            if (!activeItem?.inventory) throw new Error('No inventory selected');
            await sampleEntryApi.createFinancialCalculation(selected.id, {
                ...form, baseRate: form.baseRateValue,
                inventoryDataId: activeItem.inventory.id,
                lfinRate: 0, lfinUnit: 'PER_BAG', hamaliRate: 0, hamaliUnit: 'PER_BAG'
            });
            showNotification('Saved!', 'success');
            setSelected(null); setActiveItem(null);
            loadEntries();
        } catch (err: any) {
            showNotification(err.response?.data?.error || err.message || 'Failed', 'error');
        }
    };

    const calc = () => {
        if (!activeItem?.inventory) return null;
        const { bags, netWeight } = activeItem.inventory;
        const totalSute = form.suteType === 'PER_BAG' ? form.suteRate * bags : (netWeight / 1000) * form.suteRate;
        const snw = netWeight - totalSute;
        let div = 100;
        if (form.baseRateType === 'MD_LOOSE') div = form.customDivisor;
        else if (form.baseRateUnit === 'PER_BAG') div = 75;
        const base = (snw / div) * form.baseRateValue;
        const brDiv = form.baseRateType === 'MD_LOOSE' ? form.customDivisor : 100;
        const brok = form.brokerageUnit === 'PER_BAG' ? form.brokerageRate * bags : (netWeight / brDiv) * form.brokerageRate;
        const isLoose = form.baseRateType === 'PD_LOOSE' || form.baseRateType === 'MD_LOOSE';
        const egb = isLoose ? form.egbRate * bags : 0;
        const total = totalSute + base + brok + egb;
        const avg = snw > 0 ? total / snw : 0;
        return { totalSute, base, brok, egb, total, avg };
    };

    const totals = calc();
    const items = selected ? getAllItems(selected) : [];

    // === LISTING ===
    if (!selected) {
        return (
            <Page>
                <h2 style={{ marginBottom: '1rem' }}>💰 Owner Financial</h2>
                <Card>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Date</th>
                                <th style={{ padding: '10px' }}>Party</th>
                                <th style={{ padding: '10px' }}>Variety</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Lorries</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Pending</th>
                                <th style={{ padding: '10px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</td></tr> :
                                entries.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No pending entries</td></tr> :
                                    entries.map(e => {
                                        const items = getAllItems(e);
                                        const pending = items.filter((i: any) => !i.financial).length;
                                        return (
                                            <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '10px' }}>{new Date(e.entryDate).toLocaleDateString()}</td>
                                                <td style={{ padding: '10px', fontWeight: 600 }}>{e.partyName}</td>
                                                <td style={{ padding: '10px' }}>{e.variety}</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>{items.length}</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    {pending > 0
                                                        ? <Badge bg="#fef3c7" color="#92400e">{pending} pending</Badge>
                                                        : <Badge bg="#dcfce7" color="#166534">✅ Done</Badge>
                                                    }
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                                    <Btn onClick={() => openEntry(e)} style={{ padding: '5px 14px', fontSize: '12px' }}>
                                                        {pending > 0 ? 'Calculate' : 'View'}
                                                    </Btn>
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

    // === DETAIL VIEW ===
    return (
        <Page>
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={() => { setSelected(null); setActiveItem(null); }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    ← Back
                </button>
                <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontSize: '13px' }}>
                    {selected.partyName} • {selected.variety}
                </span>
            </div>

            {/* Lorry tabs - only if multiple */}
            {items.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {items.map((item: any, idx: number) => (
                        <button key={item.inspection.id}
                            onClick={() => { setActiveItem(item); if (!item.financial) resetForm(); }}
                            style={{
                                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                border: activeItem?.inspection.id === item.inspection.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                background: activeItem?.inspection.id === item.inspection.id ? '#dbeafe' : (item.financial ? '#f0fdf4' : '#fff'),
                                color: '#1f2937'
                            }}>
                            Lorry {idx + 1} {item.financial ? '✅' : '⏳'}
                        </button>
                    ))}
                </div>
            )}

            {/* Lorry info bar */}
            {activeItem && (
                <Card style={{ background: '#f8fafc', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '13px', flexWrap: 'wrap' }}>
                        <div><span style={{ color: '#6b7280' }}>Lorry:</span> <strong>{activeItem.inspection.lorryNumber || '-'}</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Bags:</span> <strong>{activeItem.inventory.bags}</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Net Wt:</span> <strong>{activeItem.inventory.netWeight} kg</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Broker:</span> <strong>{selected.brokerName || '-'}</strong></div>
                    </div>
                </Card>
            )}

            {/* Already done */}
            {activeItem?.financial ? (
                <Card style={{ border: '1px solid #86efac' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>✅ Financial Done</div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px', flexWrap: 'wrap' }}>
                        <div>Base: ₹{Number(activeItem.financial.baseRateTotal || 0).toLocaleString()}</div>
                        <div>Sute: ₹{Number(activeItem.financial.totalSute || 0).toLocaleString()}</div>
                        <div>Brokerage: ₹{Number(activeItem.financial.brokerageTotal || 0).toLocaleString()}</div>
                        <div style={{ fontWeight: 700 }}>Total: ₹{Number(activeItem.financial.totalAmount || 0).toLocaleString()}</div>
                    </div>
                </Card>
            ) : (
                /* Form */
                <>
                    <Card>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>⚖️ Sute & Base Rate</div>
                        <Row>
                            <Field><Label>Sute Rate</Label><Input type="number" value={form.suteRate} onChange={e => setForm({ ...form, suteRate: Number(e.target.value) })} /></Field>
                            <Field><Label>Type</Label>
                                <Select value={form.suteType} onChange={e => setForm({ ...form, suteType: e.target.value as any })}>
                                    <option value="PER_BAG">Per Bag</option><option value="PER_TON">Per Ton</option>
                                </Select>
                            </Field>
                        </Row>
                        <Row>
                            <Field flex={2}><Label>Base Rate Type</Label>
                                <Select value={form.baseRateType} onChange={e => setForm({ ...form, baseRateType: e.target.value as any })}>
                                    <option value="PD_LOOSE">PD Loose</option><option value="PD_WB">PD WB</option>
                                    <option value="MD_WB">MD WB</option><option value="MD_LOOSE">MD Loose</option>
                                </Select>
                            </Field>
                            {form.baseRateType === 'MD_LOOSE' && (
                                <Field><Label>Divisor</Label><Input type="number" value={form.customDivisor} onChange={e => setForm({ ...form, customDivisor: Number(e.target.value) })} /></Field>
                            )}
                        </Row>
                        <Row>
                            <Field><Label>Rate Value</Label><Input type="number" value={form.baseRateValue} onChange={e => setForm({ ...form, baseRateValue: Number(e.target.value) })} /></Field>
                            <Field><Label>Unit</Label>
                                <Select value={form.baseRateUnit} onChange={e => setForm({ ...form, baseRateUnit: e.target.value as any })}>
                                    <option value="PER_BAG">Per Bag (75)</option><option value="PER_QUINTAL">Per Quintal (100)</option>
                                </Select>
                            </Field>
                        </Row>
                    </Card>

                    <Card>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>🤝 Brokerage & EGB</div>
                        <Row>
                            <Field><Label>Brokerage Rate</Label><Input type="number" value={form.brokerageRate} onChange={e => setForm({ ...form, brokerageRate: Number(e.target.value) })} /></Field>
                            <Field><Label>Unit</Label>
                                <Select value={form.brokerageUnit} onChange={e => setForm({ ...form, brokerageUnit: e.target.value as any })}>
                                    <option value="PER_BAG">Per Bag</option><option value="PER_QUINTAL">Per Quintal</option>
                                </Select>
                            </Field>
                        </Row>
                        {(form.baseRateType === 'PD_LOOSE' || form.baseRateType === 'MD_LOOSE') && (
                            <Row>
                                <Field><Label>EGB Rate (per bag)</Label><Input type="number" value={form.egbRate} onChange={e => setForm({ ...form, egbRate: Number(e.target.value) })} /></Field>
                                <Field />
                            </Row>
                        )}
                    </Card>

                    {/* Preview */}
                    {totals && (
                        <Card style={{ background: '#1e293b', color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span style={{ color: '#94a3b8' }}>Sute</span><span>₹{totals.totalSute.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span style={{ color: '#94a3b8' }}>Base</span><span>₹{totals.base.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span style={{ color: '#94a3b8' }}>Brokerage</span><span>₹{totals.brok.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                <span style={{ color: '#94a3b8' }}>EGB</span><span>₹{totals.egb.toFixed(2)}</span>
                            </div>
                            <div style={{ borderTop: '1px solid #475569', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>TOTAL</span><span style={{ color: '#fbbf24', fontSize: '16px' }}>₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                                Avg: ₹{totals.avg.toFixed(2)} • LF & Hamali added by Manager
                            </div>
                            <Btn onClick={handleSave} color="#10b981" style={{ width: '100%', marginTop: '12px', padding: '10px' }}>
                                ✓ Submit Financial
                            </Btn>
                        </Card>
                    )}
                </>
            )}
        </Page>
    );
};

export default OwnerFinancialPage;
