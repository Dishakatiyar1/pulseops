const express = require("express");
const {
  getAllGyms,
  getGymLive,
  getOccupancy,
  getGymAnalytics,
} = require("../controllers/gymController");
const {
  getGymAnalytics: analytics,
} = require("../controllers/analyticsController");

const router = express.Router();

router.get("/", getAllGyms);
router.get("/:id/live", getGymLive);
router.get("/:id/analytics", analytics);
router.get("/:id/occupancy", getOccupancy); // legacy

module.exports = router;
