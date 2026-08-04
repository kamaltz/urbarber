/**
 * Mock Booking Data
 */

import { Bank, Booking, BookingReview, Service, TimeSlot } from '../types/booking';

export const MOCK_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Potongan Rambut Biasa',
    description: 'Potongan Rambut & Vitamin',
    price: 30000,
    durationMinutes: 30,
  },
  {
    id: '2',
    name: 'Pijat Ekstra',
    description: 'Pijat Ekstra',
    price: 15000,
    durationMinutes: 20,
  },
  {
    id: '3',
    name: 'Anak-anak',
    description: 'Potongan khusus anak-anak',
    price: 20000,
    durationMinutes: 25,
  },
  {
    id: '4',
    name: 'Warnai Rambut',
    description: 'Pewarnaan rambut profesional',
    price: 200000,
    durationMinutes: 60,
  },
];

export const MOCK_TIME_SLOTS: TimeSlot[] = [
  { id: '1', time: '08:00', available: true },
  { id: '2', time: '08:30', available: true },
  { id: '3', time: '09:00', available: false },
  { id: '4', time: '09:30', available: true },
  { id: '5', time: '10:00', available: true },
  { id: '6', time: '10:30', available: true },
  { id: '7', time: '11:30', available: true },
  { id: '8', time: '13:00', available: true },
  { id: '9', time: '15:30', available: true },
  { id: '10', time: '16:00', available: true },
  { id: '11', time: '17:00', available: true },
  { id: '12', time: '17:30', available: false },
];

export const MOCK_BANKS: Bank[] = [
  { id: '1', code: 'BCA', name: 'Bank Central Asia (BCA)' },
  { id: '2', code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)' },
  { id: '3', code: 'BNI', name: 'Bank Negara Indonesia (BNI)' },
  { id: '4', code: 'MANDIRI', name: 'Bank Mandiri (Mandiri)' },
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'BOOK001',
    barberId: 'BARBER001',
    customerId: 'CUST001',
    shopId: 'SHOP001',
    shop: {
      id: 'SHOP001',
      name: 'Master Piece Barbershop',
      location: 'Garut Expo Center (2 km)',
      distance: '2 km',
      rating: '5.0',
      imageUrl: 'https://via.placeholder.com/150',
      address: 'Jl. Pendidikan No. 1, Garut',
    },
    barber: {
      id: 'BARBER001',
      name: 'Yandi Maulana',
      specialization: 'Spesialis Potongan Rambut',
      profileUrl: 'https://via.placeholder.com/50',
    },
    services: [
      {
        id: '1',
        name: 'Potongan Rambut Biasa',
        description: 'Potongan Rambut & Vitamin',
        price: 30000,
        durationMinutes: 30,
      },
      {
        id: '2',
        name: 'Pijat Ekstra',
        description: 'Pijat Ekstra',
        price: 15000,
        durationMinutes: 20,
      },
    ],
    status: 'booked',
    bookingType: 'onsite',
    scheduledAt: '2024-01-17',
    scheduledTime: '08:00',
    totalPrice: 45000,
    subtotal: 45000,
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
  {
    id: 'BOOK002',
    barberId: 'BARBER002',
    customerId: 'CUST001',
    shopId: 'SHOP001',
    shop: {
      id: 'SHOP001',
      name: 'Master Piece Barbershop',
      location: 'Garut Expo Center (2 km)',
      distance: '2 km',
      rating: '5.0',
      imageUrl: 'https://via.placeholder.com/150',
    },
    barber: {
      id: 'BARBER002',
      name: 'Ahmad Sudrajat',
      specialization: 'Spesialis Cukur Profesional',
      profileUrl: 'https://via.placeholder.com/50',
    },
    services: [
      {
        id: '1',
        name: 'Potongan Rambut Biasa',
        description: 'Potongan Rambut & Vitamin',
        price: 30000,
        durationMinutes: 30,
      },
    ],
    status: 'finished',
    bookingType: 'home',
    scheduledAt: '2024-01-10',
    scheduledTime: '10:00',
    totalPrice: 30000,
    subtotal: 30000,
    createdAt: '2024-01-09T14:00:00Z',
    updatedAt: '2024-01-10T10:30:00Z',
  },
  {
    id: 'BOOK003',
    barberId: 'BARBER001',
    customerId: 'CUST001',
    shopId: 'SHOP001',
    shop: {
      id: 'SHOP001',
      name: 'Master Piece Barbershop',
      location: 'Garut Expo Center (2 km)',
      distance: '2 km',
      rating: '5.0',
      imageUrl: 'https://via.placeholder.com/150',
    },
    barber: {
      id: 'BARBER001',
      name: 'Yandi Maulana',
      specialization: 'Spesialis Potongan Rambut',
      profileUrl: 'https://via.placeholder.com/50',
    },
    services: [
      {
        id: '4',
        name: 'Warnai Rambut',
        description: 'Pewarnaan rambut profesional',
        price: 200000,
        durationMinutes: 60,
      },
    ],
    status: 'cancelled',
    bookingType: 'onsite',
    scheduledAt: '2024-01-15',
    scheduledTime: '14:00',
    totalPrice: 200000,
    subtotal: 200000,
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T15:00:00Z',
  },
];

export const MOCK_REVIEWS: BookingReview[] = [
  {
    id: 'REVIEW001',
    bookingId: 'BOOK002',
    customerId: 'CUST001',
    rating: 5,
    reviewText: 'Pelayanan sangat memuaskan! Barber profesional dan ramah.',
    tags: ['Profesional', 'Ramah', 'Rapi'],
    createdAt: '2024-01-10T11:00:00Z',
  },
];
