// add_events.js
const db = require('./db');

const events = [
  {
    title: 'AI & Machine Learning Summit 2025',
    description: 'Explore the latest advancements in artificial intelligence and machine learning with industry experts. Learn about neural networks, deep learning, and practical AI applications in business.',
    event_date: '2025-11-20 10:00:00',
    venue: 'Tech Innovation Center',
    capacity: 300,
    fee: 2000.00
  },
  {
    title: 'Digital Marketing Masterclass',
    description: 'Master the art of digital marketing with hands-on workshops covering SEO, social media marketing, content strategy, and analytics to boost your online presence.',
    event_date: '2025-10-25 14:00:00',
    venue: 'Business Hub Conference Room',
    capacity: 150,
    fee: 800.00
  },
  {
    title: 'Blockchain & Cryptocurrency Workshop',
    description: 'Dive deep into blockchain technology, cryptocurrency trading, NFTs, and decentralized finance (DeFi) with practical examples and live trading sessions.',
    event_date: '2025-12-05 09:00:00',
    venue: 'Financial District Auditorium',
    capacity: 200,
    fee: 1500.00
  },
  {
    title: 'Photography Masterclass',
    description: 'Learn professional photography techniques, lighting, composition, and post-processing. Includes outdoor shooting session and portfolio review.',
    event_date: '2025-11-10 08:00:00',
    venue: 'Art Gallery Studio',
    capacity: 50,
    fee: 1200.00
  },
  {
    title: 'Entrepreneurship Bootcamp',
    description: 'Transform your business ideas into reality with this intensive bootcamp covering business planning, funding, marketing, and scaling strategies.',
    event_date: '2025-10-28 09:30:00',
    venue: 'Startup Incubator Space',
    capacity: 100,
    fee: 2500.00
  },
  {
    title: 'Web Development Workshop',
    description: 'Build modern web applications using React, Node.js, and MongoDB. Includes hands-on coding sessions and deployment techniques.',
    event_date: '2025-11-18 10:00:00',
    venue: 'Coding Academy Lab',
    capacity: 80,
    fee: 1800.00
  },
  {
    title: 'Yoga & Wellness Retreat',
    description: 'Rejuvenate your mind and body with yoga sessions, meditation, healthy cooking workshops, and wellness consultations in a serene environment.',
    event_date: '2025-12-15 07:00:00',
    venue: 'Serenity Wellness Center',
    capacity: 40,
    fee: 800.00
  },
  {
    title: 'Gaming Tournament Championship',
    description: 'Compete in various gaming tournaments including FIFA, Counter-Strike, and mobile gaming championships with cash prizes and trophies.',
    event_date: '2025-11-25 11:00:00',
    venue: 'Gaming Arena Complex',
    capacity: 500,
    fee: 300.00
  },
  {
    title: 'Sustainable Living Workshop',
    description: 'Learn practical ways to live sustainably, reduce carbon footprint, organic gardening, waste management, and eco-friendly lifestyle choices.',
    event_date: '2025-12-08 13:00:00',
    venue: 'Environmental Education Center',
    capacity: 75,
    fee: 0.00
  },
  {
    title: 'Stand-up Comedy Night',
    description: 'Enjoy an evening of laughter with top comedians performing live stand-up comedy. Open mic session for aspiring comedians included.',
    event_date: '2025-11-30 19:00:00',
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