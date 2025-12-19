import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import adminroute from "./Admindash.js";
import clubcoordinatorroute from "./Club_coordinator.js";
import studentroute from "./Student_dashbo.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const port=process.env.PORT;

const url=process.env.MONGODB_URI;

mongoose.connect(url)
.then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.log("Error connecting to MongoDB:", error);
});

app.use("/api",adminroute);
app.use("/api/faculty",adminroute);
app.use("/api",studentroute);
app.use("/api",clubcoordinatorroute);


app.get("/", (req, res) => {
  res.send("other backend running on Render 🚀");
});
app.listen(port,()=>{
      console.log(`Server running on port ${port}`);

});
