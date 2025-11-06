import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

// Configure Amplify with Cognito settings
export function configureAuth() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
        loginWith: {
          email: true,
        },
      },
    },
  });
}

// Sign in with email and password
export async function login(email: string, password: string) {
  try {
    const result = await signIn({
      username: email,
      password,
    });
    return result;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

// Sign out
export async function logout() {
  try {
    await signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Get current authenticated user with custom attributes
export async function getUser() {
  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes();
    return {
      ...user,
      ...attributes,
    };
  } catch (error) {
    return null;
  }
}

// Get JWT token
export async function getJwtToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token || null;
  } catch (error) {
    console.error('Error getting JWT token:', error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}
