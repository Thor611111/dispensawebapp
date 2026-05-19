
-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any previous version
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'pantryai-daily-notifications';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

-- Schedule hourly call to the daily-notifications hook.
-- The hook checks notification_preferences.daily_send_hour = currentHour internally.
SELECT cron.schedule(
  'pantryai-daily-notifications',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://dispensawebapp.lovable.app/api/public/hooks/daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
