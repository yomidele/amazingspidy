-- Add sort code field for beneficiary details on monthly contributions
ALTER TABLE monthly_contributions
ADD COLUMN beneficiary_sort_code TEXT;

-- optional: add a simple check constraint to ensure numeric characters only
ALTER TABLE monthly_contributions
ADD CONSTRAINT beneficiary_sort_code_numeric CHECK (beneficiary_sort_code ~ '^[0-9]*$');
