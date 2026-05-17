import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    providers: [],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
        authorized({ auth, request }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");

            if (isOnDashboard) {
                return isLoggedIn;
            }
            return true;
        },
    },
} satisfies NextAuthConfig;
