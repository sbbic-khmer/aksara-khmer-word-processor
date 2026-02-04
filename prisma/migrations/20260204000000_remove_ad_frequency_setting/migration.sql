-- Remove ad frequency schedule setting (no longer used - Monetag handles ad timing)
DELETE FROM "app_setting" WHERE "key" = 'ad_frequency_schedule';
