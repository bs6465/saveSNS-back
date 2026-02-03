-- Manual migration: Add air_quality_forecast table and update disaster_alert table
-- Date: 2026-02-03
-- Run this SQL directly on your PostgreSQL database

-- 1. Create air_quality_forecast table
CREATE TABLE IF NOT EXISTS public.air_quality_forecast (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    sido_name VARCHAR(50) NOT NULL,
    inform_code VARCHAR(10) NOT NULL,
    forecast_date TIMESTAMP(6) NOT NULL,
    publish_time TIMESTAMP(6) NOT NULL,
    grade SMALLINT NOT NULL,
    inform_cause TEXT,
    inform_overall TEXT,
    created_at TIMESTAMP(6) DEFAULT NOW()
);

-- Add unique constraint
ALTER TABLE public.air_quality_forecast
    ADD CONSTRAINT uq_air_quality_forecast UNIQUE (sido_name, inform_code, forecast_date);

-- Add index
CREATE INDEX IF NOT EXISTS idx_air_quality_forecast_sido
    ON public.air_quality_forecast (sido_name, forecast_date);

-- 2. Update disaster_alert table
-- First, backup existing data if any
CREATE TABLE IF NOT EXISTS public.disaster_alert_backup AS
    SELECT * FROM public.disaster_alert;

-- Drop old table and recreate with new schema
DROP TABLE IF EXISTS public.disaster_alert CASCADE;

CREATE TABLE public.disaster_alert (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    sn VARCHAR(50) UNIQUE NOT NULL,
    msg_cn TEXT NOT NULL,
    rcptn_rgn_nm VARCHAR(200) NOT NULL,
    crt_dt TIMESTAMP(6),
    emrg_step_nm VARCHAR(50) NOT NULL,
    dst_se_nm VARCHAR(100) NOT NULL,
    created_at TIMESTAMP(6) DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_disaster_alert_region
    ON public.disaster_alert (rcptn_rgn_nm, crt_dt);

-- Note: Old data in disaster_alert_backup can be migrated manually if needed
-- Then drop backup: DROP TABLE public.disaster_alert_backup;
