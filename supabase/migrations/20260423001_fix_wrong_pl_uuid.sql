-- ────────────────────────────────────────────────────────────────────────────
-- Fix: the previous cannabis-vertical migration used the WRONG client UUID
-- for "Purple Lotus". See the warning header on
-- 20260421001_cannabis_vertical.sql for the full story.
--
-- This migration does two things, atomically:
--
--   PART A — Unpollute the Kyra internal marketing client (f91b28a1…):
--     Removes the Jane Algolia / cannabis-brand / dispatch-agent keys that
--     the wrong backfill injected. Only strips values that match the known
--     pollution fingerprint — if a human had set any of these keys on this
--     client manually after 2026-04-21 (unlikely), the strip is conservative
--     enough to preserve their data.
--
--   PART B — Apply the real Purple Lotus backfill to the correct client
--     (968cae23…). Same COALESCE-on-existing pattern as the original: won't
--     overwrite values a human has already set.
--
-- Idempotent — safe to re-run. Uses IF NOT EXISTS checks where applicable.
-- ────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A — Unpollute the Kyra internal marketing client
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  ghost_id CONSTANT UUID := 'f91b28a1-2911-477e-b228-9a21cdbb1dca';  -- Kyra internal, NOT Purple Lotus
  current_config JSONB;
  stripped JSONB;
  keys_removed INT := 0;
BEGIN
  SELECT container_config INTO current_config
  FROM public.agency_clients
  WHERE id = ghost_id;

  IF current_config IS NULL THEN
    RAISE NOTICE '[fix-wrong-pl-uuid] Internal Kyra client not found — skipping cleanup';
    RETURN;
  END IF;

  stripped := current_config;

  -- Strip the 8 Jane/dispatch keys the prior migration added. These have no
  -- business being on a "Market Intelligence" internal client.
  IF stripped ? 'jane_algolia_app_id'      THEN stripped := stripped - 'jane_algolia_app_id';      keys_removed := keys_removed + 1; END IF;
  IF stripped ? 'jane_algolia_search_key'  THEN stripped := stripped - 'jane_algolia_search_key';  keys_removed := keys_removed + 1; END IF;
  IF stripped ? 'jane_algolia_index'       THEN stripped := stripped - 'jane_algolia_index';       keys_removed := keys_removed + 1; END IF;
  IF stripped ? 'jane_default_store_id'    THEN stripped := stripped - 'jane_default_store_id';    keys_removed := keys_removed + 1; END IF;
  IF stripped ? 'jane_stores'              THEN stripped := stripped - 'jane_stores';              keys_removed := keys_removed + 1; END IF;
  IF stripped ? 'jane_known_brands'        THEN stripped := stripped - 'jane_known_brands';        keys_removed := keys_removed + 1; END IF;
  IF stripped ? 'dispatch_agent_enabled'   THEN stripped := stripped - 'dispatch_agent_enabled';   keys_removed := keys_removed + 1; END IF;
  IF stripped ? 'dispatch_agent_config'    THEN stripped := stripped - 'dispatch_agent_config';    keys_removed := keys_removed + 1; END IF;

  -- Only strip industry/website_url if they still hold the polluted values.
  -- A human-set value (anything else) is preserved.
  IF stripped->>'industry' = 'cannabis' THEN
    stripped := stripped - 'industry';
    keys_removed := keys_removed + 1;
  END IF;
  IF stripped->>'website_url' = 'https://plpcsanjose.com' THEN
    stripped := stripped - 'website_url';
    keys_removed := keys_removed + 1;
  END IF;

  UPDATE public.agency_clients
  SET container_config = stripped
  WHERE id = ghost_id;

  RAISE NOTICE '[fix-wrong-pl-uuid] Cleaned up internal Kyra client — % keys removed', keys_removed;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART B — Apply Jane Algolia backfill to the REAL Purple Lotus client
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  pl_client_id CONSTANT UUID := '968cae23-e978-46bd-8f4f-23ed2e82d7be';  -- Real Purple Lotus
  current_config JSONB;
  existing_stores JSONB;
BEGIN
  SELECT container_config INTO current_config
  FROM public.agency_clients
  WHERE id = pl_client_id;

  IF current_config IS NULL THEN
    RAISE NOTICE '[fix-wrong-pl-uuid] Real Purple Lotus client not found — skipping backfill';
    RETURN;
  END IF;

  -- Skip if already backfilled (idempotent re-run safety)
  IF current_config ? 'jane_algolia_app_id' THEN
    RAISE NOTICE '[fix-wrong-pl-uuid] Real Purple Lotus already has jane_algolia_app_id — skipping';
    RETURN;
  END IF;

  -- Real Purple Lotus's existing jane_stores carry {id, name, address} but
  -- are missing algoliaStoreId + baseUrl. Preserve address, add the two
  -- missing fields so buildJaneConfigFromContainerConfig() accepts them.
  existing_stores := COALESCE(current_config->'jane_stores', '[]'::jsonb);

  UPDATE public.agency_clients
  SET container_config = container_config || jsonb_build_object(
    'jane_algolia_app_id',      'VFM4X0N23A',
    'jane_algolia_search_key',  '8bd39f3c1d26dd060940b682f024757c',
    'jane_algolia_index',       'menu-products-production',
    'jane_default_store_id',    COALESCE(current_config->>'jane_default_store_id', 'san-jose'),
    'jane_stores', jsonb_build_array(
      jsonb_build_object(
        'id',              'san-jose',
        'name',            'San Jose',
        'address',         COALESCE(existing_stores->0->>'address', '752 Commercial St, San Jose, CA'),
        'algoliaStoreId',  4398,
        'baseUrl',         'https://plpcsanjose.com'
      ),
      jsonb_build_object(
        'id',              'downtown',
        'name',            'Downtown',
        'address',         COALESCE(existing_stores->1->>'address', '66 W Santa Clara St, San Jose, CA'),
        'algoliaStoreId',  5981,
        'baseUrl',         'https://plpcsanjose.com'
      )
    ),
    'jane_known_brands', to_jsonb(ARRAY[
      'Alien Labs', 'Connected', 'Wyld', 'Stiiizy', 'Raw Garden', 'Jetty',
      'Pax', 'Select', 'Kiva', 'Camino', 'PLUS', 'Wana', 'Heavy Hitters',
      'Bloom Farms', 'Cookies', 'Jungle Boys', 'Fig Farms', 'CBX', 'Coldfire',
      'Blue Chip', 'Froot', 'Upnorth', 'Caviar Gold', 'Purple Lotus',
      'Garcia Hand Picked', 'Lowell', 'Old Pal', 'Pacific Stone', 'Glass House',
      'Almora', 'CRU', 'Dablogic', 'West Coast Cure', 'Claybourne', 'Ember Valley',
      'Lost Farm', 'Kikoko', 'Terra', 'Defonce', 'Korova', 'Binske'
    ])
  )
  WHERE id = pl_client_id;

  RAISE NOTICE '[fix-wrong-pl-uuid] Real Purple Lotus Jane config backfilled';
END $$;
