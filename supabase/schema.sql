-- ============================================================
-- RT COIMBRA - Schema do Banco de Dados
-- Execute este SQL no editor SQL do seu projeto Supabase
-- ============================================================

-- 1. PERFIS DE USUÁRIOS
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('funcionario', 'coordenador')),
  numero_inspetor INTEGER,
  sigla TEXT,
  coordenador_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LANÇAMENTOS DIÁRIOS
CREATE TABLE public.daily_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  origem TEXT,
  destino TEXT,
  local_empresa TEXT,
  projeto TEXT,
  relatorio_num TEXT,
  servico_executado TEXT,
  horas_normais NUMERIC(5,2) DEFAULT 0,
  horas_sabado NUMERIC(5,2) DEFAULT 0,
  horas_domingo NUMERIC(5,2) DEFAULT 0,
  km_percorrido NUMERIC(8,2) DEFAULT 0,
  km_valor_unitario NUMERIC(6,2) DEFAULT 1,
  km_total NUMERIC(8,2) DEFAULT 0,
  refeicao NUMERIC(8,2) DEFAULT 0,
  pedagios NUMERIC(8,2) DEFAULT 0,
  passagens NUMERIC(8,2) DEFAULT 0,
  taxi_combustivel NUMERIC(8,2) DEFAULT 0,
  hotel NUMERIC(8,2) DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  relatorio_feito BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ARQUIVOS ANEXADOS (relatórios e notas de refeição)
CREATE TABLE public.entry_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES public.daily_entries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('relatorio', 'nota_refeicao')),
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: criar perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, numero_inspetor, sigla, coordenador_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'funcionario'),
    (NEW.raw_user_meta_data->>'numero_inspetor')::INTEGER,
    NEW.raw_user_meta_data->>'sigla',
    (NEW.raw_user_meta_data->>'coordenador_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: atualizar updated_at em daily_entries
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_entries_updated_at
  BEFORE UPDATE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_files ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário vê o próprio perfil; coordenador vê todos os seus funcionários
CREATE POLICY "Usuário vê próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Coordenador vê seus funcionários" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'coordenador'
    )
  );

CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Daily entries: funcionário vê os próprios; coordenador vê os dos seus funcionários
CREATE POLICY "Funcionário vê próprios lançamentos" ON public.daily_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coordenador vê lançamentos dos seus funcionários" ON public.daily_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'coordenador'
        AND EXISTS (
          SELECT 1 FROM public.profiles f
          WHERE f.id = daily_entries.user_id
            AND f.coordenador_id = auth.uid()
        )
    )
  );

-- Entry files: mesmas regras
CREATE POLICY "Funcionário gerencia próprios arquivos" ON public.entry_files
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coordenador vê arquivos dos seus funcionários" ON public.entry_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'coordenador'
        AND EXISTS (
          SELECT 1 FROM public.profiles f
          WHERE f.id = entry_files.user_id
            AND f.coordenador_id = auth.uid()
        )
    )
  );

-- ============================================================
-- STORAGE BUCKETS
-- Execute também no SQL Editor:
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('relatorios', 'relatorios', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('notas-refeicao', 'notas-refeicao', false);

-- Storage policies
CREATE POLICY "Funcionário faz upload de relatórios" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'relatorios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuário lê seus relatórios" ON storage.objects
  FOR SELECT USING (bucket_id = 'relatorios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coordenador lê todos relatórios" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'relatorios' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordenador')
  );

CREATE POLICY "Funcionário faz upload de notas" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'notas-refeicao' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuário lê suas notas" ON storage.objects
  FOR SELECT USING (bucket_id = 'notas-refeicao' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coordenador lê todas as notas" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'notas-refeicao' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordenador')
  );

CREATE POLICY "Usuário apaga seus arquivos de relatórios" ON storage.objects
  FOR DELETE USING (bucket_id = 'relatorios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuário apaga suas notas" ON storage.objects
  FOR DELETE USING (bucket_id = 'notas-refeicao' AND auth.uid()::text = (storage.foldername(name))[1]);
