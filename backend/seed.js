const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Review = require('./models/Review');
const User = require('./models/User');
dotenv.config();

const products = [
  {
    name: 'Pahari Red Lady Papaya, Katimon, Dragon, Amra & Guava Combo',
    nameBn: 'পাহাড়ি রেড লেডি পেঁপে কম্বো',
    category: 'Combo',
    description: 'Pre-order combo package with premium garden-fresh fruits.',
    price: 990, maxPrice: 4540,
    images: ['https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600'],
    deliveryEstimate: '3-5 October',
    isPreOrder: true, isFeatured: true
  },
  {
    name: 'Katimon, Dragon & Guava Combo Package',
    nameBn: 'কাটিমন, ড্রাগন ও পেয়ারা কম্বো',
    category: 'Combo',
    description: '5/10/20 Kg package available.',
    price: 1390, maxPrice: 5560,
    weightOptions: ['5kg', '10kg', '20kg'],
    images: ['https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600'],
    deliveryEstimate: '3-4 Days', isFeatured: true
  },
  {
    name: 'Homemade Mango & Boroi Laddu Pickle Combo',
    nameBn: 'লাড্ডু আচার কম্বো',
    category: 'Pickle',
    description: 'Homemade, Safe & Tasty.',
    price: 1180,
    images: ['https://images.unsplash.com/photo-1599909533143-5b62e7a5c66b?w=600'],
    deliveryEstimate: '3-4 Days', isFeatured: true
  },
  {
    name: 'Homemade Mango Laddu Pickle',
    nameBn: 'আমের লাড্ডু আচার',
    category: 'Pickle',
    description: 'Homemade, Safe & Tasty.',
    price: 620, maxPrice: 1180,
    images: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600'],
    deliveryEstimate: '3-4 Days', isFeatured: true
  },
  {
    name: 'Premium Himsagar Mango',
    nameBn: 'প্রিমিয়াম হিমসাগর আম',
    category: 'Mango',
    description: 'Sweet & delicious mangoes straight from orchard.',
    price: 1500, maxPrice: 3500,
    weightOptions: ['5kg', '10kg', '20kg'],
    images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?w=600'],
    deliveryEstimate: '42-72H', isFeatured: true
  },
  {
    name: 'Fresh Dragon Fruit',
    nameBn: 'ড্রাগন ফল',
    category: 'Dragon Fruit',
    description: 'Fresh & healthy dragon fruit.',
    price: 800, maxPrice: 1400,
    images: ['https://images.unsplash.com/photo-1527325678964-54921661f888?w=600'],
    deliveryEstimate: '3-4 Days'
  },
  {
    name: 'Premium Amra (আমড়া)',
    nameBn: 'প্রিমিয়াম আমড়া',
    category: 'Amra',
    description: 'Fresh Amra from registered gardens.',
    price: 350, maxPrice: 700,
    images: ['https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600'],
    deliveryEstimate: '3-4 Days'
  },
  {
    name: 'Premium Dates (খেজুর)',
    nameBn: 'প্রিমিয়াম খেজুর',
    category: 'Dates',
    description: 'Premium quality dates.',
    price: 1200, maxPrice: 2400,
    images: ['https://images.unsplash.com/photo-1593904306894-8f1c1c1c1c1c?w=600'],
    deliveryEstimate: '3-4 Days'
  }
];

const reviews = [
  { customerName: 'Minhaz A. Haque', rating: 5, comment: 'Excellent quality mangoes! Highly recommended.', isApproved: true },
  { customerName: 'Rahim Uddin', rating: 5, comment: 'ডেলিভারি খুব দ্রুত, ফল একদম তাজা।', isApproved: true },
  { customerName: 'Sadia Islam', rating: 4, comment: 'Premium packaging, loved it!', isApproved: true }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected for seeding...');

    await Product.deleteMany({});
    await Review.deleteMany({});
    await User.deleteMany({});

    await Product.insertMany(products);
    await Review.insertMany(reviews);

    // Admin user
    await User.create({
      name: 'Admin',
      email: 'admin@premiumfruits.com',
      password: 'admin123',
      role: 'admin'
    });

    console.log('✅ Seeded!');
    console.log('👤 Admin: admin@premiumfruits.com / admin123');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();