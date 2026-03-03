import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    onboarded: boolean;
    subscriptionStatus: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      onboarded: boolean;
      subscriptionStatus: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    onboarded: boolean;
    subscriptionStatus: string;
  }
}
