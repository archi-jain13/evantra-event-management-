const db = require('./db');

async function cleanTitles() {
  const events = await db.query('SELECT event_id, title FROM events');
  let cleaned = 0;

  for (const ev of events) {
    if (ev.title.includes(',S') || ev.title.includes(',CV')) {
      // Extract clean title before the permit code
      const cleanTitle = ev.title.split(/,S\d+|,CV\d+/)[0].trim();
      if (cleanTitle && cleanTitle !== ev.title) {
        await db.query('UPDATE events SET title = ? WHERE event_id = ?', [cleanTitle, ev.event_id]);
        cleaned++;
      }
    }
  }

  console.log(`Cleaned ${cleaned} event titles.`);
  process.exit(0);
}

cleanTitles();
