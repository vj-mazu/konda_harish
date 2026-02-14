const { sequelize } = require('./config/database');
const User = require('./models/User');

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'isActive'],
      order: [['role', 'ASC'], ['username', 'ASC']]
    });

    console.log('\n=== ALL USERS IN DATABASE ===\n');
    
    if (users.length === 0) {
      console.log('No users found in database.');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id} | Username: ${user.username} | Role: ${user.role} | Active: ${user.isActive}`);
      });
    }

    console.log('\n=== USERS BY ROLE ===\n');
    const roleGroups = {};
    users.forEach(user => {
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = [];
      }
      roleGroups[user.role].push(user.username);
    });

    Object.keys(roleGroups).sort().forEach(role => {
      console.log(`${role}: ${roleGroups[role].join(', ')}`);
    });

    console.log('\n=== PHYSICAL SUPERVISORS (for Assigning Supervisor page) ===\n');
    const physicalSupervisors = users.filter(u => u.role === 'physical_supervisor' && u.isActive);
    if (physicalSupervisors.length === 0) {
      console.log('⚠️  NO PHYSICAL SUPERVISORS FOUND!');
      console.log('You need to create users with role "physical_supervisor" for the Assigning Supervisor page to work.');
    } else {
      physicalSupervisors.forEach(user => {
        console.log(`✓ ${user.username} (ID: ${user.id})`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
