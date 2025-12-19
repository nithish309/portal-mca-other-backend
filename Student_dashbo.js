import express from "express";
import { verifyToken, authorizeRoles } from "./Authenticatio.js";
import { Student, Enroll, Club, Event, Guest } from "./Models.js";

const router = express.Router();

router.post(
  "/enroll",
  verifyToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { studentEmail, clubId, rollno, cls, section } = req.body;

      if (!studentEmail || !clubId || !rollno || !cls || !section) {
        return res
          .status(400)
          .json({ success: false, message: "Fill all fields" });
      }

      // Find student by email
      const student = await Student.findOne({
        email: studentEmail,
        role: "student",
      });
      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }
      const roles = student.role;

      //  Find club
      const club = await Club.findById(clubId);
      if (!club) {
        return res
          .status(404)
          .json({ success: false, message: "Club not found" });
      }

      //  Check if already enrolled
      const alreadyEnrolled = await Enroll.findOne({
        email: studentEmail,
      });
      if (alreadyEnrolled) {
        return res.status(400).json({
          success: false,
          message: "Student already enrolled in a club",
        });
      }

      //  Create enrollment
      const enroll = await Enroll.create({
        name: student.name,
        rollno: rollno,
        email: studentEmail,
        cls: cls,
        section: section,
        role: roles,
        clubs: [
          {
            clubId: club._id,
            clubName: club.name,
            coordinator:
              club.coordinators.length > 0
                ? {
                    name: club.coordinators[0].name,
                    email: club.coordinators[0].email,
                  }
                : { name: "", email: "" },
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: enroll,
        message: "Enrolled successfully",
      });
    } catch (err) {
      console.error("Error enrolling student:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error", error: err.message });
    }
  }
);

router.post(
  "/event-register",
  verifyToken,
  authorizeRoles("student", "guest", "studentIntra"),
  async (req, res) => {
    try {
      const { eventRegData } = req.body;

      if (!eventRegData) {
        return res
          .status(400)
          .json({ success: false, message: "Fill all fields" });
      }

      const { club_id, event_id, uname, email, rollno, dept, college } =
        eventRegData;

      const eventC = await Club.findOne({
        _id: club_id,
        "events.eventId": event_id,
      });

      if (!eventC) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found for this club" });
      }

      const event = await Event.findOne({ _id: event_id });

      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      const student = await Student.findOne({ email });
      const guest = await Guest.findOne({ email });

      const alreadyRegistered = event.registered.some(
        (r) => r.email === email || r.rollno === rollno
      );

      if (!student && !guest) {
        return res.status(404).json({
          success: false,
          message: "User not registered",
        });
      }

      if (alreadyRegistered) {
        return res
          .status(400)
          .json({ message: "Already registered for this event" });
      }

      

      event.registered.push({
        name: uname,
        email: email,
        rollno: rollno,
        department: dept,
        college: college,
      });

      await event.save();

      res
        .status(200)
        .json({ success: true, message: "Registered successfully" });
    } catch (err) {
      console.error("Error registering for event:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error", error: err.message });
    }
  }
);

router.get("/register-events", verifyToken,authorizeRoles("student", "guest", "studentIntra"), async (req, res) => {
  try {
   const { email } = req.query;

   const events=await Event.find();

   const registeredEvents = events.filter((event) => {
     return event.registered.some((user) => user.email === email);
   });

   res.status(200).json({ success: true, data: registeredEvents });
  } catch (err) {
    console.error("Error fetching registered events:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
})

export default router;
