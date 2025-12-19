import e from "express";
import mongoose from "mongoose";

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  coordinators: [
    {
      facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
      name: String,
      email: String,
    },
  ],
  secretaryName: String,
  secretaryEmail: String,
  additionalSecretaryName: String,
  additionalSecretaryEmail: String,
  jointSecretaryName: String,
  jointSecretaryEmail: String,
  members: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      name: String,
      email: String,
    },
  ],

  events: [
    {
      eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
      eventName: String,
      eventDescription: String,
      eventVenue: String,
      eventDate: Date,
      eventRegistrationStart: Date,
      eventRegistrationEnd: Date,
      eventAccess:String,
    },
  ],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  createdAt: { type: Date, default: Date.now },
});

const eventSchema = new mongoose.Schema({
  // Event Info
  name: { type: String, required: true },
  description: { type: String, default: "" },
  date: { type: Date, required: true },
  venue: { type: String, default: "" },

  // Club organizing the event
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    required: true,
  },

  // event Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
  },

  registrationStart: { type: Date, required: true }, // Registration open time
  registrationEnd: { type: Date, required: true }, // Registration close time

  //Registered Participants
  registered: [
    {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      rollno: { type: String, default: "" },
      department: { type: String, default: "" },
      college: { type: String, default: "" },
      registeredAt: { type: Date, default: Date.now },
    },
  ],

  // event Participation
  participations: [
    {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      rollno: { type: String, default: "" },
      department: { type: String, default: "" },
      college: { type: String, default: "" },
      participatedAt: { type: Date, default: Date.now },
    },
  ],

  // Attendance provider
  attendanceTakenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    default: null,
  },
  attendanceTakenAt: { type: Date, default: null },

  // event creation
  createdAt: { type: Date, default: Date.now },
});

const facultySchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club", default: [] }],
});

const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
});

const studentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  clubs: [
    {
      clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
      clubName: String,
    },
  ],
  participatedEvents: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: [] },
  ],
});

const guestSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "guest" },
  participatedEvents: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: [] },
  ],
});

const enrollSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  name: String,
  email: String,
  rollno: String,
  cls: String,
  section: String,
  role: String,
  clubs: [
    {
      clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
      clubName: String,
      coordinator: {
        name: String,
        email: String,
      },
    },
  ],

  enrolledAt: { type: Date, default: Date.now },
});

export const Guest = mongoose.model("Guest", guestSchema);
export const Student = mongoose.model("Student", studentSchema);
export const Club = mongoose.model("Club", clubSchema);
export const Faculty = mongoose.model("Faculty", facultySchema);
export const Admin = mongoose.model("Admin", adminSchema);
export const Event = mongoose.model("Event", eventSchema);
export const Enroll = mongoose.model("Enroll", enrollSchema);
