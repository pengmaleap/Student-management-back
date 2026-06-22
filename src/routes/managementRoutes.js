const express = require("express");
const controller = require("../controllers/managementController");

const router = express.Router();

router.post("/daily/initialize", controller.initializeDailyData);
router.get("/classes", controller.getClasses);
router.get("/dashboard", controller.getDashboard);
router.get("/attendance", controller.getAttendance);
router.put("/attendance", controller.upsertAttendance);
router.get("/schedules", controller.getSchedules);
router.get("/note-types", controller.getNoteTypes);
router.get("/notes", controller.getNotes);
router.post("/notes", controller.createNote);
router.put("/notes/:id", controller.updateNote);
router.delete("/notes/:id", controller.deleteNote);

module.exports = router;
