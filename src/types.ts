export interface Plot {
  id: string;
  plotNumber: string;
  area: number; // in SQ.M e.g. 450, 520
  price: number; // e.g. 45000, 60000
  status: 'available' | 'booked' | 'ongoing' | 'sold';
  facing: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West';
  coordinates: {
    x: number; // x position in master layout
    y: number; // 2D layout y position (for 3D layout, we map x and z)
    z: number; // z height or depth coordinate
    width: number; // width size of parcel
    depth: number; // depth size of parcel
  };
  points?: { x: number; y: number }[]; // custom geometry polygon vertices
  cornerRadius?: number | number[]; // plot corner rounding radius (single value or array mapping to each vertex)
  location: string; // e.g. Sector-A, Block-1, Premium Avenue
  roadWidth: number; // e.g. 30, 45, 60 feet
  description?: string;
}

export interface Booking {
  id: string;
  plotId: string;
  plotNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  pricePaid: number;
  notes?: string;
}

export interface PlotFilter {
  search: string;
  status: 'all' | 'available' | 'booked' | 'ongoing' | 'sold';
  minArea: number;
  maxArea: number;
  minPrice: number;
  maxPrice: number;
  facing: string;
  showRed: boolean;
  showGreen: boolean;
  showBlue: boolean;
}
