// auth.d.ts
declare module '#auth-utils' {
  interface User {
    id: string;
    username: string;
    role: 'admin' | 'moderator' | 'viewer';
  }

  interface UserSession {
    // Add your own fields if needed
  }

  interface SecureSessionData {
    // Add your own fields if needed
  }
}

export {};
