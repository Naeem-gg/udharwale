const mongoose = require('mongoose');

async function wipe() {
  
  if (!process.env.MONGODB_URI) {
    console.error("No MONGODB_URI found");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.collection('contacts').deleteMany({});
  console.log("Wiped all contacts.");
  process.exit(0);
}
wipe();
