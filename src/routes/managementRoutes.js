const express = require("express");
const controller = require("../controllers/managementController");

const router = express.Router();

router.get("/dashboard", controller.getDashboard);
router.get("/attendance", controller.getAttendance);
router.put("/attendance", controller.upsertAttendance);
router.get("/schedules", controller.getSchedules);
router.get("/notes", controller.getNotes);
router.post("/notes", controller.createNote);
router.put("/notes/:id", controller.updateNote);
router.delete("/notes/:id", controller.deleteNote);

module.exports = router;
