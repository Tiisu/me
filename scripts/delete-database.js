const mongoose = require('mongoose');
require('dotenv').config();

async function deleteDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the database name
    const dbName = mongoose.connection.db.databaseName;
    console.log(`Preparing to delete database: ${dbName}`);

    // Drop the database
    console.log('Dropping database...');
    await mongoose.connection.db.dropDatabase();
    console.log(`Database ${dbName} has been deleted successfully`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Error deleting database:', error);
    process.exit(1);
  }
}

// Run the function
deleteDatabase();
