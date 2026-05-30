/**
 * Seed Script — Creates demo users for MediVault
 *
 * Demo Credentials (same password for both):
 *   Patient:  shubh.patient@medivault.com  /  Shubh@1111
 *   Doctor:   shubh.doctor@medivault.com   /  Shubh@1111
 *
 * Run:  npm run seed   (or:  node seed.js)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

const DEMO_USERS = [
  {
    firstName: 'Shubh',
    lastName: 'Verma',
    email: 'shubh.patient@medivault.com',
    password: 'Shubh@1111',
    role: 'patient',
    phone: '+91 98765 43210',
    gender: 'male',
    bloodGroup: 'O+',
    dateOfBirth: new Date('2000-01-15'),
    emergencyContact: {
      name: 'Emergency Contact',
      phone: '+91 91234 56789',
      relationship: 'Family',
    },
    isActive: true,
  },
  {
    firstName: 'Shubh',
    lastName: 'Verma',
    email: 'shubh.doctor@medivault.com',
    password: 'Shubh@1111',
    role: 'doctor',
    phone: '+91 98765 43211',
    gender: 'male',
    specialization: 'General Medicine',
    licenseNumber: 'MCI-2026-SV001',
    hospital: 'MediVault City Hospital',
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const userData of DEMO_USERS) {
      const exists = await User.findOne({ email: userData.email });
      if (exists) {
        console.log(`⏭️  User already exists: ${userData.email} (${userData.role})`);
        continue;
      }
      await User.create(userData);
      console.log(`✅ Created ${userData.role}: ${userData.firstName} ${userData.lastName} <${userData.email}>`);
    }

    console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║              🏥 Demo Accounts Seeded!                   ║
  ╠══════════════════════════════════════════════════════════╣
  ║  👤 Patient Login                                       ║
  ║     Email:    shubh.patient@medivault.com                ║
  ║     Password: Shubh@1111                                ║
  ║                                                          ║
  ║  🩺 Doctor Login                                         ║
  ║     Email:    shubh.doctor@medivault.com                 ║
  ║     Password: Shubh@1111                                ║
  ╚══════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
