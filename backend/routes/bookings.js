const express = require("express");
const db = require("../config/db");

const router = express.Router();
const dbp = db.promise();

router.get("/bookings/health", (req, res) => {
  res.json({ status: "ok", route: "bookings" });
});

// Court-based booking creation
router.post("/bookings", async (req, res) => {
  const {
    userId,
    courtId,
    courtTypeId,
    date,
    startTime,
    endTime,
    is_private,
    status,
    participantsCount,
  } = req.body;
  const dbp = db.promise();

  if (
    !userId ||
    !courtId ||
    !courtTypeId ||
    !date ||
    !startTime ||
    !endTime ||
    is_private === undefined
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // START TRANSACTION
    await dbp.beginTransaction();

    const [courtRows] = await dbp.query(
      "SELECT id, arena_id FROM courts WHERE id = ?",
      [courtId],
    );
    if (!courtRows.length) {
      await dbp.rollback();
      return res.status(400).json({ error: "Invalid court" });
    }

    const [sportRows] = await dbp.query(
      "SELECT id FROM court_sports WHERE court_id = ? AND court_type_id = ? LIMIT 1",
      [courtId, courtTypeId],
    );
    if (!sportRows.length) {
      await dbp.rollback();
      return res
        .status(400)
        .json({ error: "Selected sport is not available on this court" });
    }

    const [overlapRows] = await dbp.query(
      `
      SELECT id
      FROM bookings
      WHERE court_id = ?
        AND booking_date = ?
        AND status_id <> 3
        AND start_time < ?
        AND end_time > ?
      LIMIT 1
      `,
      [courtId, date, endTime, startTime],
    );

    if (overlapRows.length) {
      await dbp.rollback();
      return res
        .status(409)
        .json({ error: "This court is already booked for the selected time" });
    }

    const statusId = status === "confirmed" ? 2 : 1;

    // INSERT 1: The Booking
    const [result] = await dbp.query(
      `
      INSERT INTO bookings (player_id, arena_id, court_id, court_type_id, booking_date, start_time, end_time, status_id, participants_count, is_private)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        courtRows[0].arena_id,
        courtId,
        courtTypeId,
        date,
        startTime,
        endTime,
        statusId,
        participantsCount || 1,
        is_private ? 1 : 0,
      ],
    );

    const bookingId = result.insertId;

    // INSERT 2: The Guest List (Only if public)
    if (is_private === false || is_private === 0) {
      await dbp.query(
        // Make sure this table name matches exactly what you named it in your SQL file!
        `INSERT INTO booking_participants (booking_id, player_id) VALUES (?, ?)`,
        [bookingId, userId],
      );
    }

    // SAVE EVERYTHING
    await dbp.commit();

    return res.json({
      message: "Booking created successfully",
      bookingId: bookingId,
    });
  } catch (err) {
    // IF ANYTHING FAILS, UNDO THE WHOLE THING
    await dbp.rollback();
    console.error("Error creating booking:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// A guest joins an existing public matchmaking lobby
router.post("/bookings/:id/join", async (req, res) => {
  // The ':id' in the route catches the '1' from your Postman URL
  const bookingId = req.params.id;
  const { userId } = req.body;
  const dbp = db.promise();

  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    await dbp.beginTransaction();

    // 1. Check if the booking exists and is currently public (is_private = 0)
    const [bookingRows] = await dbp.query(
      `SELECT participants_count, is_private FROM bookings WHERE id = ? FOR UPDATE`,
      [bookingId],
    );

    if (bookingRows.length === 0 || bookingRows[0].is_private === 1) {
      await dbp.rollback();
      return res
        .status(404)
        .json({ error: "Lobby not found or no longer public" });
    }

    const { participants_count } = bookingRows[0];

    // 2. Prevent duplicate joins (user can't join the same game twice)
    const [duplicateCheck] = await dbp.query(
      `SELECT id FROM booking_participants WHERE booking_id = ? AND player_id = ?`,
      [bookingId, userId],
    );

    if (duplicateCheck.length > 0) {
      await dbp.rollback();
      return res.status(400).json({ error: "You are already in this lobby" });
    }

    // 3. Add the player to the guest list
    await dbp.query(
      `INSERT INTO booking_participants (booking_id, player_id) VALUES (?, ?)`,
      [bookingId, userId],
    );

    // 4. Count current players to see if the lobby is now full
    const [countRows] = await dbp.query(
      `SELECT COUNT(*) as total FROM booking_participants WHERE booking_id = ?`,
      [bookingId],
    );

    // 5. If full, lock it down by flipping is_private to 1
    if (countRows[0].total >= participants_count) {
      await dbp.query(`UPDATE bookings SET is_private = 1 WHERE id = ?`, [
        bookingId,
      ]);
    }

    await dbp.commit();
    return res.status(200).json({ message: "Successfully joined the match!" });
  } catch (err) {
    await dbp.rollback();
    console.error("Error joining lobby:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.get("/bookings/owner", async (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: "Owner ID required" });

  try {
    const [results] = await dbp.query(
      `
      SELECT
        b.id AS bookingId,
        b.arena_id AS arenaId,
        b.court_id AS courtId,
        a.name AS arenaName,
        c.name AS courtName,
        ct.type_name AS sportName,
        p.name AS playerName,
        p.phone AS playerPhone,
        DATE(b.booking_date) AS bookingDate,
        b.start_time AS startTime,
        b.end_time AS endTime,
        bs.status_name AS status,
        (TIME_TO_SEC(TIMEDIFF(b.end_time, b.start_time)) / 3600) * COALESCE(c.price_per_hour, a.pricePerHour) AS revenue
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.id
      JOIN courts c ON b.court_id = c.id
      JOIN court_types ct ON b.court_type_id = ct.id
      JOIN players p ON b.player_id = p.id
      JOIN booking_status bs ON b.status_id = bs.id
      WHERE a.owner_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
      `,
      [ownerId],
    );

    return res.json(results);
  } catch (err) {
    console.error("Error fetching owner bookings:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.get("/bookings/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const [results] = await dbp.query(
      `
      SELECT
        b.id AS bookingId,
        a.name AS arenaName,
        c.name AS courtName,
        ct.type_name AS sportName,
        DATE(b.booking_date) AS bookingDate,
        b.start_time AS startTime,
        TIME_TO_SEC(TIMEDIFF(b.end_time, b.start_time)) / 60 AS duration,
        bs.status_name AS status
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.id
      JOIN courts c ON b.court_id = c.id
      JOIN court_types ct ON b.court_type_id = ct.id
      JOIN booking_status bs ON b.status_id = bs.id
      WHERE b.player_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
      `,
      [userId],
    );

    const formattedBookings = results.map((booking) => ({
      bookingId: booking.bookingId,
      arenaName: booking.arenaName,
      courtName: booking.courtName,
      sportName: booking.sportName,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      duration: Math.round(booking.duration),
      status: booking.status,
    }));

    return res.json({ success: true, bookings: formattedBookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
});

// Get all open public bookings for the lobby
router.get("/bookings/lobby/open", async (req, res) => {
  try {
    const [results] = await dbp.query(`
      SELECT 
        b.id AS bookingId,
        b.booking_date AS date,
        b.start_time AS startTime,
        b.end_time AS endTime,
        b.participants_count AS max_participants,
        a.name AS arenaName,
        a.city,
        c.name AS courtName,
        ct.type_name AS sportName,
        p.name AS hostName,
        p.skill_level_id AS hostSkillLevel,
        (SELECT COUNT(*) FROM booking_participants WHERE booking_id = b.id) AS current_players
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.id
      JOIN courts c ON b.court_id = c.id
      JOIN court_types ct ON b.court_type_id = ct.id
      JOIN players p ON b.player_id = p.id
      WHERE b.is_private = 0 -- Only display public bookings
        AND b.status_id != 3 -- Exclude cancelled bookings
      HAVING current_players < max_participants
      ORDER BY b.booking_date, b.start_time
    `);

    return res.json(results);
  } catch (err) {
    console.error("Error fetching lobby:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
