import type { Barber, BarberService } from "@/types/domain";

export const mockBarbers: Barber[] = [
  {
    id: "barber-001",
    userId: "user-barber-001",
    displayName: "Barber Dimas",
    description: "Barber home service dengan pengalaman lima tahun.",
    address: "Garut Kota",
    ratingAverage: 4.8,
    reviewCount: 124,
    verified: true,
    profileImageUrl: "https://images.unsplash.com/photo-placeholder",
  },
];

export const mockServices: BarberService[] = [
  {
    id: "service-001",
    barberId: "barber-001",
    name: "Haircut",
    description: "Potong rambut sesuai gaya pilihan pelanggan.",
    price: 35000,
    durationMinutes: 60,
    active: true,
  },
];