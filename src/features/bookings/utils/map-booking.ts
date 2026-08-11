/**
 * Batch 10B-5G: maps a raw bookings/{bookingId} Firestore document into the
 * canonical Booking domain shape consumed by BookingCard, the customer
 * booking detail screen, and the Customer Home active-booking banner.
 *
 * Live inspection of production data found real bookings under at least two
 * incompatible persistence shapes:
 *  - current (backend/vercel/api/payments.ts handleCreatePayment): flat
 *    date/startTime/price/serviceId fields, no shop/barber/services objects.
 *  - legacy/seeded: bookingDate/bookingTime/totalAmount/totalPrice and a
 *    denormalized `services` array.
 * Neither shape carries the shop/barber identity or resolved service the UI
 * needs, so barberId/serviceId must be resolved against barbers/{barberId}
 * and barberServices/{serviceId} -- see resolveBookingsDomain in
 * booking.repository.ts, which fetches those documents and passes them here.
 */
import { Timestamp } from 'firebase/firestore';
import { mapLegacyBookingStatus } from '@/types/domain';
import type { Booking, Service } from '../types/booking';

function normalizeTimestamp(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

function resolveDate(data: Record<string, any>): string {
  return data.date || data.bookingDate || data.scheduledAt || '';
}

function resolveTime(data: Record<string, any>): string {
  return data.startTime || data.bookingTime || data.scheduledTime || '';
}

function resolvePrice(data: Record<string, any>): number {
  if (typeof data.price === 'number') return data.price;
  if (typeof data.totalPrice === 'number') return data.totalPrice;
  if (typeof data.totalAmount === 'number') return data.totalAmount;
  return 0;
}

function resolveServices(data: Record<string, any>, serviceDoc: Record<string, any> | undefined): Service[] {
  if (Array.isArray(data.services) && data.services.length > 0) {
    return data.services.map((s: any, i: number) => ({
      id: s.id || s.serviceId || `${data.serviceId || 'svc'}-${i}`,
      name: s.name || 'Layanan Barber',
      description: s.description,
      price: typeof s.price === 'number' ? s.price : resolvePrice(data),
      durationMinutes: s.durationMinutes,
    }));
  }

  if (serviceDoc) {
    return [
      {
        id: data.serviceId || '',
        name: serviceDoc.name || data.serviceName || 'Layanan Barber',
        description: serviceDoc.description,
        price: typeof serviceDoc.price === 'number' ? serviceDoc.price : resolvePrice(data),
        durationMinutes: serviceDoc.durationMinutes,
      },
    ];
  }

  return [
    {
      id: data.serviceId || '',
      name: data.serviceName || 'Layanan Barber',
      price: resolvePrice(data),
    },
  ];
}

function resolveBarberIdentity(barberDoc: Record<string, any> | undefined) {
  const name = barberDoc?.shopName || barberDoc?.businessName || barberDoc?.displayName || barberDoc?.name || 'Barber URBarber';
  const address = barberDoc?.shopAddress || barberDoc?.address || '';
  const imageUrl = barberDoc?.shopImageUrl || barberDoc?.profileImageUrl || '';
  const rating = typeof barberDoc?.ratingAverage === 'number' ? barberDoc.ratingAverage.toFixed(1) : '';
  return { name, address, imageUrl, rating };
}

export function mapRawBookingToDomain(
  id: string,
  data: Record<string, any>,
  barberDoc: Record<string, any> | undefined,
  serviceDoc: Record<string, any> | undefined
): Booking {
  const identity = resolveBarberIdentity(barberDoc);
  const price = resolvePrice(data);

  return {
    id,
    barberId: data.barberId || '',
    customerId: data.customerId || '',
    shopId: data.barberId || '',
    shop: {
      id: data.barberId || '',
      name: identity.name,
      location: identity.address,
      distance: '',
      rating: identity.rating,
      imageUrl: identity.imageUrl,
      address: identity.address,
    },
    barber: {
      id: data.barberId || '',
      name: identity.name,
      specialization: '',
    },
    services: resolveServices(data, serviceDoc),
    status: mapLegacyBookingStatus(data.status),
    paymentStatus: data.paymentStatus,
    bookingType: 'onsite',
    serviceLocationType: data.serviceLocationType,
    serviceAddress: data.address,
    scheduledAt: resolveDate(data),
    scheduledTime: resolveTime(data),
    totalPrice: price,
    subtotal: price,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  } as Booking;
}
