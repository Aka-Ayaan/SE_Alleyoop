const express = require("express");
const db = require("../config/db");

const router = express.Router();

// Simple health check for matchmaking routes
router.get("/matchmaking/health", (req, res) => {
  res.json({ status: "ok", route: "matchmaking" });
});

// =========================================================
// MATCHMAKING
// =========================================================
// Player creates matchmaking request
router.post("/matchmaking/requests", async (req, res) => {
  const {
    player_id,
    court_type_id,
    city,
    arena_id,
    desired_date,
    start_time,
    end_time,
    preferred_match_size,
    min_skill_level_id,
    max_skill_level_id,
  } = req.body;
  const dbp = db.promise();

  if (
    !player_id ||
    !court_type_id ||
    !desired_date ||
    !start_time ||
    !end_time
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await dbp.beginTransaction();

    // 1. Create the Request
    const [reqResult] = await dbp.query(
      `INSERT INTO matchmaking_requests 
       (player_id, court_type_id, city, arena_id, desired_date, start_time, end_time, preferred_match_size, min_skill_level_id, max_skill_level_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        player_id,
        court_type_id,
        city || null,
        arena_id || null,
        desired_date,
        start_time,
        end_time,
        preferred_match_size || 2,
        min_skill_level_id || null,
        max_skill_level_id || null,
      ],
    );
    const requestId = reqResult.insertId;

    // 2. Create the empty Group
    const [groupResult] = await dbp.query(
      `INSERT INTO matchmaking_groups (court_type_id, arena_id, status) VALUES (?, ?, 'pending')`,
      [court_type_id, arena_id || null],
    );
    const groupId = groupResult.insertId;

    // 3. Put the Host inside the Group
    await dbp.query(
      `INSERT INTO matchmaking_group_players (group_id, player_id, from_request_id, role) VALUES (?, ?, ?, 'host')`,
      [groupId, player_id, requestId],
    );

    await dbp.commit();
    return res
      .status(201)
      .json({ message: "Lobby created", requestId, groupId });
  } catch (err) {
    await dbp.rollback();
    console.error("Create request error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// Get open matchmaking requests filtered by sport/date/location and skill
router.get("/matchmaking/requests/open", (req, res) => {
  const {
    court_type_id,
    desired_date,
    city,
    arena_id,
    min_skill_level_id,
    max_skill_level_id,
  } = req.query;

  const params = [];
  // Notice we use the 'mr' alias here
  let where = 'mr.status = "open"';

  // 1. Standard Filters
  if (court_type_id) {
    where += " AND mr.court_type_id = ?";
    params.push(court_type_id);
  }
  if (desired_date) {
    where += " AND mr.desired_date = ?";
    params.push(desired_date);
  }
  if (city) {
    where += " AND mr.city = ?";
    params.push(city);
  }
  if (arena_id) {
    where += " AND mr.arena_id = ?";
    params.push(arena_id);
  }

  // 2. Skill Level Filters (Moved from JS to SQL)
  // Notice we use the 'p' alias here because skill_level_id belongs to the players table
  if (min_skill_level_id) {
    where += " AND p.skill_level_id >= ?";
    params.push(Number(min_skill_level_id));
  }
  if (max_skill_level_id) {
    where += " AND p.skill_level_id <= ?";
    params.push(Number(max_skill_level_id));
  }

  // 3. The Query with the Subquery for Participant Counting
  const query = `
    SELECT 
      mr.*, 
      p.name AS playerName, 
      p.skill_level_id, 
      p.rating_avg,
      (
        SELECT COUNT(*) 
        FROM matchmaking_group_players mgp
        JOIN matchmaking_groups mg ON mg.id = mgp.group_id
        WHERE mgp.from_request_id = mr.id
      ) AS joined_players
    FROM matchmaking_requests mr
    JOIN players p ON mr.player_id = p.id
    WHERE ${where}
    HAVING joined_players < mr.preferred_match_size
    ORDER BY mr.desired_date, mr.start_time
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching matchmaking requests:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // You no longer need the JavaScript .filter() block!
    return res.json(results);
  });
});

// Player joins an existing matchmaking lobby
router.post("/matchmaking/join/:requestId", async (req, res) => {
  const { requestId } = req.params;
  const { player_id } = req.body;
  const dbp = db.promise();

  if (!player_id) return res.status(400).json({ error: "Player ID required" });

  try {
    await dbp.beginTransaction();

    // 1. Find the request and its associated group
    const [requestRows] = await dbp.query(
      `SELECT r.preferred_match_size, g.id AS group_id 
       FROM matchmaking_requests r
       JOIN matchmaking_group_players gp ON r.id = gp.from_request_id
       JOIN matchmaking_groups g ON gp.group_id = g.id
       WHERE r.id = ? AND r.status = 'open' LIMIT 1`,
      [requestId],
    );

    if (requestRows.length === 0) {
      await dbp.rollback();
      return res.status(404).json({ error: "Lobby not found or already full" });
    }

    const { preferred_match_size, group_id } = requestRows[0];

    // 2. Add the player to the group as a guest
    await dbp.query(
      `INSERT INTO matchmaking_group_players (group_id, player_id, from_request_id, role) 
       VALUES (?, ?, ?, 'guest')`,
      [group_id, player_id, requestId],
    );

    // 3. Count current players
    const [countRows] = await dbp.query(
      "SELECT COUNT(*) as total FROM matchmaking_group_players WHERE group_id = ?",
      [group_id],
    );

    // 4. If the lobby is now full, close it and trigger booking
    if (countRows[0].total >= preferred_match_size) {
      await dbp.query(
        `UPDATE matchmaking_requests SET status = 'matched' WHERE id = ?`,
        [requestId],
      );
      await dbp.query(
        `UPDATE matchmaking_groups SET status = 'confirmed' WHERE id = ?`,
        [group_id],
      );

      // TODO: Here is where you call your bookings logic to reserve the court!
      // const bookingId = await createActualBooking(...);
      // await dbp.query(`UPDATE matchmaking_groups SET booking_id = ? WHERE id = ?`, [bookingId, group_id]);
    }

    await dbp.commit();
    return res.status(200).json({ message: "Successfully joined the match!" });
  } catch (err) {
    await dbp.rollback();
    console.error("Join error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// Create a matchmaking group (backend algorithm groups players and calls this)
// router.post("/matchmaking/groups", (req, res) => {
//   const { court_type_id, arena_id, booking_id, players } = req.body; // players: [{ player_id, from_request_id, role }]

//   if (!court_type_id || !Array.isArray(players) || players.length === 0) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   const insertGroup = `
//     INSERT INTO matchmaking_groups (court_type_id, arena_id, booking_id, status)
//     VALUES (?, ?, ?, 'pending')
//   `;

//   db.query(
//     insertGroup,
//     [court_type_id, arena_id || null, booking_id || null],
//     (err, result) => {
//       if (err) {
//         console.error("Error creating matchmaking group:", err);
//         return res.status(500).json({ error: "Database error" });
//       }

//       const groupId = result.insertId;
//       const values = players.map((p) => [
//         groupId,
//         p.player_id,
//         p.from_request_id || null,
//         p.role || "guest",
//       ]);

//       const insertPlayers = `
//       INSERT INTO matchmaking_group_players (group_id, player_id, from_request_id, role)
//       VALUES ?
//     `;

//       db.query(insertPlayers, [values], (err2) => {
//         if (err2) {
//           console.error("Error linking group players:", err2);
//           return res.status(500).json({ error: "Database error" });
//         }

//         const requestIds = players
//           .map((p) => p.from_request_id)
//           .filter((id) => !!id);

//         if (requestIds.length > 0) {
//           const ph = requestIds.map(() => "?").join(",");
//           const updateRequests = `UPDATE matchmaking_requests SET status = 'matched' WHERE id IN (${ph})`;
//           db.query(updateRequests, requestIds, (err3) => {
//             if (err3)
//               console.error("Error updating requests to matched:", err3);
//           });
//         }

//         return res
//           .status(201)
//           .json({ message: "Matchmaking group created", groupId });
//       });
//     },
//   );
// });

module.exports = router;
