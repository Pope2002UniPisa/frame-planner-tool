-- NOTA: Creare manualmente nel Supabase Dashboard un bucket Storage chiamato
-- "client-documents" con visibilità PUBLIC prima di usare la funzione documenti.

CREATE TABLE IF NOT EXISTS end_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE end_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_clients" ON end_clients FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES end_clients(id) ON DELETE CASCADE NOT NULL,
  dealer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'documento',
  file_url TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealer_own_docs" ON client_documents FOR ALL USING (auth.uid() = dealer_id) WITH CHECK (auth.uid() = dealer_id);
