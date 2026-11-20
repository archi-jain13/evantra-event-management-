// add_events.js
const db = require('./db');

// add_events.js
const db = require('./db');

function pad(n) { return String(n).padStart(2, '0'); }
function formatSql(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
function future(days, hour = 10, minute = 0) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  d.setHours(hour, minute, 0, 0);
  return formatSql(d);
}

const events = [
  {
    title: 'AI & Machine Learning Summit',
    description: 'Explore the latest advancements in artificial intelligence and machine learning with industry experts. Learn about neural networks, deep learning, and practical AI applications in business.',
    event_date: future(2, 10, 0),
    venue: 'Tech Innovation Center',
    capacity: 300,
    fee: 2000.00
  },
  {
    title: 'Digital Marketing Masterclass',
    description: 'Master the art of digital marketing with hands-on workshops covering SEO, social media marketing, content strategy, and analytics to boost your online presence.',
    event_date: future(4, 14, 0),
    venue: 'Business Hub Conference Room',
    capacity: 150,
    fee: 800.00
  },
  {
    title: 'Blockchain & Cryptocurrency Workshop',
    description: 'Dive deep into blockchain technology, cryptocurrency trading, NFTs, and decentralized finance (DeFi) with practical examples and live trading sessions.',
    event_date: future(7, 9, 0),
    venue: 'Financial District Auditorium',
    capacity: 200,
    fee: 1500.00
  },
  {
    title: 'Photography Masterclass',
    description: 'Learn professional photography techniques, lighting, composition, and post-processing. Includes outdoor shooting session and portfolio review.',
    event_date: future(10, 8, 30),
    venue: 'Art Gallery Studio',
    capacity: 50,
    fee: 1200.00
  },
  {
    title: 'Entrepreneurship Bootcamp',
    description: 'Transform your business ideas into reality with this intensive bootcamp covering business planning, funding, marketing, and scaling strategies.',
    event_date: future(13, 9, 30),
    venue: 'Startup Incubator Space',
    capacity: 100,
    fee: 2500.00
  },
  {
    title: 'Web Development Workshop',
    description: 'Build modern web applications using React, Node.js, and MongoDB. Includes hands-on coding sessions and deployment techniques.',
    event_date: future(16, 10, 0),
    venue: 'Coding Academy Lab',
    capacity: 80,
    fee: 1800.00
  },
  {
    title: 'Yoga & Wellness Retreat',
    description: 'Rejuvenate your mind and body with yoga sessions, meditation, healthy cooking workshops, and wellness consultations in a serene environment.',
    event_date: future(20, 7, 0),
    venue: 'Serenity Wellness Center',
    capacity: 40,
    fee: 800.00
  },
  {
    title: 'Gaming Tournament Championship',
    description: 'Compete in various gaming tournaments including FIFA, Counter-Strike, and mobile gaming championships with cash prizes and trophies.',
    event_date: future(24, 11, 0),
    venue: 'Gaming Arena Complex',
    capacity: 500,
    fee: 300.00
  },
  {
    title: 'Sustainable Living Workshop',
    description: 'Learn practical ways to live sustainably, reduce carbon footprint, organic gardening, waste management, and eco-friendly lifestyle choices.',
    event_date: future(28, 13, 0),
    venue: 'Environmental Education Center',
    capacity: 75,
    fee: 0.00
  },
  {
    title: 'Stand-up Comedy Night',
    description: 'Enjoy an evening of laughter with top comedians performing live stand-up comedy. Open mic session for aspiring comedians included.',
    event_date: future(32, 19, 0),
    venue: 'Comedy Club Downtown',
    capacity: 150,
    fee: 500.00
  }
];

async function addEvents() {
  try {
    console.log('Adding events to database...');
    
    for (const event of events) {
      await db.query(
        'INSERT INTO events (title, description, event_date, venue, capacity, fee) VALUES (?, ?, ?, ?, ?, ?)',
        [event.title, event.description, event.event_date, event.venue, event.capacity, event.fee]
      );
      console.log(`✅ Added: ${event.title}`);
    }
    
    console.log('\n🎉 Successfully added 10 new events!');
    console.log('You can now see all events at http://localhost:3000');
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding events:', error);
    process.exit(1);
  }
}

addEvents();