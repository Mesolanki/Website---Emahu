const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./models/User');
const Product = require('./models/Product');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find({});
  console.log('Migrating products, total:', products.length);
  const uploadsDir = path.join(__dirname, 'uploads');

  let updatedCount = 0;

  for (const p of products) {
    let updated = false;

    // Check main image
    if (p.image && (p.image.startsWith('/uploads/') || p.image.startsWith('uploads/'))) {
      const filename = path.basename(p.image);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase().replace('.', '') || 'jpeg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const buf = fs.readFileSync(filePath);
        p.image = `data:${mime};base64,${buf.toString('base64')}`;
        updated = true;
        console.log('Converted main image for:', p.name, '(', filename, ')');
      }
    }

    // Check gallery images
    if (Array.isArray(p.images) && p.images.length > 0) {
      const newImages = p.images.map(img => {
        if (img && (img.startsWith('/uploads/') || img.startsWith('uploads/'))) {
          const filename = path.basename(img);
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filename).toLowerCase().replace('.', '') || 'jpeg';
            const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            const buf = fs.readFileSync(filePath);
            updated = true;
            return `data:${mime};base64,${buf.toString('base64')}`;
          }
        }
        return img;
      });
      p.images = newImages;
    }

    if (updated) {
      await p.save();
      updatedCount++;
      console.log('Successfully saved to DB:', p.name, p._id.toString());
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} products.`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
