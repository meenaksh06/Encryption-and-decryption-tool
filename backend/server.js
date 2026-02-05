const express = require("express");

const app = express();
app.use(express.json());

app.post("/test", (req, res) => {
  console.log("Hit /test");
  res.status(200).json({ message: "Server works" });
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
