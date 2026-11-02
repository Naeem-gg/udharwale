import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import User from '@/models/User';
import { looksLikePhone, normalizePhone } from '@/lib/phone';

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
        email: { label: 'Email or phone', type: 'text' },
        identifier: { label: 'Email or phone', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const rawIdentifier = String(
          credentials?.identifier || credentials?.email || ''
        ).trim();
        const password = String(credentials?.password || '');

        if (!rawIdentifier || !password) {
          return null;
        }

        await connectToDatabase();

        let user = null;
        if (looksLikePhone(rawIdentifier)) {
          const phone = normalizePhone(rawIdentifier);
          user = await User.findOne({ phone });
        } else {
          const email = rawIdentifier.toLowerCase();
          user = await User.findOne({ email });
        }

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
