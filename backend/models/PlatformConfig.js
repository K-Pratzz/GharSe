const mongoose = require('mongoose');

// Singleton document holding platform-wide settings.
const platformConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'singleton', unique: true },
    commissionPercent: { type: Number, default: 15 },
  },
  { timestamps: true }
);

platformConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: 'singleton' });
  if (!config) {
    config = await this.create({
      key: 'singleton',
      commissionPercent: Number(process.env.DEFAULT_COMMISSION_PERCENT) || 15,
    });
  }
  return config;
};

module.exports = mongoose.model('PlatformConfig', platformConfigSchema);
