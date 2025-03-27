-- Schema for kibol.db
CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    current_question TEXT,  -- JSON string containing current question data
    users TEXT  -- JSON string containing user:score mapping
);