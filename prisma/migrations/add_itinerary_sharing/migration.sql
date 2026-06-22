-- Add sharing support to itineraries
ALTER TABLE itineraries ADD COLUMN share_token VARCHAR(32) UNIQUE;
ALTER TABLE itineraries ADD COLUMN is_shared BOOLEAN DEFAULT false;
ALTER TABLE itineraries ADD COLUMN shared_at TIMESTAMP;

-- Create index for fast token lookups
CREATE INDEX idx_itineraries_share_token ON itineraries(share_token) WHERE share_token IS NOT NULL;
