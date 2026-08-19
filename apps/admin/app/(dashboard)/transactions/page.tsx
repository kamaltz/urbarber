'use client';

import { AdminApiClient, type AdminTransaction } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { shortId } from '@/lib/format';
import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';

const PROVIDER_OPTIONS = ['all', 'cash_on_service', 'midtrans_sandbox'] as const;

function formatRp(amount?: number): string {
  if (amount === undefined) return '-';
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<'all' | 'cash_on_service' | 'midtrans_sandbox'>('all');
  const [status, setStatus] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AdminApiClient.getTransactions(
        provider === 'all' ? undefined : provider,
        status || undefined,
        undefined,
        undefined,
        20,
        undefined
      );
      setTransactions(result.items);
      setHasMore(result.hasMore);
      setNextCursor(result.nextPageStartAfter);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal load transaction list'));
      console.error('Transaction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await AdminApiClient.getTransactions(
        provider === 'all' ? undefined : provider,
        status || undefined,
        undefined,
        undefined,
        20,
        nextCursor
      );
      setTransactions((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextPageStartAfter);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal load transaction list'));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [provider, status]);

  const statusColor = (transactionStatus: string): string => {
    if (transactionStatus === 'paid') return '#86EFAC';
    if (transactionStatus === 'pending' || transactionStatus === 'initiated') return '#FCD34D';
    if (transactionStatus === 'not_required') return '#E5E7EB';
    if (transactionStatus === 'failed') return '#FCA5A5';
    return '#E5E7EB';
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Transaksi</h1>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Transaction Monitoring</h1>

      {error && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Provider
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PROVIDER_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: provider === p ? '600' : '400',
                  backgroundColor: provider === p ? '#3B82F6' : '#E5E7EB',
                  color: provider === p ? 'white' : '#1F2937',
                }}
              >
                {p === 'all' ? 'Semua' : p === 'cash_on_service' ? 'Cash' : 'Midtrans Sandbox'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #D1D5DB',
              width: '100%',
              maxWidth: '300px',
            }}
          >
            <option value="">Semua Status</option>
            <option value="not_required">Not Required</option>
            <option value="initiated">Initiated</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: '2rem' }}>
          Tidak ada transaksi
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Transaction ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Booking ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Provider</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Environment</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Gross Amount</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Payment Type</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Paid At</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Rincian</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <Fragment key={tx.transactionId}>
                <tr style={{ borderBottom: expandedId === tx.transactionId ? 'none' : '1px solid #E5E7EB' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {shortId(tx.transactionId)}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {tx.bookingId ? (
                      <Link href={`/bookings/${tx.bookingId}`} style={{ color: '#3B82F6', fontWeight: '600' }}>
                        {shortId(tx.bookingId)}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {tx.provider === 'cash_on_service' ? 'Cash' : 'Midtrans'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {tx.environment === 'sandbox' && (
                      <span
                        style={{
                          backgroundColor: '#FCD34D',
                          color: '#000',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}
                      >
                        Sandbox
                      </span>
                    )}
                    {tx.environment === 'cash' && (
                      <span
                        style={{
                          backgroundColor: '#E5E7EB',
                          color: '#1F2937',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}
                      >
                        Cash
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>
                    Rp {tx.grossAmount.toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        backgroundColor: statusColor(tx.status),
                        color: '#000',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {tx.paymentType || '-'}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {tx.paidAt ? new Date(tx.paidAt).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      onClick={() => setExpandedId(expandedId === tx.transactionId ? null : tx.transactionId)}
                      style={{ color: '#3B82F6', fontWeight: '600', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {expandedId === tx.transactionId ? 'Tutup' : 'Detail'}
                    </button>
                  </td>
                </tr>
                {expandedId === tx.transactionId && (
                  <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                    <td colSpan={9} style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <div><span style={{ color: '#6B7280' }}>Base Amount: </span><strong>{formatRp(tx.baseAmount)}</strong></div>
                        <div><span style={{ color: '#6B7280' }}>Voucher: </span><strong>{tx.voucherCode ? `${tx.voucherCode} (-${formatRp(tx.voucherDiscount)})` : '-'}</strong></div>
                        <div><span style={{ color: '#6B7280' }}>Home Service Fee: </span><strong>{formatRp(tx.homeServiceFee)}</strong></div>
                        <div><span style={{ color: '#6B7280' }}>Application Fee (Platform): </span><strong>{formatRp(tx.applicationFee)}</strong></div>
                        <div><span style={{ color: '#6B7280' }}>Tip: </span><strong>{formatRp(tx.tipAmount)}</strong></div>
                        <div><span style={{ color: '#6B7280' }}>Gross Amount: </span><strong>{formatRp(tx.grossAmount)}</strong></div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.75rem' }}>
                        Gross Amount adalah total yang dibayar pelanggan, bukan pendapatan platform. Pendapatan platform hanya Application Fee.
                        {(tx.baseAmount === undefined) ? ' Rincian tidak tersedia untuk transaksi lama (sebelum sistem biaya/voucher aktif).' : ''}
                      </p>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loadingMore ? 'default' : 'pointer',
              fontWeight: '600',
              backgroundColor: '#E5E7EB',
              color: '#1F2937',
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
          </button>
        </div>
      )}
    </div>
  );
}
