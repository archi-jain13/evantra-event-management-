/**
 * Universal Event CSV Importer for Evantra (DBMS Project)
 * Supports importing events from Eventbrite, Kaggle, Meetup, or custom CSV files.
 * Works with both SQLite (event_db.sqlite) and MySQL.
 * 
 * Usage:
 *   node import_csv.js <path-to-csv>
 * 
 * Example:
 *   node import_csv.js eventbrite_real_events.csv
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

// Simple zero-dependency CSV parser that handles commas inside quotes
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  function parseLine(line) {
    const row = [];
    let insideQuote = false;
    let field = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (insideQuote && line[i + 1] === char) {
          field += char;
          i++; // Skip escaped quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field.trim());
    return row;
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 1 && values[0] === '') continue;
    const item = {};
    headers.forEach((h, index) => {
      item[h] = values[index] !== undefined ? values[index] : '';
    });
    records.push(item);
  }

  return records;
}

// Map various CSV header aliases to standard Evantra event schema
function mapToEventSchema(row, index) {
  // Title detection (supports Kaggle Seattle events, Eventbrite, Meetup, etc.)
  const rawTitle = row.name_of_event || row.event_name || row.title || row.name || row.event_title || row.summary;
  const title = (rawTitle && rawTitle.trim()) ? rawTitle.trim() : `Global Event #${index + 1}`;
  
  // Venue detection
  const venueParts = [];
  if (row.event_location___park && row.event_location___park.trim()) venueParts.push(row.event_location___park.trim());
  if (row.event_location___neighborhood && row.event_location___neighborhood.trim()) venueParts.push(row.event_location___neighborhood.trim());
  const rawVenue = venueParts.length > 0 
    ? venueParts.join(', ') 
    : (row.venue || row.venue_name || row.location || row.address || row.city || row.place || 'Civic Center & City Hall Plaza');
  const venue = rawVenue.slice(0, 255);
  
  // Description detection
  let description = row.description || row.desc || row.overview || row.details || row.about;
  if (!description) {
    const org = row.organization || 'City Events Community';
    const cat = row.event_category || 'Special Event';
    const sub = row.event_sub_category ? ` (${row.event_sub_category})` : '';
    description = `Official event organized by ${org}. Category: ${cat}${sub}. Open to participants with live programs and community exhibitions.`;
  }

  // Capacity / Attendance detection
  let capacity = parseInt(row.attendance || row.capacity || row.max_attendees || row.seats || row.attendees || 250, 10);
  if (isNaN(capacity) || capacity <= 0) capacity = 250;

  // Fee / Price detection
  let fee = 0.00;
  if (row.fee || row.price || row.ticket_price || row.cost) {
    fee = parseFloat((row.fee || row.price || row.ticket_price || row.cost || '0').replace(/[^0-9.]/g, ''));
    if (isNaN(fee)) fee = 0.00;
  } else if (row.event_category && row.event_category.toLowerCase().includes('commercial')) {
    fee = 350.00;
  } else if (row.event_category && row.event_category.toLowerCase().includes('athletic')) {
    fee = 200.00;
  }

  // Date parsing & ensuring future date
  let eventDate = null;
  const rawDate = row.event_start_date || row.event_date || row.start_time || row.date || row.start_date || row.datetime;
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      eventDate = parsed;
    }
  }

  // Shift to upcoming dates between 2 and 60 days ahead
  const daysOffset = (index % 60) + 2;
  const targetDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
  targetDate.setHours(9 + (index % 10), (index % 4) * 15, 0, 0); // 9:00 AM - 6:45 PM
  const dateStr = targetDate.toISOString().replace('T', ' ').substring(0, 19);

  return {
    title: title.slice(0, 150),
    description,
    event_date: dateStr,
    venue,
    capacity,
    fee
  };
}

async function runImport() {
  const csvFileName = process.argv[2] || 'eventbrite_real_events.csv';
  const csvPath = path.isAbsolute(csvFileName) ? csvFileName : path.join(__dirname, csvFileName);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    console.log('\n💡 Usage: node import_csv.js <path-to-file.csv>');
    process.exit(1);
  }

  console.log(`📖 Reading CSV file: ${path.basename(csvPath)}...`);
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(content);

  if (rows.length === 0) {
    console.error('❌ CSV file is empty or could not be parsed.');
    process.exit(1);
  }

  console.log(`📊 Found ${rows.length} rows in CSV.`);
  console.log('🔄 Connecting to Evantra database...');

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const event = mapToEventSchema(rows[i], i);

    try {
      const existing = await db.query('SELECT event_id FROM events WHERE title = ?', [event.title]);
      
      if (!existing || existing.length === 0) {
        await db.query(
          'INSERT INTO events (title, description, event_date, venue, capacity, fee) VALUES (?, ?, ?, ?, ?, ?)',
          [event.title, event.description, event.event_date, event.venue, event.capacity, event.fee]
        );
        insertedCount++;
        console.log(`  ✓ Inserted [${i + 1}/${rows.length}]: ${event.title}`);
      } else {
        await db.query(
          'UPDATE events SET description = ?, event_date = ?, venue = ?, capacity = ?, fee = ? WHERE event_id = ?',
          [event.description, event.event_date, event.venue, event.capacity, event.fee, existing[0].event_id]
        );
        updatedCount++;
        console.log(`  ↻ Updated [${i + 1}/${rows.length}]: ${event.title}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Row ${i + 1} skipped:`, err.message);
    }
  }

  console.log('\n=============================================');
  console.log(`🎉 Import completed successfully!`);
  console.log(`   ➕ New events inserted: ${insertedCount}`);
  console.log(`   🔄 Existing events updated: ${updatedCount}`);
  console.log(`   📁 Total processed: ${rows.length}`);
  console.log('=============================================\n');

  process.exit(0);
}

runImport().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
