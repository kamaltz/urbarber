'use client';

import { AdminApiClient, type AdminBookingDetail } from '@/lib/api-client';
import { shortId } from '@/lib/format';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BookingDetailPage() {
  const { bookingId } = useParams() as { bookingId: string };
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await AdminApiClient.getBookingDetail(bookingId);
        setBooking(detail);
      } catch (err: any) {
        setError(err.message || 'Gagal load booking detail');
        console.error('Booking detail error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

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

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Booking Detail</h1>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>Loading...</div>
      </div>
    );
  }

  if (!booking || error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Booking Detail</h1>
        <div
          style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            padding: '1rem',
            borderRadius: '0.375rem',
          }}
        >
          {error || 'Booking tidak ditemukan'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        Booking Detail: {shortId(booking.bookingId)}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Customer Info */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Customer</h2>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Nama:</strong> {booking.customerName}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Email:</strong> {booking.customerEmail || '-'}
            </div>
            <div>
              <strong>Phone:</strong> {booking.customerPhone || '-'}
            </div>
          </div>
        </div>

        {/* Barber Info */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Barber</h2>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Nama:</strong> {booking.barberName}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Email:</strong> {booking.barberEmail || '-'}
            </div>
            <div>
              <strong>Phone:</strong> {booking.barberPhone || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Booking Info</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Service</div>
            <div style={{ fontWeight: '600' }}>{booking.serviceName}</div>
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Tanggal</div>
            <div style={{ fontWeight: '600' }}>{booking.date}</div>
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Jam Mulai</div>
            <div style={{ fontWeight: '600' }}>{booking.startTime}</div>
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Jam Selesai</div>
            <div style={{ fontWeight: '600' }}>{booking.endTime || '-'}</div>
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Lokasi Service</div>
            <div style={{ fontWeight: '600' }}>{booking.serviceLocationType || '-'}</div>
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Alamat Service</div>
            <div style={{ fontWeight: '600' }}>{booking.serviceAddress || '-'}</div>
          </div>
        </div>
      </div>

      {/* Status & Payment */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Status</h2>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ color: '#6B7280', marginBottom: '0.5rem' }}>Booking Status</div>
            <span
              style={{
                backgroundColor: statusColor(booking.status),
                color: '#000',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontWeight: '600',
                display: 'inline-block',
              }}
            >
              {booking.status}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Pembayaran</h2>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Metode:</strong> {booking.paymentMethod === 'cash_on_service' ? 'Cash' : 'Midtrans'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Status:</strong> {booking.paymentStatus}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Total:</strong> Rp {booking.totalPrice.toLocaleString('id-ID')}
            </div>
            {booking.paidAt && (
              <div>
                <strong>Dibayar:</strong> {booking.paidAt}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {booking.notes && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Catatan</h2>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{booking.notes}</div>
        </div>
      )}

      {/* Timestamps */}
      <div
        style={{
          backgroundColor: '#F9FAFB',
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.75rem',
          color: '#6B7280',
        }}
      >
        <div>Created: {booking.createdAt}</div>
        {booking.updatedAt && <div>Updated: {booking.updatedAt}</div>}
      </div>
    </div>
  );
}
