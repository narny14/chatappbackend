import { DataTypes } from "sequelize";
import { sequelize } from "./index.js";

export const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  profileImage: { type: DataTypes.STRING },
  fcmToken: { type: DataTypes.STRING },
});
