ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE users
  ADD CONSTRAINT users_id_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();