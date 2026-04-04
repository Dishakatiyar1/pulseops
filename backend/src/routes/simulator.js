const express = require("express");
const { startSim, stopSim, resetSim } = require("../services/simulatorService");

const router = express.Router();
router.post("/start", startSim);
router.post("/stop", stopSim);
router.post("/reset", resetSim);

module.exports = router;
