/**
 * Database Seeder
 * Run: node utils/seeder.js
 * Creates: 1 superadmin, 1 admin, 5 sample voters, 2 elections, candidates
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');

const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  await User.deleteMany({});
  await Election.deleteMany({});
  await Candidate.deleteMany({});

  // ── Create Superadmin ──
  const superadmin = await User.create({
    name: 'Super Administrator',
    email: 'superadmin@evote.gov.in',
    password: 'Admin@123',
    role: 'superadmin',
    isVerified: true,
    isActive: true,
  });
  console.log('✅ Superadmin:', superadmin.email, '/ Password: Admin@123');

  // ── Create Admin ──
  const admin = await User.create({
    name: 'Election Commissioner',
    email: 'gaurdivyansh2005@evote.gov.in',
    password: 'Divyansh@123',
    role: 'admin',
    isVerified: true,
    isActive: true,
  });
  console.log('✅ Admin:', admin.email, '/ Password: Divyansh@123');

  // ── Create Sample Voters ──
  const voterData = [
    { name: 'Rahul Kumar', email: 'rahul@example.com', password: 'Voter@123', phone: '9876543210' },
    { name: 'Priya Sharma', email: 'priya@example.com', password: 'Voter@123', phone: '9876543211' },
    { name: 'Amit Singh', email: 'amit@example.com', password: 'Voter@123', phone: '9876543212' },
  ];
  for (const v of voterData) {
    const voter = await User.create({ ...v, role: 'voter', isVerified: true });
    console.log('✅ Voter:', voter.email, '| Voter ID:', voter.voterId);
  }

  // ── Create Elections ──
  const now = new Date();
  const election1 = await Election.create({
    title: 'General Elections 2025 — Lok Sabha',
    description: 'The 18th General Elections of India for electing members to the Lok Sabha. Cast your vote to shape the future of our nation.',
    electionType: 'general',
    startDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Started 2h ago
    endDate: new Date(now.getTime() + 22 * 60 * 60 * 1000),   // Ends in 22h
    status: 'active',
    totalVoters: 500,
    constituency: 'National Capital Territory',
    region: 'Delhi',
    createdBy: admin._id,
  });

  const election2 = await Election.create({
    title: 'Delhi State Assembly Elections 2025',
    description: 'Elections for the 70 assembly constituencies of Delhi. Vote for your local representative.',
    electionType: 'state',
    startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Starts in 3 days
    endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
    status: 'upcoming',
    totalVoters: 300,
    constituency: 'New Delhi',
    region: 'Delhi',
    createdBy: admin._id,
  });

  console.log('\n✅ Elections created:', election1.title);
  console.log('✅ Elections created:', election2.title);

  // ── Create Candidates for Election 1 ──
  const candidatesData = [
    { name: 'Narendra Singh', party: 'Bharatiya Vikas Party', partyAbbreviation: 'BVP', partyColor: '#FF9933', age: 56, gender: 'Male', qualification: 'M.A. Political Science', occupation: 'Politician', manifesto: 'Focus on digital India, infrastructure development, and economic growth.', keyPolicies: ['Smart Cities', '5G Rollout', 'Manufacturing Hub', 'Clean Energy'], serialNumber: 1 },
    { name: 'Sonia Mehta', party: 'Indian Congress Alliance', partyAbbreviation: 'ICA', partyColor: '#138808', age: 51, gender: 'Female', qualification: 'LLB, Delhi University', occupation: 'Lawyer & Politician', manifesto: 'Inclusive growth, social welfare, education for all, and rural development.', keyPolicies: ['Free Education', 'MGNREGA Expansion', 'Women Empowerment', 'Healthcare for All'], serialNumber: 2 },
    { name: 'Arvind Yadav', party: 'Common Man Movement', partyAbbreviation: 'CMM', partyColor: '#0000FF', age: 48, gender: 'Male', qualification: 'IIT Delhi, B.Tech', occupation: 'Engineer & Activist', manifesto: 'Corruption-free governance, transparency, and citizen-centric policies.', keyPolicies: ['Anti-Corruption Drive', 'Free Wi-Fi', 'Water for All', 'Mohalla Clinics'], serialNumber: 3 },
    { name: 'Rajesh Patel', party: 'Independent', partyAbbreviation: 'IND', partyColor: '#888888', age: 44, gender: 'Male', qualification: 'MBA Finance', occupation: 'Businessman', manifesto: 'Local development, employment generation, and business-friendly environment.', keyPolicies: ['Start-up Fund', 'Local Jobs', 'Road Development', 'Youth Training'], serialNumber: 4 },
  ];

  for (const cd of candidatesData) {
    const c = await Candidate.create({ ...cd, election: election1._id, voteCount: Math.floor(Math.random() * 80) });
    election1.candidates.push(c._id);
    election1.totalVotesCast += c.voteCount;
  }
  await election1.save();

  // Candidates for Election 2
  const candidates2 = [
    { name: 'Sunita Verma', party: 'Bharatiya Vikas Party', partyAbbreviation: 'BVP', partyColor: '#FF9933', age: 43, gender: 'Female', manifesto: 'Women safety, education, healthcare.', keyPolicies: ['Safety Cameras', 'Girls Schools', 'Hospitals'], serialNumber: 1 },
    { name: 'Manish Gupta', party: 'Indian Congress Alliance', partyAbbreviation: 'ICA', partyColor: '#138808', age: 38, gender: 'Male', manifesto: 'Youth employment, cheap housing.', keyPolicies: ['Job Fair', 'Affordable Homes', 'Skill India'], serialNumber: 2 },
  ];
  for (const cd of candidates2) {
    const c = await Candidate.create({ ...cd, election: election2._id, voteCount: 0 });
    election2.candidates.push(c._id);
  }
  await election2.save();

  console.log('\n✅ Candidates seeded for both elections');
  console.log('\n🎉 Seeding complete!\n');
  console.log('─────────────────────────────────────');
  console.log('Login Credentials:');
  console.log('  Superadmin : superadmin@evote.gov.in / Admin@123');
  console.log('  Admin      : gaurdivyansh2005@evote.gov.in / Divyansh@123');
  console.log('─────────────────────────────────────\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
