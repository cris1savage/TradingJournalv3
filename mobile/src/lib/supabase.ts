import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/*
 * Proyecto de Supabase de TJ Pro (solo URL y clave pública: la seguridad la ponen las reglas RLS de cada tabla).
 * Respaldo por si una actualización se publica sin las variables de entorno; una variable vacía desactiva la nube.
 */
const DEFAULT_URL = 'https://thlgqoamdjzshibelysb.supabase.co';
const DEFAULT_KEY = 'sb_publishable_RpnjP4xgRRuwLHYouXYsFw_5MU4s7EO';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? DEFAULT_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? DEFAULT_KEY;

/** null mientras no haya proyecto configurado: la app funciona entonces en modo local. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase && Platform.OS !== 'web') {
  // Refresca la sesión solo con la app en primer plano (recomendación de Supabase para React Native)
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
