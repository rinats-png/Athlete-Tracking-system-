-- Standard-Akzentfarbe des White-Label-Brandings auf die Markenfarbe angeglichen
-- (weiches Chartreuse statt Neon-Limette).
alter table public.coach_branding
  alter column accent_color set default '#C8E68C';

update public.coach_branding
  set accent_color = '#C8E68C'
  where accent_color = '#C7F53F';
