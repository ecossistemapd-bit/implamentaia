-- Revoke EXECUTE on run_daily_backup from all client roles (only pg_cron/owner needs it)
REVOKE EXECUTE ON FUNCTION public.run_daily_backup() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_daily_backup() FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_daily_backup() FROM authenticated;

-- Also revoke on send_weekly_backup_email for the same reason
REVOKE EXECUTE ON FUNCTION public.send_weekly_backup_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_weekly_backup_email() FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_weekly_backup_email() FROM authenticated;

-- Allow users to cancel their own mentorship bookings
CREATE POLICY "bookings_delete_own"
ON public.mentoria_bookings
FOR DELETE
TO authenticated
USING (user_id = auth.uid());