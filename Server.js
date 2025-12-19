import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import adminroute from "./Admindash.js";
import clubcoordinatorroute from "./Club_coordinator.js";
import studentroute from "./Student_dashbo.js";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URI;

mongoose.connect(url)
  .then(() => console.log("Database connected"))
  .catch(err => console.log("MongoDB error:", err));

// Routes
app.use("/api/admin", adminroute);
app.use("/api/faculty", adminroute); 
app.use("/api/student", studentroute);
app.use("/api/club", clubcoordinatorroute);

app.get("/", (req, res) => {
  res.send("Other backend running on Render 🚀");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
