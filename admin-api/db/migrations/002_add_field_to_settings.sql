-- Add new field to settings table
ALTER TABLE settings
ADD COLUMN new_field_name VARCHAR(255) DEFAULT 'default_value';

-- If you need to update existing rows with a specific value
UPDATE settings 
SET new_field_name = 'default_value' 
WHERE id = 1; 