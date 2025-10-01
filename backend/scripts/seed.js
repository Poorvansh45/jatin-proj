const mongoose = require('mongoose');
const Category = require('../models/Category');
require('dotenv').config();

const categories = [
  {
    name: "Programming",
    description: "Software development, coding, debugging",
    icon: "code"
  },
  {
    name: "Design",
    description: "UI/UX design, graphic design, web design",
    icon: "palette"
  },
  {
    name: "Mathematics",
    description: "Algebra, calculus, statistics, problem solving",
    icon: "calculator"
  },
  {
    name: "Languages",
    description: "Language learning, translation, conversation practice",
    icon: "globe"
  },
  {
    name: "Writing",
    description: "Content writing, editing, proofreading",
    icon: "pen"
  },
  {
    name: "Other",
    description: "Miscellaneous help requests",
    icon: "help"
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillwave';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️ Cleared existing categories');

    // Insert new categories
    const insertedCategories = await Category.insertMany(categories);
    console.log(`✅ Inserted ${insertedCategories.length} categories`);

    console.log('📋 Categories created:');
    insertedCategories.forEach(cat => {
      console.log(`  - ${cat.name}: ${cat.description}`);
    });

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase(); 