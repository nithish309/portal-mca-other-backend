import express from "express";
import { verifyToken, authorizeRoles } from "./Authenticatio.js";
import { Enroll, Student, Club, Event } from "./Models.js";
import e from "express";

const router = express.Router();

router.get(
  "/enrolled-students/:club_id",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    try {
      const { club_id } = req.params;
      const { email } = req.query;

      //  Use $elemMatch for flexible matching
      const clubcoordinatorC = await Club.findOne({
        _id: club_id,
        coordinators: { $elemMatch: { email: email } },
      });

      if (!clubcoordinatorC) {
        return res.status(404).json({
          success: false,
          message: "You are not a coordinator of this club",
        });
      }

      //  Get all enrolled students as array
      const enrolledStudents = await Enroll.find({ "clubs.clubId": club_id });

      res.status(200).json({
        success: true,
        data: enrolledStudents,
      });
    } catch (err) {
      console.error("Error fetching students:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.delete(
  "/enrolled-clear-students/:club_id",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    try {
      const { club_id } = req.params;
      await Student.updateMany(
        { "clubs.clubId": club_id },
        {
          $pull: { clubs: { clubId: club_id } },
          $set: { role: "student" },
        }
      );
      await Club.updateOne(
        { _id: club_id },
        {
          $set: {
            members: [],
            secretaryName: "",
            secretaryEmail: "",
            additionalSecretaryName: "",
            additionalSecretaryEmail: "",
            jointSecretaryName: "",
            jointSecretaryEmail: "",
          },
        }
      );

      // Delete all students who are enrolled in this specific club
      const result = await Enroll.deleteMany({ "clubs.clubId": club_id });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Nothing to delete ",
        });
      }

      res.status(200).json({
        success: true,
        message: "Enrolled students cleared successfully",
      });
    } catch (err) {
      console.error("Error deleting enrolled students:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// Update a student's position
router.put(
  "/position/:club_id",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    try {
      const { club_id, position, email } = req.body;

      const student = await Student.findOne({ email: email });
      const alreadyEnrolled = student.clubs.some(
        (c) => c.clubId.toString() === club_id.toString()
      );

      if (alreadyEnrolled) {
        return res.status(400).json({
          success: false,
          message: "Student already has a position",
        });
      }
      const enrolledStudents = await Enroll.find({
        "clubs.clubId": club_id,
        email: email,
      });

      if (enrolledStudents.length > 0) {
        enrolledStudents[0].role = position;
        await enrolledStudents[0].save();
      }

      if (student) {
        student.role = position;
        student.clubs.push({
          clubId: club_id,
          clubName: enrolledStudents[0].clubs[0].clubName,
        });
        await student.save();
      }

      const club = await Club.findOne({ _id: club_id });
      if (club) {
        if (position === "secretary") {
          club.secretaryName = student.name;
          club.secretaryEmail = student.email;
        } else if (position === "A-secretary") {
          club.additionalSecretaryName = student.name;
          club.additionalSecretaryEmail = student.email;
        } else if (position === "J-secretary") {
          club.jointSecretaryName = student.name;
          club.jointSecretaryEmail = student.email;
        } else if (position === "member") {
          club.members.push({
            studentId: student._id,
            name: student.name,
            email: student.email,
          });
        }
        await club.save();
      }
      res.status(200).json({
        success: true,
        message: "Position updated successfully",
      });
    } catch (err) {
      console.error("Error updating position:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// Remove a student's position
router.put(
  "/position-remove/:club_id",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    try {
      const { club_id } = req.params;
      const { email } = req.body;

      // Find the student
      const student = await Student.findOne({ email });
      if (!student) {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }

      // Remove this club from the student's clubs array
      student.clubs = (student.clubs || []).filter(
        (c) => c?.clubId?.toString() !== club_id?.toString()
      );

      // Reset role to "student"
      student.role = "student";
      await student.save();

      // Update the Enroll record (if it exists)
      const enrolled = await Enroll.findOne({ email });
      if (enrolled) {
        enrolled.role = "student";
        await enrolled.save();
      }

      //  Update the Club record
      const club = await Club.findById(club_id);
      if (club) {
        // clear any references to this student in the club
        if (club.secretaryEmail === student.email) {
          club.secretaryName = "";
          club.secretaryEmail = "";
        } else if (club.additionalSecretaryEmail === student.email) {
          club.additionalSecretaryName = "";
          club.additionalSecretaryEmail = "";
        } else if (club.jointSecretaryEmail === student.email) {
          club.jointSecretaryName = "";
          club.jointSecretaryEmail = "";
        } else {
          // remove from members array
          club.members = (club.members || []).filter(
            (m) => m.email !== student.email
          );
        }
        await club.save();
      }

      res.status(200).json({
        success: true,
        message: "Position removed successfully",
      });
    } catch (err) {
      console.error("Error updating position:", err);
      res.status(500).json({
        success: false,
        message: "Server error while removing position",
      });
    }
  }
);
//check-coordinator for events
router.get(
  "/event/coordinator-check/:clubId",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    const { clubId } = req.params;
    const { email } = req.query;
    try {
      // Find club where coordinators array contains this email
      const club = await Club.findOne({
        _id: clubId,
        coordinators: { $elemMatch: { email } },
      });

      if (club) {
        return res.json({ isCoordinator: true });
      } else {
        return res.json({ isCoordinator: false });
      }
    } catch (err) {
      console.error("Error checking coordinator:", err);
      return res
        .status(500)
        .json({ message: "Server error", isCoordinator: false });
    }
  }
);

//Add event
router.post(
  "/event",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    try {
      const { club_id, event } = req.body;

      const club = await Club.findById(club_id);
      if (!club)
        return res
          .status(404)
          .json({ success: false, message: "Club not found" });

      // Check duplicate name or date
      const existingEvent = await Event.findOne({
        name: event.name,
        date: event.date,
        club: club_id,
      });
      if (existingEvent)
        return res
          .status(400)
          .json({ success: false, message: "Event already exists" });

      const existingEventDate = await Event.findOne({
        date: event.date,
        club: club_id,
      });
      if (existingEventDate)
        return res.status(400).json({
          success: false,
          message: "Event already exists for this date",
        });

      //  Create event and fill required fields
      const newEvent = new Event({
        ...event,
        club: club_id,
        createdBy: req.user.id, // from JWT
      });

      await newEvent.save();

      await Club.findByIdAndUpdate(club_id, {
        $push: {
          events: {
            eventId: newEvent._id,
            eventName: newEvent.name,
            eventDescription: newEvent.description,
            eventVenue: newEvent.venue,
            eventDate: newEvent.date,
            eventRegistrationStart: newEvent.registrationStart,
            eventRegistrationEnd: newEvent.registrationEnd,
            eventAccess: event.access,
          },
        },
      });
      res
        .status(200)
        .json({ success: true, message: "Event added successfully" });
    } catch (err) {
      console.error("Error adding event:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

router.put(
  "/edit-event/:eventId",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { eventname, eventdes, eventvenue, clubId, email } = req.body;

      const club = await Club.findOne({
        _id: clubId,
        coordinators: { $elemMatch: { email } },
      });

      if (!club)
        return res.status(404).json({
          success: false,
          message: "you are not a coordinator of this club",
        });

      const clubevent = await Club.findOne({
        _id: clubId,
        "events.eventId": eventId,
      });

      if (!clubevent)
        return res
          .status(404)
          .json({ success: false, message: "Event not found for this club" });

      const event = await Event.findOne({ _id: eventId });
      if (event.registered.length > 0)
        return res
          .status(400)
          .json({
            success: false,
            message: "Unable to edit event after registration",
          });
      //  Update event
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        {
          name: eventname,
          description: eventdes,
          venue: eventvenue,
        },
        {
          new: true,
        }
      );

      if (!updatedEvent)
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });

      await Club.findOneAndUpdate(
        { _id: clubId, "events.eventId": eventId },
        {
          $set: {
            "events.$.eventName": eventname,
            "events.$.eventDescription": eventdes,
            "events.$.eventVenue": eventvenue,
          },
        },
        { new: true }
      );

      res
        .status(200)
        .json({ success: true, message: "Event updated successfully" });
    } catch (err) {
      console.error("Error updating event:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

router.get(
  "/events/:event_id",
  verifyToken,
  authorizeRoles("club-coordinator"),
  async (req, res) => {
    try {
      const { event_id } = req.params;

      const event = await Event.findById(event_id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Return data in correct format expected by frontend
      return res.status(200).json({
        success: true,
        data: event,
      });
    } catch (err) {
      console.error("Error fetching event:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);


export default router;
