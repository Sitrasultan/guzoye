import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import { asyncHandler } from '../middleware/errors.js';

function csv(rows, columns) {
  const escape = value => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\ufeff' + [columns.map(column => escape(column.label)).join(','), ...rows.map(row => columns.map(column => escape(typeof column.value === 'function' ? column.value(row) : row[column.value])).join(','))].join('\n');
}
function send(res, filename, value) {
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
  res.send(value);
}
export const bookingsCsv = asyncHandler(async (req, res) => {
  const rows = await Booking.find({}).sort({ createdAt: -1 }).limit(10000).populate('user', 'name email').populate('tour', 'title').populate('guide').lean();
  send(res, 'guzoye-bookings.csv', csv(rows, [
    { label: 'Booking ID', value: '_id' }, { label: 'Created', value: 'createdAt' },
    { label: 'Traveler', value: row => row.user?.name || '' }, { label: 'Email', value: row => row.user?.email || '' },
    { label: 'Tour', value: row => row.tour?.title || '' }, { label: 'Departure', value: 'departureDate' },
    { label: 'Guests', value: 'guests' }, { label: 'Total USD', value: 'totalPrice' }, { label: 'Status', value: 'status' }
  ]));
});
export const guidesCsv = asyncHandler(async (req, res) => {
  const rows = await Guide.find({}).sort({ createdAt: -1 }).limit(10000).populate('user', 'name email').lean();
  send(res, 'guzoye-guides.csv', csv(rows, [
    { label: 'Guide ID', value: '_id' }, { label: 'Name', value: row => row.user?.name || '' },
    { label: 'Email', value: row => row.user?.email || '' }, { label: 'Status', value: 'status' },
    { label: 'Active', value: 'isActive' }, { label: 'Rating', value: 'rating' }, { label: 'Reviews', value: 'reviewCount' },
    { label: 'Languages', value: row => (row.languages || []).join('; ') }
  ]));
});
export const toursCsv = asyncHandler(async (req, res) => {
  const rows = await Tour.find({}).sort({ createdAt: -1 }).limit(10000).populate('destination', 'name').lean();
  send(res, 'guzoye-tours.csv', csv(rows, [
    { label: 'Tour ID', value: '_id' }, { label: 'Title', value: 'title' },
    { label: 'Destination', value: row => row.destination?.name || '' }, { label: 'Price USD', value: 'price' },
    { label: 'Duration days', value: 'duration' }, { label: 'Difficulty', value: 'difficulty' },
    { label: 'Status', value: row => row.status || (row.archived ? 'archived' : 'published') },
    { label: 'Assigned guides', value: row => (row.assignedGuides || []).length },
    { label: 'Future departures', value: row => (row.departures || []).filter(item => +new Date(item.date) > Date.now()).length }
  ]));
});
