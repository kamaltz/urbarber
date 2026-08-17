'use client';

import { AdminApiClient, type AdminBookingSummary } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { shortId } from '@/lib/format';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const STATUS_OPTIONS = ['all', 'pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'] as const;
const PAYMENT_METHOD_OPTIONS = ['all', 'cash_on_service', 'midtrans_sandbox'] as const;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash_on_service' | 'midtrans_sandbox'>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AdminApiClient.getBookings(
        filter === 'all' ? undefined : filter,
        undefined,
        undefined,
        paymentMethod === 'all' ? undefined : paymentMethod,
        undefined,
        20,
        undefined
      );
      setBookings(result.items);
      setHasMore(result.hasMore);
      setNextCursor(result.nextPageStartAfter);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal load booking list'));
      console.error('Booking error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await AdminApiClient.getBookings(
        filter === 'all' ? undefined : filter,
        undefined,
        undefined,
        paymentMethod === 'all' ? undefined : paymentMethod,
        undefined,
        20,
        nextCursor
      );
      setBookings((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextPageStartAfter);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal load booking list'));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filter, paymentMethod]);

  const statusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#FCD34D';
      case 'accepted': return '#86EFAC';
      case 'rejected': return '#FCA5A5';
      case 'in_progress': return '#93C5FD';
      case 'completed': return '#6EE7B7';
      case 'cancelled': return '#D1D5DB';
      default: return '#E5E7EB';
    }
  };

  const paymentStatusColor = (status: string): string => {
    if (status === 'not_required') return '#E5E7EB';
    if (status === 'paid') return '#86EFAC';
    if (status === 'pending' || status === 'initiated') return '#FCD34D';
    if (status === 'failed') return '#FCA5A5';
    return '#E5E7EB';
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Booking</h1>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Booking Monitoring</h1>

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
            Status
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: filter === s ? '600' : '400',
                  backgroundColor: filter === s ? '#3B82F6' : '#E5E7EB',
                  color: filter === s ? 'white' : '#1F2937',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Metode Pembayaran
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PAYMENT_METHOD_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: paymentMethod === m ? '600' : '400',
                  backgroundColor: paymentMethod === m ? '#3B82F6' : '#E5E7EB',
                  color: paymentMethod === m ? 'white' : '#1F2937',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: '2rem' }}>
          Tidak ada booking
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Booking ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Customer</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Barber</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Service</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Tanggal/Jam</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Metode</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Pembayaran</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Total</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.bookingId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {shortId(booking.bookingId)}
                  </td>
                  <td style={{ padding: '1rem' }}>{booking.customerName}</td>
                  <td style={{ padding: '1rem' }}>{booking.barberName}</td>
                  <td style={{ padding: '1rem' }}>{booking.serviceName}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div>{booking.date}</div>
                      <div style={{ color: '#6B7280' }}>{booking.startTime}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        backgroundColor: statusColor(booking.status),
                        color: '#000',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {booking.paymentMethod === 'cash_on_service' ? 'Cash' : 'Midtrans'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        backgroundColor: paymentStatusColor(booking.paymentStatus),
                        color: '#000',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}
                    >
                      {booking.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>Rp {booking.totalPrice.toLocaleString('id-ID')}</td>
                  <td style={{ padding: '1rem' }}>
                    <Link
                      href={`/bookings/${booking.bookingId}`}
                      style={{
                        color: '#3B82F6',
                        textDecoration: 'none',
                        fontWeight: '600',
                      }}
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
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
