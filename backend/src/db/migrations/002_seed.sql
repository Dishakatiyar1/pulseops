-- PulseOps - Seed Script
-- Runs automatically on first Docker init (after 001_init.sql)
-- Idempotent: skips if gyms exist

DO $$
DECLARE
  v_gym_count INT;
  v_gyms UUID[];
  v_bandra_id UUID;
  v_velachery_id UUID;
  v_saltlake_id UUID;
  v_same_day_last_week DATE;
BEGIN
  SELECT COUNT(*) INTO v_gym_count FROM gyms;
  IF v_gym_count > 0 THEN
    RAISE NOTICE 'Seed already applied, skipping.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding gyms...';
  INSERT INTO gyms (name, city, capacity, opens_at, closes_at, status) VALUES
    ('PulseOps - Lajpat Nagar', 'New Delhi', 220, '05:30', '22:30', 'active'),
    ('PulseOps - Connaught Place', 'New Delhi', 180, '06:00', '22:00', 'active'),
    ('PulseOps - Bandra West', 'Mumbai', 300, '05:00', '23:00', 'active'),
    ('PulseOps - Powai', 'Mumbai', 250, '05:30', '22:30', 'active'),
    ('PulseOps - Indiranagar', 'Bengaluru', 200, '05:30', '22:00', 'active'),
    ('PulseOps - Koramangala', 'Bengaluru', 180, '06:00', '22:00', 'active'),
    ('PulseOps - Banjara Hills', 'Hyderabad', 160, '06:00', '22:00', 'active'),
    ('PulseOps - Sector 18 Noida', 'Noida', 140, '06:00', '21:30', 'active'),
    ('PulseOps - Salt Lake', 'Kolkata', 120, '06:00', '21:00', 'active'),
    ('PulseOps - Velachery', 'Chennai', 110, '06:00', '21:00', 'active');

  SELECT array_agg(id ORDER BY name) INTO v_gyms FROM gyms;
  SELECT id INTO v_bandra_id FROM gyms WHERE name = 'PulseOps — Bandra West';
  SELECT id INTO v_velachery_id FROM gyms WHERE name = 'PulseOps — Velachery';
  SELECT id INTO v_saltlake_id FROM gyms WHERE name = 'PulseOps — Salt Lake';
  RAISE NOTICE 'Seeding gyms... done';

  -- 2. MEMBERS (5000 with exact distribution)
  RAISE NOTICE 'Seeding 5000 members...';
  INSERT INTO members (gym_id, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at)
  SELECT
    v_gyms[gym_idx],
    (ARRAY['Rahul','Priya','Ankit','Neha','Arjun','Sneha','Vikram','Pooja','Rohan','Kavita','Amit','Divya','Sandeep','Shruti','Rajesh','Kriti','Manish','Anjali','Deepak','Sonal','Ravi','Preeti','Naveen','Pallavi','Sunil','Ritu','Ajay','Swati','Sanjay','Monika','Vivek','Kiran','Anil','Rekha','Suresh','Meera','Ramesh','Lakshmi','Mahesh','Sunita'])[1 + (seq * 7 + gym_idx) % 40] || ' ' ||
    (ARRAY['Sharma','Mehta','Verma','Gupta','Patel','Singh','Kumar','Reddy','Rao','Nair','Iyer','Pillai','Menon','Kulkarni','Desai','Joshi','Shah','Kapoor','Malhotra','Khanna','Sethi','Aggarwal','Bansal','Goyal','Agarwal','Tandon','Bhatia','Chopra','Saxena','Mathur'])[1 + (seq * 11 + gym_idx) % 30],
    'member' || global_seq || '@pulseops.com',
    '9' || lpad((780000000 + (global_seq * 7919) % 200000000)::text, 9, '0'),
    plan_type,
    CASE WHEN (global_seq % 5) = 0 THEN 'renewal' ELSE 'new' END,
    CASE WHEN r1 < active_pct THEN 'active' WHEN r1 < active_pct + 0.08 THEN 'inactive' ELSE 'frozen' END,
    joined_at,
    joined_at + plan_duration
  FROM (
    SELECT gym_idx, seq,
      (SELECT COALESCE(SUM(mc),0) FROM unnest(ARRAY[650,550,750,600,550,500,450,400,300,250]) WITH ORDINALITY t(mc,ord) WHERE ord < gym_idx) + seq AS global_seq,
      CASE WHEN r2 < monthly_pct THEN 'monthly' WHEN r2 < monthly_pct + quarterly_pct THEN 'quarterly' ELSE 'annual' END AS plan_type,
      CASE WHEN r2 < monthly_pct THEN interval '30 days' WHEN r2 < monthly_pct + quarterly_pct THEN interval '90 days' ELSE interval '365 days' END AS plan_duration,
      (NOW() - (random() * 90 * interval '1 day'))::timestamptz AS joined_at,
      r1, monthly_pct, quarterly_pct, active_pct
    FROM (
      SELECT g.ord AS gym_idx, gs.seq, random() AS r1, random() AS r2,
        (ARRAY[0.50,0.40,0.40,0.40,0.40,0.40,0.50,0.60,0.60,0.60])[g.ord] AS monthly_pct,
        (ARRAY[0.30,0.40,0.40,0.40,0.40,0.40,0.30,0.25,0.30,0.30])[g.ord] AS quarterly_pct,
        (ARRAY[0.88,0.85,0.90,0.87,0.89,0.86,0.84,0.82,0.80,0.78])[g.ord] AS active_pct
      FROM generate_series(1, 10) WITH ORDINALITY g(n, ord)
      CROSS JOIN LATERAL generate_series(0, (ARRAY[650,550,750,600,550,500,450,400,300,250])[g.ord] - 1) gs(seq)
    ) d
  ) m;
  RAISE NOTICE 'Seeding 5000 members... done';

  -- 3. CHECKINS - batch insert using generate_series
  -- Each member gets ~54 checkins. Weighted toward peak hours (7-9, 17-20) and weekdays
  RAISE NOTICE 'Seeding ~270000 check-ins...';
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, m.gym_id, ts, ts + (45 + floor(random()*46)::int) * interval '1 minute'
  FROM members m
  CROSS JOIN LATERAL (
    SELECT (CURRENT_DATE - (floor(random() * 90)::int) * interval '1 day')::date +
      CASE WHEN random() < 0.35 THEN (6 + floor(random()*4)::int)   -- 35% morning rush 6-9
           WHEN random() < 0.65 THEN (16 + floor(random()*5)::int)  -- 30% evening rush 16-20
           ELSE (6 + floor(random()*16)::int)                       -- 35% other hours
      END * interval '1 hour' + random() * interval '55 minutes' AS ts
    FROM generate_series(1, 54)
  ) t
  WHERE m.status IN ('active', 'inactive', 'frozen');
  RAISE NOTICE 'Seeding check-ins... done';

  -- Churn risk: 160 high (45-60 days ago) + 90 critical (60+ days ago)
  CREATE TEMP TABLE churn_members ON COMMIT DROP AS
  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY random()) AS rn FROM members WHERE status = 'active'
  )
  SELECT id, 45 + floor(random()*16)::int AS churn_days FROM ranked WHERE rn <= 160
  UNION ALL
  SELECT id, 65 + floor(random()*25)::int FROM ranked WHERE rn > 160 AND rn <= 250;

  -- Delete checkins for churn members that are more recent than their dropoff date
  DELETE FROM checkins c
  USING churn_members cm
  WHERE c.member_id = cm.id AND c.checked_in > (CURRENT_DATE - cm.churn_days * interval '1 day');

  -- Update last_checkin_at from actual checkins (must match checkins table)
  UPDATE members m SET last_checkin_at = (
    SELECT MAX(checked_in) FROM checkins c WHERE c.member_id = m.id
  );

  -- 4. PAYMENTS
  RAISE NOTICE 'Seeding payments...';
  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
  SELECT id, gym_id,
    CASE plan_type WHEN 'monthly' THEN 1499 WHEN 'quarterly' THEN 3999 ELSE 11999 END,
    plan_type, member_type, joined_at
  FROM members;
  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
  SELECT id, gym_id,
    CASE plan_type WHEN 'monthly' THEN 1499 WHEN 'quarterly' THEN 3999 ELSE 11999 END,
    plan_type, 'renewal', joined_at + CASE plan_type WHEN 'monthly' THEN interval '30 days' WHEN 'quarterly' THEN interval '90 days' ELSE interval '365 days' END
  FROM members WHERE member_type = 'renewal';
  RAISE NOTICE 'Seeding payments... done';

  -- 5. ANOMALY SCENARIOS
  -- Bandra: 275+ open checkins
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_bandra_id, NOW() - (random() * 90 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_bandra_id ORDER BY random() LIMIT 280) m;

  -- Other gyms: open checkins (except Velachery)
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[1], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[1] ORDER BY random() LIMIT 25) m;
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[2], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[2] ORDER BY random() LIMIT 20) m;
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[4], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[4] ORDER BY random() LIMIT 28) m;
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[5], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[5] ORDER BY random() LIMIT 22) m;
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[6], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[6] ORDER BY random() LIMIT 20) m;
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[7], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[7] ORDER BY random() LIMIT 18) m;
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[8], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[8] ORDER BY random() LIMIT 12) m;
  INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
  SELECT m.id, v_gyms[9], NOW() - (random() * 60 * interval '1 minute'), NULL
  FROM (SELECT id FROM members WHERE gym_id = v_gyms[9] ORDER BY random() LIMIT 10) m;

  -- Salt Lake revenue drop: add last week same day payments (high), ensure today low
  v_same_day_last_week := (CURRENT_DATE - interval '7 days')::date;
  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
  SELECT m.id, v_saltlake_id, 1499, 'monthly', 'new', v_same_day_last_week + interval '10 hours'
  FROM (SELECT id FROM members WHERE gym_id = v_saltlake_id ORDER BY random() LIMIT 8) m;
  INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
  SELECT m.id, v_saltlake_id, 3999, 'quarterly', 'new', v_same_day_last_week + interval '14 hours'
  FROM (SELECT id FROM members WHERE gym_id = v_saltlake_id ORDER BY random() LIMIT 2) m;
  UPDATE payments SET paid_at = paid_at - interval '1 day'
  WHERE gym_id = v_saltlake_id AND paid_at >= CURRENT_DATE;

  -- Velachery: 0 open checkins, last checkin > 2h ago. Delete any recent Velachery checkins.
  DELETE FROM checkins WHERE gym_id = v_velachery_id AND checked_in > NOW() - interval '2 hours';
  UPDATE members m SET last_checkin_at = (SELECT MAX(checked_in) FROM checkins c WHERE c.member_id = m.id)
  WHERE gym_id = v_velachery_id;

  RAISE NOTICE 'Seed complete.';
END $$;

REFRESH MATERIALIZED VIEW gym_hourly_stats;
