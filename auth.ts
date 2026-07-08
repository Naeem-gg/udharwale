import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import User from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const email = String(credentials?.email || '').toLowerCase().trim();
        const password = String(credentials?.password || '');

        if (!email || !password) {
          return null;
        }

        await connectToDatabase();
        const user = await User.findOne({ email });

        if (!user || !verifyPassword(password, user.password)) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id;
      }

      return session;
    }
  }
});
