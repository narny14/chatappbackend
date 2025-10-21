const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('chatdb', 'root', 'password', {
  host: 'containers-us-west-75.railway.app',
  dialect: 'mysql',
  port: 3306,
  logging: false,
});

module.exports = sequelize;
