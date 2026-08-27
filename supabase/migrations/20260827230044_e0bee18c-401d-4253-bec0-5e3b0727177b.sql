CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  u RECORD;
  new_id uuid;
BEGIN
  FOR u IN
    SELECT * FROM (VALUES
      ('admin@event.sa',   'المدير العام',            'admin'::public.app_role),
      ('manager@event.sa', 'مدير الفعالية',           'coordinator'::public.app_role),
      ('hotel@event.sa',   'مسؤول الإقامة بالفندق',   'coordinator'::public.app_role)
    ) AS t(email, full_name, role)
  LOOP
    SELECT id INTO new_id FROM auth.users WHERE email = u.email;

    IF new_id IS NULL THEN
      new_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
        u.email, extensions.crypt('112233', extensions.gen_salt('bf')),
        now(), now(), now(),
        jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
        jsonb_build_object('full_name', u.full_name),
        false, false
      );

      INSERT INTO auth.identities (
        provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        new_id::text, new_id,
        jsonb_build_object('sub', new_id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
        'email', now(), now(), now()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = extensions.crypt('112233', extensions.gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = new_id;
    END IF;

    INSERT INTO public.profiles (id, full_name, email)
    VALUES (new_id, u.full_name, u.email)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

    DELETE FROM public.user_roles WHERE user_id = new_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (new_id, u.role);
  END LOOP;
END $$;