begin;

alter table public.profiles
  add column theme_preference text
    check (theme_preference is null or theme_preference in ('system', 'light', 'dark')),
  add column time_preference_mode text
    check (time_preference_mode is null or time_preference_mode in ('auto', 'zone', 'offset')),
  add column time_zone text
    check (time_zone is null or char_length(time_zone) between 1 and 80),
  add column time_offset_minutes integer
    check (
      time_offset_minutes is null
      or (
        time_offset_minutes between -720 and 840
        and time_offset_minutes % 60 = 0
      )
    );

grant update (
  theme_preference,
  time_preference_mode,
  time_zone,
  time_offset_minutes
) on public.profiles to authenticated;

commit;
