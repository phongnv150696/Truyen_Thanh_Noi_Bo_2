--
-- PostgreSQL database dump
--

\restrict dCK2LKOmqjCTk04wvKCEf9vryiaRVzd1bx0zvMODRA9w6YiYRzc8aotatZFz5mL

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: protect_audit_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.protect_audit_logs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted.';
END;
$$;


ALTER FUNCTION public.protect_audit_logs() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_suggestions (
    id integer NOT NULL,
    content_id integer,
    suggestion_type character varying(100),
    suggested_text text,
    original_text text,
    is_applied boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_suggestions OWNER TO postgres;

--
-- Name: ai_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_suggestions_id_seq OWNER TO postgres;

--
-- Name: ai_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_suggestions_id_seq OWNED BY public.ai_suggestions.id;


--
-- Name: alert_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alert_messages (
    id integer NOT NULL,
    sender_id integer,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    alert_level character varying(50) DEFAULT 'priority'::character varying,
    target_unit_id integer,
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.alert_messages OWNER TO postgres;

--
-- Name: alert_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alert_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alert_messages_id_seq OWNER TO postgres;

--
-- Name: alert_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alert_messages_id_seq OWNED BY public.alert_messages.id;


--
-- Name: api_rate_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_rate_limits (
    id integer NOT NULL,
    identifier character varying(100) NOT NULL,
    endpoint character varying(255),
    hits integer DEFAULT 1,
    reset_at timestamp without time zone
);


ALTER TABLE public.api_rate_limits OWNER TO postgres;

--
-- Name: api_rate_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_rate_limits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_rate_limits_id_seq OWNER TO postgres;

--
-- Name: api_rate_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_rate_limits_id_seq OWNED BY public.api_rate_limits.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    target_table character varying(100),
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    unit_id integer
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: broadcast_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcast_schedules (
    id integer NOT NULL,
    channel_id integer,
    content_id integer,
    scheduled_time timestamp with time zone NOT NULL,
    duration integer DEFAULT 0,
    repeat_pattern character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    triggered_at timestamp with time zone,
    radio_id integer,
    stopped_at timestamp with time zone,
    routine_id integer,
    unit_id integer,
    is_all_units boolean DEFAULT false
);


ALTER TABLE public.broadcast_schedules OWNER TO postgres;

--
-- Name: broadcast_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcast_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_schedules_id_seq OWNER TO postgres;

--
-- Name: broadcast_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcast_schedules_id_seq OWNED BY public.broadcast_schedules.id;


--
-- Name: broadcast_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcast_sessions (
    id integer NOT NULL,
    channel_id integer,
    content_id integer,
    start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    end_time timestamp with time zone,
    actual_duration interval,
    status character varying(50) DEFAULT 'completed'::character varying,
    listener_count_peak integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    duration integer,
    schedule_id integer,
    radio_id integer
);


ALTER TABLE public.broadcast_sessions OWNER TO postgres;

--
-- Name: broadcast_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcast_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_sessions_id_seq OWNER TO postgres;

--
-- Name: broadcast_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcast_sessions_id_seq OWNED BY public.broadcast_sessions.id;


--
-- Name: channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.channels (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    mount_point character varying(255) NOT NULL,
    description text,
    unit_id integer,
    status character varying(50) DEFAULT 'offline'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.channels OWNER TO postgres;

--
-- Name: channels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.channels_id_seq OWNER TO postgres;

--
-- Name: channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.channels_id_seq OWNED BY public.channels.id;


--
-- Name: content_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_items (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    summary text,
    author_id integer,
    unit_id integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    tags text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    validation_results jsonb,
    clearance_level integer DEFAULT 1
);


ALTER TABLE public.content_items OWNER TO postgres;

--
-- Name: content_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.content_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.content_items_id_seq OWNER TO postgres;

--
-- Name: content_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.content_items_id_seq OWNED BY public.content_items.id;


--
-- Name: content_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_reviews (
    id integer NOT NULL,
    content_id integer,
    reviewer_type character varying(50) DEFAULT 'ai'::character varying,
    reviewer_id integer,
    score integer,
    comments text,
    is_sensitive boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.content_reviews OWNER TO postgres;

--
-- Name: content_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.content_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.content_reviews_id_seq OWNER TO postgres;

--
-- Name: content_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.content_reviews_id_seq OWNED BY public.content_reviews.id;


--
-- Name: delegations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delegations (
    id integer NOT NULL,
    delegator_id integer,
    delegatee_id integer,
    role_id integer,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.delegations OWNER TO postgres;

--
-- Name: delegations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delegations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delegations_id_seq OWNER TO postgres;

--
-- Name: delegations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delegations_id_seq OWNED BY public.delegations.id;


--
-- Name: device_broadcast_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_broadcast_logs (
    id integer NOT NULL,
    device_id integer,
    schedule_id integer,
    content_id integer,
    channel_id integer,
    start_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    end_time timestamp without time zone,
    status character varying(20) DEFAULT 'playing'::character varying,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.device_broadcast_logs OWNER TO postgres;

--
-- Name: device_broadcast_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_broadcast_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_broadcast_logs_id_seq OWNER TO postgres;

--
-- Name: device_broadcast_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_broadcast_logs_id_seq OWNED BY public.device_broadcast_logs.id;


--
-- Name: device_commands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_commands (
    id integer NOT NULL,
    device_id integer,
    operator_id integer,
    command character varying(100) NOT NULL,
    payload jsonb,
    status character varying(50) DEFAULT 'success'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.device_commands OWNER TO postgres;

--
-- Name: device_commands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_commands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_commands_id_seq OWNER TO postgres;

--
-- Name: device_commands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_commands_id_seq OWNED BY public.device_commands.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) DEFAULT 'speaker'::character varying,
    ip_address character varying(45),
    status character varying(20) DEFAULT 'offline'::character varying,
    unit_id integer,
    last_seen timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    channel_id integer,
    volume integer DEFAULT 50,
    signal_strength integer DEFAULT 100,
    firmware_version character varying(50) DEFAULT 'v1.0.0'::character varying,
    last_maintenance timestamp without time zone DEFAULT now(),
    maintenance_notes text
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devices_id_seq OWNER TO postgres;

--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: health_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.health_metrics (
    id integer NOT NULL,
    service_name character varying(100) NOT NULL,
    status character varying(50) NOT NULL,
    cpu_usage numeric(5,2),
    memory_usage bigint,
    uptime_seconds bigint,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.health_metrics OWNER TO postgres;

--
-- Name: health_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.health_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.health_metrics_id_seq OWNER TO postgres;

--
-- Name: health_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.health_metrics_id_seq OWNED BY public.health_metrics.id;


--
-- Name: media_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_files (
    id integer NOT NULL,
    content_id integer,
    file_name character varying(255) NOT NULL,
    file_path character varying(512) NOT NULL,
    bucket_name character varying(100) DEFAULT 'openclaw-media'::character varying,
    file_size bigint,
    mime_type character varying(100),
    duration interval,
    status character varying(50) DEFAULT 'ready'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    bitrate integer,
    sample_rate integer,
    tags text[],
    category character varying(100),
    clearance_level integer DEFAULT 1,
    unit_id integer
);


ALTER TABLE public.media_files OWNER TO postgres;

--
-- Name: media_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.media_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.media_files_id_seq OWNER TO postgres;

--
-- Name: media_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.media_files_id_seq OWNED BY public.media_files.id;


--
-- Name: military_dictionary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.military_dictionary (
    id integer NOT NULL,
    word character varying(255) NOT NULL,
    phonetic_reading text,
    category character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.military_dictionary OWNER TO postgres;

--
-- Name: military_dictionary_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.military_dictionary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.military_dictionary_id_seq OWNER TO postgres;

--
-- Name: military_dictionary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.military_dictionary_id_seq OWNED BY public.military_dictionary.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    link character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sender_name character varying(100),
    priority character varying(20) DEFAULT 'medium'::character varying,
    unit_id integer
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: on_demand_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.on_demand_requests (
    id integer NOT NULL,
    user_id integer,
    content_id integer,
    channel_id integer,
    priority integer DEFAULT 1,
    status character varying(50) DEFAULT 'pending'::character varying,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.on_demand_requests OWNER TO postgres;

--
-- Name: on_demand_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.on_demand_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.on_demand_requests_id_seq OWNER TO postgres;

--
-- Name: on_demand_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.on_demand_requests_id_seq OWNED BY public.on_demand_requests.id;


--
-- Name: openclaw_api_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.openclaw_api_logs (
    id integer NOT NULL,
    model_name character varying(100),
    prompt_tokens integer,
    completion_tokens integer,
    total_tokens integer,
    estimated_cost_usd numeric(10,6),
    job_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.openclaw_api_logs OWNER TO postgres;

--
-- Name: openclaw_api_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.openclaw_api_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.openclaw_api_logs_id_seq OWNER TO postgres;

--
-- Name: openclaw_api_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.openclaw_api_logs_id_seq OWNED BY public.openclaw_api_logs.id;


--
-- Name: openclaw_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.openclaw_jobs (
    id integer NOT NULL,
    job_type character varying(100) NOT NULL,
    payload jsonb,
    status character varying(50) DEFAULT 'queued'::character varying,
    result jsonb,
    error_log text,
    attempts integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.openclaw_jobs OWNER TO postgres;

--
-- Name: openclaw_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.openclaw_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.openclaw_jobs_id_seq OWNER TO postgres;

--
-- Name: openclaw_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.openclaw_jobs_id_seq OWNED BY public.openclaw_jobs.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    user_id integer,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    module character varying(50)
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: radios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radios (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    url text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    unit_id integer
);


ALTER TABLE public.radios OWNER TO postgres;

--
-- Name: radios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.radios_id_seq OWNER TO postgres;

--
-- Name: radios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radios_id_seq OWNED BY public.radios.id;


--
-- Name: recording_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recording_sessions (
    id integer NOT NULL,
    user_id integer,
    unit_id integer,
    title character varying(255),
    start_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    end_time timestamp without time zone,
    duration interval,
    media_id integer,
    is_live boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.recording_sessions OWNER TO postgres;

--
-- Name: recording_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recording_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recording_sessions_id_seq OWNER TO postgres;

--
-- Name: recording_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recording_sessions_id_seq OWNED BY public.recording_sessions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: routine_commands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routine_commands (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(100) NOT NULL,
    file_path text,
    duration integer,
    file_size character varying(50),
    unit_id integer,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.routine_commands OWNER TO postgres;

--
-- Name: routine_commands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.routine_commands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.routine_commands_id_seq OWNER TO postgres;

--
-- Name: routine_commands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.routine_commands_id_seq OWNED BY public.routine_commands.id;


--
-- Name: schedule_proposals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule_proposals (
    id integer NOT NULL,
    proposal_name character varying(255),
    details jsonb,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.schedule_proposals OWNER TO postgres;

--
-- Name: schedule_proposals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schedule_proposals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schedule_proposals_id_seq OWNER TO postgres;

--
-- Name: schedule_proposals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schedule_proposals_id_seq OWNED BY public.schedule_proposals.id;


--
-- Name: score_leaderboard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.score_leaderboard (
    id integer NOT NULL,
    unit_id integer,
    month integer NOT NULL,
    year integer NOT NULL,
    total_score numeric(10,2) DEFAULT 0,
    rank integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.score_leaderboard OWNER TO postgres;

--
-- Name: score_leaderboard_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.score_leaderboard_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.score_leaderboard_id_seq OWNER TO postgres;

--
-- Name: score_leaderboard_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.score_leaderboard_id_seq OWNED BY public.score_leaderboard.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer,
    refresh_token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: system_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_config_id_seq OWNER TO postgres;

--
-- Name: system_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_config_id_seq OWNED BY public.system_config.id;


--
-- Name: tts_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tts_jobs (
    id integer NOT NULL,
    content_id integer,
    voice_engine character varying(100),
    voice_style character varying(50),
    priority integer DEFAULT 0,
    status character varying(50) DEFAULT 'queued'::character varying,
    error_message text,
    output_media_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone
);


ALTER TABLE public.tts_jobs OWNER TO postgres;

--
-- Name: tts_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tts_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tts_jobs_id_seq OWNER TO postgres;

--
-- Name: tts_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tts_jobs_id_seq OWNED BY public.tts_jobs.id;


--
-- Name: unit_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit_scores (
    id integer NOT NULL,
    unit_id integer,
    date date DEFAULT CURRENT_DATE,
    category character varying(100),
    score numeric(5,2) NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.unit_scores OWNER TO postgres;

--
-- Name: unit_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unit_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unit_scores_id_seq OWNER TO postgres;

--
-- Name: unit_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unit_scores_id_seq OWNED BY public.unit_scores.id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    parent_id integer,
    level integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.units_id_seq OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: user_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_registrations (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    full_name character varying(255),
    rank character varying(50),
    email character varying(255),
    unit_id integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    password_hash text,
    "position" character varying(255) DEFAULT ''::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    rejected_reason text,
    phone character varying(20),
    identity_card character varying(20),
    home_address text,
    unit_address text
);


ALTER TABLE public.user_registrations OWNER TO postgres;

--
-- Name: user_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_registrations_id_seq OWNER TO postgres;

--
-- Name: user_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_registrations_id_seq OWNED BY public.user_registrations.id;


--
-- Name: user_shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_shifts (
    id integer NOT NULL,
    user_id integer,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_shifts OWNER TO postgres;

--
-- Name: user_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_shifts_id_seq OWNER TO postgres;

--
-- Name: user_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_shifts_id_seq OWNED BY public.user_shifts.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255),
    rank character varying(50),
    email character varying(255),
    role_id integer,
    unit_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "position" character varying(255) DEFAULT ''::character varying,
    clearance_level integer DEFAULT 1,
    phone character varying(20),
    identity_card character varying(20),
    home_address text,
    unit_address text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_suggestions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions ALTER COLUMN id SET DEFAULT nextval('public.ai_suggestions_id_seq'::regclass);


--
-- Name: alert_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_messages ALTER COLUMN id SET DEFAULT nextval('public.alert_messages_id_seq'::regclass);


--
-- Name: api_rate_limits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_rate_limits ALTER COLUMN id SET DEFAULT nextval('public.api_rate_limits_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: broadcast_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_schedules ALTER COLUMN id SET DEFAULT nextval('public.broadcast_schedules_id_seq'::regclass);


--
-- Name: broadcast_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_sessions ALTER COLUMN id SET DEFAULT nextval('public.broadcast_sessions_id_seq'::regclass);


--
-- Name: channels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channels ALTER COLUMN id SET DEFAULT nextval('public.channels_id_seq'::regclass);


--
-- Name: content_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_items ALTER COLUMN id SET DEFAULT nextval('public.content_items_id_seq'::regclass);


--
-- Name: content_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_reviews ALTER COLUMN id SET DEFAULT nextval('public.content_reviews_id_seq'::regclass);


--
-- Name: delegations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegations ALTER COLUMN id SET DEFAULT nextval('public.delegations_id_seq'::regclass);


--
-- Name: device_broadcast_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_broadcast_logs ALTER COLUMN id SET DEFAULT nextval('public.device_broadcast_logs_id_seq'::regclass);


--
-- Name: device_commands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands ALTER COLUMN id SET DEFAULT nextval('public.device_commands_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: health_metrics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_metrics ALTER COLUMN id SET DEFAULT nextval('public.health_metrics_id_seq'::regclass);


--
-- Name: media_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files ALTER COLUMN id SET DEFAULT nextval('public.media_files_id_seq'::regclass);


--
-- Name: military_dictionary id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.military_dictionary ALTER COLUMN id SET DEFAULT nextval('public.military_dictionary_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: on_demand_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.on_demand_requests ALTER COLUMN id SET DEFAULT nextval('public.on_demand_requests_id_seq'::regclass);


--
-- Name: openclaw_api_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openclaw_api_logs ALTER COLUMN id SET DEFAULT nextval('public.openclaw_api_logs_id_seq'::regclass);


--
-- Name: openclaw_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openclaw_jobs ALTER COLUMN id SET DEFAULT nextval('public.openclaw_jobs_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: radios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radios ALTER COLUMN id SET DEFAULT nextval('public.radios_id_seq'::regclass);


--
-- Name: recording_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_sessions ALTER COLUMN id SET DEFAULT nextval('public.recording_sessions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: routine_commands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_commands ALTER COLUMN id SET DEFAULT nextval('public.routine_commands_id_seq'::regclass);


--
-- Name: schedule_proposals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_proposals ALTER COLUMN id SET DEFAULT nextval('public.schedule_proposals_id_seq'::regclass);


--
-- Name: score_leaderboard id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.score_leaderboard ALTER COLUMN id SET DEFAULT nextval('public.score_leaderboard_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: system_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config ALTER COLUMN id SET DEFAULT nextval('public.system_config_id_seq'::regclass);


--
-- Name: tts_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tts_jobs ALTER COLUMN id SET DEFAULT nextval('public.tts_jobs_id_seq'::regclass);


--
-- Name: unit_scores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_scores ALTER COLUMN id SET DEFAULT nextval('public.unit_scores_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Name: user_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registrations ALTER COLUMN id SET DEFAULT nextval('public.user_registrations_id_seq'::regclass);


--
-- Name: user_shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_shifts ALTER COLUMN id SET DEFAULT nextval('public.user_shifts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_suggestions (id, content_id, suggestion_type, suggested_text, original_text, is_applied, created_at) FROM stdin;
\.


--
-- Data for Name: alert_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alert_messages (id, sender_id, title, body, alert_level, target_unit_id, is_active, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: api_rate_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_rate_limits (id, identifier, endpoint, hits, reset_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, target_table, details, created_at, unit_id) FROM stdin;
1	\N	INITIAL_SCHEMA_SETUP	all	{"steps": 5, "status": "completed"}	2026-03-14 10:12:55.352584	\N
2	1	EMERGENCY_TRIGGERED	system_config	{"status": "active"}	2026-03-17 10:50:17.854621	\N
3	1	EMERGENCY_STOPPED	system_config	{"status": "inactive"}	2026-03-17 10:50:24.348252	\N
4	1	PASSWORD_CHANGED	users	{}	2026-03-21 02:40:27.86001	\N
5	1	PASSWORD_CHANGED	users	{}	2026-03-21 09:18:54.023908	\N
6	1	EMERGENCY_TRIGGERED	system_config	{"status": "active"}	2026-03-31 11:01:28.623829	\N
7	1	EMERGENCY_STOPPED	system_config	{"status": "inactive"}	2026-03-31 11:01:45.096264	\N
8	28	PROFILE_UPDATED	users	{"rank": "Thượng tá", "email": "duoc6@gmail.com", "position": "Chính trị viên", "full_name": "Nguyễn Bá D"}	2026-04-04 13:05:45.093663	\N
13	1	PROFILE_UPDATED	users	{"rank": "Đại Tá", "email": "", "unit_id": 24, "position": "", "full_name": "Quản trị viên Hệ thống"}	2026-04-04 15:02:30.406231	\N
14	1	PROFILE_UPDATED	users	{"rank": "Đại Tá", "email": "", "unit_id": 24, "position": "", "full_name": "Quản trị viên Hệ thống"}	2026-04-04 15:02:32.191934	\N
15	32	PROFILE_UPDATED	users	{"rank": "Đại úy", "email": "hai@gmail.com", "unit_id": 28, "position": "Đại đội trưởng", "full_name": "Đinh Ngoc Hai"}	2026-04-06 14:11:06.802946	\N
16	32	PROFILE_UPDATED	users	{"rank": "Trung Tá", "email": "hai@gmail.com", "unit_id": 28, "position": "Tiểu đoàn trưởng", "full_name": "Đinh Ngoc Hai"}	2026-04-07 14:27:20.387241	\N
17	28	PROFILE_UPDATED	users	{"rank": "Thượng tá", "email": "duoc6@gmail.com", "unit_id": 31, "position": "Chính trị viên", "full_name": "Nguyễn Bá D"}	2026-04-07 14:34:47.745173	\N
18	28	PROFILE_UPDATED	users	{"rank": "Đại úy", "email": "duoc6@gmail.com", "unit_id": 31, "position": "Chính trị viên", "full_name": "Nguyễn Bá D"}	2026-04-07 14:34:58.072514	\N
\.


--
-- Data for Name: broadcast_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.broadcast_schedules (id, channel_id, content_id, scheduled_time, duration, repeat_pattern, is_active, created_at, triggered_at, radio_id, stopped_at, routine_id, unit_id, is_all_units) FROM stdin;
132	2	126	2026-03-31 07:24:19.114+00	301	\N	t	2026-04-06 13:24:18.698551+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
131	8	126	2026-03-31 13:24:19.111+00	301	\N	t	2026-04-06 13:24:18.695268+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
130	7	126	2026-04-01 01:24:19.108+00	301	\N	t	2026-04-06 13:24:18.691769+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
127	2	126	2026-04-02 01:24:19.099+00	301	\N	t	2026-04-06 13:24:18.682237+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
126	8	126	2026-04-02 07:24:19.096+00	301	\N	t	2026-04-06 13:24:18.679092+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
125	7	126	2026-04-02 13:24:19.092+00	301	\N	t	2026-04-06 13:24:18.675473+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
122	2	126	2026-04-03 13:24:19.082+00	301	\N	t	2026-04-06 13:24:18.664166+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
121	8	126	2026-04-04 01:24:19.078+00	301	\N	t	2026-04-06 13:24:18.660949+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
120	7	126	2026-04-04 07:24:19.075+00	301	\N	t	2026-04-06 13:24:18.657597+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
117	2	126	2026-04-05 07:24:19.063+00	301	\N	t	2026-04-06 13:24:18.645038+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
116	8	126	2026-04-05 13:24:19.059+00	301	\N	t	2026-04-06 13:24:18.641432+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
115	7	126	2026-04-06 01:24:19.054+00	301	\N	t	2026-04-06 13:24:18.635451+00	2026-04-08 10:28:33.528185+00	\N	2026-04-08 10:33:36.349+00	\N	\N	f
146	\N	\N	2026-04-10 12:00:00+00	3600	daily	t	2026-04-10 03:05:49.541189+00	2026-04-10 03:29:57.639519+00	5	\N	\N	28	f
147	\N	\N	2026-04-11 00:23:00+00	\N	daily	t	2026-04-11 00:22:35.697996+00	\N	\N	\N	116	28	f
\.


--
-- Data for Name: broadcast_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.broadcast_sessions (id, channel_id, content_id, start_time, end_time, actual_duration, status, listener_count_peak, created_at, duration, schedule_id, radio_id) FROM stdin;
637	\N	\N	2026-04-10 02:42:30.541972+00	\N	\N	completed	0	2026-04-10 02:42:30.541972+00	180	144	5
4	2	\N	2026-03-22 03:33:41.482242+00	\N	\N	completed	0	2026-03-22 03:33:41.482242+00	300	29	\N
5	2	\N	2026-03-22 03:34:26.035862+00	\N	\N	completed	0	2026-03-22 03:34:26.035862+00	300	29	\N
6	2	\N	2026-03-22 03:43:39.975531+00	\N	\N	completed	0	2026-03-22 03:43:39.975531+00	300	29	\N
9	2	\N	2026-03-22 03:46:31.653326+00	\N	\N	completed	0	2026-03-22 03:46:31.653326+00	300	29	\N
10	2	\N	2026-03-22 03:46:51.437134+00	\N	\N	completed	0	2026-03-22 03:46:51.437134+00	300	29	\N
11	2	\N	2026-03-22 03:52:37.133497+00	\N	\N	completed	0	2026-03-22 03:52:37.133497+00	300	29	\N
14	2	\N	2026-03-22 10:15:08.574482+00	\N	\N	completed	0	2026-03-22 10:15:08.574482+00	300	29	\N
17	\N	\N	2026-03-25 14:16:09.949183+00	\N	\N	completed	0	2026-03-25 14:16:09.949183+00	300	34	\N
18	\N	\N	2026-03-25 14:17:05.120221+00	\N	\N	completed	0	2026-03-25 14:17:05.120221+00	300	34	\N
19	\N	\N	2026-03-25 14:17:14.899559+00	\N	\N	completed	0	2026-03-25 14:17:14.899559+00	300	34	\N
20	\N	\N	2026-03-25 14:32:34.337176+00	\N	\N	completed	0	2026-03-25 14:32:34.337176+00	300	34	\N
21	\N	\N	2026-03-26 12:44:40.59797+00	\N	\N	completed	0	2026-03-26 12:44:40.59797+00	300	35	\N
22	\N	\N	2026-03-26 12:45:30.421579+00	\N	\N	completed	0	2026-03-26 12:45:30.421579+00	300	35	\N
23	\N	\N	2026-03-26 12:45:41.826606+00	\N	\N	completed	0	2026-03-26 12:45:41.826606+00	300	35	\N
24	\N	\N	2026-03-26 12:55:34.05653+00	\N	\N	completed	0	2026-03-26 12:55:34.05653+00	300	35	\N
25	\N	\N	2026-03-26 12:55:56.759707+00	\N	\N	completed	0	2026-03-26 12:55:56.759707+00	300	35	\N
26	\N	\N	2026-03-26 13:06:51.848997+00	\N	\N	completed	0	2026-03-26 13:06:51.848997+00	300	35	\N
31	2	\N	2026-03-26 13:07:49.65077+00	\N	\N	completed	0	2026-03-26 13:07:49.65077+00	300	36	\N
32	\N	\N	2026-03-26 13:08:33.17628+00	\N	\N	completed	0	2026-03-26 13:08:33.17628+00	300	35	\N
33	\N	\N	2026-03-26 13:08:48.134175+00	\N	\N	completed	0	2026-03-26 13:08:48.134175+00	300	35	\N
619	7	126	2026-04-05 23:24:19.124+00	2026-04-06 00:24:19.124+00	\N	completed	0	2026-04-06 13:24:18.708629+00	301	\N	\N
620	8	126	2026-04-05 11:24:19.127+00	2026-04-05 12:24:19.127+00	\N	completed	0	2026-04-06 13:24:18.712056+00	301	\N	\N
621	2	126	2026-04-05 05:24:19.13+00	2026-04-05 06:24:19.13+00	\N	completed	0	2026-04-06 13:24:18.715406+00	301	\N	\N
624	7	126	2026-04-04 05:24:19.14+00	2026-04-04 06:24:19.14+00	\N	completed	0	2026-04-06 13:24:18.724836+00	301	\N	\N
45	\N	\N	2026-03-26 13:59:42.463878+00	\N	\N	completed	0	2026-03-26 13:59:42.463878+00	300	35	\N
46	2	\N	2026-03-26 13:59:57.038322+00	\N	\N	completed	0	2026-03-26 13:59:57.038322+00	300	36	\N
47	2	\N	2026-03-26 14:00:16.443795+00	\N	\N	completed	0	2026-03-26 14:00:16.443795+00	300	36	\N
48	2	\N	2026-03-26 14:00:23.679055+00	\N	\N	completed	0	2026-03-26 14:00:23.679055+00	300	36	\N
49	2	\N	2026-03-26 14:00:31.166621+00	\N	\N	completed	0	2026-03-26 14:00:31.166621+00	300	36	\N
50	\N	\N	2026-03-26 14:00:48.673993+00	\N	\N	completed	0	2026-03-26 14:00:48.673993+00	300	35	\N
625	8	126	2026-04-03 23:24:19.143+00	2026-04-04 00:24:19.143+00	\N	completed	0	2026-04-06 13:24:18.728187+00	301	\N	\N
626	2	126	2026-04-03 11:24:19.146+00	2026-04-03 12:24:19.146+00	\N	completed	0	2026-04-06 13:24:18.731231+00	301	\N	\N
629	7	126	2026-04-02 11:24:19.155+00	2026-04-02 12:24:19.155+00	\N	completed	0	2026-04-06 13:24:18.740877+00	301	\N	\N
630	8	126	2026-04-02 05:24:19.158+00	2026-04-02 06:24:19.158+00	\N	completed	0	2026-04-06 13:24:18.743911+00	301	\N	\N
631	2	126	2026-04-01 23:24:19.161+00	2026-04-02 00:24:19.161+00	\N	completed	0	2026-04-06 13:24:18.747248+00	301	\N	\N
634	7	126	2026-03-31 23:24:19.169+00	2026-04-01 00:24:19.169+00	\N	completed	0	2026-04-06 13:24:18.755813+00	301	\N	\N
635	8	126	2026-03-31 11:24:19.172+00	2026-03-31 12:24:19.172+00	\N	completed	0	2026-04-06 13:24:18.75847+00	301	\N	\N
636	2	126	2026-03-31 05:24:19.175+00	2026-03-31 06:24:19.175+00	\N	completed	0	2026-04-06 13:24:18.761442+00	301	\N	\N
497	7	126	2026-04-03 12:52:59.520506+00	2026-04-03 13:02:59.520506+00	\N	completed	0	2026-04-03 12:52:59.520506+00	\N	\N	\N
498	7	126	2026-04-03 12:52:59.526668+00	2026-04-03 13:02:59.526668+00	\N	completed	0	2026-04-03 12:52:59.526668+00	\N	\N	\N
499	7	126	2026-04-03 12:52:59.530369+00	2026-04-03 13:02:59.530369+00	\N	completed	0	2026-04-03 12:52:59.530369+00	\N	\N	\N
638	\N	\N	2026-04-10 02:42:46.415784+00	\N	\N	completed	0	2026-04-10 02:42:46.415784+00	180	144	5
500	7	126	2026-04-03 12:52:59.533979+00	2026-04-03 13:02:59.533979+00	\N	completed	0	2026-04-03 12:52:59.533979+00	\N	\N	\N
501	7	126	2026-04-03 12:52:59.537959+00	2026-04-03 13:02:59.537959+00	\N	completed	0	2026-04-03 12:52:59.537959+00	\N	\N	\N
502	7	126	2026-04-03 12:52:59.541863+00	2026-04-03 13:02:59.541863+00	\N	completed	0	2026-04-03 12:52:59.541863+00	\N	\N	\N
503	7	126	2026-04-03 12:52:59.545662+00	2026-04-03 13:02:59.545662+00	\N	completed	0	2026-04-03 12:52:59.545662+00	\N	\N	\N
504	7	126	2026-04-03 12:52:59.548986+00	2026-04-03 13:02:59.548986+00	\N	completed	0	2026-04-03 12:52:59.548986+00	\N	\N	\N
505	7	126	2026-04-03 12:52:59.552055+00	2026-04-03 13:02:59.552055+00	\N	completed	0	2026-04-03 12:52:59.552055+00	\N	\N	\N
506	7	126	2026-04-03 12:52:59.555287+00	2026-04-03 13:02:59.555287+00	\N	completed	0	2026-04-03 12:52:59.555287+00	\N	\N	\N
507	8	126	2026-04-03 12:52:59.562227+00	2026-04-03 13:02:59.562227+00	\N	completed	0	2026-04-03 12:52:59.562227+00	\N	\N	\N
508	8	126	2026-04-03 12:52:59.565374+00	2026-04-03 13:02:59.565374+00	\N	completed	0	2026-04-03 12:52:59.565374+00	\N	\N	\N
509	8	126	2026-04-03 12:52:59.56839+00	2026-04-03 13:02:59.56839+00	\N	completed	0	2026-04-03 12:52:59.56839+00	\N	\N	\N
510	8	126	2026-04-03 12:52:59.571468+00	2026-04-03 13:02:59.571468+00	\N	completed	0	2026-04-03 12:52:59.571468+00	\N	\N	\N
511	8	126	2026-04-03 12:52:59.574821+00	2026-04-03 13:02:59.574821+00	\N	completed	0	2026-04-03 12:52:59.574821+00	\N	\N	\N
512	8	126	2026-04-03 12:52:59.577786+00	2026-04-03 13:02:59.577786+00	\N	completed	0	2026-04-03 12:52:59.577786+00	\N	\N	\N
513	8	126	2026-04-03 12:52:59.580838+00	2026-04-03 13:02:59.580838+00	\N	completed	0	2026-04-03 12:52:59.580838+00	\N	\N	\N
514	8	126	2026-04-03 12:52:59.584438+00	2026-04-03 13:02:59.584438+00	\N	completed	0	2026-04-03 12:52:59.584438+00	\N	\N	\N
515	8	126	2026-04-03 12:52:59.587562+00	2026-04-03 13:02:59.587562+00	\N	completed	0	2026-04-03 12:52:59.587562+00	\N	\N	\N
516	8	126	2026-04-03 12:52:59.590644+00	2026-04-03 13:02:59.590644+00	\N	completed	0	2026-04-03 12:52:59.590644+00	\N	\N	\N
1	2	\N	2026-03-22 02:09:54.081626+00	2026-03-22 02:14:54.081626+00	\N	completed	0	2026-03-22 03:28:21.756321+00	\N	30	\N
2	2	\N	2026-03-22 02:09:54.081626+00	2026-03-22 02:14:54.081626+00	\N	completed	0	2026-03-22 03:28:21.756321+00	\N	29	\N
8	2	\N	2026-03-22 03:43:58.246256+00	\N	\N	completed	0	2026-03-22 03:43:58.246256+00	300	\N	\N
13	2	\N	2026-03-22 10:14:40.378708+00	\N	\N	completed	0	2026-03-22 10:14:40.378708+00	300	\N	\N
28	2	\N	2026-03-26 13:07:20.785452+00	\N	\N	completed	0	2026-03-26 13:07:20.785452+00	300	\N	\N
30	2	\N	2026-03-26 13:07:31.028188+00	\N	\N	completed	0	2026-03-26 13:07:31.028188+00	300	\N	\N
34	2	\N	2026-03-26 13:42:41.040632+00	\N	\N	completed	0	2026-03-26 13:42:41.040632+00	300	36	\N
35	2	\N	2026-03-26 13:42:50.539232+00	\N	\N	completed	0	2026-03-26 13:42:50.539232+00	300	36	\N
40	2	\N	2026-03-26 13:51:17.237554+00	\N	\N	completed	0	2026-03-26 13:51:17.237554+00	300	36	\N
99	2	\N	2026-03-30 13:47:41.387352+00	\N	\N	completed	0	2026-03-30 13:47:41.387352+00	360	50	\N
100	2	\N	2026-03-30 13:47:41.437977+00	\N	\N	completed	0	2026-03-30 13:47:41.437977+00	360	50	\N
106	2	\N	2026-03-30 21:07:14.604+00	\N	\N	completed	0	2026-03-30 14:07:14.7322+00	240	50	\N
107	2	\N	2026-03-30 21:07:14.604+00	\N	\N	completed	0	2026-03-30 14:07:14.779199+00	240	50	\N
639	\N	\N	2026-04-10 03:29:57.674781+00	\N	\N	completed	0	2026-04-10 03:29:57.674781+00	3600	146	5
112	2	\N	2026-03-30 14:23:23.160351+00	\N	\N	completed	0	2026-03-30 14:23:23.160351+00	300	\N	\N
114	2	\N	2026-03-30 14:23:34.742953+00	\N	\N	completed	0	2026-03-30 14:23:34.742953+00	300	\N	\N
\.


--
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.channels (id, name, mount_point, description, unit_id, status, created_at) FROM stdin;
7	Kênh Tiểu đoàn 5	c1_broadcast	\N	16	offline	2026-04-03 12:52:59.469622
8	Kênh Tiểu đoàn 6	c2_broadcast	\N	17	offline	2026-04-03 12:52:59.558796
2	Kênh hệ thống 3	/ky_thuat	Kênh hướng dẫn và bảo trì thiết bị	3	online	2026-03-15 13:23:09.925807
\.


--
-- Data for Name: content_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_items (id, title, body, summary, author_id, unit_id, status, tags, created_at, updated_at, validation_results, clearance_level) FROM stdin;
126	Bài viết thi đua C1 - Số 1	Nội dung thi đua C1	\N	\N	16	approved	\N	2026-04-03 12:52:59.47702	2026-04-03 12:52:59.47702	\N	1
127	Bài viết thi đua C1 - Số 2	Nội dung thi đua C1	\N	\N	16	approved	\N	2026-04-03 12:52:59.483767	2026-04-03 12:52:59.483767	\N	1
128	Bài viết thi đua C1 - Số 3	Nội dung thi đua C1	\N	\N	16	approved	\N	2026-04-03 12:52:59.488485	2026-04-03 12:52:59.488485	\N	1
129	Bài viết thi đua C1 - Số 4	Nội dung thi đua C1	\N	\N	16	approved	\N	2026-04-03 12:52:59.492625	2026-04-03 12:52:59.492625	\N	1
130	Bài viết thi đua C1 - Số 5	Nội dung thi đua C1	\N	\N	16	approved	\N	2026-04-03 12:52:59.516873	2026-04-03 12:52:59.516873	\N	1
131	abc	chính trị viên đại đội 8 là đại úy nguyễn văn phong	tên thủ trưởng	1	24	pending_review	{}	2026-04-07 23:47:42.735644	2026-04-07 23:47:42.735644	{"score": 90, "feedback": "Nội dung đảm bảo tính chính quy, đạt chất lượng tốt.", "sentiment": "neutral", "violations": [], "hasViolations": false}	1
133	Bản tin âm thanh: TTS_tin_nguoi_tot_viec_tot.mp3	[Bản tin tập trung nội dung âm thanh]		1	24	approved	{}	2026-04-08 08:04:04.167865	2026-04-08 10:11:49.906229	{"score": 60, "feedback": "Nội dung ổn nhưng cần bổ sung thêm các yếu tố chào hỏi/chi tiết.", "sentiment": "neutral", "violations": [], "hasViolations": false}	1
135	tin bài gương điển hình tiên tiến	Kính chào các đồng chí và các bạn, mời các đồng chí đến với bản tin phát thanh hôm nay.\n\nTấm gương điển hình tiên tiến trong học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh.\n\nQuân đội nhân dân Việt Nam do Đảng Cộng sản Việt Nam và Chủ tịch Hồ Chí Minh sáng lập, lãnh đạo, giáo dục và rèn luyện, được nhân dân tin yêu, giúp đỡ, không ngừng trưởng thành, lớn mạnh, lập nhiều chiến công trong sự nghiệp giải phóng dân tộc, xây dựng và bảo vệ Tổ quốc. Mỗi chiến công, mỗi bước trưởng thành của Quân đội đều gắn liền với Đảng, Bác Hồ và nhân dân. Những năm qua, việc học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh đã trở thành việc làm thường xuyên, liên tục, là tình cảm, trách nhiệm của cán bộ, chiến sĩ Quân đội nhân dân Việt Nam đối với Chủ tịch Hồ Chí Minh - người tổ chức, giáo dục, rèn luyện Quân đội ta, người cha thân yêu của các lực lượng vũ trang nhân dân.\n\nThật vậy, thời gian qua, ở Trung đoàn 8 nói chung và Tiểu đoàn 5 nói riêng đã triển khai thực hiện tổng hợp nhiều biện pháp nhằm nâng cao nhận thức của cán bộ, đảng viên, quần chúng về giá trị, ý nghĩa to lớn của tư tưởng, đạo đức, phong cách Hồ Chí Minh, đổi mới nội dung, hình thức học tập, tuyên truyền về tư tưởng, đạo đức, phong cách Hồ Chí Minh. Trong đó, chú trọng tuyên truyền gương người tốt, việc tốt, nhân rộng gương điển hình tiêu biểu xuất sắc ở từng đơn vị trong học tập và làm theo Bác. Qua đó, làm cho việc học tập và làm theo Bác thực sự đi vào đời sống, gần gũi với bộ đội, dễ học tập, dễ làm theo và muốn học tập, muốn làm theo. Nhờ vậy, việc học tập và làm theo Bác đã thấm sâu vào trong nhận thức, tư tưởng, hành động và trở thành việc làm thường xuyên, tự giác của mỗi cán bộ, chiến sĩ trong đơn vị. Và một trong những tấm gương điển hình tiên tiến trong học tập và làm theo Bác ở đơn vị được cán bộ, chiến sĩ trong đơn vị tin tưởng và thực hành làm theo là đồng chí Trung úy Phạm Sỹ Linh, Trung đội trưởng, Trung đội 2, Đại đội 8, Tiểu đoàn 5.\n\nSinh ra và lớn lên trên mảnh đất Ninh Bình giàu truyền thống cách mạng, năm 2018, sau khi tốt nghiệp Trung học phổ thông, Phạm Sỹ Linh thi đỗ vào Trường Sĩ quan Lục quân 1. Tốt nghiệp tháng 8 năm 2022, đồng chí được phong quân hàm Thiếu úy và được điều động về công tác tại Trung đoàn 8, Sư đoàn 395. Là cán bộ mới ra trường, nhưng Phạm Sỹ Linh luôn nhiệt huyết, năng nổ, xông xáo trong mọi nhiệm vụ. Thời gian đầu trên cương vị Trung đội trưởng, Linh luôn chủ động học hỏi, trau dồi kiến thức, kinh nghiệm trong huấn luyện và quản lý bộ đội.\n\nTrong quá trình công tác tại Đại đội 8, đồng chí luôn tích cực học tập nâng cao trình độ chuyên môn, không ngừng tu dưỡng đạo đức, phong cách công tác theo tấm gương của Chủ tịch Hồ Chí Minh. Ở bất cứ cương vị nào, đồng chí Linh cũng thể hiện tinh thần trách nhiệm cao, tận tâm, tận lực vì nhiệm vụ chung. Là một cán bộ trẻ, đồng chí thường xuyên gần gũi, sẻ chia, giúp đỡ chiến sĩ mới, xây dựng môi trường đoàn kết, kỷ luật trong đơn vị.\n\nTrên cương vị trung đội trưởng, đồng chí Linh đã cùng chỉ huy đại đội duy trì nghiêm kỷ luật, xây dựng nền nếp chính quy; quán triệt, giáo dục bộ đội có nhận thức đúng đắn, bản lĩnh chính trị vững vàng, có tinh thần trách nhiệm cao trong thực hiện nhiệm vụ. Trong huấn luyện, anh chú trọng bồi dưỡng cán bộ khẩu đội trưởng về nội dung, phương pháp truyền tải kiến thức quân sự, chiến thuật, kết hợp lý thuyết và thực hành. Ngoài ra Trung úy Phạm Sỹ Linh còn được biết đến là người tích cực trong học tập, nghiên cứu để tìm ra những giải pháp, những sáng kiến cải tiến mới có giá trị ứng dụng cao trong huấn luyện. Nhờ đó, kết quả kiểm tra các nội dung huấn luyện của đơn vị luôn đạt kết quả cao, cán bộ, chiến sĩ trong đơn vị luôn an tâm công tác, nắm chắc các nội dung, hoàn thành tốt các nhiệm vụ được giao.\n\nHọc và làm theo Bác trong việc tương thân tương ái, giúp đỡ lẫn nhau, đồng chí luôn gần gũi, động viên, chia sẻ với khó khăn của bộ đội; tận tình giúp đỡ cán bộ, chiến sĩ trong đơn vị. Đối với những khúc mắc, chưa thông suốt, anh đều ân cần, mềm dẻo chỉ bảo, hướng dẫn. Hàng ngày, ngoài công việc chuyên môn, anh thường xuyên thăm hỏi tìm hiểu gia cảnh, nguyện vọng cán bộ, chiến sĩ để có hướng chia sẻ, giúp đỡ. Trong đơn vị có cán bộ, chiến sĩ hay gia đình người thân bị bệnh, anh đều tổ chức thăm hỏi, động viên. Qua đó, anh luôn nhận được sự kính trọng, yêu thương của đồng chí, đồng đội; quý mến của cán bộ, chiến sĩ trong đơn vị.\n\nHọc Bác tính cần kiệm, Linh luôn nhắc nhở chiến sĩ trong đơn vị sử dụng tiết kiệm điện, nước, nhu yếu phẩm một cách hợp lý nhằm tránh lãng phí. Bên cạnh đó, đồng chí cũng quan tâm vận động chiến sĩ đơn vị tích cực, đẩy mạnh tăng gia sản xuất, nâng cao chất lượng bữa ăn của bộ đội.\n\nChia sẻ về kinh nghiệm trong công tác, Trung úy Phạm Sỹ Linh cho rằng: Cái gì có lợi cho đơn vị, có ích cho cán bộ, chiến sĩ, giúp xây dựng đơn vị vững mạnh thì có khó khăn, vất vả thế nào cũng phải cố gắng vượt qua để thực hiện. Bí quyết mang lại thành công của đơn vị là luôn giữ tốt mối đoàn kết, nhất trí trong Ban chỉ huy, đội ngũ cán bộ phải như anh em, làm việc theo chức trách, hành động theo điều lệnh. Tất cả công việc trong đơn vị đều được trao đổi, bàn bạc thống nhất, như vậy mọi việc mới suôn sẻ.\n\nNhận xét về Trung úy Phạm Sỹ Linh, Thiếu tá Trịnh Công Trung, Chính trị viên Tiểu đoàn 5 khẳng định, đồng chí Linh là cán bộ trẻ năng nổ, đầy nhiệt huyết và sát sao trong công việc. Quá trình công tác, đồng chí Linh luôn tích cực tìm tòi, sáng tạo để nâng cao chất lượng huấn luyện, quản lý bộ đội. Nhờ đó mà đơn vị luôn có kết quả huấn luyện, rèn luyện tốt, thường xuyên dẫn đầu các phong trào thi đua. Chỉ huy các cấp rất tin tưởng mỗi khi giao nhiệm vụ cho đồng chí Linh.\n\nKết quả thực hiện nhiệm vụ nói chung của Trung úy Phạm Sỹ Linh được cấp trên ghi nhận. Năm 2023 đồng chí Linh được đề nghị thăng quân hàm trước niên hạn từ thiếu úy lên trung úy. Đây sẽ là nguồn động lực để đồng chí Linh tiếp tục nỗ lực phấn đấu, đạt nhiều thành tích cao hơn nữa trong thời gian tới.\n\nĐồng chí Trung úy Phạm Sỹ Linh thực sự là một tấm gương sáng, một gương điển hình tiên tiến trong học tập và làm theo Bác để toàn thể cán bộ, chiến sĩ trong đơn vị học tập và noi theo. Tin tưởng rằng, trong thời gian tới, với những thành tích đáng tự hào đã đạt được cùng với tinh thần cố gắng, học tập không ngừng nghỉ của mình, đồng chí tiếp tục gặt hái được những thành công mới, góp phần xây dựng đơn vị vững mạnh toàn diện, mẫu mực, tiêu biểu.\n\nBản tin đến đây là kết thúc, xin cảm ơn và chúc sức khỏe các đồng chí.	Bản tin tập trung vào nội dung triển khai kế hoạch đơn vị và các lưu ý quan trọng về kỷ luật.	32	28	approved	{}	2026-04-10 10:46:50.648761	2026-04-10 03:47:03.900207	{"score": 90, "feedback": "Nội dung đảm bảo tính chính quy, đạt chất lượng tốt.", "sentiment": "neutral", "violations": [], "hasViolations": false}	1
132	ád	Huấn luyện chiến sĩ mới là giai đoạn quan trọng, bước khởi đầu mang tính bản lề. Trải qua 3 tuần huấn luyện trong môi trường quân ngũ, từ sự lạ lẫm, bỡ ngỡ ban đầu, các chiến sĩ xác định rõ động cơ, ý thức trách nhiệm, nỗ lực học tập, tu dưỡng và rèn luyện. Qua đó, phấn đấu trở thành những người quân nhân thực thụ, sẵn sàng nhận và hoàn thành mọi nhiệm vụ cấp trên giao.	yui	1	24	pending_review	{}	2026-04-08 02:43:19.35516	2026-04-08 02:43:19.35516	{"score": 90, "feedback": "Nội dung đảm bảo tính chính quy, đạt chất lượng tốt.", "sentiment": "neutral", "violations": [], "hasViolations": false}	1
\.


--
-- Data for Name: content_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_reviews (id, content_id, reviewer_type, reviewer_id, score, comments, is_sensitive, created_at) FROM stdin;
\.


--
-- Data for Name: delegations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delegations (id, delegator_id, delegatee_id, role_id, start_time, end_time, status, created_at) FROM stdin;
\.


--
-- Data for Name: device_broadcast_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.device_broadcast_logs (id, device_id, schedule_id, content_id, channel_id, start_time, end_time, status, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: device_commands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.device_commands (id, device_id, operator_id, command, payload, status, created_at) FROM stdin;
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devices (id, name, type, ip_address, status, unit_id, last_seen, created_at, channel_id, volume, signal_strength, firmware_version, last_maintenance, maintenance_notes) FROM stdin;
2	Loa Khu vực B - Cổng chính	speaker	192.168.1.102	offline	\N	2026-04-06 13:24:18.768764	2026-03-15 12:41:42.940898	\N	50	100	v1.0.0	2026-04-02 13:21:15.658944	\N
24	Lao Đại 7	speaker	123232343	offline	32	2026-04-09 08:36:57.287276	2026-04-09 08:36:57.287276	2	50	100	v1.0.0	2026-04-09 08:36:57.287276	\N
25	Lao Đại 7	speaker	123.100.111	offline	31	2026-04-09 08:59:21.491781	2026-04-09 08:59:21.491781	\N	50	100	v1.0.0	2026-04-09 08:59:21.491781	\N
26	Lao thiếr bị đại 7	speaker	123.12.2321.2	offline	31	2026-04-09 09:00:19.12041	2026-04-09 09:00:19.12041	\N	50	100	v1.0.0	2026-04-09 09:00:19.12041	\N
\.


--
-- Data for Name: health_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.health_metrics (id, service_name, status, cpu_usage, memory_usage, uptime_seconds, recorded_at) FROM stdin;
1	auth-service	healthy	4.57	464605844	864000	2026-03-15 21:10:59.496
2	media-service	healthy	19.56	552677535	864000	2026-03-15 21:10:59.496
3	broadcast-engine	degraded	7.30	216964430	864000	2026-03-15 21:10:59.496
4	api-gateway	healthy	12.95	164619643	864000	2026-03-15 21:10:59.496
5	auth-service	healthy	5.41	458440753	867600	2026-03-15 20:10:59.496
6	media-service	healthy	9.60	428922004	867600	2026-03-15 20:10:59.496
7	broadcast-engine	healthy	17.47	150782277	867600	2026-03-15 20:10:59.496
8	api-gateway	healthy	13.67	563554425	867600	2026-03-15 20:10:59.496
9	auth-service	healthy	21.78	430654697	871200	2026-03-15 19:10:59.496
10	media-service	healthy	15.70	189824320	871200	2026-03-15 19:10:59.496
11	broadcast-engine	healthy	5.38	562776930	871200	2026-03-15 19:10:59.496
12	api-gateway	healthy	16.56	213216803	871200	2026-03-15 19:10:59.496
13	auth-service	healthy	12.45	463044757	874800	2026-03-15 18:10:59.496
14	media-service	healthy	11.62	146412180	874800	2026-03-15 18:10:59.496
15	broadcast-engine	healthy	5.70	252365035	874800	2026-03-15 18:10:59.496
16	api-gateway	healthy	19.00	324515109	874800	2026-03-15 18:10:59.496
17	auth-service	healthy	11.67	522965910	878400	2026-03-15 17:10:59.496
18	media-service	healthy	4.16	590165063	878400	2026-03-15 17:10:59.496
19	broadcast-engine	healthy	3.34	483956759	878400	2026-03-15 17:10:59.496
20	api-gateway	healthy	19.56	274865607	878400	2026-03-15 17:10:59.496
21	auth-service	healthy	12.14	511458345	882000	2026-03-15 16:10:59.496
22	media-service	degraded	6.95	357387678	882000	2026-03-15 16:10:59.496
23	broadcast-engine	healthy	13.33	575132313	882000	2026-03-15 16:10:59.496
24	api-gateway	healthy	9.80	321671185	882000	2026-03-15 16:10:59.496
25	auth-service	healthy	5.79	472650622	885600	2026-03-15 15:10:59.496
26	media-service	healthy	5.76	311888948	885600	2026-03-15 15:10:59.496
27	broadcast-engine	healthy	2.24	581011434	885600	2026-03-15 15:10:59.496
28	api-gateway	healthy	21.78	409092322	885600	2026-03-15 15:10:59.496
29	auth-service	healthy	5.05	354933012	889200	2026-03-15 14:10:59.496
30	media-service	healthy	17.36	390963409	889200	2026-03-15 14:10:59.496
31	broadcast-engine	healthy	21.75	495356539	889200	2026-03-15 14:10:59.496
32	api-gateway	healthy	13.02	211151594	889200	2026-03-15 14:10:59.496
33	auth-service	healthy	13.62	132840509	892800	2026-03-15 13:10:59.496
34	media-service	healthy	3.56	519121640	892800	2026-03-15 13:10:59.496
35	broadcast-engine	healthy	3.17	447719958	892800	2026-03-15 13:10:59.496
36	api-gateway	healthy	8.67	215421746	892800	2026-03-15 13:10:59.496
37	auth-service	healthy	4.02	571465117	896400	2026-03-15 12:10:59.496
38	media-service	healthy	14.19	225336463	896400	2026-03-15 12:10:59.496
39	broadcast-engine	healthy	8.54	533075560	896400	2026-03-15 12:10:59.496
40	api-gateway	healthy	11.40	218395870	896400	2026-03-15 12:10:59.496
\.


--
-- Data for Name: media_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_files (id, content_id, file_name, file_path, bucket_name, file_size, mime_type, duration, status, created_at, bitrate, sample_rate, tags, category, clearance_level, unit_id) FROM stdin;
42	\N	6 Khúc Hát Người Lính Trẻ Quân Khu 3 - YouTube.mp3	2fe2b796-a16b-4e6d-980e-687ada261e0d.mp3	openclaw-media	4105772	audio/mpeg	00:04:17	ready	2026-04-09 09:27:16.579123	\N	\N	\N	\N	1	28
45	135	TTS_tin_bai_guong_dien_hinh_tien_tien.mp3	259b9cb7-e509-4681-8b9f-8a83dfcb1055.mp3	openclaw-media	3254564	audio/mpeg	00:05:29	ready	2026-04-10 04:00:05.676133	\N	\N	\N	\N	1	28
34	131	TTS_abc.mp3	1ca5d9d0-af9c-4d78-beeb-080d86fb2742.mp3	openclaw-media	33024	audio/mpeg	\N	ready	2026-04-07 23:48:04.88914	\N	\N	\N	\N	1	24
35	131	TTS_abc.mp3	d2415d4c-56a2-4d50-aae2-17f1642267d7.mp3	openclaw-media	33024	audio/mpeg	00:00:04	ready	2026-04-07 23:58:50.507207	\N	\N	\N	\N	1	24
38	131	TTS_abc.mp3	dd464ad9-c8ad-426c-8aa4-bdbb87d42a53.mp3	openclaw-media	22464	audio/mpeg	00:00:04	ready	2026-04-08 09:10:10.025291	\N	\N	\N	\N	1	24
39	132	TTS_ad.mp3	2f4be965-8a11-45eb-a95d-09655c46bbb5.mp3	openclaw-media	210212	audio/mpeg	00:00:24	ready	2026-04-08 02:44:12.051354	\N	\N	\N	\N	1	24
40	132	TTS_ad.mp3	d756048d-da87-44f7-9c84-a82369e05992.mp3	openclaw-media	231764	audio/mpeg	00:00:23	ready	2026-04-08 03:46:18.880025	\N	\N	\N	\N	1	24
41	133	TTS_tin_nguoi_tot_viec_tot.mp3	5b19ec88-b476-4b5f-adb9-52007e2e8778.mp3	openclaw-media	3218468	audio/mpeg	00:05:28	ready	2026-04-08 07:50:15.883959	\N	\N	\N	\N	1	24
\.


--
-- Data for Name: military_dictionary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.military_dictionary (id, word, phonetic_reading, category, created_at) FROM stdin;
1	QK1	Quân khu một	Đơn vị	2026-03-17 10:11:37.271709
2	QK2	Quân khu hai	Đơn vị	2026-03-17 10:11:37.271709
3	QK3	Quân khu ba	Đơn vị	2026-03-17 10:11:37.271709
4	QK4	Quân khu bốn	Đơn vị	2026-03-17 10:11:37.271709
5	QK5	Quân khu năm	Đơn vị	2026-03-17 10:11:37.271709
6	QK7	Quân khu bảy	Đơn vị	2026-03-17 10:11:37.271709
7	QK9	Quân khu chín	Đơn vị	2026-03-17 10:11:37.271709
8	LLVT	Lực lượng vũ trang	Thuật ngữ	2026-03-17 10:11:37.271709
9	QĐND	Quân đội nhân dân	Thuật ngữ	2026-03-17 10:11:37.271709
10	BQP	Bộ Quốc phòng	Đơn vị	2026-03-17 10:11:37.271709
11	BTL	Bộ Tư lệnh	Đơn vị	2026-03-17 10:11:37.271709
12	TCT	Tổng công ty	Đơn vị	2026-03-17 10:11:37.271709
13	TCCT	Tổng cục Chính trị	Đơn vị	2026-03-17 10:11:37.271709
14	TCHC	Tổng cục Hậu cần	Đơn vị	2026-03-17 10:11:37.271709
15	TCKT	Tổng cục Kỹ thuật	Đơn vị	2026-03-17 10:11:37.271709
16	TCNI	Tổng cục Công nghiệp quốc phòng	Đơn vị	2026-03-17 10:11:37.271709
17	TMT	Tổng Tham mưu trưởng	Cấp bậc	2026-03-17 10:11:37.271709
18	BTTM	Bộ Tổng Tham mưu	Đơn vị	2026-03-17 10:11:37.271709
19	TTG	Thiết giáp	Vũ khí	2026-03-17 10:11:37.271709
20	PB	Pháo binh	Đơn vị	2026-03-17 10:11:37.271709
21	CB	Công binh	Đơn vị	2026-03-17 10:11:37.271709
22	TTLL	Thông tin liên lạc	Thuật ngữ	2026-03-17 10:11:37.271709
23	ĐC	Đặc công	Đơn vị	2026-03-17 10:11:37.271709
24	HH	Hóa học	Đơn vị	2026-03-17 10:11:37.271709
25	PK-KQ	Phòng không Không quân	Đơn vị	2026-03-17 10:11:37.271709
26	HQ	Hải quân	Đơn vị	2026-03-17 10:11:37.271709
27	BP	Biên phòng	Đơn vị	2026-03-17 10:11:37.271709
28	CSB	Cảnh sát biển	Đơn vị	2026-03-17 10:11:37.271709
29	DQTV	Dân quân tự vệ	Thuật ngữ	2026-03-17 10:11:37.271709
30	DBHV	Dự bị động viên	Thuật ngữ	2026-03-17 10:11:37.271709
31	SSQ	Sĩ quan	Cấp bậc	2026-03-17 10:11:37.271709
32	QNCN	Quân nhân chuyên nghiệp	Cấp bậc	2026-03-17 10:11:37.271709
33	HSQ-BS	Hạ sĩ quan, binh sĩ	Cấp bậc	2026-03-17 10:11:37.271709
34	SQ	Sĩ quan	Cấp bậc	2026-03-17 10:11:37.271709
35	ĐV	Đơn vị	Thuật ngữ	2026-03-17 10:11:37.271709
36	CH	Chỉ huy	Thuật ngữ	2026-03-17 10:11:37.271709
37	TM	Tham mưu	Thuật ngữ	2026-03-17 10:11:37.271709
38	CT	Chính trị	Thuật ngữ	2026-03-17 10:11:37.271709
39	HC	Hậu cần	Thuật ngữ	2026-03-17 10:11:37.271709
40	KT	Kỹ thuật	Thuật ngữ	2026-03-17 10:11:37.271709
41	SSCĐ	Sẵn sàng chiến đấu	Chiến thuật	2026-03-17 10:11:37.271709
42	HL	Huấn luyện	Thuật ngữ	2026-03-17 10:11:37.271709
43	BB	Bộ binh	Đơn vị	2026-03-17 10:11:37.271709
44	BB-CG	Bộ binh cơ giới	Đơn vị	2026-03-17 10:11:37.271709
45	BM	Bí mật	Thuật ngữ	2026-03-17 10:11:37.271709
46	BATN	Bí mật an toàn	Thuật ngữ	2026-03-17 10:11:37.271709
47	KTHH	Kinh tế hàng hóa	Thuật ngữ	2026-03-17 10:11:37.271709
48	XHCN	Xã hội chủ nghĩa	Thuật ngữ	2026-03-17 10:11:37.271709
49	TƯ	Trung ương	Đơn vị	2026-03-17 10:11:37.271709
50	ĐCSVN	Đảng Cộng sản Việt Nam	Thuật ngữ	2026-03-17 10:11:37.271709
51	TNCS	Thanh niên Cộng sản	Thuật ngữ	2026-03-17 10:11:37.271709
52	HCM	Hồ Chí Minh	Thuật ngữ	2026-03-17 10:11:37.271709
53	VPA	Quân đội nhân dân Việt Nam	Thuật ngữ	2026-03-17 10:11:37.271709
54	GĐ	Giai đoạn	Thuật ngữ	2026-03-17 10:11:37.271709
55	KH	Kế hoạch	Thuật ngữ	2026-03-17 10:11:37.271709
56	PT	Phương tiện	Thuật ngữ	2026-03-17 10:11:37.271709
57	TB	Thiết bị	Vũ khí	2026-03-17 10:11:37.271709
58	KTQP	Kinh tế quốc phòng	Thuật ngữ	2026-03-17 10:11:37.271709
59	GDQP-AN	Giáo dục quốc phòng và an ninh	Thuật ngữ	2026-03-17 10:11:37.271709
60	ANQG	An ninh quốc gia	Thuật ngữ	2026-03-17 10:11:37.271709
61	TTAT	Trật tự an toàn	Thuật ngữ	2026-03-17 10:11:37.271709
62	BCH	Ban Chỉ huy	Đơn vị	2026-03-17 10:11:37.271709
63	BCHQS	Ban Chỉ huy quân sự	Đơn vị	2026-03-17 10:11:37.271709
64	ĐKĐ	Điều lệnh đội ngũ	Thuật ngữ	2026-03-17 10:11:37.271709
65	ĐLQY	Điều lệnh quản lý bộ đội	Thuật ngữ	2026-03-17 10:11:37.271709
66	KTHL	Kỹ thuật huấn luyện	Thuật ngữ	2026-03-17 10:11:37.271709
67	TLHC	Tài liệu hướng dẫn	Thuật ngữ	2026-03-17 10:11:37.271709
68	QĐ	Quyết định	Thuật ngữ	2026-03-17 10:11:37.271709
69	NQ	Nghị quyết	Thuật ngữ	2026-03-17 10:11:37.271709
70	TT	Thông tư	Thuật ngữ	2026-03-17 10:11:37.271709
71	NĐ	Nghị định	Thuật ngữ	2026-03-17 10:11:37.271709
72	LS	Lịch sử	Thuật ngữ	2026-03-17 10:11:37.271709
73	LSQD	Lịch sử quân đội	Thuật ngữ	2026-03-17 10:11:37.271709
74	TĐ	Trung đoàn	Đơn vị	2026-03-17 10:11:37.271709
75	LĐ	Lữ đoàn	Đơn vị	2026-03-17 10:11:37.271709
76	SĐ	Sư đoàn	Đơn vị	2026-03-17 10:11:37.271709
77	QD	Quân đoàn	Đơn vị	2026-03-17 10:11:37.271709
78	KND	Khu nghỉ dưỡng	Thuật ngữ	2026-03-17 10:11:37.271709
79	NH	Ngân hàng	Thuật ngữ	2026-03-17 10:11:37.271709
80	SX	Sản xuất	Thuật ngữ	2026-03-17 10:11:37.271709
81	KD	Kinh doanh	Thuật ngữ	2026-03-17 10:11:37.271709
82	CNH	Công nghiệp hóa	Thuật ngữ	2026-03-17 10:11:37.271709
83	HĐH	Hiện đại hóa	Thuật ngữ	2026-03-17 10:11:37.271709
84	PTNT	Phát triển nông thôn	Thuật ngữ	2026-03-17 10:11:37.271709
85	MTTQ	Mặt trận Tổ quốc	Thuật ngữ	2026-03-17 10:11:37.271709
86	ĐTN	Đoàn Thanh niên	Thuật ngữ	2026-03-17 10:11:37.271709
87	HPN	Hội Phụ nữ	Thuật ngữ	2026-03-17 10:11:37.271709
88	HCCB	Hội Cựu chiến binh	Thuật ngữ	2026-03-17 10:11:37.271709
89	CNVQP	Công nhân viên quốc phòng	Cấp bậc	2026-03-17 10:11:37.271709
90	VCQP	Viên chức quốc phòng	Cấp bậc	2026-03-17 10:11:37.271709
91	VKTB	Vũ khí thiết bị	Vũ khí	2026-03-17 10:11:37.271709
92	VKTBKT	Vũ khí thiết bị kỹ thuật	Vũ khí	2026-03-17 10:11:37.271709
93	BĐ	Bộ đội	Thuật ngữ	2026-03-17 10:11:37.271709
94	CS	Chiến sĩ	Thuật ngữ	2026-03-17 10:11:37.271709
95	HV	Học viên	Thuật ngữ	2026-03-17 10:11:37.271709
96	QS	Quân sự	Thuật ngữ	2026-03-17 10:11:37.271709
97	QP	Quốc phòng	Thuật ngữ	2026-03-17 10:11:37.271709
98	TC	Tổ chức	Thuật ngữ	2026-03-17 10:11:37.271709
99	CBCC	Cán bộ công chức	Thuật ngữ	2026-03-17 10:11:37.271709
100	VĐ	Vấn đề	Thuật ngữ	2026-03-17 10:11:37.271709
101	TH	Trình hợp	Thuật ngữ	2026-03-17 10:11:37.271709
102	ctđ, ctct	công tác đảng, công tác chính trị	Thuật ngữ	2026-03-31 10:47:37.233019
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, is_read, link, created_at, sender_name, priority, unit_id) FROM stdin;
1	1	Chào mừng bạn!	Hệ thống OpenClaw đã được cài đặt và cấu hình thành công.	success	t	\N	2026-03-14 10:21:50.268235	\N	medium	\N
2	\N	Hệ thống sẵn sàng	Chào mừng bạn đến với OpenClaw V2. Hệ thống đã được khởi tạo thành công.	success	t	/dashboard	2026-03-15 14:15:31.988345	\N	medium	\N
3	\N	Cảnh báo thiết bị	Cụm loa "Hà Đông 01" đang mất tín hiệu kết nối.	warning	t	/dashboard/devices	2026-03-15 14:15:31.997914	\N	medium	\N
4	\N	Nhân sự mới	Có 2 cán bộ mới đang chờ phê duyệt tài khoản.	info	t	/dashboard/users	2026-03-15 14:15:32.002585	\N	medium	\N
5	\N	Lịch phát sóng	Lịch phát sóng "Thông tin y tế" đã được hoàn thành.	success	t	/dashboard/schedule	2026-03-15 14:15:32.006869	\N	medium	\N
6	\N	Lỗi bảo mật	Phát hiện nhiều yêu cầu đăng nhập sai từ IP 192.168.1.100.	error	t	/dashboard/settings	2026-03-15 14:15:32.010697	\N	medium	\N
7	\N	Cập nhật Media	Thư viện Media vừa được cập nhật thêm 10 bản tin mới.	info	t	/dashboard/media	2026-03-15 14:15:32.014791	\N	medium	\N
8	\N	CẢNH BÁO KHẨN CẤP	Hệ thống đang thực hiện phát báo động khẩn cấp toàn đơn vị!	error	t	\N	2026-03-17 10:50:17.867135	\N	medium	\N
9	\N	Test Notif	Test Message	info	t	ai	2026-03-20 09:43:44.184517	System Tester	high	\N
15	\N	Đăng ký tài khoản mới	Người dùng "test_user_1622109" đang chờ phê duyệt tài khoản.	info	t	users	2026-03-31 09:22:09.951513	Hệ thống Auth	high	\N
17	\N	CẢNH BÁO KHẨN CẤP	Hệ thống đang thực hiện phát báo động khẩn cấp toàn đơn vị!	error	f	\N	2026-03-31 11:01:28.638766	\N	medium	\N
\.


--
-- Data for Name: on_demand_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.on_demand_requests (id, user_id, content_id, channel_id, priority, status, requested_at) FROM stdin;
\.


--
-- Data for Name: openclaw_api_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.openclaw_api_logs (id, model_name, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, job_id, created_at) FROM stdin;
\.


--
-- Data for Name: openclaw_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.openclaw_jobs (id, job_type, payload, status, result, error_log, attempts, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, user_id, token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, code, description, module) FROM stdin;
1	VIEW_DASHBOARD	Xem bảng điều khiển	SYSTEM
2	MANAGE_SYSTEM	Cấu hình hệ thống	SYSTEM
3	CREATE_NEWS	Tạo bài viết	CONTENT
4	APPROVE_NEWS	Phê duyệt bài viết	CONTENT
5	DELETE_NEWS	Xóa bài viết	CONTENT
6	START_BROADCAST	Bắt đầu phát sóng / Ấn On-Air	BROADCAST
7	MANAGE_DEVICES	Cấu hình thiết bị Loa/IP	BROADCAST
8	VIEW_REPORTS	Xem báo cáo/Lịch sử	SYSTEM
9	EMERGENCY_OVERRIDE	Kích hoạt Báo động khẩn cấp	BROADCAST
\.


--
-- Data for Name: radios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radios (id, name, url, description, is_active, created_at, unit_id) FROM stdin;
5	VOV1 - Thời sự	http://media.kythuatvov.vn:1936/live/VOV1.sdp/playlist.m3u8	Thời sự bản tin trong ngày.	t	2026-04-09 10:01:00.304117	28
\.


--
-- Data for Name: recording_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recording_sessions (id, user_id, unit_id, title, start_time, end_time, duration, media_id, is_live, created_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description) FROM stdin;
5	listener	Người nghe: Đọc kênh và xem điểm thi đua
6	political_commissar	Chính ủy / Chính trị viên (Quản lý nội dung, duyệt tin, tư tưởng)
7	operations_commander	Thủ trưởng trực ban / Phụ trách tác chiến (Quản lý thiết bị, lịch phát)
1	Admin	Chủ sở hữu hệ thống (Duy nhất)
2	Quản trị viên	Phụ trách kỹ thuật & tài khoản
3	Quản lý	Chỉ huy đơn vị, quản lý quân số & thiết bị
4	Thành viên	Vận hành, báo cáo
\.


--
-- Data for Name: routine_commands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routine_commands (id, type, title, file_path, duration, file_size, unit_id, updated_at) FROM stdin;
11	alarm	Báo thức	\N	\N	\N	3	2026-04-08 13:54:08.587496+00
12	sleep	Đi ngủ	\N	\N	\N	3	2026-04-08 13:54:08.591218+00
13	work	Làm việc	\N	\N	\N	3	2026-04-08 13:54:08.594098+00
14	rollcall	Điểm danh	\N	\N	\N	3	2026-04-08 13:54:08.597344+00
15	break	Giải lao	\N	\N	\N	3	2026-04-08 13:54:08.666018+00
51	alarm	Báo thức	\N	\N	\N	15	2026-04-08 13:54:08.828551+00
52	sleep	Đi ngủ	\N	\N	\N	15	2026-04-08 13:54:08.831778+00
53	work	Làm việc	\N	\N	\N	15	2026-04-08 13:54:08.835046+00
54	rollcall	Điểm danh	\N	\N	\N	15	2026-04-08 13:54:08.83816+00
55	break	Giải lao	\N	\N	\N	15	2026-04-08 13:54:08.841186+00
56	alarm	Báo thức	\N	\N	\N	16	2026-04-08 13:54:08.844108+00
57	sleep	Đi ngủ	\N	\N	\N	16	2026-04-08 13:54:08.846791+00
58	work	Làm việc	\N	\N	\N	16	2026-04-08 13:54:08.849752+00
59	rollcall	Điểm danh	\N	\N	\N	16	2026-04-08 13:54:08.853639+00
60	break	Giải lao	\N	\N	\N	16	2026-04-08 13:54:08.859119+00
61	alarm	Báo thức	\N	\N	\N	17	2026-04-08 13:54:08.863266+00
62	sleep	Đi ngủ	\N	\N	\N	17	2026-04-08 13:54:08.867391+00
63	work	Làm việc	\N	\N	\N	17	2026-04-08 13:54:08.870605+00
64	rollcall	Điểm danh	\N	\N	\N	17	2026-04-08 13:54:08.873745+00
65	break	Giải lao	\N	\N	\N	17	2026-04-08 13:54:08.877196+00
66	alarm	Báo thức	\N	\N	\N	18	2026-04-08 13:54:08.879936+00
67	sleep	Đi ngủ	\N	\N	\N	18	2026-04-08 13:54:08.882634+00
68	work	Làm việc	\N	\N	\N	18	2026-04-08 13:54:08.885593+00
69	rollcall	Điểm danh	\N	\N	\N	18	2026-04-08 13:54:08.888156+00
70	break	Giải lao	\N	\N	\N	18	2026-04-08 13:54:08.890186+00
71	alarm	Báo thức	\N	\N	\N	19	2026-04-08 13:54:08.892103+00
72	sleep	Đi ngủ	\N	\N	\N	19	2026-04-08 13:54:08.894093+00
73	work	Làm việc	\N	\N	\N	19	2026-04-08 13:54:08.896182+00
74	rollcall	Điểm danh	\N	\N	\N	19	2026-04-08 13:54:08.898892+00
75	break	Giải lao	\N	\N	\N	19	2026-04-08 13:54:08.901581+00
76	alarm	Báo thức	\N	\N	\N	20	2026-04-08 13:54:08.904125+00
77	sleep	Đi ngủ	\N	\N	\N	20	2026-04-08 13:54:08.906376+00
78	work	Làm việc	\N	\N	\N	20	2026-04-08 13:54:08.908687+00
79	rollcall	Điểm danh	\N	\N	\N	20	2026-04-08 13:54:08.911377+00
80	break	Giải lao	\N	\N	\N	20	2026-04-08 13:54:08.9145+00
86	alarm	Báo thức	\N	\N	\N	22	2026-04-08 13:54:08.92963+00
87	sleep	Đi ngủ	\N	\N	\N	22	2026-04-08 13:54:08.932244+00
88	work	Làm việc	\N	\N	\N	22	2026-04-08 13:54:08.934678+00
89	rollcall	Điểm danh	\N	\N	\N	22	2026-04-08 13:54:08.936894+00
90	break	Giải lao	\N	\N	\N	22	2026-04-08 13:54:08.939122+00
91	alarm	Báo thức	\N	\N	\N	23	2026-04-08 13:54:08.94161+00
92	sleep	Đi ngủ	\N	\N	\N	23	2026-04-08 13:54:08.944296+00
93	work	Làm việc	\N	\N	\N	23	2026-04-08 13:54:08.946896+00
94	rollcall	Điểm danh	\N	\N	\N	23	2026-04-08 13:54:08.949142+00
95	break	Giải lao	\N	\N	\N	23	2026-04-08 13:54:08.951367+00
98	work	Làm việc	\N	\N	\N	24	2026-04-08 13:54:08.958754+00
100	break	Giải lao	\N	\N	\N	24	2026-04-08 13:54:08.963623+00
106	alarm	Báo thức	\N	\N	\N	26	2026-04-08 13:54:08.979038+00
107	sleep	Đi ngủ	\N	\N	\N	26	2026-04-08 13:54:08.981884+00
108	work	Làm việc	\N	\N	\N	26	2026-04-08 13:54:08.984759+00
109	rollcall	Điểm danh	\N	\N	\N	26	2026-04-08 13:54:08.98798+00
110	break	Giải lao	\N	\N	\N	26	2026-04-08 13:54:08.991785+00
111	alarm	Báo thức	\N	\N	\N	27	2026-04-08 13:54:08.994714+00
112	sleep	Đi ngủ	\N	\N	\N	27	2026-04-08 13:54:08.997379+00
113	work	Làm việc	\N	\N	\N	27	2026-04-08 13:54:08.999997+00
114	rollcall	Điểm danh	\N	\N	\N	27	2026-04-08 13:54:09.002599+00
115	break	Giải lao	\N	\N	\N	27	2026-04-08 13:54:09.005476+00
117	sleep	Đi ngủ	\N	\N	\N	28	2026-04-08 13:54:09.010044+00
118	work	Làm việc	\N	\N	\N	28	2026-04-08 13:54:09.012344+00
119	rollcall	Điểm danh	\N	\N	\N	28	2026-04-08 13:54:09.01456+00
120	break	Giải lao	\N	\N	\N	28	2026-04-08 13:54:09.016961+00
121	alarm	Báo thức	\N	\N	\N	29	2026-04-08 13:54:09.019211+00
122	sleep	Đi ngủ	\N	\N	\N	29	2026-04-08 13:54:09.022167+00
123	work	Làm việc	\N	\N	\N	29	2026-04-08 13:54:09.025458+00
116	alarm	Báo thức	routine_8e3e6198-d2e2-4aca-894e-db1f64b9d4a6.mp3	33	0.51 MB	28	2026-04-11 00:21:54.44984+00
124	rollcall	Điểm danh	\N	\N	\N	29	2026-04-08 13:54:09.028245+00
125	break	Giải lao	\N	\N	\N	29	2026-04-08 13:54:09.030965+00
126	alarm	Báo thức	\N	\N	\N	30	2026-04-08 13:54:09.033296+00
127	sleep	Đi ngủ	\N	\N	\N	30	2026-04-08 13:54:09.035824+00
128	work	Làm việc	\N	\N	\N	30	2026-04-08 13:54:09.038117+00
129	rollcall	Điểm danh	\N	\N	\N	30	2026-04-08 13:54:09.040455+00
130	break	Giải lao	\N	\N	\N	30	2026-04-08 13:54:09.043453+00
131	alarm	Báo thức	\N	\N	\N	31	2026-04-08 13:54:09.045836+00
132	sleep	Đi ngủ	\N	\N	\N	31	2026-04-08 13:54:09.048086+00
133	work	Làm việc	\N	\N	\N	31	2026-04-08 13:54:09.050322+00
134	rollcall	Điểm danh	\N	\N	\N	31	2026-04-08 13:54:09.052547+00
135	break	Giải lao	\N	\N	\N	31	2026-04-08 13:54:09.054786+00
1219	other	Nhạc điều lệnh	\N	\N	\N	24	2026-04-08 14:25:43.47054+00
96	alarm	Báo thức	routine_230f02b8-ec28-4c2f-9992-ed2279414756.mp3	33	0.51 MB	24	2026-04-08 15:02:49.446295+00
97	sleep	Đi ngủ	routine_25cbd693-66dc-491d-ab37-bb815e94c968.mp3	65	0.99 MB	24	2026-04-08 15:03:38.210558+00
99	rollcall	Điểm danh	routine_37203c33-b8f0-4427-87bc-cfb0f5ee45ae.mp3	17	0.25 MB	24	2026-04-08 15:03:47.510549+00
\.


--
-- Data for Name: schedule_proposals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedule_proposals (id, proposal_name, details, status, created_at) FROM stdin;
\.


--
-- Data for Name: score_leaderboard; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.score_leaderboard (id, unit_id, month, year, total_score, rank, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, refresh_token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_config (id, key, value, description, updated_at) FROM stdin;
1	site_name	Hệ thống Truyền thanh Nội bộ OpenClaw	Tên hiển thị của trang web	2026-03-14 10:12:54.86106
2	default_language	vi-VN	Ngôn ngữ mặc định của hệ thống	2026-03-14 10:12:54.86106
3	maintenance_mode	false	Chế độ bảo trì hệ thống	2026-03-14 10:12:54.86106
4	api_rate_limit	100	Maximum requests per minute per IP	2026-03-15 14:10:59.376783
5	broadcast_auto_archive	true	Automatically archive broadcast logs after 30 days	2026-03-15 14:10:59.456716
6	ai_proposal_auto_approve	false	Automatically approve AI-generated schedule proposals	2026-03-15 14:10:59.460903
7	system_log_level	info	Logging level for system events (debug, info, warn, error)	2026-03-15 14:10:59.466031
8	emergency_mode	false	Trạng thái phát báo động khẩn cấp	2026-03-31 11:01:45.089861
\.


--
-- Data for Name: tts_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tts_jobs (id, content_id, voice_engine, voice_style, priority, status, error_message, output_media_id, created_at, processed_at) FROM stdin;
\.


--
-- Data for Name: unit_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unit_scores (id, unit_id, date, category, score, reason, created_at) FROM stdin;
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.units (id, name, parent_id, level, created_at) FROM stdin;
3	Tiểu đoàn 1	\N	2	2026-03-15 13:18:41.254814
10	Tòa nhà Chỉ huy (A1)	\N	1	2026-03-22 02:20:07.729256
11	Tòa nhà Kỹ thuật (B1)	\N	1	2026-03-22 02:20:07.738575
12	Tòa nhà Hậu cần (C1)	\N	1	2026-03-22 02:20:07.745576
13	Cổng gác / Vọng gác	\N	1	2026-03-22 02:20:07.753041
14	Sân vận động & Khu tập luyện	\N	1	2026-03-22 02:20:07.759514
15	Tiểu đoàn 1	1	2	2026-04-03 12:52:59.445551
16	Đại đội 1	15	3	2026-04-03 12:52:59.456269
17	Đại đội 2	15	3	2026-04-03 12:52:59.46089
18	Đại đội 3	15	3	2026-04-03 12:52:59.464983
19	Đại đội 8	1	2	2026-04-04 09:31:13.680888
20	Tiểu đoàn 5	1	2	2026-04-04 13:32:48.042448
21	Quân khu 3	\N	1	2026-04-04 13:57:07.313529
22	Sư đoàn 395	21	2	2026-04-04 13:57:07.321764
23	Trung đoàn 8	22	3	2026-04-04 13:57:07.326551
24	Tiểu đoàn 5	23	4	2026-04-04 13:57:07.330496
25	Quân khu 3	\N	1	2026-04-04 14:02:29.596954
26	Sư đoàn 395	25	2	2026-04-04 14:02:29.604125
27	Trung đoàn 8	26	3	2026-04-04 14:02:29.609025
28	Tiểu đoàn 5	27	4	2026-04-04 14:02:29.612798
29	Đại đội 8	28	5	2026-04-04 14:14:45.746518
30	Đại đội 9	28	5	2026-04-06 14:15:14.317924
31	Đại đội 7	28	5	2026-04-07 14:34:47.728932
1	Khu vực lưu trữ 1	\N	99	2026-03-14 10:21:50.257121
2	Khu vực lưu trữ 2	\N	99	2026-03-15 13:18:41.254814
4	Khu vực lưu trữ 3	\N	99	2026-03-15 13:18:41.254814
5	Khu vực lưu trữ 4	\N	99	2026-03-15 13:18:41.254814
32	Đại đội 7	24	5	2026-04-09 08:36:57.264105
\.


--
-- Data for Name: user_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_registrations (id, username, full_name, rank, email, unit_id, status, created_at, password_hash, "position", approved_by, approved_at, rejected_reason, phone, identity_card, home_address, unit_address) FROM stdin;
4	user_v2_1773632223904	Test User V2	Trung úy	testv2@example.com	\N	approved	2026-03-16 03:37:04.04943	$2b$10$tMsLtLQ4JAdiDsIw8udx4uvAjXI7HQr57d8Pf2b6LnXW5LbzZGp0m		\N	\N	\N	\N	\N	\N	\N
3	user_v2_1773632191878	Test User V2	Trung úy	testv2@example.com	\N	approved	2026-03-16 03:36:32.03236	$2b$10$Joyes9csjk5PBz4RD.rZbuPPcNDxUtbMJhUnTmWdLh9EFzAboYbwu		\N	\N	\N	\N	\N	\N	\N
5	test_user_1622109				\N	pending	2026-03-31 09:22:09.942517	$2b$10$gJUJtnBUDvBml6QZ98aWC.mD461mtUPqVWSDNUl5DaU6DbWIXDto6		\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: user_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_shifts (id, user_id, start_time, end_time, status, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, rank, email, role_id, unit_id, created_at, updated_at, "position", clearance_level, phone, identity_card, home_address, unit_address) FROM stdin;
28	duoc6	$2b$10$Tyxtz.96U87uKYCpELoqJ.BRf6uGafUkkFbI6mLZidWnJgpeOTvam	Nguyễn Bá D	Đại úy	duoc6@gmail.com	3	31	2026-04-04 01:50:25.633199	2026-04-07 14:34:58.062909	Chính trị viên	1	09876432	09443234234	xã Yên Mỹ, Tỉnh Hưng Yên	Xã Yên Mỹ, Tỉnh hưng yên
1	admin	$2b$10$c7xSckz4HDvyhkIjUVIJP.DfxoBlhTZlRK/VbKPlxffXmD1PH1iLO	Quản trị viên Hệ thống	Đại Tá		1	24	2026-03-14 10:21:50.261027	2026-04-04 15:02:32.186415		1	\N	\N	\N	\N
32	hai	$2b$10$5DpUAtcBaQ3l7104U0eX1eNK6qRU9I3y8wniIADZAvLpSKkyZJE0K	Đinh Ngoc Hai	Trung Tá	hai@gmail.com	2	28	2026-04-04 14:19:20.390728	2026-04-07 14:27:20.38178	Tiểu đoàn trưởng	1	23423423423	0423424423	Lương Bằng - Hưng Yên	Yên Mỹ - Hưng Yên
\.


--
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_suggestions_id_seq', 39, true);


--
-- Name: alert_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alert_messages_id_seq', 1, false);


--
-- Name: api_rate_limits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_rate_limits_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 18, true);


--
-- Name: broadcast_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcast_schedules_id_seq', 147, true);


--
-- Name: broadcast_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcast_sessions_id_seq', 639, true);


--
-- Name: channels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.channels_id_seq', 8, true);


--
-- Name: content_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_items_id_seq', 135, true);


--
-- Name: content_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_reviews_id_seq', 44, true);


--
-- Name: delegations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delegations_id_seq', 1, false);


--
-- Name: device_broadcast_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.device_broadcast_logs_id_seq', 88, true);


--
-- Name: device_commands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.device_commands_id_seq', 24, true);


--
-- Name: devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.devices_id_seq', 26, true);


--
-- Name: health_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.health_metrics_id_seq', 40, true);


--
-- Name: media_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.media_files_id_seq', 45, true);


--
-- Name: military_dictionary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.military_dictionary_id_seq', 102, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 19, true);


--
-- Name: on_demand_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.on_demand_requests_id_seq', 1, false);


--
-- Name: openclaw_api_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.openclaw_api_logs_id_seq', 1, false);


--
-- Name: openclaw_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.openclaw_jobs_id_seq', 1, false);


--
-- Name: password_resets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_resets_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 9, true);


--
-- Name: radios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radios_id_seq', 5, true);


--
-- Name: recording_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recording_sessions_id_seq', 30, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 7, true);


--
-- Name: routine_commands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.routine_commands_id_seq', 1220, true);


--
-- Name: schedule_proposals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schedule_proposals_id_seq', 1, false);


--
-- Name: score_leaderboard_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.score_leaderboard_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: system_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_config_id_seq', 9, true);


--
-- Name: tts_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tts_jobs_id_seq', 1, false);


--
-- Name: unit_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.unit_scores_id_seq', 1, false);


--
-- Name: units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.units_id_seq', 32, true);


--
-- Name: user_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_registrations_id_seq', 5, true);


--
-- Name: user_shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_shifts_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 33, true);


--
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- Name: alert_messages alert_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_messages
    ADD CONSTRAINT alert_messages_pkey PRIMARY KEY (id);


--
-- Name: api_rate_limits api_rate_limits_identifier_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_rate_limits
    ADD CONSTRAINT api_rate_limits_identifier_endpoint_key UNIQUE (identifier, endpoint);


--
-- Name: api_rate_limits api_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_rate_limits
    ADD CONSTRAINT api_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: broadcast_schedules broadcast_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_schedules
    ADD CONSTRAINT broadcast_schedules_pkey PRIMARY KEY (id);


--
-- Name: broadcast_sessions broadcast_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_sessions
    ADD CONSTRAINT broadcast_sessions_pkey PRIMARY KEY (id);


--
-- Name: channels channels_mount_point_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_mount_point_key UNIQUE (mount_point);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: content_items content_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_items
    ADD CONSTRAINT content_items_pkey PRIMARY KEY (id);


--
-- Name: content_reviews content_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_reviews
    ADD CONSTRAINT content_reviews_pkey PRIMARY KEY (id);


--
-- Name: delegations delegations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegations
    ADD CONSTRAINT delegations_pkey PRIMARY KEY (id);


--
-- Name: device_broadcast_logs device_broadcast_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_broadcast_logs
    ADD CONSTRAINT device_broadcast_logs_pkey PRIMARY KEY (id);


--
-- Name: device_commands device_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT device_commands_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: health_metrics health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_metrics
    ADD CONSTRAINT health_metrics_pkey PRIMARY KEY (id);


--
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- Name: military_dictionary military_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.military_dictionary
    ADD CONSTRAINT military_dictionary_pkey PRIMARY KEY (id);


--
-- Name: military_dictionary military_dictionary_word_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.military_dictionary
    ADD CONSTRAINT military_dictionary_word_key UNIQUE (word);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: on_demand_requests on_demand_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.on_demand_requests
    ADD CONSTRAINT on_demand_requests_pkey PRIMARY KEY (id);


--
-- Name: openclaw_api_logs openclaw_api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openclaw_api_logs
    ADD CONSTRAINT openclaw_api_logs_pkey PRIMARY KEY (id);


--
-- Name: openclaw_jobs openclaw_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openclaw_jobs
    ADD CONSTRAINT openclaw_jobs_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: radios radios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radios
    ADD CONSTRAINT radios_pkey PRIMARY KEY (id);


--
-- Name: recording_sessions recording_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_sessions
    ADD CONSTRAINT recording_sessions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: routine_commands routine_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_commands
    ADD CONSTRAINT routine_commands_pkey PRIMARY KEY (id);


--
-- Name: routine_commands routine_commands_title_unit_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_commands
    ADD CONSTRAINT routine_commands_title_unit_unique UNIQUE (title, unit_id);


--
-- Name: schedule_proposals schedule_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_proposals
    ADD CONSTRAINT schedule_proposals_pkey PRIMARY KEY (id);


--
-- Name: score_leaderboard score_leaderboard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.score_leaderboard
    ADD CONSTRAINT score_leaderboard_pkey PRIMARY KEY (id);


--
-- Name: score_leaderboard score_leaderboard_unit_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.score_leaderboard
    ADD CONSTRAINT score_leaderboard_unit_id_month_year_key UNIQUE (unit_id, month, year);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_key_key UNIQUE (key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: tts_jobs tts_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tts_jobs
    ADD CONSTRAINT tts_jobs_pkey PRIMARY KEY (id);


--
-- Name: unit_scores unit_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_scores
    ADD CONSTRAINT unit_scores_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_registrations user_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registrations
    ADD CONSTRAINT user_registrations_pkey PRIMARY KEY (id);


--
-- Name: user_shifts user_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_shifts
    ADD CONSTRAINT user_shifts_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: audit_logs trg_protect_audit_logs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_protect_audit_logs BEFORE DELETE OR UPDATE ON public.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.protect_audit_logs();


--
-- Name: ai_suggestions ai_suggestions_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions
    ADD CONSTRAINT ai_suggestions_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE CASCADE;


--
-- Name: alert_messages alert_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_messages
    ADD CONSTRAINT alert_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: alert_messages alert_messages_target_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_messages
    ADD CONSTRAINT alert_messages_target_unit_id_fkey FOREIGN KEY (target_unit_id) REFERENCES public.units(id);


--
-- Name: audit_logs audit_logs_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: broadcast_schedules broadcast_schedules_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_schedules
    ADD CONSTRAINT broadcast_schedules_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: broadcast_schedules broadcast_schedules_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_schedules
    ADD CONSTRAINT broadcast_schedules_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE CASCADE;


--
-- Name: broadcast_schedules broadcast_schedules_radio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_schedules
    ADD CONSTRAINT broadcast_schedules_radio_id_fkey FOREIGN KEY (radio_id) REFERENCES public.radios(id);


--
-- Name: broadcast_schedules broadcast_schedules_routine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_schedules
    ADD CONSTRAINT broadcast_schedules_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES public.routine_commands(id) ON DELETE CASCADE;


--
-- Name: broadcast_schedules broadcast_schedules_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_schedules
    ADD CONSTRAINT broadcast_schedules_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: broadcast_sessions broadcast_sessions_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_sessions
    ADD CONSTRAINT broadcast_sessions_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id);


--
-- Name: broadcast_sessions broadcast_sessions_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_sessions
    ADD CONSTRAINT broadcast_sessions_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE SET NULL;


--
-- Name: broadcast_sessions broadcast_sessions_radio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_sessions
    ADD CONSTRAINT broadcast_sessions_radio_id_fkey FOREIGN KEY (radio_id) REFERENCES public.radios(id);


--
-- Name: channels channels_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: content_items content_items_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_items
    ADD CONSTRAINT content_items_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: content_items content_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_items
    ADD CONSTRAINT content_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: content_reviews content_reviews_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_reviews
    ADD CONSTRAINT content_reviews_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE CASCADE;


--
-- Name: content_reviews content_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_reviews
    ADD CONSTRAINT content_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: delegations delegations_delegatee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegations
    ADD CONSTRAINT delegations_delegatee_id_fkey FOREIGN KEY (delegatee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: delegations delegations_delegator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegations
    ADD CONSTRAINT delegations_delegator_id_fkey FOREIGN KEY (delegator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: delegations delegations_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegations
    ADD CONSTRAINT delegations_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: device_broadcast_logs device_broadcast_logs_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_broadcast_logs
    ADD CONSTRAINT device_broadcast_logs_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL;


--
-- Name: device_broadcast_logs device_broadcast_logs_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_broadcast_logs
    ADD CONSTRAINT device_broadcast_logs_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE SET NULL;


--
-- Name: device_broadcast_logs device_broadcast_logs_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_broadcast_logs
    ADD CONSTRAINT device_broadcast_logs_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: device_commands device_commands_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT device_commands_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: device_commands device_commands_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT device_commands_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: devices devices_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL;


--
-- Name: devices devices_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: media_files media_files_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE SET NULL;


--
-- Name: media_files media_files_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: notifications notifications_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: on_demand_requests on_demand_requests_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.on_demand_requests
    ADD CONSTRAINT on_demand_requests_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id);


--
-- Name: on_demand_requests on_demand_requests_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.on_demand_requests
    ADD CONSTRAINT on_demand_requests_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE CASCADE;


--
-- Name: on_demand_requests on_demand_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.on_demand_requests
    ADD CONSTRAINT on_demand_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: openclaw_api_logs openclaw_api_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.openclaw_api_logs
    ADD CONSTRAINT openclaw_api_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.openclaw_jobs(id);


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: radios radios_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radios
    ADD CONSTRAINT radios_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: recording_sessions recording_sessions_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_sessions
    ADD CONSTRAINT recording_sessions_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media_files(id);


--
-- Name: recording_sessions recording_sessions_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_sessions
    ADD CONSTRAINT recording_sessions_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: recording_sessions recording_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recording_sessions
    ADD CONSTRAINT recording_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: routine_commands routine_commands_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_commands
    ADD CONSTRAINT routine_commands_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: score_leaderboard score_leaderboard_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.score_leaderboard
    ADD CONSTRAINT score_leaderboard_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tts_jobs tts_jobs_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tts_jobs
    ADD CONSTRAINT tts_jobs_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content_items(id) ON DELETE CASCADE;


--
-- Name: tts_jobs tts_jobs_output_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tts_jobs
    ADD CONSTRAINT tts_jobs_output_media_id_fkey FOREIGN KEY (output_media_id) REFERENCES public.media_files(id);


--
-- Name: unit_scores unit_scores_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_scores
    ADD CONSTRAINT unit_scores_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: units units_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.units(id);


--
-- Name: user_registrations user_registrations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registrations
    ADD CONSTRAINT user_registrations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: user_registrations user_registrations_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_registrations
    ADD CONSTRAINT user_registrations_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: user_shifts user_shifts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_shifts
    ADD CONSTRAINT user_shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: users users_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- PostgreSQL database dump complete
--

\unrestrict dCK2LKOmqjCTk04wvKCEf9vryiaRVzd1bx0zvMODRA9w6YiYRzc8aotatZFz5mL

