-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  city TEXT,
  credits INT NOT NULL DEFAULT 3,
  trust_score NUMERIC(3,2) NOT NULL DEFAULT 0,
  ratings_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Skill level enum
CREATE TYPE public.skill_level AS ENUM ('beginner','intermediate','expert');

-- Skills to teach
CREATE TABLE public.skills_teach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  level skill_level NOT NULL DEFAULT 'beginner',
  description TEXT,
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skills_teach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills teach viewable by authenticated" ON public.skills_teach FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own teach skills" ON public.skills_teach FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own teach skills" ON public.skills_teach FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own teach skills" ON public.skills_teach FOR DELETE USING (auth.uid() = user_id);

-- Skills to learn
CREATE TABLE public.skills_learn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  level skill_level NOT NULL DEFAULT 'beginner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skills_learn ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills learn viewable by authenticated" ON public.skills_learn FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own learn skills" ON public.skills_learn FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own learn skills" ON public.skills_learn FOR DELETE USING (auth.uid() = user_id);

-- Swap requests
CREATE TYPE public.swap_status AS ENUM ('pending','accepted','rejected','completed','cancelled');

CREATE TABLE public.swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_skill TEXT NOT NULL,
  request_skill TEXT NOT NULL,
  message TEXT,
  status swap_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view swaps" ON public.swap_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users create swaps" ON public.swap_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Participants update swaps" ON public.swap_requests FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE TRIGGER trg_swap_updated BEFORE UPDATE ON public.swap_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id UUID NOT NULL REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Swap participants view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid()))
);
CREATE POLICY "Swap participants send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND s.status = 'accepted' AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid()))
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Ratings
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id UUID NOT NULL REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swap_id, rater_id)
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings viewable by authenticated" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own rating" ON public.ratings FOR INSERT WITH CHECK (
  auth.uid() = rater_id AND EXISTS (SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND s.status = 'completed' AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid()))
);

-- Update trust score after rating
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET trust_score = COALESCE((SELECT AVG(stars)::numeric(3,2) FROM public.ratings WHERE ratee_id = NEW.ratee_id), 0),
      ratings_count = (SELECT COUNT(*) FROM public.ratings WHERE ratee_id = NEW.ratee_id)
  WHERE user_id = NEW.ratee_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_update_trust AFTER INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_trust_score();

-- Certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id UUID NOT NULL REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(swap_id, learner_id, skill)
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learner views own certificates" ON public.certificates FOR SELECT USING (auth.uid() = learner_id OR auth.uid() = teacher_id);
CREATE POLICY "Learner creates certificate" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = learner_id);

-- Auto profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars','avatars',true),
  ('skill-proofs','skill-proofs',true),
  ('certificates','certificates',true);

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar user upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatar user update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatar user delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Proof public read" ON storage.objects FOR SELECT USING (bucket_id = 'skill-proofs');
CREATE POLICY "Proof user upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'skill-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Proof user update" ON storage.objects FOR UPDATE USING (bucket_id = 'skill-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Proof user delete" ON storage.objects FOR DELETE USING (bucket_id = 'skill-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Cert public read" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');