const { MongoClient } = require('./node_modules/mongodb');
const bcrypt = require('./node_modules/bcryptjs');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const uri = process.env.MONGODB_URI || 'mongodb+srv://kyra_admin:1848jdHElZ2MHrTW@clustersujayn.kr7yk55.mongodb.net/kyra';
const identifier = process.argv[2];
const newPassword = process.argv[3];

if (!identifier || !newPassword) {
  console.log('Usage: node reset_password.js <username_or_email> <new_password>');
  console.log('Example: node reset_password.js Adminkyra MyNewPass123');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('Error: New password must be at least 6 characters long.');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    let targetEmail = identifier.toLowerCase();
    if (!targetEmail.includes('@')) {
      targetEmail = targetEmail + '@kyragroup.com';
    }

    const user = await db.collection('users').findOne({
      $or: [
        { username: { $regex: new RegExp('^' + identifier + '$', 'i') } },
        { email: { $regex: new RegExp('^' + targetEmail + '$', 'i') } },
        { email: { $regex: new RegExp('^' + identifier + '$', 'i') } },
      ],
    });

    if (!user) {
      console.error('Error: User not found with identifier: ' + identifier);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: hashedPassword,
          updated_at: new Date().toISOString(),
        },
      }
    );

    console.log('✅ SUCCESS: Password updated successfully for user ' + user.username + ' (' + user.email + ')');
  } catch (err) {
    console.error('Database error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();


