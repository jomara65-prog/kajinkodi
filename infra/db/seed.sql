insert into user_profile (id, handle, role, xp, rank_tier)
values
  ('11111111-1111-1111-1111-111111111111', 'trailhawk', 'member', 120, 'scout'),
  ('22222222-2222-2222-2222-222222222222', 'riverline', 'guide', 980, 'veteran')
on conflict do nothing;

insert into quest (slug, title, reward_xp, is_active)
values
  ('dawn-catch', 'Log a catch before 8 AM', 25, true),
  ('three-sightings', 'Report 3 herd sightings this week', 40, true)
on conflict do nothing;

insert into trap_device (id, owner_id, game_type, connectivity, battery_percent, firmware_version, last_seen_at)
values
  ('trap-elk-01', '11111111-1111-1111-1111-111111111111', 'elk', 'cell', 92, '1.0.0', now()),
  ('trap-hog-07', '22222222-2222-2222-2222-222222222222', 'hog', 'lora', 77, '1.0.0', now())
on conflict do nothing;
