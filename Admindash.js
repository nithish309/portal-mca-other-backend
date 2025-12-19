import express from "express";
import { verifyToken, authorizeRoles } from "./Authenticatio.js";
import { Club, Faculty, Enroll, Event } from "./Models.js";

const router = express.Router();

router.post(
  "/create-club",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { coordinatorEmail, clubName } = req.body;

      //  Find faculty by email
      const faculty = await Faculty.findOne({ email: coordinatorEmail });
      if (!faculty) {
        return res
          .status(404)
          .json({ success: false, message: "Faculty not found" });
      }

      // Check if club already exists
      let club = await Club.findOne({ name: clubName });
      if (club) {
        return res.status(400).json({
          success: false,
          message: "Club already exists",
        });
      }

      //  Create club with coordinator info
      club = await Club.create({
        name: clubName,
        createdBy: req.user.id,
        coordinators: [
          {
            facultyId: faculty._id,
            name: faculty.name,
            email: faculty.email,
          },
        ],
      });

      // Update Faculty side
      faculty.role = "club-coordinator";
      if (!Array.isArray(faculty.clubs)) faculty.clubs = [];
      if (!faculty.clubs.includes(club._id)) {
        faculty.clubs.push(club._id);
      }
      await faculty.save();

      //  Populate createdBy
      const populatedClub = await Club.findById(club._id).populate(
        "createdBy",
        "name email"
      );

      res.status(201).json({
        success: true,
        message: "Club created successfully",
        data: populatedClub,
      });
    } catch (err) {
      console.error("Error creating club:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

router.get(
  "/clubs",
  verifyToken,
  authorizeRoles(
    "admin",
    "faculty",
    "student",
    "guest",
    "studentIntra",
    "club-coordinator",
    "secretary",
    "A-secretary",
    "J-secretary",
    "member",
    "enrolled-student"
  ),
  async (req, res) => {
    try {
      const clubs = await Club.find().populate("createdBy");

      res.status(200).json({
        success: true,
        data: clubs,
      });
    } catch (err) {
      console.error("Error fetching clubs:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

  router.put(
    "/edit-clubs/:id",
    verifyToken,
    authorizeRoles("admin"),
    async (req, res) => {
      try {
        const { clubName, coordinatorEmail } = req.body;

        if (!clubName && !coordinatorEmail) {
          return res.status(400).json({
            success: false,
            message: "At least one field is required",
          });
        }

        //  Find the club
        const club = await Club.findById(req.params.id);
        if (!club) {
          return res
            .status(404)
            .json({ success: false, message: "Club not found" });
        }

        //  Handle coordinator change
        if (coordinatorEmail && coordinatorEmail !== club.coordinators[0].email) {
          // Remove club from old coordinator 
          const oldFaculty = await Faculty.findOne({
            email: club.coordinators[0].email,
          });
          if (oldFaculty && Array.isArray(oldFaculty.clubs)) {
            oldFaculty.clubs = oldFaculty.clubs.filter(
              (c) => c.toString() !== club._id.toString()
            );

            // If no more clubs, revert role to 'faculty'
            if (oldFaculty.clubs.length === 0) {
              oldFaculty.role = "faculty";
            }

            await oldFaculty.save();
          }

          //  Add club to new coordinator
          const newFaculty = await Faculty.findOne({ email: coordinatorEmail });
          if (!newFaculty) {
            return res
              .status(404)
              .json({ success: false, message: "New faculty not found" });
          }

          if (!Array.isArray(newFaculty.clubs)) newFaculty.clubs = [];
          if (!newFaculty.clubs.includes(club._id))
            newFaculty.clubs.push(club._id);
          newFaculty.role = "club-coordinator"; // promote if needed
          await newFaculty.save();

          //  Update club record 
          club.coordinators[0].email = coordinatorEmail;
          club.coordinators[0].name = newFaculty.name;
          club.coordinators[0].facultyId = newFaculty._id;
        }
        const enroll = await Enroll.find({ "clubs.clubId": club._id });

        if (enroll && enroll.length > 0) {
          for (const e of enroll) {
            e.clubs = e.clubs.map((clubEntry) => {
              if (clubEntry.clubId.toString() === club._id.toString()) {
                // update the coordinator details
                clubEntry.coordinator = {
                  name: club.coordinators[0].name,
                  email: club.coordinators[0].email,
                };
              }
              return clubEntry;
            });
            await e.save();
          }
        }

        //  Update club name if provided
        if (clubName) {
          club.name = clubName;
        }

        await club.save();

        res.status(200).json({
          success: true,
          message: "Club updated successfully",
        });
      } catch (err) {
        console.error("Error updating club:", err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  );

router.delete(
  "/delete-clubs/:id",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      //  Find the club
      const club = await Club.findById(req.params.id);
      if (!club) {
        return res.status(404).json({
          success: false,
          message: "Club not found",
        });
      }
      const enroll = await Enroll.findOne({ "clubs.clubId": club._id });
      if (enroll) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete a club with enrolled students",
        });
      }

      const events = await Event.findOne({ club: club._id });
      if (events) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete a club with events",
        });
      }
      //  Remove this club from all faculty coordinators
      if (club.coordinators && club.coordinators.length > 0) {
        for (const c of club.coordinators) {
          const faculty = await Faculty.findById(c.facultyId);
          if (faculty && Array.isArray(faculty.clubs)) {
            // Remove this club from faculty's clubs
            faculty.clubs = faculty.clubs.filter(
              (id) => id.toString() !== club._id.toString()
            );

            // If faculty has no more clubs, revert role
            if (faculty.clubs.length === 0) {
              faculty.role = "faculty";
            }

            await faculty.save();
          }
        }
      }

      // Delete the club
      const deletedClub = await Club.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Club deleted successfully ",
        data: deletedClub,
      });
    } catch (err) {
      console.error("Error deleting club:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.get(
  "/emails",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const emails = await Faculty.find();
      res.status(200).json({
        success: true,
        data: emails,
      });
    } catch (err) {
      console.error("Error fetching emails:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

router.get(
  "/events",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const events = await Event.find();
      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (err) {
      console.error("Error fetching events:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
)
export default router;
