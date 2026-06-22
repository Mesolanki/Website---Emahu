const mongoose = require('mongoose');
const User = require('./models/User');

async function approveDeliveryPartners() {
  await mongoose.connect('mongodb://localhost:27017/emahu');
  const result = await User.updateMany(
    { role: 'delivery', status: 'pending' },
    { $set: { status: 'approved', isActivePartner: true } }
  );
  console.log('Updated delivery partners (pending -> approved):', result.modifiedCount);
  
  // Show all delivery partners
  const partners = await User.find({ role: 'delivery' }, { name: 1, status: 1, isActivePartner: 1, city: 1, currentCity: 1, coveredCities: 1 });
  console.log('\nAll delivery partners in DB:');
  partners.forEach(p => {
    console.log(JSON.stringify({
      name: p.name,
      status: p.status,
      isActive: p.isActivePartner,
      city: p.city,
      currentCity: p.currentCity,
      coveredCities: p.coveredCities
    }));
  });
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

approveDeliveryPartners().catch(console.error);
