import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

function getWebClientId() {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const fromExtra = (Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)?.googleWebClientId;
  return fromEnv ?? fromExtra ?? null;
}

function getProjectNameForProxy() {
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_PROJECT_FOR_PROXY;
  if (fromEnv) return fromEnv;
  const owner = Constants.expoConfig?.owner;
  const slug = Constants.expoConfig?.slug;
  if (!owner || !slug) return null;
  return `@${owner}/${slug}`;
}

export async function signInWithGoogleIdToken(): Promise<string> {
  const webClientId = getWebClientId();
  if (!webClientId) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  }

  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

  const projectNameForProxy = getProjectNameForProxy();
  if (!projectNameForProxy) {
    throw new Error(
      'Thiếu owner/slug cho Expo Auth Proxy. Hãy set EXPO_PUBLIC_EXPO_PROJECT_FOR_PROXY=@<expo-username>/tripblogger_app',
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
    projectNameForProxy,
  } as never);
  const state = Crypto.randomUUID();

  const authRequest = new AuthSession.AuthRequest({
    clientId: webClientId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    usePKCE: false,
    scopes: ['openid', 'profile'],
    extraParams: {
      nonce: state,
    },
    state,
  });

  await authRequest.makeAuthUrlAsync(discovery);
  const result = await authRequest.promptAsync(discovery, {
    useProxy: true,
    projectNameForProxy,
  } as never);

  if (result.type !== 'success') {
    throw new Error('Google sign-in cancelled');
  }

  const idToken = result.params?.id_token;
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('No id_token returned from Google');
  }

  return idToken;
}

