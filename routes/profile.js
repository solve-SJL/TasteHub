const express = require("express");
const router = express.Router();

router.get("/:userId", (req, res) => {
  res.render("profile.ejs", { user: req.user });
});

module.exports = router;
