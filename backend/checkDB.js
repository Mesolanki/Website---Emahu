const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    const Product = require('./models/Product');
    const products = await Product.find().sort({ createdAt: -1 }).limit(10);
    console.log("=== DB PRODUCTS ===");
    products.forEach(p => {
      console.log({
        id: p._id,
        name: p.name,
        approvalStatus: p.approvalStatus,
        imageType: typeof p.image,
        imageVal: p.image ? p.image.substring(0, 80) + '...' : null,
        startsWithHttp: p.image?.startsWith('http'),
        startsWithData: p.image?.startsWith('data:image')
      });
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
