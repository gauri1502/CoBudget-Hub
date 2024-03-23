const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
  },
  groupDescription: {
    type: String,
  },
  groupCurrency: {
    type: String,
    default: "INR",
  },
  groupOwner: {
    type: String,
    required: true,
  },
  groupMembers: {
    type: Array,
    required: true,
  },
  groupCategory: {
    type: String,
    default: "Others",
  },
  groupTotal: {
    type: Number,
    default: 0,
  },
  split: {
    type: Array,
  },
});

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
  },
  settleTo: {
    type: String,
    required: true,
  },
  settleFrom: {
    type: String,
    required: true,
  },
  settleDate: {
    type: String,
    required: true,
  },
  settleAmount: {
    type: Number,
    required: true,
  },
});

module.exports.Settlement = mongoose.model("Settlement", settlementSchema);

module.exports.Group = mongoose.model("Group", groupSchema);
