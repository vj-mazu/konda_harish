const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createDefaultUsers = async () => {
  try {
    // Check if any admin user exists
    const adminCount = await User.count({ where: { role: 'admin' } });
    
    if (adminCount === 0) {
      console.log('🔄 No admin user found. Creating default admin...');
      
      // Create default admin user
      await User.create({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        isActive: true
      });
      
      console.log('✅ Default admin user created successfully');
      console.log('═══════════════════════════════════════════');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('═══════════════════════════════════════════');
      console.log('⚠️  IMPORTANT: Change this password after first login!');
    } else {
      console.log('👥 Admin user already exists');
    }

    // Check if other default users exist
    const userCount = await User.count();
    if (userCount === 1) {
      // Only admin exists, create other default users
      console.log('🔄 Creating additional default users...');
      
      const defaultUsers = [
        {
          username: 'staff',
          password: await bcrypt.hash('staff123', 10),
          role: 'staff',
          isActive: true
        },
        {
          username: 'manager',
          password: await bcrypt.hash('manager123', 10),
          role: 'manager',
          isActive: true
        }
      ];

      await User.bulkCreate(defaultUsers);
      console.log('✅ Additional default users created');
      console.log('👤 Staff: username=staff, password=staff123');
      console.log('👤 Manager: username=manager, password=manager123');
    }
  } catch (error) {
    console.error('❌ Error creating default users:', error.message);
  }
};

module.exports = createDefaultUsers;