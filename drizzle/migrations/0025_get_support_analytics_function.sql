-- From supabase/migrations/20261110050000_support_analytics_function.sql
-- Adds an admin-only guard: the aggregates cover every advertiser's conversations.
CREATE OR REPLACE FUNCTION public.get_support_analytics()
RETURNS JSONB AS $$
DECLARE
    v_total_rooms INT;
    v_open_rooms INT;
    v_resolved_rooms INT;
    v_avg_response_time_minutes INT;
    v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'get_support_analytics : accès réservé aux administrateurs';
    END IF;

    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status = 'open'),
           COUNT(*) FILTER (WHERE status = 'resolved')
    INTO v_total_rooms, v_open_rooms, v_resolved_rooms
    FROM public.support_rooms;

    WITH first_responses AS (
        SELECT m2.created_at - m1.created_at AS response_time
        FROM public.support_messages m1
        JOIN public.support_messages m2 ON m1.room_id = m2.room_id
        WHERE m1.sender_type = 'advertiser'
          AND m2.sender_type = 'admin'
          AND m2.created_at > m1.created_at
          AND NOT EXISTS (
              SELECT 1 FROM public.support_messages m3
              WHERE m3.room_id = m1.room_id
                AND m3.sender_type = 'admin'
                AND m3.created_at > m1.created_at
                AND m3.created_at < m2.created_at
          )
    )
    SELECT COALESCE(EXTRACT(EPOCH FROM AVG(response_time)) / 60, 0)::INT
    INTO v_avg_response_time_minutes
    FROM first_responses;

    v_result := jsonb_build_object(
        'total_rooms', v_total_rooms,
        'open_rooms', v_open_rooms,
        'resolved_rooms', v_resolved_rooms,
        'avg_response_time_minutes', v_avg_response_time_minutes
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_support_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_support_analytics() TO authenticated;
GRANT ALL ON FUNCTION public.get_support_analytics() TO service_role;