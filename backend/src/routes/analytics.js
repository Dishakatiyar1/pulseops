const express = require("express");
const { getCrossGymRevenue } = require("../controllers/analyticsController");

const router = express.Router();
router.get("/cross-gym", getCrossGymRevenue);

module.exports = router;
