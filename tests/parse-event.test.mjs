// Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEventText, splitBlocks } from '../public/assets/parse-event.js';
const CITIES = { pune: 'Pune', mumbai: 'Mumbai', bhopal: 'Bhopal', nashik: 'Nashik', nagpur: 'Nagpur', indore: 'Indore' };
const CATS = { festival: 'Festivals', garba: 'Garba & Dandiya', cultural: 'Cultural', market: 'Markets & Melas', music: 'Music & Concerts', workshop: 'Workshops' };
const P = t => parseEventText(t, { CITIES, CATS, today: '2026-10-11' }).draft;
const cases = [
  ['range with dash', 'Mega Dandiya Night 2026\n12-19 Oct, 7 PM onwards\nVenue: Kothrud Ground, Pune\nCouple Rs 999, Single Rs 499', { start_date: '2026-10-12', end_date: '2026-10-19', start_time: '7:00 PM', city: 'pune', category: 'garba' }],
  ['hinglish se', 'Garba Raas Utsav\n12 Oct se 19 Oct\nShaam 7 baje\nVenue: Baner, Pune', { start_date: '2026-10-12', end_date: '2026-10-19', city: 'pune', category: 'garba' }],
  ['shaam baje', 'Dandiya Raas\n14 Oct\nShaam 7 baje\nPune', { start_time: '7:00 PM' }],
  ['raat baje', 'Late night garba\n14 Oct, raat 10:30 baje\nPune', { start_time: '10:30 PM' }],
  ['subah baje', 'Yoga workshop\n15 Oct subah 6 baje\nPune', { start_time: '6:00 AM' }],
  ['hinglish tak', 'Diwali Mela 2026\n20 October se 24 October tak\nPune', { start_date: '2026-10-20', end_date: '2026-10-24', category: 'market' }],
  ['single date, 24h time', 'Classical Music Concert\n25 Oct 2026, 19:30\nVenue: Balgandharva Rangmandir, Pune\nTickets Rs 500', { start_date: '2026-10-25', start_time: '7:30 PM', price: '500', category: 'music' }],
  ['mumbai city', 'Stand-up comedy night\n3 Nov, 8 PM\nAndheri, Mumbai', { city: 'mumbai', start_date: '2026-11-03', category: 'cultural' }],
  ['year rolls to next year', 'Holi Utsav\n3 Mar\nPune', { start_date: '2027-03-03' }],
  ['dd/mm/yyyy', 'Craft workshop\n15/11/2026 at 11 AM\nPune', { start_date: '2026-11-15', category: 'workshop' }],
  ['price rupaye', 'Navratri Dandiya\n14 Oct\nEntry 300 rupaye\nPune', { start_date: '2026-10-14' }],
  ['venue label', 'Event: Sunburn Pune\nDate: 30 Oct\nLocation: Hinjewadi Phase 2\n', { title: 'Sunburn Pune', venue: 'Hinjewadi Phase 2' }],
  ['ticket link', 'Food Fest\n18 Oct\nPune\nBook: https://www.townscript.com/e/food-fest', { ticket_url: 'https://www.townscript.com/e/food-fest' }],
  ['organiser', 'Kala Utsav\n19 Oct, Pune\nOrganised by Kala Mandal, Pune', { organizer: 'Kala Mandal' }],
];
for (const [name, text, want] of cases) test(name, () => { const d = P(text); for (const [k, v] of Object.entries(want)) assert.equal(d[k], v, `${k}: got "${d[k]}"`); });
test('phone is never put in the draft fields', () => { const d = P('Garba night\n14 Oct\nPune\nCall 9876543210'); assert.ok(!JSON.stringify(d).includes('9876543210') || d.description.includes('9876543210')); assert.equal(d.price, ''); });
test('multi pass names', () => { const d = P('Dandiya\n14 Oct\nPune\nCouple Rs 999, Single Rs 499'); assert.deepEqual(d.passes.map(p => p.name + p.price), ['Couple999', 'Single499']); });
test('splitBlocks', () => { assert.equal(splitBlocks('Event one is here, long enough\n---\nEvent two is also long enough').length, 2); });
test('empty input does not crash', () => { assert.doesNotThrow(() => P('')); });
