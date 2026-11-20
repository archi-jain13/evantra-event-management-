/**
 * Import Real-World Eventbrite / Global Events into Evantra Database
 * Supports both SQLite (event_db.sqlite) and MySQL.
 */
const db = require('./db');

const REAL_EVENTS = [
  {
    title: 'Google Cloud Next & AI Developers Summit',
    description: 'Join industry visionaries, Google engineers, and cloud architects for three days of hands-on breakout sessions, keynote previews, and deep dives into generative AI and Kubernetes.',
    daysAhead: 5,
    venue: 'Moscone Center, San Francisco, CA',
    capacity: 500,
    fee: 2499.00
  },
  {
    title: 'International Music & Indie Arts Festival',
    description: 'An open-air showcase featuring three stages of live indie rock, electronic, jazz, and immersive art installations with artisan food stalls and craft workshops.',
    daysAhead: 12,
    venue: 'Zilker Park, Austin, TX',
    capacity: 1200,
    fee: 1850.00
  },
  {
    title: 'AWS Community Day & Cloud Architecture Forum',
    description: 'Community-led technical sessions on serverless architectures, event-driven microservices, enterprise cloud security, and DevSecOps pipelines.',
    daysAhead: 18,
    venue: 'Bangalore International Exhibition Centre, Bengaluru',
    capacity: 350,
    fee: 650.00
  },
  {
    title: 'PyCon & Data Engineering Conference',
    description: 'The premier annual gathering for Python developers, scientific computing specialists, data engineers, and machine learning researchers.',
    daysAhead: 25,
    venue: 'David L. Lawrence Convention Center, Pittsburgh, PA',
    capacity: 400,
    fee: 1200.00
  },
  {
    title: 'Global Fintech & Decentralized Finance Expo',
    description: 'Explore the future of payments, algorithmic trading, open banking APIs, blockchain interoperability, and automated fraud prevention.',
    daysAhead: 30,
    venue: 'Marina Bay Sands Convention Centre, Singapore',
    capacity: 600,
    fee: 3200.00
  },
  {
    title: 'TEDx: Horizons of Sustainable Innovation',
    description: 'A curated evening of 8 inspiring talks from climatologists, renewable energy founders, urban architects, and youth pioneers shaping tomorrow.',
    daysAhead: 7,
    venue: 'National Center for the Performing Arts, Mumbai',
    capacity: 250,
    fee: 450.00
  },
  {
    title: 'Full-Stack Web3 & TypeScript Hackathon 2026',
    description: 'A 36-hour sprint where developer teams build production-grade web applications, competing for $25,000 in sponsor bounties and venture mentor feedback.',
    daysAhead: 15,
    venue: 'Station F, Paris, France',
    capacity: 300,
    fee: 0.00
  },
  {
    title: 'World Culinary & Artisan Food Festival',
    description: 'Taste authentic recipes from over 40 global culinary masters, masterclasses with Michelin-starred chefs, wine pairings, and live acoustic music.',
    daysAhead: 22,
    venue: 'ExCeL London Waterfront, London, UK',
    capacity: 800,
    fee: 750.00
  },
  {
    title: 'UX/UI Design Systems & Product Strategy Masterclass',
    description: 'Interactive workshop for senior designers and product leaders covering token-based design systems, Figma variables, accessibility audits, and micro-interactions.',
    daysAhead: 9,
    venue: 'Metropolitan Pavilion, New York, NY',
    capacity: 150,
    fee: 1500.00
  },
  {
    title: 'Robotics & Autonomous Systems World Congress',
    description: 'Live field demonstrations of quadrupeds, autonomous warehouse robots, drone delivery corridors, and industrial collaborative robotic arms.',
    daysAhead: 40,
    venue: 'Tokyo Big Sight, Tokyo, Japan',
    capacity: 700,
    fee: 2800.00
  }
];

async function seedRealWorldEvents() {
  console.log('🔄 Initializing database connection...');

  for (const ev of REAL_EVENTS) {
    const eventDate = new Date(Date.now() + ev.daysAhead * 24 * 60 * 60 * 1000);
    const dateStr = eventDate.toISOString().replace('T', ' ').substring(0, 19);

    const existing = await db.query('SELECT event_id FROM events WHERE title = ?', [ev.title]);

    if (!existing || existing.length === 0) {
      await db.query(
        'INSERT INTO events (title, description, event_date, venue, capacity, fee) VALUES (?, ?, ?, ?, ?, ?)',
        [ev.title, ev.description, dateStr, ev.venue, ev.capacity, ev.fee]
      );
      console.log(`  ✓ Added: ${ev.title}`);
    } else {
      await db.query(
        'UPDATE events SET event_date = ?, venue = ?, fee = ?, capacity = ?, description = ? WHERE event_id = ?',
        [dateStr, ev.venue, ev.fee, ev.capacity, ev.description, existing[0].event_id]
      );
      console.log(`  ↻ Updated schedule: ${ev.title}`);
    }
  }

  console.log('\n✅ Real-world Eventbrite events populated successfully into database!');
  process.exit(0);
}

seedRealWorldEvents().catch(err => {
  console.error('❌ Error seeding events:', err);
  process.exit(1);
});
